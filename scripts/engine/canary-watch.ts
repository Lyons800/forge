/**
 * Canary watch orchestrator (J3).
 *
 * Polls Sentry error rates and, based on the `shouldRollback` decision function,
 * either rolls back to the previous deployment or advances the rolling release
 * through each stage until it reaches 100%.
 *
 * All side-effecting dependencies (vercel client, sentry signal, sleep) are
 * injected so the orchestrator is fully unit-testable without real timers or
 * network calls.
 */

import { shouldRollback } from "@/lib/canary";
import type { VercelClient } from "@/lib/engine/vercel-rollout";
import type { SentrySignal } from "@/lib/engine/sentry-signal";

export interface WatchResult {
  action: "rolled_back" | "promoted" | "max_checks_reached";
  reason?: string;
  checks: number;
}

export interface WatchCanaryOpts {
  vercel: VercelClient;
  sentry: SentrySignal;
  deploymentIds: {
    /** The new canary deployment being rolled out */
    canary: string;
    /** The previous stable deployment to fall back to */
    previous: string;
  };
  /** How many milliseconds to wait between checks */
  poll: number;
  /** Maximum number of poll iterations before giving up */
  maxChecks: number;
  /** Injected sleep function (defaults to real timer; inject a no-op in tests) */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function watchCanary(opts: WatchCanaryOpts): Promise<WatchResult> {
  const {
    vercel,
    sentry,
    deploymentIds,
    poll,
    maxChecks,
    sleep = defaultSleep,
  } = opts;

  let checks = 0;

  while (checks < maxChecks) {
    checks++;

    // 1. Read current error rates from Sentry
    const rates = await sentry.getErrorRates({
      baselineDeployment: deploymentIds.previous,
      canaryDeployment: deploymentIds.canary,
    });

    // 2. Decision: roll back?
    if (shouldRollback(rates)) {
      await vercel.rollback(deploymentIds.previous);
      return {
        action: "rolled_back",
        reason: `canary error rate ${rates.canary.toFixed(4)} > baseline ${rates.baseline.toFixed(4)} (samples: ${rates.samples})`,
        checks,
      };
    }

    // 3. Read current rollout state
    const rollout = await vercel.getActiveRollout();

    // 4. If already fully promoted (COMPLETED state or no remaining active stage), we're done
    const isFullyPromoted =
      rollout.state === "COMPLETED" ||
      (rollout.activeStage === null && rollout.state !== "NONE" && rollout.state !== "ACTIVE");

    if (isFullyPromoted) {
      return { action: "promoted", checks };
    }

    // 5. Advance if we have an active stage that needs approval.
    //    isFinalStage means this is the last stage — we still call advance() to approve it,
    //    then return promoted since there are no further stages.
    if (rollout.canaryDeploymentId && rollout.activeStage) {
      const nextStageIndex = rollout.activeStage.index + 1;
      const wasFinalStage = rollout.activeStage.isFinalStage;
      await vercel.advance({
        canaryDeploymentId: rollout.canaryDeploymentId,
        nextStageIndex,
      });

      // Approving the final stage completes the rollout
      if (wasFinalStage) {
        return { action: "promoted", checks };
      }
    }

    // 6. Wait before next iteration
    await sleep(poll);
  }

  return { action: "max_checks_reached", checks };
}

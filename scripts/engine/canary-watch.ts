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
 *
 * CLI usage (I1): run via `pnpm tsx scripts/engine/canary-watch.ts`
 * Required env vars: VERCEL_TOKEN, VERCEL_PROJECT_ID, SENTRY_TOKEN, SENTRY_ORG,
 * SENTRY_PROJECT, CANARY_DEPLOYMENT_ID, PREVIOUS_DEPLOYMENT_ID.
 * If any are absent the script logs a warning and exits cleanly (no throw).
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

// ─── CLI entry point ───────────────────────────────────────────────────────────
// Only runs when this file is executed directly (pnpm tsx scripts/engine/canary-watch.ts).
// Importing the module in tests does NOT trigger main.

async function main() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const sentryToken = process.env.SENTRY_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;
  const canaryId = process.env.CANARY_DEPLOYMENT_ID;
  const previousId = process.env.PREVIOUS_DEPLOYMENT_ID;

  if (!token || !projectId || !sentryToken || !sentryOrg || !sentryProject || !canaryId || !previousId) {
    console.warn(
      "canary watch: missing required env vars " +
      "(VERCEL_TOKEN, VERCEL_PROJECT_ID, SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT, " +
      "CANARY_DEPLOYMENT_ID, PREVIOUS_DEPLOYMENT_ID). Skipping."
    );
    return;
  }

  // Lazy-import factory functions so the module remains importable without them
  const { makeVercelClient } = await import("@/lib/engine/vercel-rollout");
  const { makeSentrySignal } = await import("@/lib/engine/sentry-signal");

  const vercel = makeVercelClient({ token, projectId });
  const sentry = makeSentrySignal({ token: sentryToken, org: sentryOrg, project: sentryProject });

  // Poll every 60 seconds for up to 20 checks (≥ 15 minutes of coverage)
  const result = await watchCanary({
    vercel,
    sentry,
    deploymentIds: { canary: canaryId, previous: previousId },
    poll: 60_000,
    maxChecks: 20,
  });

  console.log(`canary watch result: ${result.action} after ${result.checks} check(s)${result.reason ? ` — ${result.reason}` : ""}`);

  if (result.action === "rolled_back") {
    process.exit(1);
  }
}

// ESM-compatible guard: only invoke main when this file is the entry point
const isMain = process.argv[1]?.endsWith("canary-watch.ts") ||
  process.argv[1]?.endsWith("canary-watch.js");

if (isMain) {
  main().catch((err) => {
    console.error("canary watch: unexpected error", err);
    process.exit(1);
  });
}

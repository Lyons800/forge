import { describe, it, expect, vi } from "vitest";
import { watchCanary } from "../../scripts/engine/canary-watch";
import type { VercelClient } from "@/lib/engine/vercel-rollout";
import type { SentrySignal } from "@/lib/engine/sentry-signal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A sleep that resolves immediately — keeps tests fast */
const noopSleep = () => Promise.resolve();

/** Build a minimal VercelClient mock */
function makeVercelMock(overrides: Partial<VercelClient> = {}): VercelClient & {
  rollback: ReturnType<typeof vi.fn>;
  advance: ReturnType<typeof vi.fn>;
  getActiveRollout: ReturnType<typeof vi.fn>;
} {
  const getActiveRollout = vi.fn().mockResolvedValue({
    state: "ACTIVE",
    percent: 25,
    activeStage: {
      index: 0,
      isFinalStage: false,
      targetPercentage: 25,
      requireApproval: true,
      duration: null,
    },
    canaryDeploymentId: "dpl_canary",
  });

  const advance = vi.fn().mockResolvedValue(undefined);
  const rollback = vi.fn().mockResolvedValue(undefined);

  return { getActiveRollout, advance, rollback, ...overrides };
}

/** Build a SentrySignal mock that always returns the given rates */
function makeSentryMock(rates: { baseline: number; canary: number; samples: number }): SentrySignal {
  return {
    getErrorRates: vi.fn().mockResolvedValue(rates),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("watchCanary", () => {
  const deploymentIds = { canary: "dpl_canary", previous: "dpl_stable" };

  // -------------------------------------------------------------------------
  // Rollback path
  // -------------------------------------------------------------------------

  describe("regression detected → rollback", () => {
    it("returns action=rolled_back and calls vercel.rollback with the previous deployment id", async () => {
      const vercel = makeVercelMock();
      // canary 0.06 is >2x baseline 0.01, samples 1000 > 100 → shouldRollback = true
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.06, samples: 1000 });

      const result = await watchCanary({
        vercel,
        sentry,
        deploymentIds,
        poll: 1000,
        maxChecks: 5,
        sleep: noopSleep,
      });

      expect(result.action).toBe("rolled_back");
      expect(result.reason).toBeDefined();
      expect(vercel.rollback).toHaveBeenCalledOnce();
      expect(vercel.rollback).toHaveBeenCalledWith(deploymentIds.previous);
    });

    it("does NOT call vercel.advance when rolling back", async () => {
      const vercel = makeVercelMock();
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.06, samples: 1000 });

      await watchCanary({ vercel, sentry, deploymentIds, poll: 0, maxChecks: 5, sleep: noopSleep });

      expect(vercel.advance).not.toHaveBeenCalled();
    });

    it("rolls back on the first check (does not wait for maxChecks)", async () => {
      const vercel = makeVercelMock();
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.06, samples: 1000 });

      const result = await watchCanary({
        vercel, sentry, deploymentIds, poll: 0, maxChecks: 100, sleep: noopSleep,
      });

      expect(result.checks).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Healthy path → promote
  // -------------------------------------------------------------------------

  describe("healthy canary → promote", () => {
    it("returns action=promoted and calls advance, NOT rollback", async () => {
      // healthy: canary 0.012 vs baseline 0.01, within noise; samples 2000 > 100
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.012, samples: 2000 });

      // After one advance the rollout returns COMPLETED
      const vercel = makeVercelMock({
        getActiveRollout: vi.fn()
          .mockResolvedValueOnce({
            state: "ACTIVE",
            percent: 25,
            activeStage: {
              index: 0,
              isFinalStage: false,
              targetPercentage: 25,
              requireApproval: true,
              duration: null,
            },
            canaryDeploymentId: "dpl_canary",
          })
          .mockResolvedValue({
            state: "COMPLETED",
            percent: 100,
            activeStage: null,
            canaryDeploymentId: "dpl_canary",
          }),
      });

      const result = await watchCanary({
        vercel,
        sentry,
        deploymentIds,
        poll: 0,
        maxChecks: 5,
        sleep: noopSleep,
      });

      expect(result.action).toBe("promoted");
      expect(vercel.advance).toHaveBeenCalled();
      expect(vercel.rollback).not.toHaveBeenCalled();
    });

    it("calls advance with the canary deployment id", async () => {
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.012, samples: 2000 });

      const vercel = makeVercelMock({
        getActiveRollout: vi.fn()
          .mockResolvedValueOnce({
            state: "ACTIVE",
            percent: 100,
            activeStage: {
              index: 3,
              isFinalStage: true,
              targetPercentage: 100,
              requireApproval: true,
              duration: null,
            },
            canaryDeploymentId: "dpl_canary",
          }),
      });

      const result = await watchCanary({
        vercel, sentry, deploymentIds, poll: 0, maxChecks: 5, sleep: noopSleep,
      });

      expect(result.action).toBe("promoted");
      expect(vercel.advance).toHaveBeenCalledWith({
        canaryDeploymentId: "dpl_canary",
        nextStageIndex: 4,
      });
    });

    it("uses the injected no-op sleep (test completes immediately)", async () => {
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.012, samples: 2000 });
      const sleepMock = vi.fn().mockResolvedValue(undefined);

      const vercel = makeVercelMock({
        getActiveRollout: vi.fn().mockResolvedValue({
          state: "COMPLETED",
          percent: 100,
          activeStage: null,
          canaryDeploymentId: "dpl_canary",
        }),
      });

      await watchCanary({
        vercel, sentry, deploymentIds, poll: 60_000, maxChecks: 5, sleep: sleepMock,
      });

      // sleep is not called when we exit immediately (COMPLETED on first read)
      // but if it were called it must use the injected fn, not real timers
      expect(sleepMock.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Max-checks guard
  // -------------------------------------------------------------------------

  describe("max checks exhausted", () => {
    it("returns action=max_checks_reached if never completes or regresses", async () => {
      // Rates never trigger rollback, rollout never reaches COMPLETED
      const sentry = makeSentryMock({ baseline: 0.01, canary: 0.012, samples: 2000 });
      const vercel = makeVercelMock(); // always returns ACTIVE / 25% stage 0

      const result = await watchCanary({
        vercel, sentry, deploymentIds, poll: 0, maxChecks: 3, sleep: noopSleep,
      });

      expect(result.action).toBe("max_checks_reached");
      expect(result.checks).toBe(3);
    });
  });
});

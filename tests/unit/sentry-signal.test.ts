import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSentrySignal } from "@/lib/engine/sentry-signal";
import { shouldRollback } from "@/lib/canary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock fetch that returns Sentry Stats v2 responses.
 * `errorCount` and `txnCount` are arrays consumed in call order:
 *   call 0 → baseline errors
 *   call 1 → baseline transactions
 *   call 2 → canary errors
 *   call 3 → canary transactions
 */
function makeFetch(counts: number[]): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const count = counts[callIndex++] ?? 0;
    const body = {
      groups: [
        {
          totals: { "sum(times_seen)": count },
        },
      ],
    };
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("makeSentrySignal", () => {
  const TOKEN = "sntr_tok";
  const ORG = "my-org";
  const PROJECT = "my-project";
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  describe("getErrorRates()", () => {
    it("returns baseline, canary, and samples from mocked Sentry responses", async () => {
      // baseline: 10 errors / 1000 txns = 0.01; canary: 50 errors / 1000 txns = 0.05
      mockFetch = makeFetch([10, 1000, 50, 1000]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      const rates = await signal.getErrorRates({
        baselineDeployment: "dpl_stable",
        canaryDeployment: "dpl_canary",
      });

      expect(rates.baseline).toBeCloseTo(0.01);
      expect(rates.canary).toBeCloseTo(0.05);
      expect(rates.samples).toBe(2000); // 1000 + 1000
    });

    it("makes 4 fetch calls (baseline errors, baseline txns, canary errors, canary txns)", async () => {
      mockFetch = makeFetch([0, 500, 0, 500]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      await signal.getErrorRates({ baselineDeployment: "dpl_a", canaryDeployment: "dpl_b" });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("uses Bearer auth on each call", async () => {
      mockFetch = makeFetch([0, 100, 0, 100]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      await signal.getErrorRates({ baselineDeployment: "dpl_a", canaryDeployment: "dpl_b" });

      for (const call of mockFetch.mock.calls) {
        const [, init] = call as [string, RequestInit];
        expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
      }
    });

    it("includes org in the request URL", async () => {
      mockFetch = makeFetch([0, 100, 0, 100]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      await signal.getErrorRates({ baselineDeployment: "dpl_a", canaryDeployment: "dpl_b" });

      for (const call of mockFetch.mock.calls) {
        const [url] = call as [string, RequestInit];
        expect(url).toContain(`/organizations/${ORG}/stats_v2/`);
      }
    });

    it("returns 0 baseline rate when there are 0 transactions (avoids division by zero)", async () => {
      mockFetch = makeFetch([5, 0, 0, 100]); // baseline: 5 errors, 0 txns → rate 0
      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      const rates = await signal.getErrorRates({ baselineDeployment: "dpl_a", canaryDeployment: "dpl_b" });

      expect(rates.baseline).toBe(0);
      expect(rates.canary).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Integration with shouldRollback
    // -------------------------------------------------------------------------

    it("(scenario A) clear regression: canary 5x baseline → shouldRollback returns true", async () => {
      // baseline: 10/1000 = 0.01; canary: 60/1000 = 0.06 (>2x); samples 2000 > 100
      mockFetch = makeFetch([10, 1000, 60, 1000]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      const rates = await signal.getErrorRates({
        baselineDeployment: "dpl_stable",
        canaryDeployment: "dpl_canary",
      });

      expect(shouldRollback(rates)).toBe(true);
    });

    it("(scenario B) noise: canary only slightly above baseline → shouldRollback returns false", async () => {
      // baseline: 20/1000 = 0.02; canary: 25/1000 = 0.025 (<2x); samples 2000 > 100
      mockFetch = makeFetch([20, 1000, 25, 1000]);

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      const rates = await signal.getErrorRates({
        baselineDeployment: "dpl_stable",
        canaryDeployment: "dpl_canary",
      });

      expect(shouldRollback(rates)).toBe(false);
    });

    it("(scenario C) not enough samples → shouldRollback returns false even on apparent spike", async () => {
      // Only 50 total transactions → samples < MIN_SAMPLES (100)
      mockFetch = makeFetch([5, 25, 20, 25]); // canary rate 0.8 >> baseline 0.2, but only 50 samples
      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      const rates = await signal.getErrorRates({
        baselineDeployment: "dpl_stable",
        canaryDeployment: "dpl_canary",
      });

      expect(rates.samples).toBe(50);
      expect(shouldRollback(rates)).toBe(false);
    });

    it("throws when Sentry returns a non-ok response", async () => {
      mockFetch.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

      const signal = makeSentrySignal({ token: TOKEN, org: ORG, project: PROJECT, fetchImpl: mockFetch });
      await expect(
        signal.getErrorRates({ baselineDeployment: "dpl_a", canaryDeployment: "dpl_b" })
      ).rejects.toThrow("500");
    });
  });
});

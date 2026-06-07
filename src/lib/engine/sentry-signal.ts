/**
 * Sentry error-rate signal (J2).
 *
 * Fetches per-deployment error rates from the Sentry Stats v2 API and returns
 * a `{ baseline, canary, samples }` object shaped to feed directly into
 * `shouldRollback` from `@/lib/canary`.
 *
 * API reference (Sentry Stats v2):
 *   GET https://sentry.io/api/0/organizations/{org}/stats_v2/
 *       ?field=sum(times_seen)
 *       &groupBy=release
 *       &query=release:<deploymentId>
 *       &interval=1h
 *       &statsPeriod=1h
 *
 * Error-rate = errors / total-events for the release window.
 * Because Sentry's event-stats endpoint doesn't directly return an error rate,
 * we use `sum(times_seen)` with category filters:
 *   - category=error  for the error count
 *   - category=transaction for the total-request proxy (samples)
 *
 * ASSUMPTION: The Sentry Stats v2 `sum(times_seen)` field returns the total
 * event count for the given groupBy+query filter. This is the documented
 * behaviour but the exact shape depends on your Sentry plan / data category
 * configuration. If your Sentry org uses a different field, adjust `field`.
 */

const SENTRY_BASE = "https://sentry.io/api/0";

export interface ErrorRates {
  /** Error rate for the stable/baseline deployment (0–1) */
  baseline: number;
  /** Error rate for the canary deployment (0–1) */
  canary: number;
  /** Total request samples observed across both deployments (used for min-sample guard) */
  samples: number;
}

export interface SentrySignal {
  getErrorRates(opts: {
    baselineDeployment: string;
    canaryDeployment: string;
  }): Promise<ErrorRates>;
}

/** Parses a Sentry Stats v2 response and returns the first group's total. */
function extractCount(data: unknown): number {
  const d = data as {
    groups?: Array<{ totals?: Record<string, number> }>;
  };
  const group = d?.groups?.[0];
  if (!group) return 0;
  const totals = group.totals ?? {};
  // "sum(times_seen)" is the field we request
  return totals["sum(times_seen)"] ?? 0;
}

export function makeSentrySignal(opts: {
  token: string;
  org: string;
  project: string;
  fetchImpl?: typeof fetch;
}): SentrySignal {
  const { token, org, project, fetchImpl = fetch } = opts;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function fetchStats(release: string, category: "error" | "transaction"): Promise<number> {
    const params = new URLSearchParams({
      field: "sum(times_seen)",
      groupBy: "release",
      query: `release:${release} project:${project}`,
      interval: "1h",
      statsPeriod: "1h",
      category,
    });

    const url = `${SENTRY_BASE}/organizations/${org}/stats_v2/?${params.toString()}`;
    const res = await fetchImpl(url, { headers });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Sentry API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return extractCount(data);
  }

  return {
    async getErrorRates({ baselineDeployment, canaryDeployment }): Promise<ErrorRates> {
      // Fetch errors and transaction counts concurrently for both deployments
      const [baselineErrors, baselineTxns, canaryErrors, canaryTxns] = await Promise.all([
        fetchStats(baselineDeployment, "error"),
        fetchStats(baselineDeployment, "transaction"),
        fetchStats(canaryDeployment, "error"),
        fetchStats(canaryDeployment, "transaction"),
      ]);

      const baselineRate = baselineTxns > 0 ? baselineErrors / baselineTxns : 0;
      const canaryRate = canaryTxns > 0 ? canaryErrors / canaryTxns : 0;
      const samples = baselineTxns + canaryTxns;

      return {
        baseline: baselineRate,
        canary: canaryRate,
        samples,
      };
    },
  };
}

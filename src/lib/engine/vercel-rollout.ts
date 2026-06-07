/**
 * Vercel Rolling-Release client (J1).
 *
 * Thin wrapper around the Vercel REST API for rolling releases and rollback.
 * All calls use an injected `fetchImpl` so the module is fully unit-testable
 * without real network access or credentials.
 *
 * API reference:
 *   GET  /v1/projects/{projectId}/rolling-release
 *   POST /v1/projects/{projectId}/deployments/{deploymentId}/rolling-release/approve
 *   POST /v1/projects/{projectId}/rollback/{deploymentId}
 */

const BASE = "https://api.vercel.com";

export interface RollingReleaseStage {
  index: number;
  isFinalStage: boolean;
  targetPercentage: number;
  requireApproval: boolean;
  duration: number | null;
}

export interface ActiveRollout {
  /** "ACTIVE" | "COMPLETED" | "ABORTED" */
  state: string;
  /** current traffic share going to canary (0–100) */
  percent: number;
  activeStage: RollingReleaseStage | null;
  canaryDeploymentId: string | null;
}

export interface VercelClient {
  /** Return the active rolling release for the project. */
  getActiveRollout(): Promise<ActiveRollout>;
  /**
   * Approve/advance the rolling release to its next stage.
   * Requires knowing the canary deployment id and the next stage index, which
   * are read from the current rollout state by the caller (watchCanary).
   */
  advance(opts: { canaryDeploymentId: string; nextStageIndex: number }): Promise<void>;
  /** Roll back to a previous (stable) deployment. */
  rollback(deploymentId: string): Promise<void>;
}

export function makeVercelClient(opts: {
  token: string;
  projectId: string;
  fetchImpl?: typeof fetch;
}): VercelClient {
  const { token, projectId, fetchImpl = fetch } = opts;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function request(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchImpl(url, { ...init, headers: { ...headers, ...init?.headers } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Vercel API error ${res.status}: ${body}`);
    }
    // 204 / no-content responses have no body
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.json();
    }
    return null;
  }

  return {
    async getActiveRollout(): Promise<ActiveRollout> {
      const data = (await request(
        `${BASE}/v1/projects/${projectId}/rolling-release`
      )) as {
        state?: string;
        activeStage?: RollingReleaseStage | null;
        canaryDeployment?: { id: string } | null;
      } | null;

      if (!data) {
        return { state: "NONE", percent: 0, activeStage: null, canaryDeploymentId: null };
      }

      return {
        state: data.state ?? "UNKNOWN",
        percent: data.activeStage?.targetPercentage ?? 0,
        activeStage: data.activeStage ?? null,
        canaryDeploymentId: data.canaryDeployment?.id ?? null,
      };
    },

    async advance(advOpts: { canaryDeploymentId: string; nextStageIndex: number }): Promise<void> {
      await request(
        `${BASE}/v1/projects/${projectId}/deployments/${advOpts.canaryDeploymentId}/rolling-release/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            nextStageIndex: advOpts.nextStageIndex,
            canaryDeploymentId: advOpts.canaryDeploymentId,
          }),
        }
      );
    },

    async rollback(deploymentId: string): Promise<void> {
      await request(`${BASE}/v1/projects/${projectId}/rollback/${deploymentId}`, {
        method: "POST",
      });
    },
  };
}

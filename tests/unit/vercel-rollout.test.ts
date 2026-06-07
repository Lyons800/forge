import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeVercelClient } from "@/lib/engine/vercel-rollout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number): Response {
  return new Response("Unauthorized", { status });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("makeVercelClient", () => {
  const TOKEN = "tok_test";
  const PROJECT_ID = "prj_abc123";
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  // -------------------------------------------------------------------------
  // getActiveRollout
  // -------------------------------------------------------------------------

  describe("getActiveRollout()", () => {
    it("calls GET /v1/projects/{projectId}/rolling-release with auth header", async () => {
      mockFetch.mockResolvedValue(
        makeResponse({
          state: "ACTIVE",
          activeStage: {
            index: 0,
            isFinalStage: false,
            targetPercentage: 25,
            requireApproval: true,
            duration: null,
          },
          canaryDeployment: { id: "dpl_canary" },
        })
      );

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      const result = await client.getActiveRollout();

      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`https://api.vercel.com/v1/projects/${PROJECT_ID}/rolling-release`);
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
      // GET (no method field set means GET by default, or explicit)
      expect(init.method).toBeUndefined();

      expect(result.state).toBe("ACTIVE");
      expect(result.percent).toBe(25);
      expect(result.canaryDeploymentId).toBe("dpl_canary");
    });

    it("returns safe defaults when API returns null (no rollout yet)", async () => {
      mockFetch.mockResolvedValue(makeResponse(null));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      const result = await client.getActiveRollout();

      expect(result.state).toBe("NONE");
      expect(result.percent).toBe(0);
      expect(result.activeStage).toBeNull();
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue(errorResponse(401));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await expect(client.getActiveRollout()).rejects.toThrow("401");
    });
  });

  // -------------------------------------------------------------------------
  // advance()
  // -------------------------------------------------------------------------

  describe("advance()", () => {
    it("calls POST approve endpoint with correct URL and auth header", async () => {
      mockFetch.mockResolvedValue(makeResponse({ status: "approved" }));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await client.advance({ canaryDeploymentId: "dpl_canary", nextStageIndex: 1 });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `https://api.vercel.com/v1/projects/${PROJECT_ID}/deployments/dpl_canary/rolling-release/approve`
      );
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);

      const body = JSON.parse(init.body as string);
      expect(body.nextStageIndex).toBe(1);
      expect(body.canaryDeploymentId).toBe("dpl_canary");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue(errorResponse(403));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await expect(
        client.advance({ canaryDeploymentId: "dpl_x", nextStageIndex: 2 })
      ).rejects.toThrow("403");
    });
  });

  // -------------------------------------------------------------------------
  // rollback()
  // -------------------------------------------------------------------------

  describe("rollback(deploymentId)", () => {
    it("calls POST /v1/projects/{projectId}/rollback/{deploymentId}", async () => {
      mockFetch.mockResolvedValue(makeResponse(null, 200));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await client.rollback("dpl_123");

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/rollback/dpl_123");
      expect(url).toBe(`https://api.vercel.com/v1/projects/${PROJECT_ID}/rollback/dpl_123`);
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
    });

    it("URL contains the deployment id passed as argument", async () => {
      mockFetch.mockResolvedValue(makeResponse(null, 200));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await client.rollback("dpl_abc_xyz");

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/rollback/dpl_abc_xyz");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      const client = makeVercelClient({ token: TOKEN, projectId: PROJECT_ID, fetchImpl: mockFetch });
      await expect(client.rollback("dpl_123")).rejects.toThrow("500");
    });
  });
});

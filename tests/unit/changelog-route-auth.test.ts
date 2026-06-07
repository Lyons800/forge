import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/headers so the route can be imported in a node test environment.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock @/lib/auth to control the session response.
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock @/lib/db so no real DB connection is attempted.
vi.mock("@/lib/db", () => ({ db: {} }));

// Mock the changelog repo so we don't hit the database.
vi.mock("@/lib/changelog/repo", () => ({
  insertChangelogEntry: vi.fn(),
}));

describe("POST /api/changelog — auth guard", () => {
  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    // Reset to unauthenticated state before each test.
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const { POST } = await import("@/app/api/changelog/route");

    const req = new NextRequest("http://localhost/api/changelog", {
      method: "POST",
      body: JSON.stringify({ title: "Test", body: "Body" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});

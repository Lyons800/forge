import { describe, it, expect, beforeAll, vi } from "vitest";
import { makeTestDb } from "../helpers/testdb";
import { insertChangelogEntry } from "@/lib/changelog/repo";

// ---------------------------------------------------------------------------
// Integration tests — use a real PGlite DB
// ---------------------------------------------------------------------------

let db: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  db = await makeTestDb();
});

/**
 * Import the feed GET handler with a specific db injected.
 * Resets the module registry so each call gets a fresh module instance.
 */
async function importFeedRoute(injectedDb: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/db", () => ({ db: injectedDb }));
  const mod = await import("@/app/api/changelog/feed/route");
  return mod;
}

describe("GET /api/changelog/feed — PGlite integration", () => {
  it("returns count=0 and empty entries when the table is empty", async () => {
    const freshDb = await makeTestDb(); // isolated empty DB
    const { GET } = await importFeedRoute(freshDb);
    const res = await GET();
    const json = await res.json();

    expect(json).toHaveProperty("entries");
    expect(json).toHaveProperty("count");
    expect(Array.isArray(json.entries)).toBe(true);
    expect(json.count).toBe(0);
    expect(json.entries).toHaveLength(0);
  });

  it("returns entries newest-first with correct shape", async () => {
    // Insert an older entry first, then a newer one.
    const older = await insertChangelogEntry(db, {
      title: "Older feature",
      body: "This shipped earlier.",
    });
    // Small delay to ensure distinct shippedAt timestamps.
    await new Promise((r) => setTimeout(r, 5));
    const newer = await insertChangelogEntry(db, {
      title: "Newer feature",
      body: "This shipped later.",
    });

    const { GET } = await importFeedRoute(db);
    const res = await GET();
    const json = await res.json();

    // Basic shape
    expect(json).toHaveProperty("count");
    expect(json).toHaveProperty("entries");
    expect(typeof json.count).toBe("number");
    expect(json.count).toBeGreaterThanOrEqual(2);
    expect(json.entries.length).toBe(json.count);

    // Each entry has the required fields
    for (const entry of json.entries) {
      expect(entry).toHaveProperty("title");
      expect(entry).toHaveProperty("body");
      expect(entry).toHaveProperty("shippedAt");
      expect(typeof entry.title).toBe("string");
      expect(typeof entry.body).toBe("string");
      expect(typeof entry.shippedAt).toBe("string");
      // shippedAt should be an ISO 8601 string
      expect(() => new Date(entry.shippedAt)).not.toThrow();
      expect(new Date(entry.shippedAt).toISOString()).toBe(entry.shippedAt);
    }

    // Newest-first ordering
    for (let i = 0; i < json.entries.length - 1; i++) {
      const a = new Date(json.entries[i].shippedAt).getTime();
      const b = new Date(json.entries[i + 1].shippedAt).getTime();
      expect(a).toBeGreaterThanOrEqual(b);
    }

    // The two entries we inserted are present
    const titles = json.entries.map((e: { title: string }) => e.title);
    expect(titles).toContain(older.title);
    expect(titles).toContain(newer.title);

    // The newer one comes first
    expect(titles.indexOf(newer.title)).toBeLessThan(titles.indexOf(older.title));
  });
});

// ---------------------------------------------------------------------------
// Unit test — null-db guard (no DATABASE_URL scenario)
// ---------------------------------------------------------------------------

describe("GET /api/changelog/feed — null db guard", () => {
  it("returns { entries: [], count: 0 } with 200 when db is null", async () => {
    const { GET } = await importFeedRoute(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ entries: [], count: 0 });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { canShipThisWeek } from "../../src/lib/engine/cap";
import { makeTestDb } from "../helpers/testdb";
import { countShipsSince } from "../../src/lib/engine/report-repo";

describe("canShipThisWeek — pure function", () => {
  it("returns true when 0 ships this week (default cap 3)", () => {
    expect(canShipThisWeek(0)).toBe(true);
  });

  it("returns false when 3 ships this week (at default cap)", () => {
    expect(canShipThisWeek(3)).toBe(false);
  });

  it("returns true when 2 ships this week (below default cap)", () => {
    expect(canShipThisWeek(2)).toBe(true);
  });

  it("respects a custom cap of 1: 0 ships → true", () => {
    expect(canShipThisWeek(0, 1)).toBe(true);
  });

  it("respects a custom cap of 1: 1 ship → false", () => {
    expect(canShipThisWeek(1, 1)).toBe(false);
  });

  it("respects a custom cap of 5: 4 ships → true", () => {
    expect(canShipThisWeek(4, 5)).toBe(true);
  });

  it("respects a custom cap of 5: 5 ships → false", () => {
    expect(canShipThisWeek(5, 5)).toBe(false);
  });
});

describe("countShipsSince — PGlite integration", () => {
  let db: Awaited<ReturnType<typeof makeTestDb>>;

  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("counts only entries within the window, ignores older entries", async () => {
    // Use fixed dates to avoid drift
    const sevenDaysAgo = new Date("2026-05-31T12:00:00Z");
    const tenDaysAgo = new Date("2026-05-28T12:00:00Z");

    // Insert 2 entries within the 7-day window
    const { changelogEntries } = await import("../../drizzle/schema");
    const fiveDaysAgo = new Date("2026-06-02T12:00:00Z");
    const threeDaysAgo = new Date("2026-06-04T12:00:00Z");

    await db
      .insert(changelogEntries)
      .values({ title: "Ship within window 1", body: "body", shippedAt: fiveDaysAgo })
      .returning();
    await db
      .insert(changelogEntries)
      .values({ title: "Ship within window 2", body: "body", shippedAt: threeDaysAgo })
      .returning();
    // Insert 1 entry outside the 7-day window (10 days ago)
    await db
      .insert(changelogEntries)
      .values({ title: "Old ship outside window", body: "body", shippedAt: tenDaysAgo })
      .returning();

    const count = await countShipsSince(db, sevenDaysAgo);
    expect(count).toBe(2);
  });

  it("returns 0 when no entries exist within the window", async () => {
    const sevenDaysAgo = new Date("2026-05-31T12:00:00Z");
    const count = await countShipsSince(db, sevenDaysAgo);
    expect(count).toBe(0);
  });

  it("counts entries exactly on the boundary (gte)", async () => {
    const boundary = new Date("2026-05-31T12:00:00Z");
    const { changelogEntries } = await import("../../drizzle/schema");

    // Entry exactly on the boundary
    await db
      .insert(changelogEntries)
      .values({ title: "Boundary ship", body: "body", shippedAt: boundary })
      .returning();

    const count = await countShipsSince(db, boundary);
    expect(count).toBe(1);
  });
});

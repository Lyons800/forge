import { describe, it, expect } from "vitest";
import {
  groupEntriesByDate,
  formatShipDate,
  type ChangelogRenderEntry,
} from "@/lib/changelog/render";

const entry = (
  id: number,
  title: string,
  body: string,
  shippedAt: Date
): ChangelogRenderEntry => ({ id, title, body, shippedAt });

describe("formatShipDate", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(formatShipDate(new Date("2026-06-08T12:00:00Z"))).toBe("2026-06-08");
  });

  it("handles midnight UTC correctly", () => {
    expect(formatShipDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("groupEntriesByDate", () => {
  it("returns an empty array for no entries", () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });

  it("groups entries sharing the same ship date", () => {
    const entries = [
      entry(1, "Feature A", "Body A", new Date("2026-06-08T10:00:00Z")),
      entry(2, "Feature B", "Body B", new Date("2026-06-08T18:00:00Z")),
    ];
    const groups = groupEntriesByDate(entries);
    expect(groups).toHaveLength(1);
    expect(groups[0].date).toBe("2026-06-08");
    expect(groups[0].entries).toHaveLength(2);
  });

  it("creates separate groups for different dates", () => {
    // Input is newest-first (listChangelogEntries returns desc by shippedAt)
    const entries = [
      entry(2, "Day 2 feature", "Body", new Date("2026-06-08T10:00:00Z")),
      entry(1, "Day 1 feature", "Body", new Date("2026-06-07T10:00:00Z")),
    ];
    const groups = groupEntriesByDate(entries);
    expect(groups).toHaveLength(2);
    // Groups are ordered newest-date first
    expect(groups[0].date).toBe("2026-06-08");
    expect(groups[1].date).toBe("2026-06-07");
  });

  it("preserves entry order within a date group (newest first)", () => {
    const entries = [
      entry(3, "Third", "c", new Date("2026-06-08T18:00:00Z")),
      entry(2, "Second", "b", new Date("2026-06-08T12:00:00Z")),
      entry(1, "First",  "a", new Date("2026-06-08T08:00:00Z")),
    ];
    const groups = groupEntriesByDate(entries);
    expect(groups[0].entries.map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it("handles mixed dates with multiple entries per date", () => {
    const entries = [
      entry(4, "D2-B", "x", new Date("2026-06-09T15:00:00Z")),
      entry(3, "D2-A", "x", new Date("2026-06-09T09:00:00Z")),
      entry(2, "D1-B", "x", new Date("2026-06-08T20:00:00Z")),
      entry(1, "D1-A", "x", new Date("2026-06-08T08:00:00Z")),
    ];
    const groups = groupEntriesByDate(entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe("2026-06-09");
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].date).toBe("2026-06-08");
    expect(groups[1].entries).toHaveLength(2);
  });
});

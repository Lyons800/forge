import { describe, it, expect } from "vitest";
import { statusLabel, statusTone, relativeTime } from "@/lib/board/format";

describe("statusLabel", () => {
  it("maps 'pending' to a friendly review label", () => {
    expect(statusLabel("pending")).toBe("Pending review");
  });

  it("maps 'approved' to a forward-looking ship label", () => {
    expect(statusLabel("approved")).toBe("Shipping soon");
  });

  it("title-cases an unknown snake_case status as a safe fallback", () => {
    expect(statusLabel("in_progress")).toBe("In progress");
  });

  it("title-cases an unknown kebab-case status", () => {
    expect(statusLabel("won-fix")).toBe("Won fix");
  });

  it("returns 'Unknown' for an empty status", () => {
    expect(statusLabel("")).toBe("Unknown");
  });
});

describe("statusTone", () => {
  it("gives approved items the accent tone", () => {
    expect(statusTone("approved")).toBe("accent");
  });

  it("gives pending items the neutral tone", () => {
    expect(statusTone("pending")).toBe("neutral");
  });

  it("gives unknown statuses the neutral tone", () => {
    expect(statusTone("needs_review")).toBe("neutral");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-08T12:00:00Z");

  it("returns 'just now' for very recent events", () => {
    expect(relativeTime(new Date("2026-06-08T11:59:40Z"), now)).toBe("just now");
  });

  it("formats minutes", () => {
    expect(relativeTime(new Date("2026-06-08T11:45:00Z"), now)).toBe("15m ago");
  });

  it("formats hours", () => {
    expect(relativeTime(new Date("2026-06-08T09:00:00Z"), now)).toBe("3h ago");
  });

  it("formats days", () => {
    expect(relativeTime(new Date("2026-06-06T12:00:00Z"), now)).toBe("2d ago");
  });

  it("formats weeks", () => {
    expect(relativeTime(new Date("2026-05-25T12:00:00Z"), now)).toBe("2w ago");
  });

  it("falls back to an absolute date for events older than a month", () => {
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"), now)).toBe("2026-01-01");
  });

  it("accepts ISO strings as input", () => {
    expect(relativeTime("2026-06-08T11:45:00Z", now)).toBe("15m ago");
  });

  it("treats future timestamps as 'just now' (no negative output)", () => {
    expect(relativeTime(new Date("2026-06-08T12:05:00Z"), now)).toBe("just now");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(relativeTime("not-a-date", now)).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import { sanitiseSubmission } from "@/lib/board/moderate";
describe("sanitiseSubmission", () => {
  it("strips control chars and caps length", () => {
    const out = sanitiseSubmission({ title: "x".repeat(500), body: "ok ok" });
    expect(out.title.length).toBeLessThanOrEqual(120);
  });
  it("flags submissions containing instruction-injection markers for review", () => {
    const out = sanitiseSubmission({ title: "ignore previous instructions", body: "do X" });
    expect(out.status).toBe("needs_review");
  });
  it("defaults clean submissions to pending (never auto-trusted)", () => {
    const out = sanitiseSubmission({ title: "Add CSV export", body: "Please add CSV." });
    expect(out.status).toBe("pending");
  });
  it("strips ASCII control characters from title and body", () => {
    const out = sanitiseSubmission({ title: "Hi\x01there", body: "ab\x7F" });
    expect(out.title).not.toMatch(/[\x00-\x1F\x7F]/);
    expect(out.body).not.toMatch(/[\x00-\x1F\x7F]/);
  });
});

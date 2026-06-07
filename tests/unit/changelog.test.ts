import { describe, it, expect } from "vitest";
import { generateChangelogMarkdown } from "@/lib/changelog/generate";

describe("generateChangelogMarkdown", () => {
  it("renders entries newest-first grouped by date", () => {
    const md = generateChangelogMarkdown([
      { title: "Add OG tool", body: "New tool.", shippedAt: new Date("2026-06-02T10:00:00Z") },
      { title: "Fix board bug", body: "Sanitised input.", shippedAt: new Date("2026-06-01T09:00:00Z") },
    ]);
    expect(md.indexOf("Add OG tool")).toBeLessThan(md.indexOf("Fix board bug"));
    expect(md).toContain("## 2026-06-02");
    expect(md).toContain("### Add OG tool");
  });
  it("escapes markdown control chars in titles", () => {
    const md = generateChangelogMarkdown([
      { title: "Weird # title", body: "x", shippedAt: new Date("2026-06-02T10:00:00Z") },
    ]);
    expect(md).toContain("Weird \\# title");
  });
  it("returns an empty-state line for no entries", () => {
    expect(generateChangelogMarkdown([])).toContain("No changes yet");
  });
});

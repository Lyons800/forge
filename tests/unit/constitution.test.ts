import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("control plane integrity", () => {
  it("has the immutable files present", () => {
    for (const f of [
      "CONSTITUTION.md",
      "atlas.hcl",
      "control/auth/auth.config.ts",
      "scripts/check-migrations.sh",
      ".github/CODEOWNERS",
    ]) {
      expect(existsSync(f)).toBe(true);
    }
  });

  // m1 — content assertions
  it("CONSTITUTION.md contains CONTROL plane marker", () => {
    const content = readFileSync("CONSTITUTION.md", "utf8");
    expect(content).toContain("CONTROL plane");
  });

  it("check-migrations.sh contains DROP and TRUNCATE patterns", () => {
    const content = readFileSync("scripts/check-migrations.sh", "utf8");
    expect(content).toContain("DROP");
    expect(content).toContain("TRUNCATE");
  });

  it("control/auth/auth.config.ts uses betterAuth", () => {
    const content = readFileSync("control/auth/auth.config.ts", "utf8");
    expect(content).toContain("betterAuth");
  });

  // C1 — src/lib/auth.ts must re-export auth from the control plane config
  it("src/lib/auth.ts re-exports auth from the control plane config", () => {
    const content = readFileSync("src/lib/auth.ts", "utf8");
    expect(content).toMatch(
      /export\s*\{\s*auth\s*\}\s*from\s*["'].*control\/auth\/auth\.config["']/
    );
  });
});

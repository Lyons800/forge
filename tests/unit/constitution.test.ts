import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
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
});

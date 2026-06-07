import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
const run = (files: string[]) => {
  try { execFileSync("bash", ["scripts/check-control-plane.sh", "--files", files.join("\n")]); return 0; }
  catch (e: unknown) { return (e as NodeJS.ErrnoException & { status?: number }).status ?? 1; }
};
describe("control-plane guard", () => {
  it("blocks a PR that modifies a control-plane path", () => {
    expect(run(["control/auth/auth.config.ts"])).not.toBe(0);
    expect(run(["CONSTITUTION.md"])).not.toBe(0);
    expect(run([".github/workflows/ci.yml"])).not.toBe(0);
    expect(run(["src/lib/auth.ts"])).not.toBe(0);
    expect(run(["scripts/check-migrations.sh"])).not.toBe(0);
    expect(run(["tests/unit/foo.test.ts"])).not.toBe(0);
  });
  it("blocks even if only ONE of several files is control-plane", () => {
    expect(run(["src/app/page.tsx", "control/auth/auth.config.ts"])).not.toBe(0);
  });
  it("allows a PR that only touches the app plane", () => {
    expect(run(["src/app/tools/changelog/page.tsx", "src/lib/changelog/generate.ts"])).toBe(0);
  });
});

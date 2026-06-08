import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
const run = (files: string[]) => {
  try { execFileSync("bash", ["scripts/check-control-plane.sh", "--files", files.join("\n")]); return 0; }
  catch (e: unknown) { return (e as NodeJS.ErrnoException & { status?: number }).status ?? 1; }
};

// --name-status mode helper: stdin is "STATUS\tPATH\n"
const runNameStatus = (input: string) => {
  try {
    execFileSync("bash", ["scripts/check-control-plane.sh", "--name-status"], { input });
    return 0;
  } catch (e: unknown) {
    return (e as NodeJS.ErrnoException & { status?: number }).status ?? 1;
  }
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

  // C1 — ./ prefix bypass: "./CONSTITUTION.md" must be blocked
  it("blocks a path with a leading ./ prefix (C1)", () => {
    expect(run(["./CONSTITUTION.md"])).not.toBe(0);
  });

  // C1 — whitespace bypass: paths with surrounding spaces must be blocked
  it("blocks a path with surrounding whitespace (C1)", () => {
    expect(run(["  control/auth/auth.config.ts  "])).not.toBe(0);
  });

  // C2 — drizzle/schema.ts must be blocked (contains control-plane auth tables)
  it("blocks drizzle/schema.ts (C2)", () => {
    expect(run(["drizzle/schema.ts"])).not.toBe(0);
  });

  // --stdin mode: the production CI path — pipe a control-plane path via stdin
  it("blocks a control-plane path passed via --stdin", () => {
    expect(() =>
      execFileSync("bash", ["scripts/check-control-plane.sh", "--stdin"], {
        input: "control/auth/auth.config.ts\n",
      })
    ).toThrow();
  });
});

describe("control-plane guard — --name-status mode", () => {
  // Engine ADDING a new test file must be allowed
  it("allows adding a new test file (A status under tests/)", () => {
    expect(runNameStatus("A\ttests/unit/new-feature.test.ts\n")).toBe(0);
  });

  // Modifying an existing test must be blocked (anti-reward-hacking)
  it("blocks modifying an existing test file (M status)", () => {
    expect(runNameStatus("M\ttests/unit/health.test.ts\n")).not.toBe(0);
  });

  // Deleting an existing test must be blocked
  it("blocks deleting an existing test file (D status)", () => {
    expect(runNameStatus("D\ttests/unit/health.test.ts\n")).not.toBe(0);
  });

  // Adding to control/ must be blocked (non-test control-plane path, any status)
  it("blocks adding a file to control/ (A status)", () => {
    expect(runNameStatus("A\tcontrol/engine/new.ts\n")).not.toBe(0);
  });

  // Adding a new workflow must be blocked
  it("blocks adding a new workflow to .github/ (A status)", () => {
    expect(runNameStatus("A\t.github/workflows/evil.yml\n")).not.toBe(0);
  });

  // Modifying src/lib/auth.ts must be blocked
  it("blocks modifying src/lib/auth.ts (M status)", () => {
    expect(runNameStatus("M\tsrc/lib/auth.ts\n")).not.toBe(0);
  });

  // Adding an app-plane file must be allowed
  it("allows adding an app-plane file (A status, not control-plane)", () => {
    expect(runNameStatus("A\tsrc/app/api/changelog/feed/route.ts\n")).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/check-migrations.sh");

function runGuard(filePath: string): { status: number; output: string } {
  try {
    const output = execSync(`bash "${SCRIPT}" --scan-file "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, output };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, output: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

describe("migration guard (check-migrations.sh)", () => {
  it("exits non-zero for a migration containing DROP TABLE", () => {
    const dir = mkdtempSync(join(tmpdir(), "forge-mg-test-"));
    const file = join(dir, "0000_test.sql");
    try {
      writeFileSync(file, 'DROP TABLE "user";\n');
      const { status } = runGuard(file);
      expect(status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits zero for a migration containing only additive SQL", () => {
    const dir = mkdtempSync(join(tmpdir(), "forge-mg-test-"));
    const file = join(dir, "0001_test.sql");
    try {
      writeFileSync(file, 'ALTER TABLE "x" ADD COLUMN "y" text;\n');
      const { status } = runGuard(file);
      expect(status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits non-zero for a migration containing TRUNCATE TABLE (I2)", () => {
    const dir = mkdtempSync(join(tmpdir(), "forge-mg-test-"));
    const file = join(dir, "0002_test.sql");
    try {
      writeFileSync(file, 'TRUNCATE TABLE "user";\n');
      const { status } = runGuard(file);
      expect(status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

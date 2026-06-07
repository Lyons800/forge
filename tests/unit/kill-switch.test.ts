import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("isEngineEnabled — kill switch", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.ENGINE_ENABLED;
  });

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.ENGINE_ENABLED;
    } else {
      process.env.ENGINE_ENABLED = saved;
    }
  });

  it('returns true when ENGINE_ENABLED is exactly "true"', async () => {
    process.env.ENGINE_ENABLED = "true";
    const { isEngineEnabled } = await import("@/lib/engine/kill-switch");
    expect(isEngineEnabled()).toBe(true);
  });

  it('returns false when ENGINE_ENABLED is "false"', async () => {
    process.env.ENGINE_ENABLED = "false";
    const { isEngineEnabled } = await import("@/lib/engine/kill-switch");
    expect(isEngineEnabled()).toBe(false);
  });

  it("returns false when ENGINE_ENABLED is unset", async () => {
    delete process.env.ENGINE_ENABLED;
    const { isEngineEnabled } = await import("@/lib/engine/kill-switch");
    expect(isEngineEnabled()).toBe(false);
  });

  it('returns false when ENGINE_ENABLED is "TRUE" (strict case-sensitive match)', async () => {
    process.env.ENGINE_ENABLED = "TRUE";
    const { isEngineEnabled } = await import("@/lib/engine/kill-switch");
    expect(isEngineEnabled()).toBe(false);
  });
});

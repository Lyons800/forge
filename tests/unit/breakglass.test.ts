import { describe, it, expect, beforeEach } from "vitest";
import { isBreakGlass } from "@/lib/auth-admin";

describe("break-glass", () => {
  beforeEach(() => {
    process.env.BREAK_GLASS_TOKEN = "secret-xyz";
  });

  it("grants only when the token matches the env secret", () => {
    expect(isBreakGlass("secret-xyz")).toBe(true);
    expect(isBreakGlass("wrong")).toBe(false);
    expect(isBreakGlass(undefined)).toBe(false);
  });
});

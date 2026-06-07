import { describe, it, expect } from "vitest";
import { stripSensitiveParams } from "@/lib/posthog";

describe("stripSensitiveParams", () => {
  it("removes the token param from a query string", () => {
    const result = stripSensitiveParams("token=abc123&foo=bar");
    expect(result).not.toContain("token");
    expect(result).toContain("foo=bar");
  });

  it("removes token when query string starts with ?", () => {
    const result = stripSensitiveParams("?token=secret&page=1");
    expect(result).not.toContain("token");
    expect(result).toContain("page=1");
  });

  it("preserves non-sensitive params intact", () => {
    const result = stripSensitiveParams("foo=bar&baz=qux");
    expect(result).toContain("foo=bar");
    expect(result).toContain("baz=qux");
  });

  it("returns empty string for empty input", () => {
    expect(stripSensitiveParams("")).toBe("");
    expect(stripSensitiveParams("?")).toBe("");
  });

  it("returns empty string when only token remains", () => {
    const result = stripSensitiveParams("token=onlyparam");
    expect(result).toBe("");
  });

  it("handles a token-only param with ? prefix", () => {
    const result = stripSensitiveParams("?token=xyz");
    expect(result).toBe("");
  });
});

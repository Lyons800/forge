import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";
describe("health", () => {
  it("returns ok status and a timestamp", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
  });
});

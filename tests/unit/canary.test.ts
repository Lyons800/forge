import { describe, it, expect } from "vitest";
import { shouldRollback } from "@/lib/canary";
describe("shouldRollback", () => {
  it("rolls back when canary error-rate exceeds baseline by the threshold, sustained", () => {
    expect(shouldRollback({ baseline: 0.01, canary: 0.05, samples: 200 })).toBe(true);
  });
  it("does not roll back on small samples (avoids flapping)", () => {
    expect(shouldRollback({ baseline: 0.01, canary: 0.05, samples: 5 })).toBe(false);
  });
  it("does not roll back when canary is within noise of baseline", () => {
    expect(shouldRollback({ baseline: 0.02, canary: 0.025, samples: 500 })).toBe(false);
  });
});

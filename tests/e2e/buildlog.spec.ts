import { test, expect } from "@playwright/test";

test.describe("public build log", () => {
  test("anonymous visit to /changelog shows Build Log heading", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.getByRole("heading", { name: /build.?log/i })).toBeVisible({
      timeout: 10000,
    });
  });
});

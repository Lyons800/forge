import { test, expect } from "@playwright/test";
test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
test("health endpoint is ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).status).toBe("ok");
});

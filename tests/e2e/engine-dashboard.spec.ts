import { test, expect } from "@playwright/test";

test.describe("engine dashboard", () => {
  test('anonymous visit to /engine shows "Engine" heading and cap indicator', async ({
    page,
  }) => {
    await page.goto("/engine");

    // Must show an Engine heading (h1 level)
    await expect(page.getByRole("heading", { name: /engine/i, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // Must show the weekly ship cap indicator
    await expect(page.getByTestId("cap-indicator")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("cap-indicator")).toContainText(/this week/i);
  });
});

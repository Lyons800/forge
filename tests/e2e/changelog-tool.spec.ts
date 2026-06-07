import { test, expect } from "@playwright/test";

test.describe("changelog tool", () => {
  test("sign up, add entry, see it in preview", async ({ page }) => {
    const unique = `cl-${Date.now()}@forge.local`;

    // Sign up first
    await page.goto("/sign-in");
    await page.getByTestId("name-input").fill("Changelog User");
    await page.getByTestId("email-input").fill(unique);
    await page.getByTestId("password-input").fill("Password1234!");
    await page.getByTestId("signup-button").click();
    await expect(page.getByTestId("signed-in-message")).toBeVisible({ timeout: 10000 });

    // Navigate to changelog tool
    await page.goto("/tools/changelog");
    await expect(page.getByTestId("changelog-title")).toBeVisible();

    // Fill in form and save
    await page.getByTestId("changelog-title").fill("Shipped dark mode");
    await page.getByTestId("changelog-body").fill("Dark mode is now available for all users.");
    await page.getByTestId("changelog-save").click();

    // Should appear in the preview
    await expect(page.getByTestId("changelog-preview")).toContainText("### Shipped dark mode", {
      timeout: 10000,
    });
  });
});

import { test, expect } from "@playwright/test";

test.describe("auth flow", () => {
  test("sign up → see 'Signed in'", async ({ page }) => {
    const unique = `test-${Date.now()}@forge.local`;

    await page.goto("/sign-in");
    await page.getByTestId("name-input").fill("Test User");
    await page.getByTestId("email-input").fill(unique);
    await page.getByTestId("password-input").fill("Password1234!");
    await page.getByTestId("signup-button").click();

    await expect(page.getByTestId("signed-in-message")).toBeVisible({
      timeout: 10000,
    });
  });
});

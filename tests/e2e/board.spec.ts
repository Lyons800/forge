import { test, expect } from "@playwright/test";

test.describe("improvement board", () => {
  test("submit a clean idea and see it appear in the pending list", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board-title")).toBeVisible({ timeout: 10000 });

    const ideaTitle = `Add CSV export ${Date.now()}`;
    await page.getByTestId("board-title").fill(ideaTitle);
    await page.getByTestId("board-body").fill("It would be great to export data as CSV.");
    await page.getByTestId("board-submit").click();

    // The success message should appear
    await expect(page.getByTestId("submit-success")).toBeVisible({ timeout: 10000 });

    // The idea should appear in the list
    await expect(page.getByTestId("board-list")).toContainText(ideaTitle, {
      timeout: 10000,
    });
  });
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("token", "kbd-token"));
});

test("sign-in works from the keyboard alone", async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => localStorage.removeItem("token"));
  await page.goto("/signin");
  await expect(page.getByLabel("Access token")).toBeFocused(); // autofocus
  await page.keyboard.type("kbd-token");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();
});

test("bulk replay is possible without a mouse, with a visible focus ring", async ({ page }) => {
  await page.goto("/jobs?status=dead");
  const rowBox = page.getByRole("checkbox", { name: /^Select job_/ }).first();
  await expect(rowBox).toBeVisible();

  // Tab until the first row checkbox is focused, proving it is reachable in order.
  for (let i = 0; i < 40 && !(await rowBox.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(rowBox).toBeFocused();
  const outline = await rowBox.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");

  await page.keyboard.press("Space");
  await expect(rowBox).toBeChecked();

  const bulkButton = page.getByRole("button", { name: "Replay 1 dead job" });
  await bulkButton.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Replay 1" })).toBeFocused();
  await page.keyboard.press("Tab"); // wraps inside the dialog
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(bulkButton).toBeFocused();

  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Replay 1" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText(/Replayed 1 of 1/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
});

test("sorting, paging and the theme toggle are keyboard operable", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page.getByText(/Showing 1–25/)).toBeVisible();

  await page.getByRole("button", { name: "Attempts" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: /attempts/i })).toHaveAttribute(
    "aria-sort",
    "descending",
  );

  await page.getByRole("button", { name: /next/i }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Showing 26–50/)).toBeVisible();

  await page.getByRole("button", { name: "Dark mode" }).focus();
  const before = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(!before);
});

test("the skip link jumps past the navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

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

test("a whole session works with the keyboard only: queues, filters, detail, retry, copy, sign out", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();

  // Queues: follow a count link.
  const failedLink = page.getByRole("link", { name: /failed jobs in email/ });
  await failedLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/queue=email&status=failed/);
  await expect(page.getByText(/Showing 1/)).toBeVisible();

  // Filters: toggle a status with Space, change the queue with the keyboard.
  const pending = page.getByRole("checkbox", { name: "Pending", exact: true });
  await pending.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/status=pending&status=failed/);
  const queue = page.getByLabel("Queue");
  await queue.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/queue=exports/);
  await page.getByRole("button", { name: "Clear filters" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).not.toHaveURL(/queue=/);

  // Search with the keyboard.
  await page.getByRole("searchbox").focus();
  await page.keyboard.type("job_01J");
  await expect(page).toHaveURL(/q=job_01J/);
  await page.getByRole("searchbox").fill("");
  await expect(page).not.toHaveURL(/q=/);

  // Open a failed job and retry it.
  await page.goto("/jobs?status=failed");
  const firstLink = page.getByRole("table").getByRole("link").first();
  const id = (await firstLink.textContent()) ?? "";
  await firstLink.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: id })).toBeVisible();

  // Copy payload.
  await page.getByRole("button", { name: "Copy payload" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /copied/i })).toBeVisible();

  // Retry.
  await page.getByRole("button", { name: `Retry ${id}` }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();

  // Back link, then sign out.
  await page.getByRole("link", { name: /back to jobs/i }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/jobs\?status=failed/);
  await page.getByRole("button", { name: "Sign out" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Access token")).toBeVisible();
});

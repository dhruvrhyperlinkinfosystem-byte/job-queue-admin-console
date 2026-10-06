import { expect, test } from "@playwright/test";

test("sign in, filter to dead jobs, open one, replay it and see it pending", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Access token").fill("e2e-token");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();

  await page.getByRole("link", { name: "Jobs", exact: true }).click();
  await page.getByRole("checkbox", { name: "Dead", exact: true }).click();
  await expect(page).toHaveURL(/status=dead/);
  const statuses = page.getByRole("table").getByRole("row").filter({ hasText: /job_/ });
  await expect(statuses.first()).toContainText("Dead");
  await expect(
    page.getByRole("table").getByText(/^(Pending|Failed|Running|Succeeded)$/),
  ).toHaveCount(0);

  const firstId = (await page.getByRole("table").getByRole("link").first().textContent()) ?? "";
  await page.getByRole("link", { name: firstId }).click();
  await expect(page.getByRole("heading", { level: 1, name: firstId })).toBeVisible();
  await expect(page.getByText("Dead", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Replay ${firstId}` }).click();

  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await expect(page.getByText(/^0 of \d+$/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Replay / })).toHaveCount(0);

  // The change survives a reload of the app (mock state persists for the session).
  await page.reload();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("token", "idle-token"));
});

/** Simulates what browsers do to idle tabs: stop the service worker that serves the mock API. */
async function stopServiceWorkers(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("ServiceWorker.enable");
  await session.send("ServiceWorker.stopAllWorkers");
}

test("keeps working after the mock service worker was stopped while the tab was idle", async ({
  page,
}) => {
  await page.goto("/jobs");
  await expect(page.getByText(/Showing 1–25 of 250/)).toBeVisible();

  await stopServiceWorkers(page);
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText(/Showing 26–50 of 250/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("re-attaches the worker when the tab becomes visible again", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "email" })).toBeVisible();

  await stopServiceWorkers(page);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  // The check ran before any user action: the very next call is served by the mock again.
  const status = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const res = await fetch("/api/v1/__mock/ping", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok === true) return res.status;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return 0;
  });
  expect(status).toBe(200);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark";

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map(
        (n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`,
      ),
    }));
}

for (const theme of ["light", "dark"] as const satisfies Theme[]) {
  test.describe(`axe, ${theme} theme`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    });

    test("sign-in", async ({ page }) => {
      await page.goto("/signin");
      await expect(page.getByLabel("Access token")).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test("sign-in with validation error and expiry notice", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Access token").fill("expired");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert")).toContainText("session has expired");
      await page.getByLabel("Access token").fill("   ");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Enter an access token.")).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test.describe("signed in", () => {
      test.beforeEach(async ({ context }) => {
        await context.addInitScript(() => localStorage.setItem("token", "axe-token"));
      });

      test("queues", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("region", { name: "email" })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("jobs list", async ({ page }) => {
        await page.goto("/jobs");
        await expect(page.getByText(/Showing 1–25/)).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("jobs list with a selection and the bulk dialog", async ({ page }) => {
        await page.goto("/jobs?status=dead");
        await page
          .getByRole("checkbox", { name: /^Select job_/ })
          .first()
          .check();
        await page.getByRole("button", { name: /^Replay 1 dead job/ }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("jobs list empty and error states", async ({ page }) => {
        await page.goto("/jobs?q=zzzz");
        await expect(page.getByRole("heading", { name: /no jobs match/i })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
        await page.goto("/jobs?mock=errors");
        await expect(page.getByRole("alert")).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("sign-out confirmation dialog", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "Queues" })).toBeVisible();
        await page.getByRole("button", { name: "Sign out" }).click();
        await expect(page.getByRole("dialog", { name: "Sign out?" })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("toasts after an action and after signing out", async ({ page }) => {
        await page.goto("/jobs?status=failed");
        await page
          .getByRole("button", { name: /^Retry job_/ })
          .first()
          .click();
        await expect(page.getByText(/is pending again/)).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
        await page.getByRole("button", { name: "Sign out" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
        await expect(page.getByText("You have been signed out.")).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("mock mode banner", async ({ page }) => {
        await page.goto("/jobs?mock=flaky");
        await expect(page.getByText(/Mock mode/)).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("job detail", async ({ page }) => {
        await page.goto("/jobs?status=dead");
        await page.getByRole("table").getByRole("link").first().click();
        await expect(page.getByRole("heading", { name: "Payload" })).toBeVisible();
        await expect(page.getByRole("table", { name: /attempts/i })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });

      test("job not found and page not found", async ({ page }) => {
        await page.goto("/jobs/job_missing");
        await expect(page.getByRole("heading", { name: "Job not found" })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
        await page.goto("/nowhere");
        await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
        expect(await seriousViolations(page)).toEqual([]);
      });
    });
  });
}

// Records a silent, captioned run-through of the app to ./walkthrough/*.webm.
// Use it as a script or reference for the narrated 5-10 minute walkthrough.
// Requires a production build: `npm run build && npm run walkthrough`.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { chromium } from "@playwright/test";

const PORT = 4176;
const ORIGIN = `http://localhost:${PORT}`;
const OUT = "walkthrough";

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
});

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("preview server did not start");
}

async function caption(page, text) {
  await page.evaluate((value) => {
    let el = document.getElementById("__caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "__caption";
      el.style.cssText =
        "position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:99999;" +
        "background:#111;color:#fff;padding:6px 14px;border-radius:999px;font:600 14px sans-serif;" +
        "pointer-events:none;box-shadow:0 2px 8px #0006;max-width:90vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = value;
  }, text);
}

const pause = (page, ms = 1500) => page.waitForTimeout(ms);

async function step(page, text, action, ms = 1500) {
  await caption(page, text).catch(() => {});
  await action?.();
  await caption(page, text).catch(() => {});
  await pause(page, ms);
}

async function signIn(page, token = "walkthrough") {
  await page.getByLabel("Access token").fill(token);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function main() {
  await waitForServer();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${ORIGIN}/`);
    await step(page, "1. Sign-in: validation", async () => {
      await page.getByRole("button", { name: "Sign in" }).click();
    });
    await step(page, "Signing in with any token", () => signIn(page));

    await page.getByRole("heading", { name: "Queues" }).waitFor();
    await step(page, "2. Queues overview: select a count to open the filtered list");
    await page.getByRole("link", { name: /dead jobs in email/ }).click();
    await page.getByText(/Showing 1/).waitFor();
    await step(page, "3. Jobs list, filtered by queue and status (see the URL state)");

    await step(page, "Multi-select status filter", async () => {
      await page.getByRole("checkbox", { name: "Failed", exact: true }).click();
    });
    await step(page, "Sort by attempts", async () => {
      await page.getByRole("button", { name: "Attempts" }).click();
    });
    await step(
      page,
      "Search by ID prefix",
      async () => {
        await page.getByRole("searchbox").fill("job_01J9");
      },
      2200,
    );
    await step(page, "Clear filters, then page through results", async () => {
      await page.getByRole("button", { name: "Clear filters" }).first().click();
      await page.getByText("Showing 1–25 of 250").waitFor();
      await page.getByRole("button", { name: "Next" }).click();
    });
    await page.getByRole("button", { name: "Previous" }).click();

    await page.goto(`${ORIGIN}/jobs?status=dead`);
    await page.getByText(/Showing 1/).waitFor();
    await step(page, "Bulk replay: select dead jobs", async () => {
      const boxes = page.getByRole("checkbox", { name: /^Select job_/ });
      await boxes.nth(0).click();
      await boxes.nth(1).click();
    });
    await step(
      page,
      "Confirmation dialog states the count",
      async () => {
        await page.getByRole("button", { name: /^Replay 2 dead jobs/ }).click();
      },
      2200,
    );
    await step(
      page,
      "Per-job results",
      async () => {
        await page.getByRole("dialog").getByRole("button", { name: "Replay 2" }).click();
        await page.getByText(/Replayed 2 of 2/).waitFor();
      },
      2000,
    );
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

    await page.getByRole("table").getByRole("link").first().click();
    await page.getByRole("heading", { name: "Payload" }).waitFor();
    await step(page, "4. Job detail: status, attempts history, payload", null, 2500);
    await step(page, "Copy payload", async () => {
      await page.getByRole("button", { name: "Copy payload" }).click();
    });

    await step(page, "Unknown job: not-found state", async () => {
      await page.goto(`${ORIGIN}/jobs/job_unknown`);
      await page.getByRole("heading", { name: "Job not found" }).waitFor();
    });

    await page.goto(`${ORIGIN}/jobs?status=failed`);
    await page.getByText(/Showing 1/).waitFor();
    await step(
      page,
      "5. Retry a failed job (confirmed update)",
      async () => {
        await page
          .getByRole("button", { name: /^Retry job_/ })
          .first()
          .click();
      },
      2200,
    );

    await step(
      page,
      "7. Dark mode",
      async () => {
        await page.getByRole("button", { name: "Dark mode" }).click();
      },
      2200,
    );
    await step(
      page,
      "8. Responsive: 375 px wide, table scrolls inside its container",
      async () => {
        await page.setViewportSize({ width: 375, height: 720 });
      },
      2500,
    );
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto(`${ORIGIN}/?mock=slow`);
    await step(page, "Mock mode: slow (2 s latency, skeletons)", null, 3200);

    await page.goto(`${ORIGIN}/jobs?mock=errors`);
    await page.getByRole("alert").waitFor();
    await step(page, "Mock mode: errors (message + retry control)", null, 2200);
    await step(
      page,
      "Retry still fails: every call returns 500",
      async () => {
        await page.getByRole("button", { name: "Try again" }).click();
      },
      2000,
    );

    await page.goto(`${ORIGIN}/?mock=flaky`);
    await step(
      page,
      "Mock mode: flaky (30% 500, 5% 429): retry until it loads",
      async () => {
        for (let i = 0; i < 4; i++) {
          const retry = page.getByRole("button", { name: /Try again|Retry now/ });
          if (await retry.isVisible().catch(() => false)) await retry.click();
          await pause(page, 900);
        }
      },
      1500,
    );

    await page.goto(`${ORIGIN}/?mock=normal`);
    await step(
      page,
      "Expired token: any call returns 401, user is signed out with a message",
      async () => {
        await page.getByRole("button", { name: "Sign out" }).click();
        await signIn(page, "expired");
        await page.getByRole("alert").waitFor();
      },
      3000,
    );
  } finally {
    await context.close();
    await browser.close();
    server.kill();
  }

  const file = readdirSync(OUT).find((name) => name.endsWith(".webm"));
  if (file) renameSync(`${OUT}/${file}`, `${OUT}/walkthrough.webm`);
  console.log(`Saved ${OUT}/walkthrough.webm`);
}

main().catch((error) => {
  server.kill();
  console.error(error);
  process.exit(1);
});

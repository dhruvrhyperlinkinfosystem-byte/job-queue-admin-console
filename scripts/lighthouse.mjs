// Runs Lighthouse (accessibility) on the jobs list and job detail screens, light and dark,
// desktop and mobile. Requires a production build: `npm run build && npm run lighthouse`.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import lighthouse from "lighthouse";
import { chromium } from "@playwright/test";

const PORT = 4175;
const DEBUG_PORT = 9333;
const ORIGIN = `http://localhost:${PORT}`;
const THRESHOLD = 90;

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

const DESKTOP = {
  formFactor: "desktop",
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

async function main() {
  await waitForServer();
  // A persistent context is the browser's default profile, which Lighthouse shares over CDP.
  const browser = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "lh-")), {
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });
  const page = browser.pages()[0] ?? (await browser.newPage());
  const results = [];

  try {
    await page.goto(`${ORIGIN}/signin`);
    await page.evaluate(() => localStorage.setItem("token", "lighthouse"));
    await page.goto(`${ORIGIN}/jobs?status=dead`);
    await page.getByRole("table").getByRole("link").first().waitFor();
    const jobId = await page.getByRole("table").getByRole("link").first().textContent();

    const screens = [
      { name: "list", path: "/jobs?status=dead" },
      { name: "detail", path: `/jobs/${jobId}` },
    ];

    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => localStorage.setItem("theme", value), theme);
      for (const form of ["desktop", "mobile"]) {
        for (const screen of screens) {
          const run = await lighthouse(
            `${ORIGIN}${screen.path}`,
            {
              port: DEBUG_PORT,
              output: "json",
              logLevel: "error",
              onlyCategories: ["accessibility"],
            },
            {
              extends: "lighthouse:default",
              settings: { disableStorageReset: true, ...(form === "desktop" ? DESKTOP : {}) },
            },
          );
          const lhr = run.lhr;
          const failing = Object.values(lhr.audits)
            .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
            .map((a) => a.id);
          const finalPath = new URL(lhr.finalDisplayedUrl).pathname;
          if (finalPath === "/signin") throw new Error(`${screen.name}: redirected to sign-in`);
          results.push({
            path: finalPath,
            theme,
            form,
            screen: screen.name,
            score: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
            failing,
          });
        }
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.table(
    results.map(({ failing, ...row }) => ({ ...row, failing: failing.join(", ") || "-" })),
  );
  const below = results.filter((r) => r.score < THRESHOLD);
  if (below.length > 0) {
    console.error(`Accessibility score below ${THRESHOLD} for ${below.length} run(s).`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  server.kill();
  console.error(error);
  process.exit(1);
});

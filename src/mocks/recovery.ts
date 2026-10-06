import { worker } from "./browser";
import { PING_PATH } from "./handlers";

/**
 * Browsers stop idle service workers (background tabs, sleep). When one wakes up, MSW no longer
 * knows this page, so requests fall through to the real server and come back as 404. Detect that
 * and re-attach the worker instead of showing an error until the user refreshes.
 */
async function workerIsAnswering(): Promise<boolean> {
  try {
    const response = await fetch(PING_PATH, { cache: "no-store" });
    // A static host may answer unknown URLs with index.html and a 200, so check the body.
    const body: unknown = await response.json();
    return (
      response.ok && typeof body === "object" && body !== null && "ok" in body && body.ok === true
    );
  } catch {
    return false;
  }
}

let restarting: Promise<boolean> | null = null;

/** Resolves true if the worker was dead and has been restarted. */
export function restartMockWorkerIfNeeded(): Promise<boolean> {
  restarting ??= (async () => {
    if (await workerIsAnswering()) return false;
    await worker.stop();
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
    return true;
  })().finally(() => {
    restarting = null;
  });
  return restarting;
}

/** Checks the worker whenever the tab comes back, which is when it is most likely to be stale. */
export function watchMockWorker(): void {
  const check = () => {
    if (document.visibilityState === "visible") void restartMockWorkerIfNeeded();
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
}

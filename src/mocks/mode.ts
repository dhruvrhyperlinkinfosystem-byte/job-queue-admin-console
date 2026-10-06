export type MockMode = "normal" | "slow" | "errors" | "flaky";

const MODES: readonly MockMode[] = ["normal", "slow", "errors", "flaky"];
const STORAGE_KEY = "mock-mode";

/** Tunable so tests don't wait two real seconds or depend on Math.random. */
export const mockConfig = {
  slowMs: 2000,
  retryAfterSeconds: 2,
  random: (): number => Math.random(),
};

function isMockMode(value: string | null): value is MockMode {
  return MODES.some((mode) => mode === value);
}

/**
 * `?mock=slow|errors|flaky|normal` selects the mode. The choice is kept in sessionStorage so it
 * survives in-app navigation that drops the query string; `?mock=normal` clears it.
 */
export function getMockMode(): MockMode {
  const fromUrl = new URLSearchParams(window.location.search).get("mock");
  try {
    if (isMockMode(fromUrl)) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isMockMode(stored)) return stored;
  } catch {
    if (isMockMode(fromUrl)) return fromUrl;
  }
  return "normal";
}

export function resetMockMode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

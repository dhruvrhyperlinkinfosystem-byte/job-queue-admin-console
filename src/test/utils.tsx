import { render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { http, HttpResponse } from "msw";
import App from "../App";
import type { ApiErrorBody, Job, JobStatus } from "../api/types";
import { createSeedJobs } from "../mocks/seed";
import { server } from "../mocks/server";

export const seed: Job[] = createSeedJobs();

export function seedWhere(predicate: (job: Job) => boolean): Job[] {
  return seed.filter(predicate);
}

/** Renders the whole app at a real URL so tests can assert on window.location. */
export function renderAt(path: string) {
  window.history.pushState(null, "", path);
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

export function tableRows(): HTMLElement[] {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

export function rowIds(): string[] {
  return tableRows().map((row) => within(row).getByRole("link").textContent ?? "");
}

export function attemptCounts(): number[] {
  return tableRows().map((row) =>
    Number((within(row).getByText(/^\d+ \/ \d+$/).textContent ?? "").split(" / ")[0]),
  );
}

export function errorBody(code: string, message: string): ApiErrorBody {
  return { error: { code, message } };
}

/** Answers the next call to `path` with an error, then falls through to the default mock. */
export function failOnce(
  method: "get" | "post",
  path: string,
  status: number,
  headers?: Record<string, string>,
) {
  server.use(
    http[method](
      path,
      () => HttpResponse.json(errorBody("injected", `Injected ${status}`), { status, headers }),
      { once: true },
    ),
  );
}

export function stubMatchMedia(prefersDark: boolean) {
  let matches = prefersDark;
  const listeners = new Set<() => void>();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        media: query,
        get matches() {
          return matches;
        },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  });
  return {
    setPrefersDark(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

export const STATUSES_ON_PAGE = (status: JobStatus, pageSize = 25) =>
  Math.min(pageSize, seedWhere((job) => job.status === status).length);

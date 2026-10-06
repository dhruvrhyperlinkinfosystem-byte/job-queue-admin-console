# Job Queue Admin Console

A React admin console for a fictional job-queue service, built against a mocked API (MSW).
Four screens: sign-in, queues overview, jobs list and job detail, with retry, replay and bulk replay.

- **Stack:** TypeScript 6 (strict), React 19, Vite 8, React Router 7 (declarative), Zustand 5,
  Tailwind 3.4, MSW, Vitest + React Testing Library, Playwright.
- **No backend.** The API is served by MSW inside the page, including in the production build.

## Contents

1. [Setup](#setup)
2. [Mock modes and tokens](#mock-modes-and-tokens)
3. [Stack notes and extra dependencies](#stack-notes-and-extra-dependencies)
4. [Folder structure](#folder-structure)
5. [State and data flow](#state-and-data-flow)
6. [Optimistic versus confirmed updates](#optimistic-versus-confirmed-updates)
7. [Failure handling](#failure-handling)
8. [Accessibility and responsiveness](#accessibility-and-responsiveness)
9. [Testing and quality results](#testing-and-quality-results)
10. [Trade-offs and assumptions](#trade-offs-and-assumptions)
11. [Changes from the spec](#changes-from-the-spec)
12. [What I would do with more time](#what-i-would-do-with-more-time)
13. [Other deliverables](#other-deliverables)

## Setup

Requires Node 24 (`.nvmrc`, `engines`) and npm.

```bash
npm ci
npm run dev          # http://localhost:5173
```

| Script                 | What it does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                        |
| `npm run build`        | `tsc -b` then a static Vite build into `dist/`                         |
| `npm run preview`      | Serve the production build                                             |
| `npm run typecheck`    | `tsc -b`                                                               |
| `npm run lint`         | ESLint, zero warnings allowed                                          |
| `npm run format:check` | Prettier check (`npm run format` to fix)                               |
| `npm test`             | Vitest (jsdom) component and API tests                                 |
| `npm run e2e`          | Playwright: replay flow, axe on every screen, keyboard-only flows      |
| `npm run lighthouse`   | Lighthouse accessibility on list and detail, both themes (needs build) |
| `npm run walkthrough`  | Records a silent, captioned run-through video (see below)              |

First run of the e2e tests needs a browser: `npx playwright install chromium`.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests and build on every push,
and the Playwright suite as a second job.

## Mock modes and tokens

**Token.** Any non-empty token signs in. The literal token `expired` gets a 401 on every call,
which signs you out with a message.

**Mock mode.** Add `?mock=<mode>` to any URL:

| Mode     | Behaviour                                                 |
| -------- | --------------------------------------------------------- |
| `normal` | Default                                                   |
| `slow`   | 2 s latency on every call                                 |
| `errors` | Every call returns 500                                    |
| `flaky`  | 30% of calls return 500, 5% return 429 (`Retry-After: 2`) |

```text
http://localhost:5173/?mock=slow
http://localhost:5173/jobs?status=dead&mock=flaky
```

The mode is remembered for the browser tab (`sessionStorage`), because navigating inside the app
drops the query string. `?mock=normal` switches back. Auth is checked before failure injection,
so the `expired` token still gets 401 in `errors` mode.

Because the mode sticks to the tab, a banner under the header shows whenever it is not `normal`,
with a "Switch back to normal" link, so a plain URL after `?mock=errors` is not mistaken for a
broken app. Changing the mode refetches the data on screen.

**Session state.** Retries and replays persist for the session: reload the list and a replayed job
stays `pending`. MSW runs in the page, so state would be lost on reload; it is mirrored to
`sessionStorage` (one tab = one session). Open a new tab or clear site data to reset to the seed.

**Seed data.** 250 jobs across `email`, `exports`, `webhooks` and `billing`, generated with a seeded
PRNG so tests and screenshots are stable. Attempt history is derived from each job's state.

## Stack notes and extra dependencies

Versions that differ from what `npm install` would pick today, because the spec names them:

- `typescript` is pinned to **6.0.x** (npm's latest is 7).
- `react-router` is **7.x** (latest is 8), used declaratively: `<BrowserRouter>` and `<Routes>`.
- `tailwind-merge` is **2.x**, since v3 targets Tailwind 4. It is `tailwindcss@3.4`.

Dependencies beyond the spec's list, with a one-line reason each. None is a UI or data library.

| Package                                                    | Why                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| `postcss`, `autoprefixer`                                  | Required by Tailwind 3                                          |
| `jsdom`                                                    | Vitest's DOM environment                                        |
| `@testing-library/user-event`, `@testing-library/jest-dom` | Realistic user input and readable DOM assertions                |
| `@axe-core/playwright`                                     | Runs axe in a real browser (jsdom cannot check colour contrast) |
| `lighthouse`                                               | Produces the Lighthouse accessibility scores the spec asks for  |
| `eslint-plugin-react-refresh`, `globals`                   | Lint rule and globals for the flat config                       |
| `@types/*`                                                 | Type definitions                                                |

Runtime dependencies are only `react`, `react-dom`, `react-router`, `zustand`, `lucide-react`,
`clsx` and `tailwind-merge`. MSW is a dev dependency in `package.json`, but because the mock API
is the only API it is bundled and started in production builds too (about 160 kB gzipped,
loaded as a separate chunk).

## Folder structure

```text
src/
  api/        Types, ApiError, fetch wrapper and one function per endpoint. No React.
  mocks/      The fake backend: seed, session db, query parsing, mock modes, MSW handlers.
  stores/     Zustand stores: auth, theme, toasts, row selection.
  hooks/      useApiQuery (data fetching), useTheme, useCountdown, useDocumentTitle.
  components/ Shared UI: Button, StatusBadge, Dialog, ErrorState, EmptyState, Skeleton, toasts.
  features/jobs/  Jobs-specific pieces: URL state, filters, table, pagination, actions, bulk dialog.
  pages/      One component per route, composing the above.
  app/        Layout, route guard, and the wiring that connects the API client to the auth store.
  lib/        Small pure helpers (class names, formatting, storage, validation).
  test/       Test setup and helpers.
e2e/          Playwright specs.
scripts/      Lighthouse and walkthrough scripts.
```

Separation: `api/` knows nothing about React or stores. `pages/` and `features/` own the view.
The only bridge is `app/wireApi.ts`, which gives the client a token getter and an `onUnauthorized`
callback. The largest source file is about 220 lines.

## State and data flow

- **Server data** is loaded by `useApiQuery(fetcher, key)`, a small hand-written hook. It refetches
  when `key` changes, keeps the previous data on screen (dimmed) while the next page loads, aborts
  superseded requests, and exposes `reload`.
- **URL is the source of truth for the jobs list.** `features/jobs/listParams.ts` parses and writes
  filters, sort, page and page size. Defaults are omitted, status order is canonical (one URL per
  view), unrelated params such as `mock` are preserved, and junk values fall back to defaults.
  Filter changes push history entries (so Back works) and reset to page 1. Typing in search is
  debounced and replaces the entry instead.
- **Zustand stores** hold only client state:
  - `authStore`: token (persisted in `localStorage`) and a one-off sign-out notice.
  - `themeStore`: `system | light | dark`, stored as a plain string so `index.html` can apply it
    before first paint (no flash).
  - `selectionStore`: ticked job ids. Selection counts only dead jobs on the current page, and is
    cleared when the view changes.
  - `toastStore`: notifications.

## Optimistic versus confirmed updates

**I chose confirmed updates.** The UI changes only after the server answers; the button shows a
spinner meanwhile, then the screen reloads from the server.

Why:

1. **Actions can legitimately be refused.** A 409 means the job moved on (someone else replayed
   it). An optimistic flip to `pending` would be wrong and have to be undone, which is more
   confusing than a short wait.
2. **The failure modes are part of the product.** `flaky` and `errors` make rollbacks frequent.
   Visible state that flickers back is worse than a spinner.
3. **Replay has side effects the client cannot predict**: attempts reset to 0, the error is
   cleared, and the job may leave the current filter. Reloading shows what the server really did.
4. **Bulk replay is partial by design.** Per-job outcomes only exist once the server replies.
5. **These are rare, deliberate admin actions**, not high-frequency interactions, so the latency
   cost is small.

Cost: a little perceived latency, and an extra list request after each action. If it mattered, I
would add an optimistic row state ("replaying…") for the single-job case while keeping the
server's answer authoritative.

A 409 or 404 shows the server's message, then refreshes the affected view.

## Failure handling

- **401** (any call): the token is cleared, selection cleared, and the user is sent to sign-in with
  "Your session has expired". After signing in again they return to where they were.
- **429**: the data hook waits for `Retry-After`, then retries automatically, up to three times in a
  row, showing a countdown and a "Retry now" button. After that it falls back to a manual "Try
  again". Actions (retry/replay) are not auto-retried; the toast says how long to wait.
- **500 and network errors**: the message plus a "Try again" button, on every screen.
- **404**: unknown job id shows a not-found state; unknown route shows a page-not-found state.
- **409**: a clear message, then the job or list is refreshed.
- **400**: handled by the client types and validation; malformed filters in the URL fall back to
  defaults rather than erroring.
- **Bulk replay**: partial success is shown per job inside the dialog; a request-level failure
  appears in the dialog with a retry.
- **Empty states**: no queues, no jobs at all, no matches for the filters (with "Clear filters"),
  and a page past the end (with a way back).

## Accessibility and responsiveness

- Status is always an icon plus a word, never colour alone.
- Every action is reachable and operable by keyboard; visible focus ring everywhere; skip link.
- The dialog traps focus, closes on Escape, and returns focus to the control that opened it.
  Escape and backdrop clicks are blocked while a request is in flight.
- Tables have captions and header scope, sortable headers use `aria-sort`, loading regions and
  toasts use live regions, forms have labels and `aria-describedby` errors.
- Light/dark with the `class` strategy; defaults to the system preference, toggle in the header,
  choice remembered.
- Usable at 375 px. Wide tables scroll inside their own container; the page never scrolls
  sideways (checked in a real browser).

## Visual design

Plain Tailwind utilities, no component library. A small set of tokens keeps the screens consistent:

- **Surfaces:** one `.card` style (border, soft shadow) and one `.field` style for inputs,
  defined in `src/index.css`; slate neutrals and a single indigo accent in both themes.
- **Status colours** live in one place (`src/lib/statusStyles.ts`) and are always paired with an
  icon and a word. The queue proportion bars are decorative; the counts carry the information.
- **Queues:** totals strip across all queues, then one card per queue with a proportion bar.
- **Jobs:** filter panel with status pills, a table with an attempts meter, and a floating
  selection bar for bulk actions. **Detail:** header card, icon-labelled facts, error callout,
  attempts table with outcome icons, and a code-style payload block.
- **States:** icon-led empty and error cards, and a table-shaped skeleton so layout does not jump.
- `prefers-reduced-motion` is honoured. Every colour pair was re-checked with axe in both themes
  after the redesign, which caught and fixed a hover-contrast miss and invalid `<dl>` markup.

## Testing and quality results

All checks pass on a fresh clone after `npm ci` (run on Node 22, see caveats below).

| Check                                           | Result                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tsc -b`, no `any`, no unexplained `@ts-ignore` | pass                                                                                                   |
| ESLint (`--max-warnings 0`), Prettier           | pass                                                                                                   |
| Vitest                                          | 97 tests across 11 files                                                                               |
| Playwright                                      | 24 tests: replay flow, axe on every screen/state in both themes, keyboard-only flows                   |
| axe (critical + serious)                        | 0 violations on sign-in, queues, list, detail, bulk dialog, empty, error, not-found, in light and dark |
| Lighthouse accessibility                        | 100 on list and detail, light and dark, desktop and mobile                                             |

What the tests cover (user-visible behaviour, against the real MSW handlers):

- API client and mock API: filters, sorting, pagination, validation errors, retry/replay/409,
  partial bulk replay, 401 and expired token, every mock mode, network failure.
- List: loading, filtering, search, sorting, pagination, empty states, URL state (shared link,
  reload, back button, junk params).
- Actions: row actions, 409 refresh, 429 message, bulk replay with partial failure, dialog focus
  trap/Escape/focus return.
- Detail: all fields, attempts order, payload copy, not-found, replay/retry, attempts failing alone.
- Failures: 500 with recovery, network error, errors mode, 401 sign-out and return, 429 waiting
  for `Retry-After` (and giving up after three).
- Theme: system default, manual toggle, persistence, following system changes.
- Mock mode banner, and the clipboard fallback when the async Clipboard API is unavailable.

Two honest notes on the accessibility numbers: axe cannot check everything (it found the one real
issue, a low-contrast placeholder, which is fixed), and I did not do a screen-reader pass.
`npm run lighthouse` fails if it lands on the sign-in page, so a redirect cannot give a false 100.

## Trade-offs and assumptions

Where the spec was silent:

- **Page size** defaults to 25 (options 10/25/50/100); default sort is newest created first.
- **Bulk selection** applies to dead jobs only, capped at 50 (the API limit), cleared whenever the
  filters, sort or page change. Selecting past 50 explains why it stopped.
- **Queue counts** show pending, running, failed and dead, as in the API; `succeeded` has no count
  in `QueueSummary`, so it is not shown.
- **Retry** keeps the attempt count; **replay** resets it to 0 and clears `last_error`, per the spec.
- **Empty bulk body** (`ids: []`) returns 400 from the mock.
- **Flaky 429** uses `Retry-After: 2`.
- **Attempt history** is derived deterministically from the job rather than stored.
- **Time** is shown in the browser's locale and time zone, with the ISO value in `<time dateTime>`.
- **Token** is kept in `localStorage`. Fine for a demo; a real app would prefer an httpOnly cookie.
- **Session** is per tab (`sessionStorage`) for mock state and mock mode.

Trade-offs:

- Hand-written `useApiQuery` instead of a data library (required), so there is no shared cache:
  the jobs filters fetch `/queues` again to fill the queue select.
- The list is paginated server-side only; there is no live refresh or polling.
- MSW ships in the production bundle because it is the only backend.
- The e2e suite is Chromium only.

## Changes from the spec

Nothing was cut. Additions beyond the minimum: more than one Playwright test (axe and
keyboard-only specs on top of the required replay flow), and the extra CI job for e2e.

Verification caveats, stated plainly:

- Development and every run above happened on **Node 22.15**, not Node 24. `.nvmrc`, `engines` and
  CI target 24, but I did not run on 24 locally.
- Browser checks were done in **Chromium** only.
- I did not run a screen reader.

## What I would do with more time

- Run the full suite on Node 24 and in Firefox and WebKit; add a screen-reader pass.
- A shared query cache (still hand-written) so the queue list is not fetched twice, plus optional
  background refresh of counts and statuses.
- An optimistic "replaying…" row state for the single-job case (see above).
- Virtualise very long pages and add column visibility and saved filter views.
- Bulk retry for failed jobs, and chunked bulk replay beyond 50.
- Visual regression screenshots for the seeded data in both themes.
- Move the token to an httpOnly cookie in a real backend, and add request correlation ids to
  error toasts.
- Split `JobsPage` further (selection and bulk logic into a hook) as it grows.

## Other deliverables

- Hours log: [`docs/hours-log.md`](docs/hours-log.md) (a template; actual hours are filled in by the
  engineer).
- Progress note: [`docs/progress-note.md`](docs/progress-note.md).
- Walkthrough: `npm run walkthrough` records a silent, captioned run-through of every screen, dark
  mode, 375 px layout, the `slow`, `errors` and `flaky` modes and the `expired` token, to
  `walkthrough/`. The submitted 5 to 10 minute recording is made with narration by the engineer.

# Progress note

**Status:** all required screens and behaviour are built and tested; remaining work is the
narrated walkthrough recording, the hours log and the live walkthrough.

## Done

- Stack set up exactly as specified; typecheck, lint, format check, tests and build all green on a
  clean `npm ci`. CI config included.
- Mock API in MSW: 7 endpoints, 250 seeded jobs, session-persistent state, `expired` token, and
  the `normal`, `slow`, `errors` and `flaky` modes.
- Screens: sign-in, queues overview, jobs list (URL-backed filters, sort, pagination, selection),
  job detail (attempts, payload with copy), retry, replay and bulk replay with per-job results.
- Loading, empty and error states; 429 waits for `Retry-After`; 401 returns to sign-in.
- Dark mode, 375 px layout, keyboard and accessibility work.
- 106 component tests, 26 Playwright tests (replay flow, axe, keyboard), Lighthouse 100.

## Decisions worth a look

- Confirmed (not optimistic) updates; reasoning is in the README.
- Mock state and mock mode live in `sessionStorage` so they survive reloads and in-app navigation.

## Open questions I would have sent

1. Should `succeeded` counts appear on the queues overview? `QueueSummary` has no such field, so I
   left them out.
2. Is a selection cap of 50 (the bulk API limit) acceptable, or should the UI chunk larger
   selections into several requests?
3. Is localStorage acceptable for the token in this trial?

## Risks

- Everything was verified on Node 22 and Chromium only; Node 24 and other browsers are untested.

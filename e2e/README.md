# End-to-end tests

Playwright tests for Pulsar's main happy paths, run in Chromium at a phone viewport
(Pixel 7) against the production build served by `vite preview`.

```sh
npx playwright install chromium   # once
npm run test:e2e                   # builds, serves on :4173, runs the suite
npm run test:e2e:ui                # Playwright's interactive UI
```

Locally, an already-running server on port 4173 is reused, so after `npm run build`
you can keep `npx vite preview --port 4173` open between runs (rebuild after app changes).

## What's covered

- `first-run.spec.ts`: welcome screen, and creating a routine from a template (and it
  surviving a reload).
- `ai.spec.ts`: "Make my routine!" asking for a key and then building the routine with
  (mocked) AI, the key prompt's non-AI alternatives, and the routine chat proposing a
  change that is accepted.
- `workout.spec.ts`: completing every set of a workout and seeing it on Home and in
  History, resuming a workout after a reload, and finishing a workout early.
- `data-safety.spec.ts`: a timed set catching up after a simulated screen lock and
  surviving a reload mid-set, backup → wipe → restore, and rejecting a non-backup file.
- `navigation.spec.ts`: bottom nav and menu reach every screen, and dark mode persists.
- `homepage.spec.ts`: the marketing homepage (the site root) renders, fits a phone width, works with
  reduced motion, and its "Open the app" link lands in the app.
- `recorded-ai.spec.ts`: every recorded plan, edit and question (below) through both AI paths,
  the user's own key and hosted Pulsar AI.
- `back-button.spec.ts`: Back closes modals (menu, routine dialogs, Activity drawer deep link,
  stacked day-template dialogs, finish confirmation, setup's template chooser, AI key prompt).

## How tests are kept deterministic

`fixtures.ts` gives every test (import `test`/`expect` from there, not from
`@playwright/test`):

- **A fixed clock**: Monday 2 Nov 2026, 9am New York time, so "today" is always a
  workout day for template routines. Timers still run in real time.
- **No outside network**: requests to anything other than localhost are aborted
  (exercise image lookups fall back to no image), and the service worker is blocked so
  it can't cache or intercept.
- **No real AI**: calls to `api.openai.com` fail with a 500 unless the test mocks them.
  To test an AI flow, give it a canned reply:

  ```ts
  import { test, expect, mockOpenAI } from './fixtures';

  test('ai flow', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('<api key storage key>', 'sk-test'));
    await mockOpenAI(page, (body) => ({ /* the JSON the app expects back */ }));
    // ...
  });
  ```

- **No uncaught page errors**: any error thrown in the page fails the test.

Each test gets a fresh browser context, so IndexedDB and localStorage start empty.

## Recorded AI replies

`worker/ai/recordings/replies.json` holds real OpenAI replies for typical requests (the cases
are in `worker/ai/recordings/cases.ts`: three plans, three edits and a question). Tests replay
them with the `aiReplay` fixture instead of hand-writing a reply:

```ts
test('plan', async ({ page, aiReplay }) => {
  await aiReplay.openai(page, 'plan-dumbbells-knees');  // bring-your-own-key calls
  await aiReplay.hosted(page, 'edit-friday-rest');      // hosted /api/ai/* calls
});
```

Each recording remembers a fingerprint of the exact prompt it answered. When the prompts
(`src/services/ai/prompts.ts`) or a case change, `npm test` (`worker/ai/replay.test.ts`) and any
test replaying it fail with "re-record". To re-record (a few cents):

- `OPENAI_API_KEY=sk-... npm run ai:record` records the missing and stale ones (`-- --all` for
  everything, `-- --only id1,id2` for some), then commit `replies.json`; or
- run the **Record AI replies** workflow from the Actions tab on your branch. It needs the repo
  secret `OPENAI_API_KEY` and commits the result to that branch. (A push by the workflow doesn't
  start CI by itself; push again or re-run CI.)

Recordings whose `model` is `hand-written` are stand-ins that were never recorded; the first
`npm run ai:record` replaces them. The same recordings answer tester accounts' hosted AI on the
live site (see `TESTER_EMAILS` in the README).

## Full-stack tests

`npm run test:e2e:fullstack` (`playwright.fullstack.config.ts`, specs in `e2e-fullstack/`) runs
the app on the real Worker (`wrangler dev`) with a fresh local D1 database, so sign-in, allowance
counting, the Account tools and subscribing/cancelling go through the real server code:

- Sign-in is email and password, which the Worker only offers with `E2E_EMAIL_SIGNIN=1` on
  localhost (Google can't be used in a test).
- The Worker's settings come from `e2e-fullstack/worker.env` (never `.dev.vars`). Tester
  accounts get recorded replies; any other account's AI goes to a dead address, so the run can
  never reach OpenAI.
- Stripe is `e2e-fullstack/fake-stripe.mjs`: the Worker's Stripe API calls, plus stand-in
  Checkout and Portal pages that send the Worker signed webhooks, as Stripe would.

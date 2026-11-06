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

- `first-run.spec.ts`: welcome screen, creating a routine from a template (and it
  surviving a reload), and the "Make my routine!" path.
- `workout.spec.ts`: completing every set of a workout and seeing it on Home and in
  History, resuming a workout after a reload, and finishing a workout early.
- `navigation.spec.ts`: bottom nav and menu reach every screen, and dark mode persists.

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

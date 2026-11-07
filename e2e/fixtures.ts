import { test as base, expect, type Page, type Route } from '@playwright/test';

/**
 * A Monday morning. Template routines put their first workout on Monday, so pinning the
 * clock here makes "today" a workout day no matter when the suite runs.
 */
export const MONDAY_MORNING = new Date('2026-11-02T09:00:00-05:00');

const OPENAI_HOST = 'https://api.openai.com/';

export type OpenAIMock = (body: unknown, route: Route) => unknown | Promise<unknown>;

/**
 * Answers the app's OpenAI calls (the bring-your-own-key provider) with canned replies, so
 * AI flows can be tested without a key or network. `reply` gets the request body and returns
 * the assistant message content (a string, or an object that is JSON-encoded the way a
 * `response_format: json_object` reply would be).
 *
 * Every test already gets a default that fails OpenAI calls loudly, so a test can never
 * reach the real API by accident; calling this replaces that default for the test.
 */
export async function mockOpenAI(page: Page, reply: OpenAIMock) {
  await page.unroute(`${OPENAI_HOST}**`);
  await page.route(`${OPENAI_HOST}**`, async (route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) {
      return route.fulfill({ json: { object: 'list', data: [{ id: 'gpt-4o-mini', object: 'model' }] } });
    }
    const body = route.request().postDataJSON();
    const content = await reply(body, route);
    return route.fulfill({
      json: {
        id: 'chatcmpl-e2e',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) },
          },
        ],
      },
    });
  });
}

type Fixtures = {
  /** Uncaught page errors seen during the test; checked automatically at the end. */
  pageErrors: string[];
};

export const test = base.extend<Fixtures>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      // Keep tests hermetic: no real AI, and no third-party image lookups (Wikimedia search,
      // free-exercise-db images). The app treats a failed image lookup as "no image".
      await page.route(`${OPENAI_HOST}**`, (route) =>
        route.fulfill({ status: 500, json: { error: { message: 'OpenAI is not mocked in this test' } } }),
      );
      await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());

      await page.clock.install({ time: MONDAY_MORNING });

      await use(errors);
      expect(errors, 'uncaught errors in the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

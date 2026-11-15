import { defineConfig, devices } from '@playwright/test';

// Full-stack e2e tests: the app served by the real Worker (`wrangler dev`) with a local D1
// database, so sign-in, AI allowance counting and subscribing/cancelling run through the real
// server code. OpenAI is never reached (tester accounts get recorded replies) and Stripe is
// e2e-fullstack/fake-stripe.mjs. See e2e/README.md.
const PORT = 8788;
const STRIPE_PORT = 8790;

export default defineConfig({
  testDir: 'e2e-fullstack',
  // Tests share one server and database; each uses its own accounts.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-fullstack' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    serviceWorkers: 'block',
    timezoneId: 'America/New_York',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: `node e2e-fullstack/fake-stripe.mjs`,
      url: `http://localhost:${STRIPE_PORT}/health`,
      env: { FAKE_STRIPE_PORT: String(STRIPE_PORT), WORKER_URL: `http://127.0.0.1:${PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npm run build && node e2e-fullstack/start-worker.mjs`,
      url: `http://localhost:${PORT}/api/health`,
      env: { WORKER_PORT: String(PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});

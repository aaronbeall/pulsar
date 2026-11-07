import { defineConfig, devices } from '@playwright/test';

// End-to-end happy-path tests. They run against the production build (`vite preview`), at a
// phone viewport, since Pulsar is a mobile-only PWA. See e2e/README.md.
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The PWA service worker would cache responses and sit between the page and
    // page.route() mocks, so keep it out of tests.
    serviceWorkers: 'block',
    timezoneId: 'America/New_York',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Chromium with a phone profile, so CI only needs one browser installed.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

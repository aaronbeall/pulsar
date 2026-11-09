import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Settings > Account. The e2e server is a static Vite preview with no API, so these tests
 * stand in for the Worker's /api/me and /api/auth/* (worker/index.ts).
 */
async function mockAccountApi(page: Page, user: { name: string; email: string } | null) {
  let current = user ? { id: 'u1', image: null, ...user } : null;
  const calls: string[] = [];
  await page.route('**/api/me', (route) => route.fulfill({ json: { signInAvailable: true, user: current } }));
  await page.route('**/api/auth/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/auth\//, '');
    calls.push(path);
    if (path === 'sign-in/social') {
      return route.fulfill({ json: { url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=e2e', redirect: true } });
    }
    current = null; // sign-out and delete-user both end the session
    return route.fulfill({ json: { success: true } });
  });
  return calls;
}

test('without an account API, Settings shows no account card', async ({ page }) => {
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByTestId('account-card')).toHaveCount(0);
});

test('signing in sends the browser to Google', async ({ page }) => {
  const calls = await mockAccountApi(page, null);
  await page.goto('/app/settings');
  const card = page.getByTestId('account-card');
  await expect(card).toContainText('Your routines and workouts stay on this device');

  const googleRequest = page.waitForRequest((req) => req.url().startsWith('https://accounts.google.com/'));
  await card.getByRole('button', { name: 'Sign in with Google' }).click();
  await googleRequest;
  expect(calls).toEqual(['sign-in/social']);
});

test('a signed-in user can sign out', async ({ page }) => {
  const calls = await mockAccountApi(page, { name: 'Ada Lovelace', email: 'ada@example.com' });
  await page.goto('/app/settings');
  const card = page.getByTestId('account-card');
  await expect(card).toContainText('Ada Lovelace');
  await expect(card).toContainText('ada@example.com');

  await card.getByRole('button', { name: 'Sign out' }).click();
  await expect(card.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  expect(calls).toEqual(['sign-out']);
});

test('deleting the account asks first and keeps workout data', async ({ page }) => {
  const calls = await mockAccountApi(page, { name: 'Ada Lovelace', email: 'ada@example.com' });
  await page.goto('/app/settings');
  const card = page.getByTestId('account-card');
  await expect(card).toContainText('Ada Lovelace');

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('stay on this device');
    dialog.accept();
  });
  await card.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByText('Account deleted')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  expect(calls).toEqual(['delete-user']);
});

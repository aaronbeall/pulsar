import { test, expect } from './fixtures';

// The marketing homepage (home/) is a separate page from the app, served at <base>home/.

test('the homepage shows the product and links into the app', async ({ page }) => {
  await page.goto('/home/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Routines built');
  for (const heading of ['Say what you want.', 'Your call, every time.', 'Or do it yourself.', 'Keep the streak.']) {
    await expect(page.getByRole('heading', { name: heading })).toBeAttached();
  }
  // No sideways scrolling at phone width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );

  await page.getByRole('link', { name: /Open the app/ }).first().click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('the homepage still renders with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Steps are shown right away, not hidden waiting for a scroll animation.
  await expect(page.locator('.step').first()).toHaveCSS('opacity', '1');
});

import { test, expect } from './fixtures';
import { navTab } from './helpers';

test('the bottom nav and menu reach every screen', async ({ page }) => {
  await page.goto('/app/');

  await navTab(page, 'History').click();
  await expect(page).toHaveURL(/\/history$/);

  await navTab(page, 'Workout').click();
  await expect(page).toHaveURL(/\/workout\/setup$/);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);

  await navTab(page, 'Home').click();
  await expect(page.getByText('Welcome to Pulsar!')).toBeVisible();
});

test('switching to dark mode sticks after a reload', async ({ page }) => {
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

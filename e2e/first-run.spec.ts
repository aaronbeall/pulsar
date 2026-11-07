import { test, expect } from './fixtures';
import { createRoutineFromTemplate, navTab } from './helpers';

test('a new user is welcomed and sent to routine setup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome to Pulsar!')).toBeVisible();
  await page.getByRole('button', { name: 'Create My First Workout' }).click();

  // With no routines yet, the workout tab goes straight to setup.
  await expect(page).toHaveURL(/\/workout\/setup$/);
  await expect(page.getByRole('heading', { name: 'What are your goals?' })).toBeVisible();
});

test('creates a routine from a template and keeps it after a reload', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');

  await expect(page.getByText('Strength Builder')).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  // The weekly schedule lists the template's days and exercises.
  await expect(page.getByText('Monday', { exact: true })).toBeVisible();
  await expect(page.getByText('Deadlift').first()).toBeVisible();

  // Routines live in IndexedDB, so they survive a reload.
  await page.reload();
  await expect(page.getByText('Strength Builder')).toBeVisible();

  await navTab(page, 'Workout').click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(page.getByText('Strength Builder').first()).toBeVisible();
  await expect(page.getByText('Create New Routine')).toBeVisible();
});

test('"Make my routine!" builds a routine from the setup answers', async ({ page }) => {
  await page.goto('/workout/setup');
  const answers = ['get stronger', 'dumbbells', '3 days a week', 'nothing'];
  for (const [i, answer] of answers.entries()) {
    await page.getByRole('textbox').fill(answer);
    if (i < answers.length - 1) await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  await expect(page).toHaveURL(/\/workout\/routine\/[\w-]+$/);
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
});

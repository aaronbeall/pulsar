import { test, expect } from './fixtures';
import { answerSetupQuestions } from './helpers';

test('builds a routine from free-text answers without AI', async ({ page }) => {
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, [
    'build muscle',
    'dumbbells and a bench',
    '4 days a week, not Thursday, 45 min',
    "I have bad knees and I hate running",
  ]);
  await page.getByRole('button', { name: 'Build it without AI' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible();

  // What it understood, as chips.
  await expect(page.getByRole('button', { name: 'Build muscle' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Dumbbells' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Thursday: keep free' })).toBeVisible();
  await expect(page.getByText('Knees injury')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove No running' })).toBeVisible();

  // The week it built: four days, none on Thursday.
  const week = page.getByLabel('Your week');
  await expect(page.getByRole('heading', { name: '4-Day Muscle Builder' })).toBeVisible();
  await expect(week.getByText('Thursday', { exact: true })).toHaveCount(0);
  await expect(week.getByText('Upper Body A')).toBeVisible();

  // Changing an answer rebuilds the week.
  await page.getByRole('button', { name: 'Thursday: keep free' }).click(); // free → any
  await page.getByRole('button', { name: 'Thursday: any' }).click(); // any → train
  await expect(week.getByText('Thursday', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Create routine' }).click();
  await expect(page).toHaveURL(/\/workout\/routine\/[\w-]+$/);
  await expect(page.getByText('4-Day Muscle Builder').first()).toBeVisible();
  await expect(page.getByText('Thursday', { exact: true })).toBeVisible();
});

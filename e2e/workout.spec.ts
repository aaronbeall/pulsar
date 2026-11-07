import { test, expect } from './fixtures';
import { completeAllSets, createRoutineFromTemplate, navTab } from './helpers';

test('completes a full workout and sees it in history', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page).toHaveURL(/\/workout\/session\/[\w-]+$/);
  await expect(page.getByText(/Monday, Nov 2/)).toBeVisible(); // the pinned clock
  await expect(page.getByText('Set 1 of 5')).toBeVisible();

  await completeAllSets(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Workout Complete!')).toBeVisible();

  // Home now shows today's workout as done, and history lists it.
  await navTab(page, 'Home').click();
  await expect(page.getByText(/You crushed your workout today/)).toBeVisible();

  await navTab(page, 'History').click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText('Strength Builder').first()).toBeVisible();
  await expect(page.getByText('In progress')).toBeHidden();
});

test('a workout in progress survives a reload', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/workout\/session\/[\w-]+$/);
  const sessionUrl = page.url();

  await page.getByRole('button', { name: 'Start Set 1' }).click();
  await page.getByRole('button', { name: 'Complete 5 Reps' }).click();
  await expect(page.getByText(/Rest Time: \d+s/)).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByText('Set 2 of 5')).toBeVisible();
  await expect(page.getByText('1/5 × 5')).toBeVisible();
});

test('finishing a workout early flags the skipped exercises', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  // Finish appears once at least one exercise is done: work through the first one.
  for (let set = 1; set <= 5; set++) {
    await page.getByRole('button', { name: set === 1 ? 'Start Set 1' : /^Start Next (Set|Exercise)$/ }).click();
    await page.getByRole('button', { name: 'Complete 5 Reps' }).click();
  }

  await page.getByRole('button', { name: 'Finish' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Finish Workout?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Finish' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Not all exercises were completed')).toBeVisible();
});

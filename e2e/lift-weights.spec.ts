import { test, expect } from './fixtures';
import { completeAllSets, createRoutineFromTemplate, navTab } from './helpers';

test('logs a weight on each set and sees the lift in Activity', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deadlift' })).toBeVisible();

  // Weights are optional: a quiet link until you add one.
  await page.getByTestId('add-weight').click();
  const input = page.getByTestId('weight-input');
  await input.fill('135');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Heavier' }).click();
  await expect(input).toHaveValue('140');

  await page.getByRole('button', { name: 'Start Set 1' }).click();
  await page.getByRole('button', { name: 'Complete 5 Reps' }).click();
  // The finished set shows its weight, and the next set starts from it.
  await expect(page.getByTestId('set-dot-0')).toContainText('140');
  await expect(page.getByTestId('weight-input')).toHaveValue('140');

  // Fix the finished set: it was only 4 reps.
  await page.getByTestId('set-dot-0').click();
  const sheet = page.getByTestId('edit-set-sheet');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Decrement reps' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toBeHidden();

  await completeAllSets(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Deadlift').first()).toBeVisible();
  await expect(page.getByText(/5\/5 × 5 @ 140 lb/)).toBeVisible();

  await navTab(page, 'Activity').click();
  const lifts = page.getByTestId('lifts-card');
  await expect(lifts).toContainText('Deadlift');
  await expect(lifts).toContainText('140');
  await lifts.getByRole('button', { name: /Deadlift/ }).click();
  await expect(page.getByTestId('lift-progress')).toContainText('140×4');
});

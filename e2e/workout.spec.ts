import { test, expect } from './fixtures';
import { completeAllSets, createRoutineFromTemplate, navTab } from './helpers';

test('completes a full workout and sees it in Activity', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Set 1 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Start Set 1' }).click();
  await expect(page).toHaveURL(/\/workout\/session\/[\w-]+$/);
  await expect(page.getByText(/Monday, Nov 2/)).toBeVisible(); // the pinned clock

  await completeAllSets(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Workout Complete!')).toBeVisible();

  // Home now shows today's workout as done, and Activity lists it.
  await navTab(page, 'Home').click();
  await expect(page.getByText(/You crushed your workout today/)).toBeVisible();

  await navTab(page, 'Activity').click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByText('Strength Builder').first()).toBeVisible();
  await expect(page.getByText('In progress')).toBeHidden();
});

test('a workout in progress survives a reload', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Start Set 1' }).click();
  await expect(page).toHaveURL(/\/workout\/session\/[\w-]+$/);
  const sessionUrl = page.url();
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
    await page.getByRole('button', { name: `Start Set ${set}` }).click();
    await page.getByRole('button', { name: 'Complete 5 Reps' }).click();
  }

  await page.getByRole('button', { name: 'Finish' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Finish Workout?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Finish' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Not all exercises were completed')).toBeVisible();
});

test('opening a workout day without starting a set does not start it', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Set 1 of 5')).toBeVisible();
  await expect(page.getByText('Not started yet')).toBeVisible();
  await expect(page).toHaveURL(/\/workout\/session\/?\?routineId=/);

  // Leaving without starting a set leaves nothing behind.
  await navTab(page, 'Activity').click();
  await expect(page.getByText('In progress')).toBeHidden();
  await navTab(page, 'Home').click();
  await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible();
});

test('tapping a rest day opens the rest day screen with tips', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await navTab(page, 'Workout').click();
  // Strength Builder rests on Tuesday.
  await page.getByRole('button', { name: 'Open Tuesday rest day' }).click();
  await expect(page).toHaveURL(/\/workout\/rest\/Tuesday$/);
  await expect(page.getByRole('heading', { name: 'Rest day' })).toBeVisible();
  const tips = page.getByRole('list', { name: 'Rest day tips' }).getByRole('listitem');
  await expect(tips).toHaveCount(5);
  // Squats and deadlifts in the routine bring in a leg tip.
  await expect(page.getByText('Your routine works your legs')).toBeVisible();
  await expect(page.getByText('Next workout')).toBeVisible();
  await expect(page.getByText(/Wednesday · /)).toBeVisible();
});

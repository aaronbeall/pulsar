import { test, expect } from './fixtures';
import { answerSetupQuestions, createRoutineFromTemplate, navTab } from './helpers';

// Modals keep their open state in the URL (hooks/useUrlModal.ts), so the browser or Android
// Back button closes the modal rather than leaving the page.

test('Back closes the side menu, and leaving through it skips the menu on the way back', async ({ page }) => {
  await page.goto('/app/');
  await navTab(page, 'Activity').click();
  await expect(page).toHaveURL(/\/activity$/);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await expect(page).toHaveURL(/\/activity\?menu=1$/);

  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  await expect(page).toHaveURL(/\/activity$/);

  // Settings from the menu: Back returns to Activity with the menu closed.
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
});

test('Back closes dialogs on a routine, and closing one in the app does not leave a Back step', async ({ page }) => {
  await page.goto('/app/activity');
  const routineId = await createRoutineFromTemplate(page, 'Strength Builder');
  const routineUrl = new RegExp(`/workout/routine/${routineId}$`);

  // Opened from the ⋮ menu, closed with Back.
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const deleteDialog = page.getByRole('alertdialog', { name: 'Delete Routine' });
  await expect(deleteDialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`\\?deleteRoutine=${routineId}$`));
  await page.goBack();
  await expect(deleteDialog).toBeHidden();
  await expect(page).toHaveURL(routineUrl);

  // Closed with its own Cancel button: the next Back leaves the page as usual.
  await page.getByRole('button', { name: 'Activity' }).click();
  const activity = page.getByRole('dialog');
  await expect(activity).toBeVisible();
  await expect(page).toHaveURL(/\?activity=1$/);
  await activity.getByRole('button', { name: 'Close' }).click();
  await expect(activity).toBeHidden();
  await expect(page).toHaveURL(routineUrl);

  // Neither dialog left an entry behind, and neither did setup's template chooser (the new
  // routine replaced setup), so Back goes straight to where we started.
  await page.goBack();
  await expect(page).toHaveURL(/\/activity$/);
});

test('a deep link opens the Activity drawer, and closing it stays on the routine', async ({ page }) => {
  const routineId = await createRoutineFromTemplate(page, 'Strength Builder');
  await page.goto(`/app/workout/routine/${routineId}?activity=1`);
  const activity = page.getByRole('dialog');
  await expect(activity).toBeVisible();

  await activity.getByRole('button', { name: 'Close' }).click();
  await expect(activity).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/workout/routine/${routineId}$`));
});

test('Back steps out of a stacked confirmation to the chooser beneath it, then closes the chooser', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  // Monday already has exercises, so picking a template asks before overwriting.
  const monday = page.locator('#routine-day-Monday');
  await monday.getByRole('button', { name: 'Day actions' }).click();
  await page.getByRole('menuitem', { name: 'Choose from Template...' }).click();
  const chooser = page.getByRole('dialog', { name: 'Select a Routine Template' });
  await expect(chooser).toBeVisible();
  await chooser.getByRole('heading').first().click(); // a template card
  const confirm = page.getByRole('dialog', { name: 'Overwrite all exercises?' });
  await expect(confirm).toBeVisible();

  await page.goBack();
  await expect(confirm).toBeHidden();
  await expect(chooser).toBeVisible();

  await page.goBack();
  await expect(chooser).toBeHidden();
  // Still editing: Back only closed the dialogs.
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('Back closes the finish confirmation without leaving the workout', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let set = 1; set <= 5; set++) {
    await page.getByRole('button', { name: `Start Set ${set}` }).click();
    await page.getByRole('button', { name: 'Complete 5 Reps' }).click();
  }
  await expect(page).toHaveURL(/\/workout\/session\/[\w-]+$/);
  const sessionUrl = page.url();

  await page.getByRole('button', { name: 'Finish' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Finish Workout?' });
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(sessionUrl);
});

test('Back from the template chooser in setup returns to the plan, then the questions', async ({ page }) => {
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['strength', '', '', '']);
  await page.getByRole('button', { name: 'Use the free Planner' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Browse ready-made routines' }).click();
  await expect(page.getByRole('heading', { name: 'Ready-made routines' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Ready-made routines' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/workout\/setup$/);
  await expect(page.getByRole('button', { name: 'Use the free Planner' })).toBeVisible();
});

test('Back closes the AI key prompt, and a reload drops a prompt whose action is gone', async ({ page }) => {
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['strength', '', '', '']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();
  const prompt = page.getByRole('dialog');
  await expect(prompt).toBeVisible();
  await expect(page).toHaveURL(/\?ai=action$/);

  await page.goBack();
  await expect(prompt).toBeHidden();
  await expect(page).toHaveURL(/\/workout\/setup$/);

  // The action waiting behind the prompt can't survive a reload, so the prompt isn't reshown.
  await page.getByRole('button', { name: 'Make my routine!' }).click();
  await expect(prompt).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/workout\/setup$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

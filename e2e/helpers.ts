import { expect, type Page } from '@playwright/test';
import { workoutPrompts } from '../src/constants/prompts';

/** A tab in the bottom navigation bar. */
export function navTab(page: Page, name: 'Home' | 'Workout' | 'History') {
  return page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name });
}

/** Walks the setup questions, answering each one, and stops on the last. */
export async function answerSetupQuestions(page: Page, answers: string[]) {
  for (let i = 0; i < workoutPrompts.length; i++) {
    await expect(page.getByRole('heading', { name: workoutPrompts[i].question })).toBeVisible();
    await page.getByRole('textbox').fill(answers[i] ?? '');
    if (i < workoutPrompts.length - 1) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
  }
}

/**
 * Creates a routine from the template chooser, starting from a fresh app, and leaves the
 * page on the new routine. Returns the routine's id.
 */
export async function createRoutineFromTemplate(page: Page, templateName = 'Strength Builder') {
  await page.goto('/workout/setup');
  // The chooser shows the top three templates for the answers, so answer for this one.
  await answerSetupQuestions(page, ['strength', '', '', '']);
  await page.getByRole('button', { name: /Choose from a template/ }).click();
  await expect(page.getByRole('heading', { name: 'Choose a Routine Template' })).toBeVisible();

  // The nearest ancestor of the template's heading that holds a start button is its card.
  const card = page
    .getByRole('heading', { name: templateName, exact: true })
    .locator('xpath=ancestor::*[.//button[normalize-space()="Start with this template"]][1]');
  await card.getByRole('button', { name: 'Start with this template' }).click();

  await expect(page.getByText('Name your routine')).toBeVisible();
  await page.getByRole('button', { name: 'Create Routine' }).click();

  await expect(page).toHaveURL(/\/workout\/routine\/[\w-]+$/);
  return page.url().split('/').pop()!;
}

/**
 * Works through every set of the current workout session, stopping once the
 * congratulations screen shows.
 */
export async function completeAllSets(page: Page) {
  const startSet = page.getByRole('button', { name: /^Start Set \d+$/ });
  const completeSet = page.getByRole('button', { name: /^Complete \d+ Reps$/ });
  const done = page.getByRole('heading', { name: /Completed!$/ });

  for (let guard = 0; guard < 200; guard++) {
    await expect(startSet.or(completeSet).or(done).first()).toBeVisible();
    if (await done.isVisible()) return;
    if (await completeSet.isVisible()) {
      await completeSet.click();
    } else {
      await startSet.click();
    }
  }
  throw new Error('Workout never completed');
}

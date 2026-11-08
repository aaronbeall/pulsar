import { test, expect, mockOpenAI } from './fixtures';
import { answerSetupQuestions, createRoutineFromTemplate } from './helpers';

// AI features always look available. Using one without a key opens the "Unlock Pulsar AI"
// prompt, and the action continues once a key is accepted. OpenAI is mocked (fixtures.ts).

const GENERATED_ROUTINE = {
  name: 'Knee-Friendly Builder',
  description: 'Three dumbbell days, easy on the knees.',
  commentary: 'I kept it to dumbbells and skipped jumping because of your knees.',
  schedule: [
    { day: 'Monday', kind: 'Upper Push', exercises: [{ name: 'Push-up', sets: 3, reps: 10 }, { name: 'Plank', sets: 3, duration: 30 }] },
    { day: 'wed', kind: 'Upper Pull', exercises: [{ name: 'Dumbbell Row', sets: 3, reps: '12' }] },
  ],
};

test('"Make my routine!" asks for a key, then builds the routine with AI', async ({ page }) => {
  const requests: any[] = [];
  await mockOpenAI(page, (body) => {
    requests.push(body);
    return GENERATED_ROUTINE;
  });

  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', 'dumbbells only', '3 days a week', 'bad knees']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const prompt = page.getByRole('dialog');
  await expect(prompt.getByText('Unlock Pulsar AI')).toBeVisible();
  await expect(prompt.getByText('Building a routine from your answers uses Pulsar AI.')).toBeVisible();
  await prompt.getByPlaceholder('sk-...').fill('sk-test-key');
  await prompt.getByRole('button', { name: 'Continue' }).click();

  // The routine is built without tapping "Make my routine!" again. The build screen shows the
  // coach's note and the planned week, then waits for the user to open the routine.
  const progress = page.getByTestId('routine-build-progress');
  await expect(progress.getByText('Your routine is ready')).toBeVisible();
  await expect(progress.getByText('I kept it to dumbbells')).toBeVisible();
  await expect(progress.getByText('Upper Pull')).toBeVisible();
  await progress.getByRole('button', { name: 'See my routine & make changes' }).click();
  await expect(page).toHaveURL(/\/workout\/routine\/[\w-]+$/);
  await expect(page.getByText('Knee-Friendly Builder')).toBeVisible();
  await expect(page.getByText('I kept it to dumbbells')).toBeVisible();
  await expect(page.getByText('Dumbbell Row').first()).toBeVisible();
  expect(JSON.stringify(requests[0].messages)).toContain('bad knees');
});

test('the key prompt offers templates as the non-AI way forward', async ({ page }) => {
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['lose weight', 'treadmill', '', '']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const prompt = page.getByRole('dialog');
  await expect(prompt.getByRole('button', { name: 'Not now' })).toHaveCount(0);
  await prompt.getByRole('button', { name: 'Create from a template instead' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a Routine Template' })).toBeVisible();
  // Templates are ranked against the answers.
  await expect(page.getByRole('heading', { name: 'Fat Loss HIIT', exact: true })).toBeVisible();
});

test('routine chat asks for a key, sends the message, and applies an accepted change', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  // Hold the reply until the test has seen the thinking state.
  let release!: () => void;
  const replyReady = new Promise<void>((resolve) => { release = resolve; });
  await mockOpenAI(page, async (body: any) => {
    expect(body.stream).toBe(true);
    await replyReady;
    return {
      commentary: 'Done: Friday is now a rest day.',
      patch: { dailySchedule: [{ op: 'clearDay', day: 'Friday' }] },
    };
  });

  const input = page.getByPlaceholder('Suggest changes or ask a question...');
  await input.fill('make friday a rest day');
  await input.press('Enter');

  const prompt = page.getByRole('dialog');
  await expect(prompt.getByText('Chatting with your routine uses Pulsar AI.')).toBeVisible();
  await prompt.getByPlaceholder('sk-...').fill('sk-test-key');
  await prompt.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('make friday a rest day')).toBeVisible();
  await expect(page.getByTestId('ai-thinking')).toBeVisible();
  release();
  await expect(page.getByText('Done: Friday is now a rest day.')).toBeVisible();
  await expect(page.getByTestId('ai-streaming-reply')).toHaveCount(0);
  // The suggestion also shows inline on the day it changes, until it's decided.
  await expect(page.locator('#routine-day-Friday').getByText('Suggested change')).toBeVisible();
  await page.getByRole('button', { name: 'Accept all' }).click();
  await expect(page.getByText('Accepted', { exact: true })).toBeVisible();
  await expect(page.locator('#routine-day-Friday').getByText('Suggested change')).toHaveCount(0);

  // Friday's workout is gone after a reload too.
  await page.reload();
  await expect(page.getByText('Done: Friday is now a rest day.')).toBeVisible();
});

test('each day of a suggestion is accepted or rejected inline, and the chat summary follows', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await mockOpenAI(page, () => ({
    commentary: 'Two tweaks for you.',
    patch: { dailySchedule: [{ op: 'clearDay', day: 'Friday' }, { op: 'setDay', day: 'Sunday', kind: 'Mobility', exercises: [{ name: 'Plank', sets: 2, duration: 30 }] }] },
  }));

  const input = page.getByPlaceholder('Suggest changes or ask a question...');
  await input.fill('two tweaks');
  await input.press('Enter');
  await page.getByRole('dialog').getByPlaceholder('sk-...').fill('sk-test-key');
  await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Two tweaks for you.')).toBeVisible();

  await page.locator('#routine-day-Friday').getByRole('button', { name: 'Accept' }).click();
  await page.locator('#routine-day-Sunday').getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByLabel('Accepted')).toHaveCount(1);
  await expect(page.getByLabel('Rejected')).toHaveCount(1);
  await expect(page.getByText('Partly accepted')).toBeVisible();

  // Both the accepted change and the routine's history survive a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Activity' }).click();
  await expect(page.getByText('Friday made a rest day')).toBeVisible();
});

test('routine chat offers manual editing as the non-AI way forward', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  const input = page.getByPlaceholder('Suggest changes or ask a question...');
  await input.fill('swap deadlifts');
  await input.press('Enter');

  await page.getByRole('dialog').getByRole('button', { name: 'Edit the routine myself' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(input).toHaveValue('swap deadlifts');
});

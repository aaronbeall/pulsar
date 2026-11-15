import type { Page } from '@playwright/test';
import { test, expect, mockOpenAI } from './fixtures';

// When a routine's recent workouts keep feeling too hard (or easy, long, short), the finished
// workout offers to adjust it: with Pulsar AI behind the AI gate, or with the free Planner.

/** A four-exercise Monday routine and two finished workouts of it that felt too hard and too long. */
async function seedHardWorkouts(page: Page) {
  await page.goto('/app/');
  await page.evaluate(async () => {
    const req = indexedDB.open('PulsarDB', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['exercises', 'routines', 'workouts'], 'readwrite');
    const names = ['Goblet Squat', 'Push-up', 'Dumbbell Row', 'Plank'];
    names.forEach((name, i) => tx.objectStore('exercises').put({
      id: `e${i}`, name, description: '', howToUrl: '', coverImageUrl: '', iconImageUrl: '',
    }));
    const exercises = names.map((_, i) => ({ exerciseId: `e${i}`, sets: 4, reps: 10 }));
    tx.objectStore('routines').put({
      id: 'r1', name: 'Full Body', description: '', active: true, createdAt: Date.now() - 20 * 864e5, chatHistory: [],
      dailySchedule: [{ day: 'Monday', kind: 'Full body', exercises }],
    });
    for (const [id, daysAgo] of [['w1', 0], ['w2', 7]] as const) {
      const startedAt = Date.now() - daysAgo * 864e5 - 3600e3;
      tx.objectStore('workouts').put({
        id, nickname: 'Test', routineId: 'r1', day: 'Monday', startedAt, completedAt: startedAt + 55 * 60e3,
        effort: 'hard', lengthFeel: 'long',
        exercises: exercises.map(e => ({ ...e, completedSets: 4, completedAt: startedAt + 50 * 60e3 })),
      });
    }
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });
  await page.goto('/app/workout/session/w1');
}

test('the free Planner adjusts a routine that keeps feeling too hard', async ({ page }) => {
  await seedHardWorkouts(page);
  const offer = page.getByTestId('routine-adjust-offer');
  await expect(offer.getByText('Your last few workouts on this routine felt too hard and too long.')).toBeVisible();

  // AI is the main action; without a key the gate offers the Planner instead.
  await offer.getByRole('button', { name: 'Adjust with Pulsar AI' }).click();
  const prompt = page.getByRole('dialog');
  await expect(prompt.getByText('Adjusting your routine uses Pulsar AI.')).toBeVisible();
  await prompt.getByRole('button', { name: /Use the free Pulsar Planner/ }).click();

  await expect(page).toHaveURL(/\/workout\/routine\/r1$/);
  const monday = page.locator('#routine-day-Monday');
  await expect(monday.getByText('Planner suggestion')).toBeVisible();
  await monday.getByRole('button', { name: 'Accept' }).click();
  await expect(monday.getByText('Planner suggestion')).toHaveCount(0);
  // A set fewer on each exercise, and the last one dropped for time.
  await expect(monday.getByText('Plank')).toHaveCount(0);
  await expect(monday.getByRole('row').filter({ hasText: 'Goblet Squat' }).getByRole('cell').nth(1)).toHaveText('3');

  // The offer doesn't come back for the same feedback.
  await page.goto('/app/workout/session/w1');
  await expect(page.getByText('How was it?')).toBeVisible();
  await expect(page.getByTestId('routine-adjust-offer')).toHaveCount(0);
});

test('Pulsar AI adjusts it through the routine chat', async ({ page }) => {
  const requests: any[] = [];
  await mockOpenAI(page, (body) => {
    requests.push(body);
    return { commentary: 'Eased it off: three sets each, and Plank is out.', patch: {} };
  });
  await seedHardWorkouts(page);
  await page.getByTestId('routine-adjust-offer').getByRole('button', { name: 'Adjust with Pulsar AI' }).click();
  const prompt = page.getByRole('dialog');
  await prompt.getByPlaceholder('sk-...').fill('sk-test-key');
  await prompt.getByRole('button', { name: 'Use this key' }).click();

  await expect(page).toHaveURL(/\/workout\/routine\/r1$/);
  await expect(page.getByText(/felt too hard and too long\. Please make it a bit easier and shorter/)).toBeVisible();
  await expect(page.getByText('Eased it off: three sets each, and Plank is out.')).toBeVisible();
  expect(JSON.stringify(requests[0].messages)).toContain('Please make it a bit easier and shorter');

  // A reload doesn't send it again.
  await page.reload();
  await expect(page.getByText('Eased it off: three sets each, and Plank is out.')).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('"Not now" puts the offer away', async ({ page }) => {
  await seedHardWorkouts(page);
  const offer = page.getByTestId('routine-adjust-offer');
  await offer.getByRole('button', { name: 'Not now' }).click();
  await expect(offer).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('How was it?')).toBeVisible();
  await expect(page.getByTestId('routine-adjust-offer')).toHaveCount(0);
});

test('a delayed note save preserves ratings selected while it was pending', async ({ page }) => {
  await seedHardWorkouts(page);
  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('textbox', { name: 'Notes on this workout' }).fill('Needed more rest');
  await page.getByRole('group', { name: 'Effort', exact: true }).getByRole('button', { name: 'Too easy' }).click();
  await page.getByRole('group', { name: 'Length', exact: true }).getByRole('button', { name: 'Too short' }).click();
  await page.clock.runFor(1000);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Notes on this workout' })).toHaveValue('Needed more rest');
  await expect(page.getByRole('group', { name: 'Effort', exact: true }).getByRole('button', { name: 'Too easy' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Length', exact: true }).getByRole('button', { name: 'Too short' })).toHaveAttribute('aria-pressed', 'true');
});

test('returning from Google with no edits left reopens the adjustment gate', async ({ page }) => {
  let signedIn = false;
  let aiCalls = 0;
  await page.route('**/api/me', route => route.fulfill({ json: {
    signInAvailable: true, hostedAI: true, billing: true,
    user: signedIn ? { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null } : null,
    ai: signedIn ? { tier: 'free', plan: { used: 1, limit: 1 }, edit: { used: 2, limit: 2 }, resetsAt: null } : null,
  } }));
  await page.route('**/api/auth/**', route => route.fulfill({ json: {
    url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=e2e', redirect: true,
  } }));
  await page.route('https://accounts.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Google</title>' }));
  await page.route('**/api/ai/*', route => {
    aiCalls++;
    return route.fulfill({ status: 429, json: { code: 'allowance_used' } });
  });
  await seedHardWorkouts(page);
  await page.getByTestId('routine-adjust-offer').getByRole('button', { name: 'Adjust with Pulsar AI' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);
  signedIn = true;
  await page.goto('/app/workout/session/w1');
  const gate = page.getByRole('dialog');
  await expect(gate.getByText("You've used your free AI.", { exact: false })).toBeVisible();
  await expect(gate.getByRole('button', { name: /Use the free Pulsar Planner/ })).toBeVisible();
  await expect(page).toHaveURL(/\/workout\/session\/w1\?ai=/);
  expect(aiCalls).toBe(0);
  // The feedback isn't marked handled until the user actually chooses an adjustment.
  await gate.getByRole('button', { name: /Use the free Pulsar Planner/ }).click();
  await expect(page).toHaveURL(/\/workout\/routine\/r1$/);
  await expect(page.getByText('Planner suggestion')).toBeVisible();
});

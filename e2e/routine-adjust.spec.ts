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

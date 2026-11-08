import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/** A routine with Sunday exercises and one finished workout, so Home shows the streak calendar. */
async function seedSundayRoutine(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const req = indexedDB.open('PulsarDB', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['exercises', 'routines', 'workouts'], 'readwrite');
    tx.objectStore('exercises').put({
      id: 'squat', name: 'Squat', description: '', howToUrl: '', coverImageUrl: '', iconImageUrl: '',
    });
    tx.objectStore('routines').put({
      id: 'r1', name: 'Legs', description: '', active: true, createdAt: Date.now(), chatHistory: [],
      dailySchedule: [{ day: 'Sunday', kind: 'Legs', exercises: [{ exerciseId: 'squat', sets: 3, reps: 10 }] }],
    });
    const started = new Date('2026-10-25T10:00:00-05:00').getTime();
    tx.objectStore('workouts').put({
      id: 'w1', nickname: 'Test', routineId: 'r1', day: 'Sunday', startedAt: started, completedAt: started + 3600_000,
      exercises: [{ exerciseId: 'squat', sets: 3, reps: 10, completedSets: 3 }],
    });
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });
}

async function workoutCount(page: Page) {
  return page.evaluate(async () => {
    const req = indexedDB.open('PulsarDB', 1);
    const db = await new Promise<IDBDatabase>((resolve) => (req.onsuccess = () => resolve(req.result)));
    const countReq = db.transaction('workouts').objectStore('workouts').count();
    return new Promise<number>((resolve) => (countReq.onsuccess = () => resolve(countReq.result)));
  });
}

test('developer tools are hidden until dev mode is turned on with ?dev=1', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
  await expect(page.getByTestId('developer-settings')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear All Settings' })).toHaveCount(0);

  await page.goto('/settings?dev=1');
  await expect(page.getByTestId('developer-settings')).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/); // the param is removed from the address bar
  await page.reload();
  await expect(page.getByTestId('developer-settings')).toBeVisible(); // remembered

  await page.getByRole('button', { name: 'Turn off dev mode' }).click();
  await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
  await expect(page.getByTestId('developer-settings')).toHaveCount(0);
});

test('tapping a calendar day logs it only in dev mode', async ({ page }) => {
  await seedSundayRoutine(page);
  await page.goto('/');
  const sunday = page.getByTitle('Nov 1', { exact: true });
  await sunday.click();
  await page.waitForTimeout(300);
  expect(await workoutCount(page)).toBe(1);

  await page.goto('/?dev=1');
  // Logging a day reloads the page.
  await Promise.all([page.waitForEvent('load'), page.getByTitle('Nov 1', { exact: true }).click()]);
  expect(await workoutCount(page)).toBe(2);
});

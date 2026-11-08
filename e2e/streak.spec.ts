import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { navTab } from './helpers';

// The clock is pinned to Monday, Nov 2 2026 (see e2e/README.md).

/** Two routines: "Old" (Mon/Wed) used until Oct 28, then "New" (Tue/Thu) from Oct 28. */
async function seedSwitchedRoutines(page: Page) {
  await page.goto('/app/');
  await page.evaluate(async () => {
    const req = indexedDB.open('PulsarDB', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const at = (iso: string) => new Date(iso).getTime();
    const tx = db.transaction(['exercises', 'routines', 'workouts'], 'readwrite');
    tx.objectStore('exercises').put({ id: 'squat', name: 'Squat', description: '', howToUrl: '', coverImageUrl: '', iconImageUrl: '' });
    const day = (d: string, kind: string) => ({ day: d, kind, exercises: [{ exerciseId: 'squat', sets: 3, reps: 10 }] });
    tx.objectStore('routines').put({
      id: 'old', name: 'Old Plan', description: '', active: false, createdAt: at('2026-10-19T08:00:00'), chatHistory: [],
      dailySchedule: [day('Monday', 'Legs'), day('Wednesday', 'Push')],
      schedulePeriods: [{ start: at('2026-10-19T08:00:00'), end: at('2026-10-28T08:00:00'), days: ['Monday', 'Wednesday'] }],
    });
    tx.objectStore('routines').put({
      id: 'new', name: 'New Plan', description: '', active: true, createdAt: at('2026-10-28T08:00:00'), chatHistory: [],
      dailySchedule: [day('Tuesday', 'Pull'), day('Thursday', 'Core')],
      schedulePeriods: [{ start: at('2026-10-28T08:00:00'), days: ['Tuesday', 'Thursday'] }],
    });
    const done = (id: string, routineId: string, d: string, iso: string) => ({
      id, nickname: `${d} session`, routineId, day: d, startedAt: at(iso), completedAt: at(iso) + 3600_000,
      exercises: [{ exerciseId: 'squat', sets: 3, reps: 10 }],
    });
    tx.objectStore('workouts').put(done('w1', 'old', 'Monday', '2026-10-19T10:00:00'));
    tx.objectStore('workouts').put(done('w2', 'old', 'Wednesday', '2026-10-21T10:00:00'));
    tx.objectStore('workouts').put(done('w3', 'old', 'Monday', '2026-10-26T10:00:00'));
    tx.objectStore('workouts').put(done('w4', 'new', 'Thursday', '2026-10-29T10:00:00'));
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });
}

test('switching routines keeps the streak, and days open their story', async ({ page }) => {
  await seedSwitchedRoutines(page);
  await page.goto('/app/');

  // Old Mon/Wed + new Thu, no misses: before the switch Tuesday wasn't scheduled.
  await expect(page.getByText('day streak')).toBeVisible();
  await expect(page.getByText('4', { exact: true })).toBeVisible();

  // A past day shows what was done.
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByTitle('Oct 26', { exact: true }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Monday, October 26')).toBeVisible();
  await expect(sheet.getByText('Done')).toBeVisible();
  await expect(sheet.getByText('Monday session')).toBeVisible();
  await page.goBack(); // Back closes the sheet
  await expect(sheet).toBeHidden();

  // An upcoming day shows what's planned.
  await page.getByText('October 2026').click(); // jumps back to the current month
  await page.getByTitle('Nov 3', { exact: true }).click();
  await expect(sheet.getByText('Planned')).toBeVisible();
  await expect(sheet.getByText('New Plan')).toBeVisible();
  await page.goBack();

  // History tells the same story, one card per routine stretch.
  await navTab(page, 'History').click();
  await expect(page.getByText('New Plan')).toBeVisible();
  await expect(page.getByText('Old Plan')).toBeVisible();
  await expect(page.getByText(/^3 workouts/)).toBeVisible();
});

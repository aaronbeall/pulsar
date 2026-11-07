import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { createRoutineFromTemplate } from './helpers';

/** Writes a routine with one timed exercise (2 × 30s) and a workout for it straight into IndexedDB. */
async function seedTimedWorkout(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const req = indexedDB.open('PulsarDB', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['exercises', 'routines', 'workouts'], 'readwrite');
    tx.objectStore('exercises').put({
      id: 'plank', name: 'Plank', description: '', howToUrl: '', coverImageUrl: '', iconImageUrl: '', timed: true,
    });
    tx.objectStore('routines').put({
      id: 'r1', name: 'Core', description: '', active: true, createdAt: Date.now(), chatHistory: [],
      dailySchedule: [{ day: 'Monday', kind: 'Core', exercises: [{ exerciseId: 'plank', sets: 2, duration: 30 }] }],
    });
    tx.objectStore('workouts').put({
      id: 'w1', nickname: 'Test', routineId: 'r1', day: 'Monday', startedAt: Date.now(),
      exercises: [{ exerciseId: 'plank', sets: 2, duration: 30, completedSets: 0, completedDuration: 0 }],
    });
    await new Promise((resolve) => (tx.oncomplete = resolve));
  });
}

test('a timed set catches up after the phone was locked', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __vibrations: unknown[] }).__vibrations = [];
    navigator.vibrate = (pattern) => {
      (window as unknown as { __vibrations: unknown[] }).__vibrations.push(pattern);
      return true;
    };
  });
  await seedTimedWorkout(page);
  await page.goto('/workout/session/w1');

  await page.getByRole('button', { name: 'Start Set 1' }).click();
  await expect(page.getByRole('button', { name: 'End Set Early' })).toBeVisible();
  await expect(page.getByText(/^(30|29|28)s$/)).toBeVisible();

  // Jump two minutes with no timer ticks in between, like a locked screen.
  await page.clock.fastForward('02:00');

  // The set recorded itself at its real end, and rest is counted from then (~1:30).
  await expect(page.getByText(/Rest Time: 1:3\d/)).toBeVisible();
  await expect(page.getByText('1/2 × 30s')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations.length)).toBe(1);

  // A set in progress survives a reload with the right time left.
  await page.getByRole('button', { name: 'Start Set 2' }).click();
  await page.clock.fastForward(10_000);
  await page.reload();
  await expect(page.getByText(/^(20|19|18)s$/)).toBeVisible();
  await page.clock.fastForward(25_000);
  await expect(page.getByRole('heading', { name: /Completed!$/ })).toBeVisible();
});

test('backs up and restores all data', async ({ page }) => {
  // Force the download path: the phone profile would otherwise try the share sheet.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined });
  });
  await createRoutineFromTemplate(page, 'Strength Builder');

  await page.goto('/settings');
  await expect(page.getByText('Last backup:')).toContainText('never');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save Backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('pulsar-backup-2026-11-02.json');
  const file = await download.path();
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(backup.app).toBe('pulsar');
  expect(backup.routines).toHaveLength(1);
  await expect(page.getByText('Last backup:')).not.toContainText('never');

  // Wipe everything, then restore from the file.
  await page.evaluate(() => new Promise((resolve) => {
    const del = indexedDB.deleteDatabase('PulsarDB');
    del.onsuccess = del.onblocked = resolve;
  }));
  await page.reload();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Restore Backup' }).click(),
  ]);
  await chooser.setFiles(file);
  const dialog = page.getByRole('alertdialog', { name: 'Restore this backup?' });
  await expect(dialog).toContainText('1 routine');
  await dialog.getByRole('button', { name: 'Replace & Restore' }).click();
  await expect(page.getByText('Backup restored')).toBeVisible();

  await page.goto('/workout');
  await expect(page.getByText('Strength Builder').first()).toBeVisible();
});

test('rejects a file that is not a Pulsar backup', async ({ page }) => {
  await page.goto('/settings');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Restore Backup' }).click(),
  ]);
  await chooser.setFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText("This file isn't a Pulsar backup.")).toBeVisible();
});

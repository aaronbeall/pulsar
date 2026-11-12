import { test, expect } from './fixtures';
import { completeAllSets, createRoutineFromTemplate, navTab } from './helpers';

type Shared = { text?: string; files: { name: string; type: string; size: number }[] };

test('shares a finished workout as an image through the phone share sheet', async ({ page }) => {
  // Stand in for the phone's share sheet, recording what was handed to it.
  await page.addInitScript(() => {
    const shared: unknown[] = [];
    (window as unknown as { __shared: unknown[] }).__shared = shared;
    navigator.canShare = () => true;
    navigator.share = async (data?: ShareData) => {
      shared.push({ text: data?.text, files: (data?.files ?? []).map(f => ({ name: f.name, type: f.type, size: f.size })) });
    };
  });
  const sharedSoFar = () => page.evaluate(() => (window as unknown as { __shared: Shared[] }).__shared);

  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await completeAllSets(page);

  await page.getByTestId('celebration-share').click();
  const sheet = page.getByTestId('share-sheet');
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/[?&]share=workout%3A/);
  await expect(sheet.getByTestId('share-preview')).toBeVisible();
  await sheet.getByRole('button', { name: 'Share', exact: true }).click();

  await expect.poll(async () => (await sharedSoFar()).length).toBe(1);
  const [first] = await sharedSoFar();
  expect(first.files).toHaveLength(1);
  expect(first.files[0]).toMatchObject({ name: 'pulsar-workout.png', type: 'image/png' });
  expect(first.files[0].size).toBeGreaterThan(20_000);
  expect(first.text).toMatch(/^Finished “.+” on Pulsar 💪 https:\/\/pulsarworkouts\.app$/);

  // Switch to the streak card and share that too.
  await sheet.getByRole('button', { name: 'Streak', exact: true }).click();
  await sheet.getByRole('button', { name: 'Square', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Share', exact: true })).toBeEnabled();
  await sheet.getByRole('button', { name: 'Share', exact: true }).click();
  await expect.poll(async () => (await sharedSoFar()).length).toBe(2);
  const second = (await sharedSoFar())[1];
  expect(second.files[0].name).toBe('pulsar-streak-1.png');
  expect(second.text).toBe('Day 1 of my streak on Pulsar 🔥 https://pulsarworkouts.app');

  // Back closes the sheet and leaves the celebration showing.
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId('celebration-share')).toBeVisible();
});

test('without Web Share, Activity offers to save the image instead', async ({ page }) => {
  await page.addInitScript(() => {
    // Like most desktop browsers.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await createRoutineFromTemplate(page, 'Strength Builder');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await completeAllSets(page);
  await page.getByRole('button', { name: 'Continue' }).click();

  await navTab(page, 'Activity').click();
  await page.getByTestId('activity-share').click();
  const sheet = page.getByTestId('share-sheet');
  await expect(sheet.getByRole('button', { name: 'Streak', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);

  const download = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Save image' }).click();
  expect((await download).suggestedFilename()).toBe('pulsar-streak-1.png');
});

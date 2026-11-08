import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { createRoutineFromTemplate, navTab } from './helpers';

/** True when nothing else on the page is painted over the middle of `item`. */
async function isOnTop(item: Locator) {
  return item.evaluate(el => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && el.contains(hit);
  });
}

test('the routine card menu is drawn above the card content', async ({ page }) => {
  await createRoutineFromTemplate(page, 'Strength Builder');
  await navTab(page, 'Workout').click();
  await expect(page).toHaveURL(/\/workout$/);

  // The card's ⋮ menu opens over its own description and stats (which used to draw
  // straight through it).
  const card = page.getByRole('group', { name: 'View details for Strength Builder' });
  await card.getByRole('button').first().click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();

  for (const name of ['View details', 'Add to favorites', 'Export...', 'Delete routine']) {
    const item = menu.getByRole('menuitem', { name });
    await expect(item).toBeVisible();
    expect(await isOnTop(item), `"${name}" is covered`).toBe(true);
  }

  // Picking an item still works from the portaled menu.
  await menu.getByRole('menuitem', { name: 'Add to favorites' }).click();
  await expect(page.getByText('Added to favorites')).toBeVisible();
});

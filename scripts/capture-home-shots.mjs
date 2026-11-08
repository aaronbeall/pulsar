// Captures the real-app screenshots used on the marketing homepage (home/).
// Usage: npm run build && npx vite preview --port 4173 & node scripts/capture-home-shots.mjs
// AI replies are canned (no key or network needed); the clock is pinned to a Monday.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173';
const OUT = process.env.SHOTS_OUT || 'home/shots';
const ONLY = process.env.SHOTS_ONLY; // optional comma list of shot names
mkdirSync(OUT, { recursive: true });

const ROUTINE = {
  name: 'Strong & Steady',
  description: 'Three dumbbell days plus a mobility reset, easy on the knees.',
  commentary: 'I kept it to dumbbells, skipped jumping because of your knees, and gave Saturday a short mobility flow so you keep the habit without the pounding.',
  schedule: [
    { day: 'Monday', kind: 'Upper Push', exercises: [{ name: 'Dumbbell Bench Press', sets: 4, reps: 8 }, { name: 'Push-up', sets: 3, reps: 12 }, { name: 'Arnold Dumbbell Press', sets: 3, reps: 10 }, { name: 'Plank', sets: 3, duration: 45 }] },
    { day: 'Wednesday', kind: 'Upper Pull', exercises: [{ name: 'Dumbbell Row', sets: 4, reps: 10 }, { name: 'Hammer Curls', sets: 3, reps: 12 }, { name: 'Reverse Flyes', sets: 3, reps: 12 }] },
    { day: 'Friday', kind: 'Lower Body', exercises: [{ name: 'Goblet Squat', sets: 4, reps: 10 }, { name: 'Romanian Deadlift', sets: 3, reps: 10 }, { name: 'Glute Bridge', sets: 3, reps: 15 }] },
    { day: 'Saturday', kind: 'Mobility', exercises: [{ name: 'Cat Stretch', sets: 2, duration: 60 }, { name: 'World\'s Greatest Stretch', sets: 2, duration: 60 }] },
  ],
};

const CHANGE = {
  commentary: 'Swapped Friday\'s squats for split squats so each leg works on its own, and added calf raises. Accept or reject each day.',
  patch: {
    dailySchedule: [
      { op: 'setDay', day: 'Friday', kind: 'Lower Body', exercises: [{ name: 'Bulgarian Split Squat', sets: 3, reps: 10 }, { name: 'Romanian Deadlift', sets: 3, reps: 10 }, { name: 'Standing Calf Raises', sets: 3, reps: 15 }] },
    ],
  },
};

// A Wednesday late in the month, so there's room for a streak before it.
const TODAY = new Date('2026-11-25T08:30:00-05:00');

async function newPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    serviceWorkers: 'block',
    timezoneId: 'America/New_York',
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.clock.install({ time: TODAY });
  await page.addInitScript(() => localStorage.setItem('pulsar:openaiApiKey', 'sk-shots'));
  return page;
}

async function mockAI(page, reply) {
  await page.unroute('https://api.openai.com/**').catch(() => {});
  await page.route('https://api.openai.com/**', async (route) => {
    const body = route.request().postDataJSON();
    const content = JSON.stringify(typeof reply === 'function' ? reply(body) : reply);
    if (body?.stream) {
      const events = (content.match(/[\s\S]{1,8}/g) || []).map((p) => `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: p } }] })}\n\n`);
      return route.fulfill({ contentType: 'text/event-stream', body: `${events.join('')}data: [DONE]\n\n` });
    }
    return route.fulfill({ json: { choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] } });
  });
}

async function answerSetup(page, answers) {
  for (let i = 0; i < answers.length; i++) {
    const box = page.getByRole('textbox');
    await box.waitFor();
    await box.fill(answers[i]);
    const next = page.getByRole('button', { name: 'Next' });
    if (i < answers.length - 1) await next.click();
  }
}

async function shot(page, name) {
  if (ONLY && !ONLY.split(',').includes(name)) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80 });
  console.log('saved', name);
}


const browser = await chromium.launch();
let page;
try {
  page = await newPage(browser);
  await mockAI(page, ROUTINE);
  await page.goto(`${BASE}/workout/setup`);
  await answerSetup(page, ['get stronger without hurting my knees', 'dumbbells and a mat', '3-4 days, 40 minutes', 'bad knees, no jumping']);
  await shot(page, 'setup');
  await page.getByRole('button', { name: 'Make my routine!' }).click();
  const progress = page.getByTestId('routine-build-progress');
  await progress.getByText('Your routine is ready').waitFor();
  await shot(page, 'build');
  await progress.getByRole('button', { name: /See my routine/ }).click();
  await page.waitForURL(/\/workout\/routine\//);
  const routineUrl = page.url();

  await mockAI(page, CHANGE);
  const input = page.getByPlaceholder('Suggest changes or ask a question...');
  await input.fill('make leg day more single-leg, add calves');
  await input.press('Enter');
  await page.getByText('Swapped Friday').first().waitFor();
  await page.waitForTimeout(800);
  await page.locator('#routine-day-Friday').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await shot(page, 'review');

  // The routine editor, for the "do it yourself" step.
  await page.goto(routineUrl);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByText('Dumbbell Bench Press').first().waitFor();
  await page.waitForTimeout(800);
  // Monday's card just below the editor's sticky Save bar.
  await page.getByText('Dumbbell Bench Press').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -175));
  await shot(page, 'editor');

  // Today's workout: mid-set, then finished.
  await page.goto(`${BASE}/`);
  await page.getByRole('button', { name: 'Start Workout' }).click();
  const startSet = page.getByRole('button', { name: /^Start Set \d+$/ });
  const completeSet = page.getByRole('button', { name: /^Complete \d+ Reps$/ });
  const done = page.getByRole('heading', { name: /Completed!$/ });
  await startSet.waitFor();
  // Two sets done, the third in progress, with believable times on the clock.
  for (let i = 0; i < 5; i++) {
    await startSet.or(completeSet).first().waitFor();
    if (await completeSet.isVisible()) await completeSet.click(); else await startSet.click();
    await page.clock.runFor(i % 2 ? '01:25' : '00:48');
  }
  await page.waitForTimeout(1200);
  await completeSet.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.evaluate(() => window.scrollBy(0, 60));
  await shot(page, 'workout-set');
  for (let guard = 0; guard < 200; guard++) {
    // The celebration covers the session as soon as the last set is done.
    const celebration = done.or(page.getByRole('dialog'));
    await startSet.or(completeSet).or(celebration).first().waitFor();
    if (await celebration.count()) break;
    // Between sets the buttons can be mid-transition; only click one that's there.
    if (await completeSet.isVisible()) await completeSet.click({ timeout: 2000 }).catch(() => {});
    else if (await startSet.isVisible()) await startSet.click({ timeout: 2000 }).catch(() => {});
    else await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1500);

  // Log earlier workouts with dev mode's calendar tap (it reloads the page), to show a streak.
  await page.goto(`${BASE}/?dev=1`);
  for (const d of [2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 20, 21, 23]) {
    const cell = page.locator(`[title="Nov ${d}"]`).first();
    await cell.waitFor({ timeout: 15000 });
    await Promise.all([page.waitForEvent('load'), cell.click()]);
  }
  await page.locator('[title="Nov 2"]').first().waitFor();
  await page.waitForTimeout(1500);
  await page.getByText('day streak').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 330));
  await shot(page, 'streak');

} catch (err) {
  await page?.screenshot({ path: `${OUT}/_failure.png` }).catch(() => {});
  throw err;
} finally {
  await browser.close();
}

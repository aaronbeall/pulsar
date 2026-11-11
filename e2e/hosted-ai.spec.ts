import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { answerSetupQuestions, createRoutineFromTemplate } from './helpers';

// Hosted Pulsar AI: no key, a signed-in account spends its allowance through the site's API
// (worker/ai/routes.ts). The e2e server has no API, so these tests stand in for /api/me and
// /api/ai/*, answering AI calls as an OpenAI event stream the way the Worker passes it on.

const PLAN = {
  name: 'Hosted Builder',
  description: 'Built by hosted AI.',
  commentary: 'Made on the house, no key needed.',
  schedule: [{ day: 'Monday', kind: 'Full Body', exercises: [{ name: 'Push-up', sets: 3, reps: 10 }] }],
};

const EDIT = {
  commentary: 'Added a Friday mobility day.',
  patch: { dailySchedule: [{ op: 'setDay', day: 'Friday', kind: 'Mobility', exercises: [{ name: 'Plank', sets: 2, duration: 30 }] }] },
};

const sse = (content: string) =>
  `${(content.match(/[\s\S]{1,8}/g) || []).map((piece) => `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`).join('')}data: [DONE]\n\n`;

interface Allowance { plan: number; edit: number }

/** Mocks the account and hosted AI. `used` counts go up as calls succeed; returns the AI request bodies. */
async function mockHostedAI(page: Page, opts: { signedIn: boolean; used?: Allowance; limits?: Allowance }) {
  const used = { plan: 0, edit: 0, ...opts.used };
  const limits = { plan: 1, edit: 2, ...opts.limits };
  let signedIn = opts.signedIn;
  const aiRequests: { kind: string; body: any }[] = [];
  const authCalls: string[] = [];
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        signInAvailable: true,
        hostedAI: true,
        user: signedIn ? { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null } : null,
        ai: signedIn ? { tier: 'free', plan: { used: used.plan, limit: limits.plan }, edit: { used: used.edit, limit: limits.edit }, resetsAt: null } : null,
      },
    }),
  );
  await page.route('**/api/auth/**', (route) => {
    authCalls.push(new URL(route.request().url()).pathname.replace(/^.*\/api\/auth\//, ''));
    return route.fulfill({ json: { url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=e2e', redirect: true } });
  });
  // A stand-in Google page, so leaving for sign-in finishes loading before the test comes back
  // (an aborted request would leave a late error page racing the next navigation).
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Google</title>' }));
  await page.route('**/api/ai/*', (route) => {
    const kind = route.request().url().endsWith('/plan') ? 'plan' : 'edit';
    aiRequests.push({ kind, body: route.request().postDataJSON() });
    if (!signedIn) return route.fulfill({ status: 401, json: { code: 'signin_required', message: 'Sign in to use Pulsar AI.' } });
    if (used[kind] >= limits[kind]) return route.fulfill({ status: 429, json: { code: 'allowance_used', message: "You've used your free Pulsar AI." } });
    used[kind]++;
    return route.fulfill({ contentType: 'text/event-stream', body: sse(JSON.stringify(kind === 'plan' ? PLAN : EDIT)) });
  });
  return { aiRequests, authCalls, signIn: () => (signedIn = true) };
}

test('signed out, the AI gate offers free Pulsar AI with Google first and keeps the answers', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: false });
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', 'dumbbells', '3 days', 'none']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const gate = page.getByRole('dialog');
  await expect(gate.getByText('Try Pulsar AI free')).toBeVisible();
  // The key is folded away behind its own section while Pulsar AI is on offer.
  await expect(gate.getByPlaceholder('sk-...')).toBeHidden();
  await gate.getByRole('button', { name: 'Or use your own OpenAI key' }).click();
  await expect(gate.getByPlaceholder('sk-...')).toBeVisible();
  await expect(gate.getByRole('button', { name: 'Use this key' })).toBeDisabled();
  await gate.getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);
  expect(api.authCalls).toEqual(['sign-in/social']);

  // Coming back from Google reloads the app, and building carries on by itself with the
  // answers that were kept.
  api.signIn();
  await page.goto('/app/workout/setup');
  await expect(page.getByTestId('routine-build-progress').getByText('Your routine is ready')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.aiRequests).toHaveLength(1);
  expect(JSON.stringify(api.aiRequests[0].body)).toContain('dumbbells');
});

test('back from Google with the free plan already used, the gate opens again instead of building', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: false, used: { plan: 1, edit: 0 } });
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', '', '', '']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);

  api.signIn();
  await page.goto('/app/workout/setup');
  await expect(page.getByRole('dialog').getByText("You've used your free AI.", { exact: false })).toBeVisible();
  expect(api.aiRequests).toHaveLength(0);
});

test('cancelling at Google comes back to the answers with nothing started', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: false });
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', '', '', 'none']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);

  await page.goto('/app/workout/setup'); // still signed out
  await expect(page.getByRole('textbox')).toHaveValue('none');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.aiRequests).toHaveLength(0);
});

test('a chat message sends by itself after signing in from the gate', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: false });
  await createRoutineFromTemplate(page);
  const routineUrl = page.url();

  const chat = page.getByPlaceholder('Suggest changes or ask a question...');
  await chat.fill('Add a mobility day on Friday');
  await chat.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(/accounts\.google\.com/);

  api.signIn();
  await page.goto(routineUrl);
  await expect(page.getByText('Added a Friday mobility day.')).toBeVisible();
  expect(api.aiRequests.map((r) => r.body.message)).toEqual(['Add a mobility day on Friday']);
});

test('signed in with allowance left, AI builds the routine with no key and no prompt', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: true });
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', 'bodyweight', '1 day', 'none']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const progress = page.getByTestId('routine-build-progress');
  await expect(progress.getByText('Your routine is ready')).toBeVisible();
  await expect(progress.getByText('Made on the house')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await progress.getByRole('button', { name: 'See my routine & make changes' }).click();
  await expect(page.getByText('Hosted Builder')).toBeVisible();
  expect(api.aiRequests.map((r) => r.kind)).toEqual(['plan']);
});

test('chat edits use the hosted allowance, then the gate says it is used up', async ({ page }) => {
  const api = await mockHostedAI(page, { signedIn: true, used: { plan: 1, edit: 1 } });
  await createRoutineFromTemplate(page);

  const chat = page.getByPlaceholder('Suggest changes or ask a question...');
  await chat.fill('Add a mobility day on Friday');
  await chat.press('Enter');
  await expect(page.getByText('Added a Friday mobility day.')).toBeVisible();
  expect(api.aiRequests[0].body.message).toBe('Add a mobility day on Friday');
  expect(api.aiRequests[0].body.schedule.length).toBeGreaterThan(0);

  // That was the last free edit: the next message opens the gate instead of calling the API.
  await chat.fill('Make Monday shorter');
  await chat.press('Enter');
  const gate = page.getByRole('dialog');
  await expect(gate.getByText('Keep using Pulsar AI')).toBeVisible();
  await expect(gate.getByText("You've used your free AI.", { exact: false })).toBeVisible();
  await expect(gate.getByPlaceholder('sk-...')).toBeVisible();
  expect(api.aiRequests).toHaveLength(1);
});

test('after subscribing from the gate, the chat message sends by itself and the app says thanks', async ({ page }) => {
  let tier: 'free' | 'pulsar_ai' = 'free';
  let meCallsAfterReturn = 0;
  let returned = false;
  const aiRequests: string[] = [];
  const checkoutBodies: any[] = [];
  await page.route('**/api/me', (route) => {
    // Stripe's webhook lands a few seconds after the redirect back.
    if (returned && ++meCallsAfterReturn >= 3) tier = 'pulsar_ai';
    const limits = tier === 'free' ? { plan: 1, edit: 2 } : { plan: 20, edit: 200 };
    const used = tier === 'free' ? { plan: 1, edit: 2 } : { plan: 0, edit: 0 };
    return route.fulfill({
      json: {
        signInAvailable: true, hostedAI: true, billing: true,
        user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null },
        ai: { tier, plan: { used: used.plan, limit: limits.plan }, edit: { used: used.edit, limit: limits.edit }, resetsAt: null },
        subscription: tier === 'pulsar_ai' ? { status: 'active', interval: 'year', currentPeriodEnd: Date.UTC(2027, 10, 2), cancelAtPeriodEnd: false } : null,
      },
    });
  });
  await page.route('**/api/billing/checkout', (route) => {
    checkoutBodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { url: 'https://checkout.stripe.com/c/pay/e2e' } });
  });
  await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Stripe</title>' }));
  await page.route('**/api/ai/edit', (route) => {
    aiRequests.push(route.request().postDataJSON().message);
    return route.fulfill({ contentType: 'text/event-stream', body: sse(JSON.stringify(EDIT)) });
  });

  await createRoutineFromTemplate(page);
  const chat = page.getByPlaceholder('Suggest changes or ask a question...');
  await chat.fill('Add a mobility day on Friday');
  await chat.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: /\$29\.99\/year/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/);

  // Stripe sends the user back to success_url: the page they started on, plus ?subscribed=1.
  const back = checkoutBodies[0].returnTo as string;
  returned = true;
  await page.goto(back + (back.includes('?') ? '&' : '?') + 'subscribed=1');
  await expect(page.getByText('Welcome to Pulsar AI')).toBeVisible();
  await expect(page.getByText('Added a Friday mobility day.')).toBeVisible({ timeout: 15_000 });
  expect(aiRequests).toEqual(['Add a mobility day on Friday']);
});

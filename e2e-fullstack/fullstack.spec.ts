import type { Page } from '@playwright/test';
import { test, expect } from '../e2e/fixtures';
import { answerSetupQuestions, createRoutineFromTemplate } from '../e2e/helpers';
import { recordingById } from '../worker/ai/replay';

// The real Worker and database (playwright.fullstack.config.ts): sign-in, hosted AI allowance
// counting, the Account tools, and subscribing and cancelling through (fake) Stripe pages.
// Tester accounts are listed in e2e-fullstack/worker.env; their AI replays recordings.

/**
 * Signs the page in as `email` with the e2e-only email sign-in (worker/auth.ts), creating the
 * account the first time. Tester accounts are reset to a fresh free account, so a test can run
 * again against the same server.
 */
async function signIn(page: Page, email: string) {
  // Better Auth checks the Origin of sign-in requests.
  const headers = { Origin: new URL(test.info().project.use.baseURL!).origin };
  const data = { email, password: 'e2e-password-123', name: email.split('@')[0] };
  const signUp = await page.request.post('/api/auth/sign-up/email', { data, headers });
  if (!signUp.ok()) {
    const signInRes = await page.request.post('/api/auth/sign-in/email', { data, headers });
    expect(signInRes.ok(), await signInRes.text()).toBe(true);
  }
  const me = await (await page.request.get('/api/me')).json();
  expect(me.user?.email).toBe(email);
  if (me.tester) {
    await page.request.post('/api/dev/usage', { data: { action: 'reset' } });
    await page.request.post('/api/dev/subscription', { data: { state: 'none' } });
  }
  return me;
}

const opening = (id: string) => (JSON.parse(recordingById(id).content).commentary as string).trim().slice(0, 40);
const meter = (page: Page, name: 'Routine plans' | 'AI edits') => page.getByTestId('account-card').getByRole('meter', { name });

test('a tester builds a routine with hosted AI from a recording, and it counts against the allowance', async ({ page }) => {
  await signIn(page, 'tester-1@e2e.test');
  const plan = recordingById('plan-dumbbells-knees');
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, (plan.input.answers as Array<{ answer: string }>).map((a) => a.answer));
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const progress = page.getByTestId('routine-build-progress');
  await expect(progress.getByText('Your routine is ready')).toBeVisible();
  await expect(progress.getByText(opening(plan.id), { exact: false })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/app/settings');
  await expect(meter(page, 'Routine plans')).toHaveAttribute('aria-valuetext', '0 of 1 left');
  await expect(meter(page, 'AI edits')).toHaveAttribute('aria-valuetext', '2 of 2 left');
});

test('free AI edits run out on the server, then the gate offers Pulsar AI', async ({ page }) => {
  await signIn(page, 'tester-2@e2e.test');
  await createRoutineFromTemplate(page, 'Strength Builder');
  const chat = page.getByPlaceholder('Suggest changes or ask a question...');

  for (const id of ['edit-friday-rest', 'question-rest-time']) {
    await chat.fill(recordingById(id).input.message as string);
    await chat.press('Enter');
    await expect(page.getByText(opening(id), { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId('ai-streaming-reply')).toHaveCount(0);
  }

  await chat.fill('add a short cardio day on Saturday');
  await chat.press('Enter');
  const gate = page.getByRole('dialog');
  await expect(gate.getByText('Keep using Pulsar AI')).toBeVisible();
  const me = await (await page.request.get('/api/me')).json();
  expect(me.ai.edit).toEqual({ used: 2, limit: 2 });
});

test('Account tools use up and reset the allowance and pretend to subscribe', async ({ page }) => {
  await signIn(page, 'tester-3@e2e.test');
  await page.goto('/app/settings?dev=1');
  const tools = page.getByTestId('account-tools');
  await expect(tools).toBeVisible();

  await tools.getByRole('button', { name: 'Use up allowance' }).click();
  await expect(meter(page, 'Routine plans')).toHaveAttribute('aria-valuetext', '0 of 1 left');
  await expect(meter(page, 'AI edits')).toHaveAttribute('aria-valuetext', '0 of 2 left');
  await tools.getByRole('button', { name: 'Reset AI usage' }).click();
  await expect(meter(page, 'Routine plans')).toHaveAttribute('aria-valuetext', '1 of 1 left');

  const card = page.getByTestId('account-card');
  await tools.getByRole('radio', { name: 'Subscribed', exact: true }).click();
  await expect(meter(page, 'Routine plans')).toHaveAttribute('aria-valuetext', '20 of 20 left');
  await expect(card.getByTestId('subscription')).toContainText('Monthly plan, renews');
  await expect(card.getByTestId('upgrade')).toHaveCount(0);

  await tools.getByRole('radio', { name: 'Past due', exact: true }).click();
  await expect(card.getByTestId('subscription')).toContainText('Payment failed');

  await tools.getByRole('radio', { name: 'Cancelling', exact: true }).click();
  await expect(card.getByTestId('subscription')).toContainText('Monthly plan, ends');

  await tools.getByRole('radio', { name: 'Cancelled', exact: true }).click();
  await expect(card.getByTestId('subscription')).toHaveCount(0);
  await expect(card.getByTestId('upgrade')).toBeVisible();
  await expect(meter(page, 'Routine plans')).toHaveAttribute('aria-valuetext', '1 of 1 left');
});

test('regular accounts get no Account tools, and their AI never gets a recording', async ({ page }) => {
  const me = await signIn(page, `regular-${Date.now()}@e2e.test`);
  expect(me.tester).toBeUndefined();
  await page.goto('/app/settings?dev=1');
  await expect(page.getByTestId('developer-settings')).toBeVisible();
  await expect(page.getByTestId('account-card')).toContainText(me.user.email);
  await expect(page.getByTestId('account-tools')).toHaveCount(0);

  expect((await page.request.post('/api/dev/usage', { data: { action: 'reset' } })).status()).toBe(403);
  expect((await page.request.post('/api/dev/subscription', { data: { state: 'active' } })).status()).toBe(403);
  // Hosted AI for everyone else goes to OpenAI, which the e2e server points at a dead address.
  const ai = await page.request.post('/api/ai/plan', { data: recordingById('plan-gym-muscle').input });
  expect(ai.status()).toBe(502);
  const after = await (await page.request.get('/api/me')).json();
  expect(after.ai.plan.used).toBe(0); // a failed call gives the allowance back
});

test('subscribing through Checkout and cancelling in the portal', async ({ page }) => {
  await signIn(page, `subscriber-${Date.now()}@e2e.test`);
  await page.goto('/app/settings');
  const card = page.getByTestId('account-card');

  await card.getByTestId('upgrade').getByRole('button', { name: '$3.99/month' }).click();
  await expect(page.getByRole('heading', { name: 'Fake Stripe Checkout' })).toBeVisible();
  await page.getByRole('button', { name: 'Subscribe' }).click();

  // Back in the app after the webhook: the account is on Pulsar AI.
  await expect(page.getByText('Welcome to Pulsar AI')).toBeVisible();
  await expect(meter(page, 'AI edits')).toHaveAttribute('aria-valuetext', '200 of 200 left');
  await expect(card.getByTestId('subscription')).toContainText('Monthly plan, renews');

  await card.getByRole('button', { name: 'Manage subscription' }).click();
  await expect(page.getByRole('heading', { name: 'Fake Stripe Portal' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel plan' }).click();
  await expect(card.getByTestId('subscription')).toContainText('Monthly plan, ends');

  // The period runs out: Stripe deletes the subscription and the account is free again.
  await card.getByRole('button', { name: 'Manage subscription' }).click();
  await page.getByRole('button', { name: 'End now' }).click();
  await expect(card.getByTestId('upgrade')).toBeVisible();
  await expect(card.getByTestId('subscription')).toHaveCount(0);
});

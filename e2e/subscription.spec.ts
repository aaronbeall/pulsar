import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { answerSetupQuestions } from './helpers';

// Pulsar AI subscriptions. The e2e server has no API, so these tests stand in for /api/me
// and /api/billing/* (worker/billing/routes.ts); Stripe's pages are never loaded.

type Tier = 'free' | 'pulsar_ai';

async function mockAccount(page: Page, tier: Tier, used = { plan: 0, edit: 0 }) {
  const limits = tier === 'free' ? { plan: 1, edit: 2 } : { plan: 20, edit: 200 };
  const billingCalls: { path: string; body: any }[] = [];
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        signInAvailable: true,
        hostedAI: true,
        billing: true,
        user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null },
        ai: { tier, plan: { used: used.plan, limit: limits.plan }, edit: { used: used.edit, limit: limits.edit }, resetsAt: tier === 'free' ? null : Date.UTC(2026, 11, 1) },
        subscription: tier === 'pulsar_ai' ? { status: 'active', interval: 'year', currentPeriodEnd: Date.UTC(2027, 10, 2), cancelAtPeriodEnd: false } : null,
      },
    }),
  );
  await page.route('**/api/billing/*', (route) => {
    const path = new URL(route.request().url()).pathname.split('/').pop()!;
    billingCalls.push({ path, body: route.request().postDataJSON() });
    const url = path === 'checkout' ? 'https://checkout.stripe.com/c/pay/e2e' : 'https://billing.stripe.com/p/session/e2e';
    return route.fulfill({ json: { url } });
  });
  return billingCalls;
}

test('when the free AI is used up, the gate offers Pulsar AI and goes to Stripe Checkout', async ({ page }) => {
  const calls = await mockAccount(page, 'free', { plan: 1, edit: 0 });
  await page.goto('/app/workout/setup');
  await answerSetupQuestions(page, ['get stronger', '', '', '']);
  await page.getByRole('button', { name: 'Make my routine!' }).click();

  const gate = page.getByRole('dialog');
  await expect(gate.getByText('Get Pulsar AI')).toBeVisible();
  await expect(gate.getByText('Or use your own OpenAI key')).toBeVisible();
  const toStripe = page.waitForRequest((req) => req.url().startsWith('https://checkout.stripe.com/'));
  await gate.getByRole('button', { name: /\$29\.99\/year/ }).click();
  await toStripe;
  expect(calls).toEqual([{ path: 'checkout', body: { interval: 'year', returnTo: '/app/workout/setup' } }]);
});

test('a subscriber sees their plan in Settings and can manage it in Stripe', async ({ page }) => {
  const calls = await mockAccount(page, 'pulsar_ai', { plan: 2, edit: 10 });
  await page.goto('/app/settings');
  const card = page.getByTestId('account-card');
  await expect(card.getByText('18 of 20 routine plans left', { exact: false })).toBeVisible();
  await expect(card.getByText('Yearly plan, renews', { exact: false })).toBeVisible();
  await expect(card.getByTestId('upgrade')).toHaveCount(0);

  const toPortal = page.waitForRequest((req) => req.url().startsWith('https://billing.stripe.com/'));
  await card.getByRole('button', { name: 'Manage subscription' }).click();
  await toPortal;
  expect(calls.map((c) => c.path)).toEqual(['portal']);
});

test('coming back from checkout thanks the user', async ({ page }) => {
  await mockAccount(page, 'pulsar_ai');
  await page.goto('/app/settings?subscribed=1');
  await expect(page.getByText('Welcome to Pulsar AI')).toBeVisible();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test('free accounts can upgrade from Settings', async ({ page }) => {
  const calls = await mockAccount(page, 'free');
  await page.goto('/app/settings');
  const upgrade = page.getByTestId('account-card').getByTestId('upgrade');
  await expect(upgrade).toBeVisible();
  // Auto-renewal and the terms are stated before purchase.
  await expect(upgrade.getByTestId('upgrade-terms')).toContainText('Renews automatically');
  await expect(upgrade.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms/');
  const toStripe = page.waitForRequest((req) => req.url().startsWith('https://checkout.stripe.com/'));
  await upgrade.getByRole('button', { name: '$3.99/month' }).click();
  await toStripe;
  expect(calls[0].body.interval).toBe('month');
});

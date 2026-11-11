// A stand-in for the few Stripe endpoints the Worker calls (worker/billing/stripe.ts), plus
// stand-in Checkout and Customer Portal pages that act like Stripe's: finishing them changes
// the subscription and sends the Worker a signed webhook, then returns to the app. The Worker
// reaches it through STRIPE_API_BASE; the browser loads its pages on localhost.
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_STRIPE_PORT || 8790);
const PUBLIC = `http://localhost:${PORT}`;
const WORKER = process.env.WORKER_URL || 'http://127.0.0.1:8788';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_e2e';
const PRICES = { price_e2e_month: 'month', price_e2e_year: 'year' };
const DAY = 24 * 60 * 60;

let counter = 0;
const sessions = new Map(); // checkout session id -> { userId, email, interval, successUrl, cancelUrl, customer }
const subscriptions = new Map(); // subscription id -> Stripe-shaped subscription
const portals = new Map(); // portal session id -> { customer, returnUrl }

const now = () => Math.floor(Date.now() / 1000);

function subscriptionObject({ id, customer, userId, interval }) {
  return {
    id,
    object: 'subscription',
    customer,
    status: 'active',
    cancel_at_period_end: false,
    metadata: { userId },
    items: { data: [{ current_period_end: now() + (interval === 'year' ? 365 : 30) * DAY, price: { recurring: { interval } } }] },
  };
}

async function sendWebhook(type, object) {
  const body = JSON.stringify({ id: `evt_e2e_${++counter}`, object: 'event', type, data: { object } });
  const t = now();
  const sig = createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  const res = await fetch(`${WORKER}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${sig}` },
    body,
  });
  if (!res.ok) throw new Error(`Webhook ${type} failed: ${res.status} ${await res.text()}`);
}

/** Form-encoded Stripe params (a[b][c]=v) to a flat map of their full names. */
const formParams = (raw) => Object.fromEntries(new URLSearchParams(raw));

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const page = (res, title, html) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>${title}</title><h1>${title}</h1>${html}`);
};
const redirect = (res, location) => {
  res.writeHead(303, { Location: location });
  res.end();
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC);
  const raw = await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true });
    // --- The API the Worker calls ---
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const p = formParams(raw);
      const id = `cs_e2e_${++counter}`;
      const price = p['line_items[0][price]'];
      sessions.set(id, {
        userId: p['metadata[userId]'] || p.client_reference_id,
        interval: PRICES[price] || 'month',
        successUrl: p.success_url,
        cancelUrl: p.cancel_url,
        customer: p.customer || `cus_e2e_${counter}`,
      });
      return json(res, 200, { id, url: `${PUBLIC}/checkout/${id}` });
    }
    if (req.method === 'POST' && url.pathname === '/v1/billing_portal/sessions') {
      const p = formParams(raw);
      const id = `bps_e2e_${++counter}`;
      portals.set(id, { customer: p.customer, returnUrl: p.return_url });
      return json(res, 200, { id, url: `${PUBLIC}/portal/${id}` });
    }
    const subMatch = url.pathname.match(/^\/v1\/subscriptions\/([^/]+)$/);
    if (req.method === 'GET' && subMatch) {
      const sub = subscriptions.get(decodeURIComponent(subMatch[1]));
      return sub ? json(res, 200, sub) : json(res, 404, { error: { message: 'No such subscription' } });
    }

    // --- Pages the browser visits instead of Stripe's ---
    const checkout = url.pathname.match(/^\/checkout\/([^/]+)(\/pay)?$/);
    if (checkout) {
      const session = sessions.get(checkout[1]);
      if (!session) return json(res, 404, { error: { message: 'No such checkout session' } });
      if (!checkout[2]) {
        return page(res, 'Fake Stripe Checkout', `<form method="post" action="/checkout/${checkout[1]}/pay"><button>Subscribe</button></form><a href="${session.cancelUrl}">Back</a>`);
      }
      const subId = `sub_e2e_${++counter}`;
      subscriptions.set(subId, subscriptionObject({ id: subId, customer: session.customer, userId: session.userId, interval: session.interval }));
      await sendWebhook('checkout.session.completed', {
        id: checkout[1], object: 'checkout.session', mode: 'subscription', subscription: subId, client_reference_id: session.userId,
      });
      return redirect(res, session.successUrl);
    }
    const portal = url.pathname.match(/^\/portal\/([^/]+)(\/cancel|\/end)?$/);
    if (portal) {
      const session = portals.get(portal[1]);
      if (!session) return json(res, 404, { error: { message: 'No such portal session' } });
      const sub = [...subscriptions.values()].find((s) => s.customer === session.customer && s.status !== 'canceled');
      if (!portal[2]) {
        return page(
          res,
          'Fake Stripe Portal',
          `<form method="post" action="/portal/${portal[1]}/cancel"><button>Cancel plan</button></form>` +
            `<form method="post" action="/portal/${portal[1]}/end"><button>End now</button></form>` +
            `<a href="${session.returnUrl}">Return to Pulsar</a>`,
        );
      }
      if (sub && portal[2] === '/cancel') {
        sub.cancel_at_period_end = true;
        await sendWebhook('customer.subscription.updated', sub);
      } else if (sub) {
        // What Stripe sends when a cancelled subscription reaches its period end.
        sub.status = 'canceled';
        sub.items.data[0].current_period_end = now() - DAY;
        await sendWebhook('customer.subscription.deleted', sub);
      }
      return redirect(res, session.returnUrl);
    }
    return json(res, 404, { error: { message: `Fake Stripe has no ${req.method} ${url.pathname}` } });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: { message: String(e) } });
  }
});

server.listen(PORT, () => console.log(`Fake Stripe on ${PUBLIC}`));

-- Pulsar AI subscriptions (Stripe, with Managed Payments). One row per account, kept in step
-- with Stripe by the webhook. Times are ms since the epoch.
CREATE TABLE "subscription" (
  "userId" text NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "stripeCustomerId" text NOT NULL,
  "stripeSubscriptionId" text NOT NULL UNIQUE,
  "status" text NOT NULL,             -- Stripe's: active, trialing, past_due, canceled, unpaid...
  "interval" text,                    -- 'month' | 'year'
  "currentPeriodEnd" integer,
  "cancelAtPeriodEnd" integer NOT NULL DEFAULT 0,
  "updatedAt" integer NOT NULL
);
CREATE INDEX "subscription_customer_idx" ON "subscription" ("stripeCustomerId");

-- Stripe event ids already handled: Stripe can deliver an event more than once.
CREATE TABLE "stripe_event" (
  "id" text NOT NULL PRIMARY KEY,
  "createdAt" integer NOT NULL
);

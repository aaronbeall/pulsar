-- One row per hosted AI call: reserved before calling OpenAI, then settled with the real
-- token counts and cost (or marked failed, which gives the allowance back). Times are ms
-- since the epoch. Deleting an account deletes its usage.
CREATE TABLE "ai_usage" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "kind" text NOT NULL,          -- 'plan' | 'edit'
  "status" text NOT NULL,        -- 'reserved' | 'done' | 'failed'
  "model" text NOT NULL,
  "inputTokens" integer,
  "cachedTokens" integer,
  "outputTokens" integer,
  "costMicros" integer NOT NULL, -- millionths of a dollar; an estimate until settled
  "createdAt" integer NOT NULL
);
CREATE INDEX "ai_usage_user_idx" ON "ai_usage" ("userId", "createdAt");
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" ("createdAt");

import { Hono } from 'hono';
import { currentUser } from '../session';
import { AIKind } from './plans';
import { BadRequest, messagesFor } from './request';
import { usageTap } from './stream';
import { getTier, release, reserve, settle, spentToday, usageSummary, UsageSummary } from './usage';

// Hosted Pulsar AI: POST /api/ai/plan and /api/ai/edit. Signed-in accounts spend their
// allowance (plans.ts); the reply is OpenAI's own event stream, passed straight through, so
// the app reads it exactly like a bring-your-own-key reply.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_DAILY_BUDGET_USD = 10;

type Env_ = { Bindings: Env };

export const hostedAIAvailable = (env: Env) => Boolean(env.OPENAI_API_KEY);
// OPENAI_URL is only for local testing against a fake OpenAI (see README).
const openaiUrl = (env: Env) => (env as { OPENAI_URL?: string }).OPENAI_URL || OPENAI_URL;
const modelFor = (env: Env) => env.AI_MODEL || DEFAULT_MODEL;
const dailyBudgetMicros = (env: Env) => Math.round((Number(env.AI_DAILY_BUDGET_USD) || DEFAULT_DAILY_BUDGET_USD) * 1_000_000);

/** The allowance shown in the app (part of /api/me). */
export async function aiStatus(env: Env, userId: string): Promise<UsageSummary | null> {
  if (!hostedAIAvailable(env)) return null;
  return usageSummary(env.DB, userId, await getTier(env.DB, userId));
}

const error = (code: string, message: string, status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  Response.json({ code, message, ...extra }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export const aiRoutes = new Hono<Env_>();

for (const kind of ['plan', 'edit'] as AIKind[]) {
  aiRoutes.post(`/${kind}`, async (c) => {
    const env = c.env;
    if (!hostedAIAvailable(env)) return error('unavailable', 'Pulsar AI is not available here.', 503);

    const userId = (await currentUser(env, c.req.raw))?.id;
    if (!userId) return error('signin_required', 'Sign in to use Pulsar AI.', 401);

    let messages;
    try {
      messages = messagesFor(kind, await c.req.json().catch(() => null));
    } catch (e) {
      if (e instanceof BadRequest) return error('bad_request', e.message, 400);
      throw e;
    }

    // Global circuit breaker: fail closed rather than let a spike or bug run up the bill.
    if ((await spentToday(env.DB)) >= dailyBudgetMicros(env)) {
      return error('busy', 'Pulsar AI is very busy right now. Try again later.', 503);
    }

    const tier = await getTier(env.DB, userId);
    const model = modelFor(env);
    const reservation = await reserve(env.DB, userId, tier, kind, model);
    if ('denied' in reservation) {
      const usage = await usageSummary(env.DB, userId, tier);
      const messagesByReason = {
        allowance_used: tier === 'free' ? "You've used your free Pulsar AI." : "You've used this month's Pulsar AI.",
        burst_limit: "That's a lot of AI requests in a few minutes. Wait a moment and try again.",
        daily_limit: "You've reached today's limit for AI messages. Try again tomorrow.",
        cost_cap: "You've reached this month's Pulsar AI limit.",
      };
      const retryAfter = 'retryAfter' in reservation ? reservation.retryAfter : undefined;
      return error(
        reservation.denied,
        messagesByReason[reservation.denied],
        429,
        { usage, ...(retryAfter ? { retryAfter } : {}) },
        retryAfter ? { 'Retry-After': String(retryAfter) } : {}
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(openaiUrl(env), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          stream: true,
          stream_options: { include_usage: true },
          ...(/^(gpt-5|o\d)/.test(model) ? { reasoning_effort: 'low' } : {}),
          user: userId, // lets OpenAI attribute abuse to an account
        }),
      });
    } catch {
      await release(env.DB, reservation.id);
      return error('upstream', 'Could not reach the AI service. Try again.', 502);
    }
    if (!upstream.ok || !upstream.body) {
      await release(env.DB, reservation.id);
      console.error('OpenAI error', upstream.status, await upstream.text().catch(() => ''));
      return error('upstream', 'The AI service had a problem. Try again.', 502);
    }

    const tap = usageTap((usage) => {
      c.executionCtx.waitUntil(settle(env.DB, reservation.id, model, usage));
    });
    return new Response(upstream.body.pipeThrough(tap), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
    });
  });
}

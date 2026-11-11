// Records real OpenAI replies for the requests in worker/ai/recordings/cases.ts and saves
// them in worker/ai/recordings/replies.json, where the e2e tests and tester accounts replay
// them (worker/ai/replay.ts). Costs a few cents per full run.
//
//   OPENAI_API_KEY=sk-... npm run ai:record              # missing or stale recordings only
//   OPENAI_API_KEY=sk-... npm run ai:record -- --all     # every case again
//   OPENAI_API_KEY=sk-... npm run ai:record -- --only plan-gym-muscle,edit-friday-rest
//
// AI_MODEL picks the model (default: the hosted model, gpt-5-mini). The request is the one
// the Worker sends (worker/ai/routes.ts), minus streaming.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeChangeResponse, normalizeRoutineResponse } from '../src/services/ai/normalize';
import { costMicros, type TokenUsage } from '../worker/ai/plans';
import { messagesFor } from '../worker/ai/request';
import { RECORDING_CASES } from '../worker/ai/recordings/cases';
import { promptKey, staleCases, type RecordedReply } from '../worker/ai/replay';

const REPLIES_PATH = fileURLToPath(new URL('../worker/ai/recordings/replies.json', import.meta.url));
const OPENAI_URL = process.env.OPENAI_URL || 'https://api.openai.com/v1/chat/completions';
const model = process.env.AI_MODEL || 'gpt-5-mini';
const apiKey = process.env.OPENAI_API_KEY;

const args = process.argv.slice(2);
const all = args.includes('--all');
const onlyAt = args.findIndex((a) => a.startsWith('--only'));
const only =
  onlyAt === -1
    ? null
    : (args[onlyAt].includes('=') ? args[onlyAt].split('=')[1] : args[onlyAt + 1] ?? '').split(',').filter(Boolean);

if (!apiKey) {
  console.error('Set OPENAI_API_KEY to record. Recording calls OpenAI once per case (a few cents in all).');
  process.exit(1);
}
if (only) {
  const unknown = only.filter((id) => !RECORDING_CASES.some((c) => c.id === id));
  if (unknown.length) {
    console.error(`Unknown case ids: ${unknown.join(', ')}`);
    process.exit(1);
  }
}

const existing: RecordedReply[] = JSON.parse(readFileSync(REPLIES_PATH, 'utf8'));
const stale = new Set(staleCases(existing).map((c) => c.id));
const toRecord = RECORDING_CASES.filter((c) => (only ? only.includes(c.id) : all || stale.has(c.id)));
if (!toRecord.length) {
  console.log('Every recording is up to date. Use --all to record them again.');
  process.exit(0);
}

async function record(messages: ReturnType<typeof messagesFor>) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      ...(/^(gpt-5|o\d)/.test(model) ? { reasoning_effort: 'low' } : {}),
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${body?.error?.message ?? 'request failed'}`);
  const content: string | undefined = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');
  const u = body.usage;
  const usage: TokenUsage | null = u
    ? { inputTokens: u.prompt_tokens ?? 0, cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0, outputTokens: u.completion_tokens ?? 0 }
    : null;
  return { content, usage, model: String(body.model ?? model) };
}

const byId = new Map(existing.map((r) => [r.id, r]));
let spent = 0;
let failed = 0;
for (const c of toRecord) {
  const messages = messagesFor(c.kind, c.input);
  process.stdout.write(`${c.id}: `);
  try {
    const { content, usage, model: answeredBy } = await record(messages);
    // Fail now, not in a test later, if the reply isn't something the app can use.
    const parsed = JSON.parse(content);
    if (c.kind === 'plan') normalizeRoutineResponse(parsed);
    else normalizeChangeResponse(parsed);
    byId.set(c.id, {
      id: c.id,
      kind: c.kind,
      label: c.label,
      input: c.input,
      promptKey: promptKey(messages),
      model: answeredBy,
      recordedAt: new Date().toISOString(),
      content,
      usage,
    });
    const cost = usage ? costMicros(model, usage) : 0;
    spent += cost;
    console.log(`recorded (${usage?.outputTokens ?? '?'} output tokens, $${(cost / 1e6).toFixed(4)})`);
  } catch (e) {
    failed++;
    console.log(`FAILED: ${e instanceof Error ? e.message : e}`);
  }
}

// Keep the cases' order, and drop recordings whose case is gone.
const out = RECORDING_CASES.map((c) => byId.get(c.id)).filter((r): r is RecordedReply => Boolean(r));
writeFileSync(REPLIES_PATH, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nSaved ${REPLIES_PATH}. Spent about $${(spent / 1e6).toFixed(3)}.`);
const stillStale = staleCases(out);
if (stillStale.length) console.log(`Still missing or stale: ${stillStale.map((c) => c.id).join(', ')}`);
if (failed) process.exit(1);

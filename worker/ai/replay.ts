import type { OpenAIMessage } from '../../src/services/ai/prompts';
import type { AIKind, TokenUsage } from './plans';
import { messagesFor } from './request';
import { RECORDING_CASES } from './recordings/cases';
import replies from './recordings/replies.json';

// Recorded OpenAI replies (scripts/record-ai-replies.ts), replayed instead of calling OpenAI:
// by the e2e tests for both AI paths, and by the Worker for tester accounts (../testers.ts).
// Pure and free of browser and Worker-only APIs, so Node (Playwright, Vitest) can use it too.

export interface RecordedReply {
  id: string;
  kind: AIKind;
  label: string;
  /** The app's request body (see recordings/cases.ts). */
  input: Record<string, unknown>;
  /** promptKey() of the messages sent to OpenAI when this was recorded. */
  promptKey: string;
  /** The model that answered, or "hand-written" for a stand-in that was never recorded. */
  model: string;
  recordedAt: string | null;
  /** The assistant message: the JSON text the app parses. */
  content: string;
  usage: TokenUsage | null;
}

export const RECORDINGS = replies as RecordedReply[];

export const RERECORD_HINT = 'Re-record the AI replies: OPENAI_API_KEY=sk-... npm run ai:record (or run the "Record AI replies" workflow).';

/**
 * A short fingerprint of the exact messages sent to OpenAI. A recording only fits a request
 * whose prompt has the same key, so any change to the prompts or the input shows up as a
 * different key. (cyrb53: fast and stable, not cryptographic, which is fine here.)
 */
export function promptKey(messages: OpenAIMessage[]): string {
  const str = JSON.stringify(messages.map(({ role, content }) => [role, content]));
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** The prompt key a case's input produces with today's prompt code. */
export const currentPromptKey = (kind: AIKind, input: unknown) => promptKey(messagesFor(kind, input));

/** Cases whose recording is missing or was made from a different prompt. */
export function staleCases(recordings: RecordedReply[] = RECORDINGS) {
  return RECORDING_CASES.filter((c) => {
    const rec = recordings.find((r) => r.id === c.id);
    return !rec || rec.kind !== c.kind || rec.promptKey !== currentPromptKey(c.kind, c.input);
  });
}

export function recordingById(id: string, recordings: RecordedReply[] = RECORDINGS): RecordedReply {
  const rec = recordings.find((r) => r.id === id);
  if (!rec) throw new Error(`No recorded AI reply "${id}". ${RERECORD_HINT}`);
  return rec;
}

/** The words of what the user typed, for matching a request that has no exact recording. */
function userWords(kind: AIKind, input: unknown): Set<string> {
  const b = (input ?? {}) as Record<string, any>;
  const text =
    kind === 'plan'
      ? (Array.isArray(b.answers) ? b.answers.map((a: any) => String(a?.answer ?? '')).join(' ') : '')
      : String(b.message ?? '');
  return new Set(text.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []);
}

/**
 * The recording to answer a request with: the one recorded from this exact prompt, otherwise
 * the one of the same kind whose user text shares the most words (testers type anything).
 * A question ("how", "what"...) prefers question recordings, so it isn't answered with a change.
 */
export function findRecording(kind: AIKind, input: unknown, recordings: RecordedReply[] = RECORDINGS): RecordedReply | null {
  const ofKind = recordings.filter((r) => r.kind === kind);
  if (!ofKind.length) return null;
  const key = currentPromptKey(kind, input);
  const exact = ofKind.find((r) => r.promptKey === key);
  if (exact) return exact;

  const words = userWords(kind, input);
  const asksQuestion = kind === 'edit' && /\?\s*$|^(how|what|why|when|which|should|can|is|are|do|does)\b/i.test(String((input as any)?.message ?? '').trim());
  let best = ofKind[0];
  let bestScore = -1;
  for (const rec of ofKind) {
    const theirs = userWords(kind, rec.input);
    let score = 0;
    for (const w of words) if (theirs.has(w)) score++;
    if (kind === 'edit' && asksQuestion === rec.id.startsWith('question-')) score += 100;
    if (score > bestScore) {
      best = rec;
      bestScore = score;
    }
  }
  return best;
}

/**
 * A reply as OpenAI's streaming chat completion sends it: content in small deltas, then a
 * usage event (requested with stream_options.include_usage), then [DONE].
 */
export function replayEvents(content: string, usage: TokenUsage | null = null, piece = 12): string[] {
  const chunk = (delta: object, extra: object = {}) =>
    `data: ${JSON.stringify({ id: 'chatcmpl-replay', object: 'chat.completion.chunk', choices: [{ index: 0, delta }], ...extra })}\n\n`;
  const events = (content.match(new RegExp(`[\\s\\S]{1,${piece}}`, 'g')) ?? []).map((p) => chunk({ content: p }));
  if (usage) {
    events.push(
      `data: ${JSON.stringify({
        id: 'chatcmpl-replay',
        object: 'chat.completion.chunk',
        choices: [],
        usage: {
          prompt_tokens: usage.inputTokens,
          completion_tokens: usage.outputTokens,
          prompt_tokens_details: { cached_tokens: usage.cachedTokens },
        },
      })}\n\n`
    );
  }
  events.push('data: [DONE]\n\n');
  return events;
}

/** A recording as a live-feeling event stream, one event every `delayMs`. */
export function replayStream(rec: RecordedReply, delayMs = 15): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const events = replayEvents(rec.content, rec.usage);
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= events.length) {
        controller.close();
        return;
      }
      if (i > 0 && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      controller.enqueue(encoder.encode(events[i++]));
    },
  });
}

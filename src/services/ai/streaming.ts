import { AIError, StreamOptions } from './types';
// Helpers for streaming OpenAI chat completions. The model answers in JSON (json_object
// mode), so the human-readable "commentary" field arrives as a string inside a partial JSON
// document. These pull that text out while the rest is still being written, so the UI can
// show the reply as it's typed instead of waiting for the whole response. Pure logic, no
// React or fetch — see streaming.test.ts.

export interface PartialString {
  /** The decoded text so far. */
  text: string;
  /** True once the closing quote has arrived. */
  done: boolean;
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t',
};

/**
 * Read the string value of `key` from a JSON document that may be cut off at any point.
 * Returns null until the value has started. Only matches a key followed by a string value,
 * so a nested key of the same name holding a number or object is skipped. An escape cut off
 * mid-way (a trailing "\" or partial "\u12") is left out until the rest arrives.
 */
export function extractPartialJsonString(json: string, key: string): PartialString | null {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, 'g');
  const match = keyPattern.exec(json);
  if (!match) return null;

  let text = '';
  let i = match.index + match[0].length;
  while (i < json.length) {
    const ch = json[i];
    if (ch === '"') return { text, done: true };
    if (ch !== '\\') {
      text += ch;
      i++;
      continue;
    }
    const next = json[i + 1];
    if (next === undefined) break;
    if (next === 'u') {
      const hex = json.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      text += String.fromCharCode(parseInt(hex, 16));
      i += 6;
      continue;
    }
    text += SIMPLE_ESCAPES[next] ?? next;
    i += 2;
  }
  return { text, done: false };
}

/**
 * Splits a server-sent-events byte stream (already decoded to text) into `data:` payloads.
 * Network chunks can end mid-line, so the unfinished tail is kept for the next push.
 */
export class SSEParser {
  private buffer = '';

  /** Feed the next chunk of text; returns the complete `data:` payloads it finished. */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';
    return lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .filter(Boolean);
  }

  /** Whatever is left once the stream has ended (a last line without a trailing newline). */
  flush(): string[] {
    const rest = this.buffer;
    this.buffer = '';
    return rest.startsWith('data:') ? [rest.slice(5).trim()].filter(Boolean) : [];
  }
}

export interface PartialScheduleDay {
  day: string;
  kind: string;
}

/**
 * The schedule days a partial routine response has written so far, each listed once its
 * "kind" label is complete, so a progress view can fill in the week as the plan is written.
 * Relies on the prompt's field order ("day" then "kind").
 */
export function extractScheduleDays(json: string): PartialScheduleDay[] {
  const days: PartialScheduleDay[] = [];
  const pattern = /"day"\s*:\s*"([^"\\]*)"\s*,\s*"kind"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(json))) {
    const kind = extractPartialJsonString(`{"kind":"${match[2]}"}`, 'kind')?.text ?? match[2];
    days.push({ day: match[1], kind });
  }
  return days;
}

/**
 * Read a streamed completion (`stream: true`), calling `onContent` with everything received
 * so far after each chunk. Returns the full message content.
 */
export async function readStreamedContent(res: Response, onContent: (content: string) => void): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  let content = '';
  const handle = (payloads: string[]) => {
    let changed = false;
    for (const payload of payloads) {
      if (payload === '[DONE]') continue;
      let event: { choices?: Array<{ delta?: { content?: string } }>; error?: { message?: string } };
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }
      if (event.error) throw new AIError('network', `The AI stopped mid-reply${event.error.message ? `: ${event.error.message}` : '.'}`);
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
        changed = true;
      }
    }
    if (changed) onContent(content);
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      handle(parser.push(decoder.decode(value, { stream: true })));
    }
  } catch (e) {
    if (e instanceof AIError) throw e;
    throw new AIError('network', 'The connection to the AI dropped mid-reply. Try again.');
  }
  handle(parser.push(decoder.decode()));
  handle(parser.flush());
  return content;
}

/** Turns StreamOptions callbacks into a raw-content callback, firing each only when its value changes. */
export function commentaryStreamer(options?: StreamOptions): ((content: string) => void) | undefined {
  const { onCommentary, onScheduleDays } = options || {};
  if (!onCommentary && !onScheduleDays) return undefined;
  let last = '';
  let lastDone = false;
  let dayCount = 0;
  return (content) => {
    const partial = onCommentary && extractPartialJsonString(content, 'commentary');
    if (partial && (partial.text !== last || partial.done !== lastDone)) {
      last = partial.text;
      lastDone = partial.done;
      onCommentary!(partial.text, partial.done);
    }
    if (onScheduleDays) {
      const days = extractScheduleDays(content);
      if (days.length !== dayCount) {
        dayCount = days.length;
        onScheduleDays(days);
      }
    }
  };
}

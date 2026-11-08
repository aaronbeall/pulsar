import { describe, expect, it } from 'vitest';
import { usageFromLine, usageTap } from './stream';

const encoder = new TextEncoder();

describe('usageFromLine', () => {
  it('reads the usage event', () => {
    const line = 'data: {"choices":[],"usage":{"prompt_tokens":2500,"completion_tokens":4000,"prompt_tokens_details":{"cached_tokens":500}}}';
    expect(usageFromLine(line)).toEqual({ inputTokens: 2500, cachedTokens: 500, outputTokens: 4000 });
  });

  it('ignores content events and the end marker', () => {
    expect(usageFromLine('data: {"choices":[{"delta":{"content":"hi"}}],"usage":null}')).toBeNull();
    expect(usageFromLine('data: [DONE]')).toBeNull();
  });
});

describe('usageTap', () => {
  it('passes bytes through and reports usage split across chunks', async () => {
    let seen: unknown = 'not called';
    const tap = usageTap((usage, completed) => (seen = { usage, completed }));
    const body = 'data: {"choices":[{"delta":{"content":"{}"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":20}}\n\ndata: [DONE]\n\n';
    const parts = [body.slice(0, 70), body.slice(70, 95), body.slice(95)];
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        parts.forEach((p) => c.enqueue(encoder.encode(p)));
        c.close();
      },
    });
    const out = await new Response(source.pipeThrough(tap)).text();
    expect(out).toBe(body);
    expect(seen).toEqual({ usage: { inputTokens: 10, cachedTokens: 0, outputTokens: 20 }, completed: true });
  });
});

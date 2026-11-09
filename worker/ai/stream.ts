import type { TokenUsage } from './plans';

/**
 * Passes OpenAI's server-sent events through to the app unchanged, and picks out the token
 * usage that OpenAI sends in the last event (requested with stream_options.include_usage).
 * `onEnd` gets that usage when the stream finishes, or null if it was cut short.
 */
export function usageTap(onEnd: (usage: TokenUsage | null, completed: boolean) => void) {
  const decoder = new TextDecoder();
  let buffer = '';
  let usage: TokenUsage | null = null;
  let finished = false;
  const scan = (final: boolean) => {
    const lines = buffer.split('\n');
    buffer = final ? '' : lines.pop() ?? '';
    for (const line of lines) {
      const found = usageFromLine(line);
      if (found) usage = found;
    }
  };
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      scan(false);
    },
    flush() {
      buffer += decoder.decode();
      scan(true);
      finished = true;
      onEnd(usage, true);
    },
    cancel() {
      if (!finished) onEnd(usage, false);
    },
  });
}

/** Token usage from one SSE line, if it carries any. */
export function usageFromLine(line: string): TokenUsage | null {
  if (!line.startsWith('data:') || !line.includes('"usage"')) return null;
  try {
    const event = JSON.parse(line.slice(5).trim());
    const u = event?.usage;
    if (!u || typeof u.prompt_tokens !== 'number') return null;
    return {
      inputTokens: u.prompt_tokens,
      cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: u.completion_tokens ?? 0,
    };
  } catch {
    return null;
  }
}

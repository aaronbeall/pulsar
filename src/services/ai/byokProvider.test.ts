import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildChangeMessages, byokProvider } from './byokProvider';
import { useAiSettingsStore } from '../../store/aiSettingsStore';
import type { Routine } from '../../models/types';

const routine: Routine = {
  id: 'r1', name: 'Test', description: 'Desc', active: true, createdAt: 0,
  dailySchedule: [], chatHistory: [],
};

describe('buildChangeMessages', () => {
  it('puts routine context in the system prompt and replays history before the new message', () => {
    const msgs = buildChangeMessages(
      routine,
      [{ day: 'Monday', kind: 'Push', exercises: [{ name: 'Push-up', sets: 3, reps: 10 }] }],
      [{ role: 'user', message: 'Can I swap push-ups?' }, { role: 'ai', message: 'Sure, for what?' }],
      'Dumbbell press'
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('Push-up');
    expect(msgs.slice(1)).toEqual([
      { role: 'user', content: 'Can I swap push-ups?' },
      { role: 'assistant', content: 'Sure, for what?' },
      { role: 'user', content: 'Dumbbell press' },
    ]);
  });

  it('caps the replayed history', () => {
    const history = Array.from({ length: 40 }, (_, i) => ({ role: 'user' as const, message: `m${i}` }));
    const msgs = buildChangeMessages(routine, [], history, 'last');
    expect(msgs.length).toBeLessThan(20);
    expect(msgs[msgs.length - 2].content).toBe('m39');
  });
});

describe('streaming', () => {
  const sse = (chunks: string[]) => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
  };
  const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

  afterEach(() => {
    vi.unstubAllGlobals();
    useAiSettingsStore.getState().setOpenaiApiKey(null);
  });

  it('streams the commentary as it arrives, then returns the full change', async () => {
    useAiSettingsStore.getState().setOpenaiApiKey('sk-test');
    const reply = JSON.stringify({ commentary: 'Making Friday a rest day.', patch: { dailySchedule: [{ op: 'clearDay', day: 'Friday' }] } });
    // Split mid-word and mid-SSE-line to exercise the buffering.
    const cut = 22;
    const fetchMock = vi.fn(async () => sse([delta(reply.slice(0, cut)).slice(0, 30), delta(reply.slice(0, cut)).slice(30), delta(reply.slice(cut)), 'data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const seen: Array<[string, boolean]> = [];
    const result = await byokProvider.suggestRoutineChange(routine, [], [], 'Rest on Friday', {
      onCommentary: (text, done) => seen.push([text, done]),
    });

    const requestBody = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(requestBody.stream).toBe(true);
    expect(seen[0]).toEqual(['Making ', false]);
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toEqual(['Making Friday a rest day.', true]);
    expect(result.commentary).toBe('Making Friday a rest day.');
    expect(result.patch.dailySchedule).toEqual([{ op: 'clearDay', day: 'Friday' }]);
  });

  it('still accepts a non-streamed reply', async () => {
    useAiSettingsStore.getState().setOpenaiApiKey('sk-test');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: '{"commentary":"Hi","patch":{}}' } }] })));
    const result = await byokProvider.suggestRoutineChange(routine, [], [], 'Hi', { onCommentary: () => {} });
    expect(result.commentary).toBe('Hi');
  });
});

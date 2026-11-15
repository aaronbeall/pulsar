import { describe, expect, it } from 'vitest';
import { normalizeChangeResponse, normalizeRoutineResponse } from '../../src/services/ai/normalize';
import { RECORDING_CASES, STRENGTH_BUILDER } from './recordings/cases';
import { RECORDINGS, RERECORD_HINT, findRecording, promptKey, recordingById, replayEvents, replayStream, staleCases } from './replay';
import { usageFromLine } from './stream';

describe('recorded AI replies', () => {
  it('cover every case and match the current prompts', () => {
    const stale = staleCases().map((c) => c.id);
    // A prompt change in src/services/ai/prompts.ts, or a changed case, lands here.
    expect(stale, `Recorded AI replies are missing or out of date: ${stale.join(', ')}. ${RERECORD_HINT}`).toEqual([]);
  });

  it('are replies the app can use', () => {
    for (const rec of RECORDINGS) {
      const parsed = JSON.parse(rec.content);
      if (rec.kind === 'plan') expect(normalizeRoutineResponse(parsed).schedule.length, rec.id).toBeGreaterThan(0);
      else expect(normalizeChangeResponse(parsed).commentary, rec.id).toBeTruthy();
    }
  });

  it('have one recording per case, in the same order', () => {
    expect(RECORDINGS.map((r) => r.id)).toEqual(RECORDING_CASES.map((c) => c.id));
  });
});

describe('promptKey', () => {
  it('changes with any change to the messages', () => {
    const a = promptKey([{ role: 'user', content: 'hi' }]);
    expect(a).toBe(promptKey([{ role: 'user', content: 'hi' }]));
    expect(a).not.toBe(promptKey([{ role: 'user', content: 'hi ' }]));
    expect(a).not.toBe(promptKey([{ role: 'system', content: 'hi' }]));
  });
});

describe('findRecording', () => {
  it('finds the recording made from this exact request', () => {
    const rec = recordingById('edit-add-cardio');
    expect(findRecording('edit', rec.input)?.id).toBe('edit-add-cardio');
  });

  it('falls back to the closest recording of the same kind', () => {
    const input = { ...STRENGTH_BUILDER, history: [], message: 'please make friday a rest day instead' };
    expect(findRecording('edit', input)?.id).toBe('edit-friday-rest');
    const plan = { answers: [{ question: 'Goals?', answer: 'build muscle in my arms at the gym' }] };
    expect(findRecording('plan', plan)?.id).toBe('plan-gym-muscle');
  });

  it('answers a question with a question recording, not a change', () => {
    const input = { ...STRENGTH_BUILDER, history: [], message: 'What should I eat before a workout?' };
    expect(findRecording('edit', input)?.id).toMatch(/^question-/);
  });

  it('finds nothing without recordings of that kind', () => {
    expect(findRecording('plan', { answers: [] }, [])).toBeNull();
  });
});

describe('replay', () => {
  const rec = { ...recordingById('question-rest-time'), usage: { inputTokens: 100, cachedTokens: 10, outputTokens: 50 } };

  it('streams the content as OpenAI does, with usage at the end', () => {
    const events = replayEvents(rec.content, rec.usage);
    const content = events
      .filter((e) => e.includes('"delta"'))
      .map((e) => JSON.parse(e.slice(6)).choices[0].delta.content)
      .join('');
    expect(content).toBe(rec.content);
    expect(usageFromLine(events.at(-2)!.trim())).toEqual(rec.usage);
    expect(events.at(-1)).toBe('data: [DONE]\n\n');
  });

  it('reads back as the same text', async () => {
    const text = await new Response(replayStream(rec, 0)).text();
    expect(text).toBe(replayEvents(rec.content, rec.usage).join(''));
  });

  it('names the fix when a recording is missing', () => {
    expect(() => recordingById('nope')).toThrow(/npm run ai:record/);
  });
});

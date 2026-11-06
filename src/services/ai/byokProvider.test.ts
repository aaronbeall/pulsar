import { describe, it, expect } from 'vitest';
import { buildChangeMessages } from './byokProvider';
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

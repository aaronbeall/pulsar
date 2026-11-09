import { describe, expect, it } from 'vitest';
import { BadRequest, messagesFor } from './request';

describe('messagesFor', () => {
  it('builds the routine prompt from wizard answers', () => {
    const msgs = messagesFor('plan', { answers: [{ question: 'Goals?', answer: 'Get strong' }] });
    expect(msgs[0].role).toBe('system');
    expect(msgs[1]).toEqual({ role: 'user', content: 'Goals?\nGet strong' });
  });

  it('builds the change prompt from the routine, history and message', () => {
    const msgs = messagesFor('edit', {
      routine: { name: 'Legs', description: '' },
      schedule: [{ day: 'Monday', kind: 'Legs', exercises: [{ name: 'Squat', sets: 3, reps: 10 }] }],
      history: [{ role: 'ai', message: 'Hi' }],
      message: 'Add lunges',
    });
    expect(msgs[0].content).toContain('"Squat"');
    expect(msgs.slice(1)).toEqual([
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'Add lunges' },
    ]);
  });

  it('refuses oversized or malformed requests', () => {
    expect(() => messagesFor('plan', { answers: [] })).toThrow(BadRequest);
    expect(() => messagesFor('plan', { answers: [{ question: 'Q', answer: 'x'.repeat(5000) }] })).toThrow(BadRequest);
    expect(() => messagesFor('edit', { schedule: [{ day: 'Funday', exercises: [] }], message: 'hi' })).toThrow(BadRequest);
    expect(() => messagesFor('edit', { schedule: [], message: '   ' })).toThrow(BadRequest);
    expect(() => messagesFor('edit', null)).toThrow(BadRequest);
  });
});

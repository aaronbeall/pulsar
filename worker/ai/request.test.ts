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

describe('messagesFor with learned preferences', () => {
  const answers = [{ question: 'What are your goals?', answer: 'push-ups' }];
  const preferences = {
    likedExercises: ['Goblet Squat'], dislikedExercises: ['Push-up'], skippedExercises: ['Burpee'],
    usualDays: ['Monday', 'Thursday'], usualMinutes: 40,
  };

  it('adds them to the routine prompt as soft preferences', () => {
    const user = messagesFor('plan', { answers, preferences })[1].content;
    expect(user).toContain('Exercises they disliked: Push-up');
    expect(user).toContain('Exercises they often skip in workouts: Burpee');
    expect(user).toContain('Days they\'ve usually trained on lately: Monday, Thursday');
    expect(user).toContain('Anything they ask for in their answers or messages comes first');
  });

  it('adds them to the change prompt', () => {
    const system = messagesFor('edit', { routine: { name: 'R' }, schedule: [], history: [], message: 'hi', preferences })[0].content;
    expect(system).toContain('Exercises they liked: Goblet Squat');
  });

  it('leaves the prompt alone without them', () => {
    expect(messagesFor('plan', { answers })[1].content).not.toContain('learned');
  });

  it('refuses malformed preferences', () => {
    expect(() => messagesFor('plan', { answers, preferences: { usualDays: ['Someday'] } })).toThrow();
    expect(() => messagesFor('plan', { answers, preferences: { likedExercises: Array(50).fill('x') } })).toThrow();
    expect(() => messagesFor('plan', { answers, preferences: 'all of them' })).toThrow();
  });
});

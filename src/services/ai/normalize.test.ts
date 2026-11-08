import { describe, it, expect } from 'vitest';
import { normalizeChangeResponse, normalizeDay, normalizeExercise, normalizeRoutineResponse } from './normalize';
import { AIError } from './types';

describe('normalizeDay', () => {
  it('accepts full, lowercase and abbreviated names', () => {
    expect(normalizeDay('Monday')).toBe('Monday');
    expect(normalizeDay('tuesday')).toBe('Tuesday');
    expect(normalizeDay('Wed')).toBe('Wednesday');
  });
  it('rejects junk', () => {
    expect(normalizeDay('Day 1')).toBeNull();
    expect(normalizeDay('M')).toBeNull();
    expect(normalizeDay(3)).toBeNull();
  });
});

describe('normalizeExercise', () => {
  it('keeps reps or duration, never both (duration wins)', () => {
    expect(normalizeExercise({ name: 'Plank', sets: 3, reps: 10, duration: 30 })).toEqual({ name: 'Plank', sets: 3, duration: 30 });
    expect(normalizeExercise({ name: 'Push-up', sets: '3', reps: '12' })).toEqual({ name: 'Push-up', sets: 3, reps: 12 });
  });
  it('fills defaults for missing sets/reps', () => {
    expect(normalizeExercise({ name: 'Squat' })).toEqual({ name: 'Squat', sets: 1, reps: 10 });
  });
  it('drops entries without a name', () => {
    expect(normalizeExercise({ sets: 3, reps: 10 })).toBeNull();
    expect(normalizeExercise('Squat')).toBeNull();
  });
});

describe('normalizeRoutineResponse', () => {
  it('orders days, merges duplicates (first wins) and skips empty days', () => {
    const result = normalizeRoutineResponse({
      name: 'Plan',
      description: 'Desc',
      commentary: 'Why',
      schedule: [
        { day: 'friday', kind: 'Legs', exercises: [{ name: 'Squat', sets: 3, reps: 8 }] },
        { day: 'Monday', kind: 'Push', exercises: [{ name: 'Push-up', sets: 3, reps: 12 }] },
        { day: 'Monday', kind: 'Dup', exercises: [{ name: 'Row', sets: 3, reps: 12 }] },
        { day: 'Tuesday', kind: 'Empty', exercises: [] },
      ],
    });
    expect(result.schedule.map(d => [d.day, d.kind])).toEqual([['Monday', 'Push'], ['Friday', 'Legs']]);
    expect(result.name).toBe('Plan');
  });

  it('throws a parse_error when there are no usable days', () => {
    expect(() => normalizeRoutineResponse({ schedule: [] })).toThrow(AIError);
    expect(() => normalizeRoutineResponse(null)).toThrow(AIError);
  });
});

describe('normalizeChangeResponse', () => {
  it('passes through setDay and clearDay ops', () => {
    const result = normalizeChangeResponse({
      commentary: 'Done',
      patch: {
        dailySchedule: [
          { op: 'setDay', day: 'Mon', kind: 'Upper', exercises: [{ name: 'Row', sets: 3, reps: 10 }] },
          { op: 'clearDay', day: 'friday' },
        ],
      },
    });
    expect(result.patch.dailySchedule).toEqual([
      { op: 'setDay', day: 'Monday', kind: 'Upper', exercises: [{ name: 'Row', sets: 3, reps: 10 }] },
      { op: 'clearDay', day: 'Friday' },
    ]);
  });

  it('ignores a setDay with no exercises instead of wiping the day', () => {
    const result = normalizeChangeResponse({ commentary: 'x', patch: { dailySchedule: [{ op: 'setDay', day: 'Monday', exercises: [] }] } });
    expect(result.patch).toEqual({});
  });

  it('treats an empty patch as a plain answer', () => {
    const result = normalizeChangeResponse({ commentary: 'Planks work your core.', patch: {} });
    expect(result).toEqual({ commentary: 'Planks work your core.', patch: {} });
  });

  it('drops a blank description', () => {
    expect(normalizeChangeResponse({ commentary: 'x', patch: { description: '  ' } }).patch).toEqual({});
  });
});

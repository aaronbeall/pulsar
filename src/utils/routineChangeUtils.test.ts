import { describe, it, expect } from 'vitest';
import { applyRoutineChange } from './routineChangeUtils';
import type { RoutineChange, RoutineDay } from '../models/types';

const day = (d: RoutineDay['day'], kind: string): RoutineDay => ({ day: d, kind, exercises: [{ exerciseId: kind, sets: 3, reps: 10 }] });
const change = (patch: RoutineChange['patch']): RoutineChange => ({ id: 'c1', status: 'pending', patch });

describe('applyRoutineChange', () => {
  const routine = { description: 'Old', dailySchedule: [day('Monday', 'Push'), day('Friday', 'Legs')] };

  it('replaces an existing day and keeps the rest', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'setDay', day: 'Monday', kind: 'Pull', exercises: [] }] }));
    expect(result.dailySchedule.map(d => d.kind)).toEqual(['Pull', 'Legs']);
  });

  it('adds a new day in weekday order', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'setDay', day: 'Wednesday', kind: 'Cardio', exercises: [] }] }));
    expect(result.dailySchedule.map(d => d.day)).toEqual(['Monday', 'Wednesday', 'Friday']);
  });

  it('clears a day to rest', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'clearDay', day: 'Friday' }] }));
    expect(result.dailySchedule.map(d => d.day)).toEqual(['Monday']);
  });

  it('updates the description only when the change has one', () => {
    expect(applyRoutineChange(routine, change({ description: 'New' })).description).toBe('New');
    expect(applyRoutineChange(routine, change({})).description).toBe('Old');
  });

  it('does not mutate the input', () => {
    applyRoutineChange(routine, change({ dailySchedule: [{ op: 'clearDay', day: 'Monday' }] }));
    expect(routine.dailySchedule).toHaveLength(2);
  });
});

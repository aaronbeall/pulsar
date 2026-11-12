import { describe, it, expect } from 'vitest';
import { adjustRoutine, adjustmentRequest, describeTrend, detectRoutineTrend } from './routineFeedback';
import type { Routine, Workout } from '../models/types';

const NOW = new Date('2026-11-11T12:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

const routine = (extra: Partial<Routine> = {}): Routine => ({
  id: 'r', name: 'R', description: '', active: true, createdAt: 0, chatHistory: [],
  dailySchedule: [
    { day: 'Monday', kind: 'Full body', exercises: [
      { exerciseId: 'squat', sets: 4, reps: 8 },
      { exerciseId: 'press', sets: 3, reps: 10 },
      { exerciseId: 'row', sets: 3, reps: 10 },
      { exerciseId: 'plank', sets: 3, duration: 40 },
    ] },
    { day: 'Wednesday', kind: 'Rest', exercises: [] },
  ],
  ...extra,
});

const rated = (daysAgo: number, extra: Partial<Workout>, routineId = 'r'): Workout => {
  const startedAt = NOW - daysAgo * DAY;
  return { id: `w${daysAgo}`, nickname: '', routineId, day: 'Monday', startedAt, completedAt: startedAt + 45 * 60000, exercises: [], ...extra };
};

describe('detectRoutineTrend', () => {
  it('finds a trend in this routine\'s latest ratings', () => {
    const t = detectRoutineTrend(routine(), [rated(1, { effort: 'hard', lengthFeel: 'long' }), rated(3, { effort: 'hard' })], NOW);
    expect(t).toEqual({ effort: 'easier', length: undefined, rated: 2 });
    expect(describeTrend(t!)).toBe('Your last few workouts on this routine felt too hard.');
  });

  it('ignores other routines, old workouts and ones before the last offer', () => {
    const workouts = [rated(1, { effort: 'hard' }, 'other'), rated(2, { effort: 'hard' }, 'other'), rated(40, { effort: 'hard' }), rated(41, { effort: 'hard' })];
    expect(detectRoutineTrend(routine(), workouts, NOW)).toBeNull();
    const handled = routine({ feedbackHandledAt: NOW - 2 * DAY });
    expect(detectRoutineTrend(handled, [rated(1, { effort: 'easy' }), rated(3, { effort: 'easy' }), rated(5, { effort: 'easy' })], NOW)).toBeNull();
    expect(detectRoutineTrend(handled, [rated(0, { effort: 'easy' }), rated(1, { effort: 'easy' })], NOW)?.effort).toBe('harder');
  });

  it('needs a clear trend', () => {
    expect(detectRoutineTrend(routine(), [rated(1, { effort: 'hard' })], NOW)).toBeNull();
    expect(detectRoutineTrend(routine(), [rated(1, { effort: 'hard' }), rated(2, { effort: 'easy' })], NOW)).toBeNull();
  });
});

describe('adjustRoutine', () => {
  const monday = (ops: ReturnType<typeof adjustRoutine>) => ops.find(o => o.day === 'Monday')!;
  const exercisesOf = (ops: ReturnType<typeof adjustRoutine>) => {
    const op = monday(ops);
    return op.op === 'setDay' ? op.exercises : [];
  };

  it('goes easier with fewer sets, then fewer reps and seconds', () => {
    const ex = exercisesOf(adjustRoutine(routine(), { effort: 'easier', rated: 2 }));
    expect(ex.map(e => [e.sets, e.reps ?? e.duration])).toEqual([[3, 8], [3, 8], [3, 8], [3, 30]]);
  });

  it('goes harder with more sets, then more reps', () => {
    const ex = exercisesOf(adjustRoutine(routine(), { effort: 'harder', rated: 2 }));
    expect(ex.map(e => [e.sets, e.reps ?? e.duration])).toEqual([[4, 10], [4, 10], [4, 10], [4, 40]]);
  });

  it('goes shorter by dropping the last exercise, keeping at least three', () => {
    expect(exercisesOf(adjustRoutine(routine(), { length: 'shorter', rated: 2 })).map(e => e.exerciseId)).toEqual(['squat', 'press', 'row']);
    const short = routine({ dailySchedule: [{ day: 'Monday', kind: 'A', exercises: [{ exerciseId: 'a', sets: 3, reps: 10 }, { exerciseId: 'b', sets: 3, reps: 10 }] }] });
    expect(exercisesOf(adjustRoutine(short, { length: 'shorter', rated: 2 })).map(e => e.sets)).toEqual([2, 2]);
  });

  it('goes longer with a set more', () => {
    expect(exercisesOf(adjustRoutine(routine(), { length: 'longer', rated: 2 })).map(e => e.sets)).toEqual([5, 4, 4, 4]);
  });

  it('leaves rest days and unchanged days out', () => {
    const ops = adjustRoutine(routine(), { effort: 'easier', length: 'shorter', rated: 2 });
    expect(ops.map(o => o.day)).toEqual(['Monday']);
    const floor = routine({ dailySchedule: [{ day: 'Friday', kind: 'A', exercises: [{ exerciseId: 'a', sets: 5, reps: 10 }] }] });
    expect(adjustRoutine(floor, { length: 'longer', rated: 2 })).toEqual([]);
  });

  it('phrases the request for Pulsar AI', () => {
    expect(adjustmentRequest({ effort: 'easier', length: 'shorter', rated: 3 }))
      .toBe('My last few workouts on this routine felt too hard and too long. Please make it a bit easier and shorter, keeping the same training days.');
  });
});

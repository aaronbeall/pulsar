import { describe, it, expect } from 'vitest';
import {
  isPerfectWorkout,
  getHistorySummaryStats,
  formatTotalDuration,
  getRoutineStints,
  getRoutineName,
  getWorkoutKind,
} from './historyStats';
import type { Routine, RoutineDay, Workout, DayOfWeek } from '../models/types';

const d = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).getTime();

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: nextId(),
    name: 'Test Routine',
    description: '',
    active: true,
    createdAt: Date.now(),
    dailySchedule: [],
    chatHistory: [],
    ...overrides,
  };
}

function scheduleDay(day: DayOfWeek, kind = 'Strength', exerciseIds: string[] = ['ex1']): RoutineDay {
  return { day, kind, exercises: exerciseIds.map(exerciseId => ({ exerciseId, sets: 3, reps: 10 })) };
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: nextId(),
    nickname: 'Test Workout',
    routineId: 'routine-1',
    day: 'Monday',
    startedAt: Date.now(),
    exercises: [],
    ...overrides,
  };
}

describe('isPerfectWorkout', () => {
  it('is true only when completed, has exercises, and none are skipped or incomplete', () => {
    const perfect = makeWorkout({
      completedAt: d(2026, 7, 29),
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, completedAt: d(2026, 7, 29) }],
    });
    expect(isPerfectWorkout(perfect)).toBe(true);

    const notCompleted = makeWorkout({ exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10 }] });
    expect(isPerfectWorkout(notCompleted)).toBe(false);

    const noExercises = makeWorkout({ completedAt: d(2026, 7, 29), exercises: [] });
    expect(isPerfectWorkout(noExercises)).toBe(false);

    const withSkipped = makeWorkout({
      completedAt: d(2026, 7, 29),
      exercises: [
        { exerciseId: 'ex1', sets: 3, reps: 10, completedAt: d(2026, 7, 29) },
        { exerciseId: 'ex2', sets: 3, reps: 10, skipped: true, completedAt: d(2026, 7, 29) },
      ],
    });
    expect(isPerfectWorkout(withSkipped)).toBe(false);
  });
});

describe('getHistorySummaryStats', () => {
  it('aggregates totals, perfect count, workout time, exercise variety, and active routine count in one pass', () => {
    const active = makeRoutine({ id: 'active-1', active: true, dailySchedule: [scheduleDay('Monday')] });
    const inactive = makeRoutine({ id: 'inactive-1', active: false, dailySchedule: [scheduleDay('Tuesday')] });
    const workouts = [
      makeWorkout({
        routineId: 'active-1',
        day: 'Monday',
        startedAt: d(2026, 7, 27, 8),
        completedAt: d(2026, 7, 27, 9), // 1 hour
        exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, completedAt: d(2026, 7, 27, 9) }],
      }),
      makeWorkout({
        routineId: 'active-1',
        day: 'Monday',
        startedAt: d(2026, 7, 20, 8),
        completedAt: d(2026, 7, 20, 8) + 30 * 60 * 1000, // 30 min, not perfect (skipped exercise)
        exercises: [
          { exerciseId: 'ex1', sets: 3, reps: 10, completedAt: d(2026, 7, 20, 8) + 30 * 60 * 1000 },
          { exerciseId: 'ex2', sets: 3, reps: 10, skipped: true },
        ],
      }),
      makeWorkout({ routineId: 'active-1', day: 'Monday', startedAt: d(2026, 7, 13, 8) }), // still in progress
    ];

    const stats = getHistorySummaryStats(workouts, [active, inactive]);
    expect(stats.totalCompleted).toBe(2);
    expect(stats.perfectWorkouts).toBe(1);
    expect(stats.totalWorkoutTimeMs).toBe(90 * 60 * 1000); // 1h + 30m
    expect(stats.uniqueExercisesDone).toBe(1); // only ex1 — ex2 was skipped, so it doesn't count as "done"
    expect(stats.activeRoutineCount).toBe(1);
    expect(stats.bestStreak).toBe(2); // 7/20 and 7/27
  });
});

describe('formatTotalDuration', () => {
  it('formats under an hour as just minutes', () => {
    expect(formatTotalDuration(45 * 60 * 1000)).toBe('45m');
  });

  it('formats an hour or more as hours and minutes', () => {
    expect(formatTotalDuration((18 * 60 + 42) * 60 * 1000)).toBe('18h 42m');
  });

  it('formats zero as 0m', () => {
    expect(formatTotalDuration(0)).toBe('0m');
  });
});

describe('getRoutineStints', () => {
  const now = new Date(2026, 6, 31, 12); // Friday 7/31
  const done = (routineId: string, day: DayOfWeek, at: number) => makeWorkout({ routineId, day, startedAt: at, completedAt: at });

  it('groups workouts into active stretches, keeps edits inside one stretch, and counts misses', () => {
    // "Old" ran Mon/Wed 7/6 to 7/20. "New" started 7/20 on Tue, gained Thu on 7/27.
    const old = makeRoutine({
      id: 'old', active: false, dailySchedule: [scheduleDay('Monday'), scheduleDay('Wednesday')],
      schedulePeriods: [{ start: d(2026, 7, 6, 8), end: d(2026, 7, 20, 8), days: ['Monday', 'Wednesday'] }],
    });
    const fresh = makeRoutine({
      id: 'new', dailySchedule: [scheduleDay('Tuesday'), scheduleDay('Thursday')],
      schedulePeriods: [
        { start: d(2026, 7, 20, 8), end: d(2026, 7, 27, 8), days: ['Tuesday'] },
        { start: d(2026, 7, 27, 8), days: ['Tuesday', 'Thursday'] },
      ],
    });
    const workouts = [
      done('old', 'Monday', d(2026, 7, 6)),
      done('old', 'Wednesday', d(2026, 7, 8)),
      // missed Mon 7/13, did Wed 7/15
      done('old', 'Wednesday', d(2026, 7, 15)),
      done('new', 'Tuesday', d(2026, 7, 21)),
      done('new', 'Tuesday', d(2026, 7, 28)),
      // missed Thu 7/30
    ];

    const stints = getRoutineStints(workouts, [old, fresh], now);
    expect(stints.map(s => s.routine.id)).toEqual(['new', 'old']); // the current one first
    const [current, previous] = stints;
    expect(current.end).toBeUndefined();
    expect(current.days).toEqual(['Tuesday']);
    expect(current.changes).toEqual([{ date: d(2026, 7, 27, 8), days: ['Tuesday', 'Thursday'] }]);
    expect(current.workouts.map(w => w.startedAt)).toEqual([d(2026, 7, 28), d(2026, 7, 21)]);
    expect(current.missed).toBe(1);
    expect(previous.completed).toBe(3);
    expect(previous.missed).toBe(1);
  });

  it("gives workouts outside any recorded stretch their own stint, and skips routines never used", () => {
    const retired = makeRoutine({ id: 'r1', active: false, dailySchedule: [scheduleDay('Monday')] });
    const neverUsed = makeRoutine({ id: 'r2', active: false });
    const stints = getRoutineStints([done('r1', 'Monday', d(2026, 7, 6)), done('r1', 'Monday', d(2026, 7, 13))], [retired, neverUsed], now);
    expect(stints).toHaveLength(1);
    expect(stints[0].start).toBe(d(2026, 7, 6));
    expect(stints[0].end).toBe(d(2026, 7, 13));
    expect(stints[0].completed).toBe(2);
  });
});

describe('getRoutineName / getWorkoutKind', () => {
  it('looks up the routine name, falling back when not found', () => {
    const routine = makeRoutine({ id: 'r1', name: 'Leg Day' });
    expect(getRoutineName('r1', [routine])).toBe('Leg Day');
    expect(getRoutineName('missing', [routine])).toBe('Unknown routine');
  });

  it("looks up the workout's scheduled day kind, undefined when absent", () => {
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Monday', 'Cardio')] });
    const matching = makeWorkout({ routineId: 'r1', day: 'Monday' });
    const noKindDay = makeWorkout({ routineId: 'r1', day: 'Tuesday' }); // not in schedule
    expect(getWorkoutKind(matching, [routine])).toBe('Cardio');
    expect(getWorkoutKind(noKindDay, [routine])).toBeUndefined();
  });
});

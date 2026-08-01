import { describe, it, expect } from 'vitest';
import {
  isPerfectWorkout,
  getHistorySummaryStats,
  formatTotalDuration,
  getRoutineTimeline,
  getWorkoutHistory,
  getHistoryTimeline,
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

describe('getRoutineTimeline', () => {
  it('excludes routines with no workout history and sorts the rest by most recent activity', () => {
    const withHistory = makeRoutine({ id: 'r1', name: 'Has History' });
    const neverUsed = makeRoutine({ id: 'r2', name: 'Never Used' });
    const olderHistory = makeRoutine({ id: 'r3', name: 'Older History' });

    const workouts = [
      makeWorkout({ routineId: 'r1', startedAt: d(2026, 7, 1), completedAt: d(2026, 7, 1) }),
      makeWorkout({ routineId: 'r1', startedAt: d(2026, 7, 20), completedAt: d(2026, 7, 20) }),
      makeWorkout({ routineId: 'r3', startedAt: d(2026, 6, 1), completedAt: d(2026, 6, 5) }),
    ];

    const timeline = getRoutineTimeline([withHistory, neverUsed, olderHistory], workouts);

    expect(timeline.map(e => e.routine.id)).toEqual(['r1', 'r3']); // r2 excluded, r1 more recent than r3
    expect(timeline[0].firstDate).toBe(d(2026, 7, 1));
    expect(timeline[0].lastDate).toBe(d(2026, 7, 20));
    expect(timeline[1].lastDate).toBe(d(2026, 6, 5)); // uses completedAt, not startedAt
  });
});

describe('getWorkoutHistory', () => {
  it('returns all workouts sorted newest first without mutating the input', () => {
    const original = [
      makeWorkout({ id: 'old', startedAt: d(2026, 1, 1) }),
      makeWorkout({ id: 'new', startedAt: d(2026, 7, 1) }),
    ];
    const sorted = getWorkoutHistory(original);
    expect(sorted.map(w => w.id)).toEqual(['new', 'old']);
    expect(original.map(w => w.id)).toEqual(['old', 'new']); // input untouched
  });
});

describe('getHistoryTimeline', () => {
  it('merges workouts and routine-created entries into one newest-first feed', () => {
    const routine = makeRoutine({ id: 'r1', name: 'Leg Day', createdAt: d(2026, 7, 10) });
    const workouts = [
      makeWorkout({ id: 'w-old', routineId: 'r1', startedAt: d(2026, 7, 1) }),
      makeWorkout({ id: 'w-new', routineId: 'r1', startedAt: d(2026, 7, 20) }),
    ];

    const timeline = getHistoryTimeline(workouts, [routine]);

    expect(timeline.map(item => item.type === 'workout' ? item.workout.id : `created-${item.routine.id}`))
      .toEqual(['w-new', 'created-r1', 'w-old']);
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

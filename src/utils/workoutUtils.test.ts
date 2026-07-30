import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDayOfWeek,
  hasRoutineForDay,
  findRoutineForDay,
  findWorkoutForDay,
  getWorkoutStatusForDay,
  getStreakInfo,
  getExerciseStats,
  getRoutineStats,
} from './workoutUtils';
import type { Routine, RoutineDay, Workout, DayOfWeek } from '../models/types';

// Fixed local dates for deterministic day-of-week math (July 2026: Wed 29, Thu 30 is
// "today" elsewhere in the app's context, but each test pins its own "today" explicitly).
const d = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour);

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
    prompts: { goals: '', equipment: '', time: '', additionalInfo: '' },
    responses: [],
    ...overrides,
  };
}

function scheduleDay(day: DayOfWeek, exerciseIds: string[] = ['ex1']): RoutineDay {
  return { day, kind: 'Strength', exercises: exerciseIds.map(exerciseId => ({ exerciseId, sets: 3, reps: 10 })) };
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

describe('getDayOfWeek', () => {
  it('maps a date to the correct day name', () => {
    expect(getDayOfWeek(d(2026, 7, 29))).toBe('Wednesday');
    expect(getDayOfWeek(d(2026, 7, 26))).toBe('Sunday');
    expect(getDayOfWeek(d(2026, 8, 1))).toBe('Saturday');
  });
});

describe('hasRoutineForDay / findRoutineForDay', () => {
  it('only considers active routines', () => {
    const active = makeRoutine({ id: 'active', active: true, dailySchedule: [scheduleDay('Monday')] });
    const inactive = makeRoutine({ id: 'inactive', active: false, dailySchedule: [scheduleDay('Tuesday')] });

    expect(hasRoutineForDay([active, inactive], 'Monday')).toBe(true);
    expect(hasRoutineForDay([active, inactive], 'Tuesday')).toBe(false);
    expect(findRoutineForDay([active, inactive], 'Tuesday')).toBeUndefined();
    expect(findRoutineForDay([active, inactive], 'Monday')?.id).toBe('active');
  });
});

describe('findWorkoutForDay', () => {
  it('matches a workout by routine, day, and calendar week', () => {
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Wednesday')] });
    const thisWeek = makeWorkout({ id: 'w1', routineId: 'r1', day: 'Wednesday', startedAt: d(2026, 7, 29).getTime() });
    const found = findWorkoutForDay([thisWeek], [routine], 'Wednesday', d(2026, 7, 29));
    expect(found?.id).toBe('w1');
  });

  it('does not match a workout from a different calendar week', () => {
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Wednesday')] });
    const lastWeek = makeWorkout({ id: 'w1', routineId: 'r1', day: 'Wednesday', startedAt: d(2026, 7, 22).getTime() });
    const found = findWorkoutForDay([lastWeek], [routine], 'Wednesday', d(2026, 7, 29));
    expect(found).toBeUndefined();
  });
});

describe('getWorkoutStatusForDay', () => {
  it('reports not started, in progress, and completed', () => {
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Wednesday')] });
    const today = d(2026, 7, 29);

    expect(getWorkoutStatusForDay([], [routine], 'Wednesday', today)).toBe('not started');

    const inProgress = makeWorkout({ routineId: 'r1', day: 'Wednesday', startedAt: today.getTime() });
    expect(getWorkoutStatusForDay([inProgress], [routine], 'Wednesday', today)).toBe('in progress');

    const completed = makeWorkout({ routineId: 'r1', day: 'Wednesday', startedAt: today.getTime(), completedAt: today.getTime() });
    expect(getWorkoutStatusForDay([completed], [routine], 'Wednesday', today)).toBe('completed');
  });
});

describe('getStreakInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an empty/expired streak when there are no completed workouts', () => {
    vi.setSystemTime(d(2026, 7, 29));
    const result = getStreakInfo([], []);
    expect(result).toEqual({ streak: 0, status: 'expired', days: {} });
  });

  it('counts a streak through today, bridging non-scheduled rest days', () => {
    vi.setSystemTime(d(2026, 7, 29)); // Wednesday
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Monday'), scheduleDay('Wednesday'), scheduleDay('Friday')] });
    const workouts = [
      makeWorkout({ routineId: 'r1', day: 'Monday', startedAt: d(2026, 7, 27).getTime(), completedAt: d(2026, 7, 27).getTime() }),
      makeWorkout({ routineId: 'r1', day: 'Wednesday', startedAt: d(2026, 7, 29).getTime(), completedAt: d(2026, 7, 29).getTime() }),
    ];

    const result = getStreakInfo(workouts, [routine]);
    expect(result.streak).toBe(2); // Monday + Wednesday; Tuesday is a rest day and bridges the gap
    expect(result.status).toBe('up_to_date');
  });

  it('marks status "pending" (and excludes today from the count) when today is scheduled but not yet done', () => {
    vi.setSystemTime(d(2026, 7, 29)); // Wednesday, scheduled but not completed
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Monday'), scheduleDay('Wednesday')] });
    const workouts = [
      makeWorkout({ routineId: 'r1', day: 'Monday', startedAt: d(2026, 7, 27).getTime(), completedAt: d(2026, 7, 27).getTime() }),
    ];

    const result = getStreakInfo(workouts, [routine]);
    expect(result.status).toBe('pending');
    expect(result.streak).toBe(1); // only Monday counts; today is pending, not yet in the streak count
    expect(result.days[d(2026, 7, 29).toDateString()].completed).toBe(false);
  });

  it('reports today as a plain not-completed day (not rest) when there is no streak leading into it', () => {
    // This is the exact data the StreakCalendar UI relies on to distinguish "missed" (X)
    // from "not done yet" (pending) for today, independent of the overall streak status.
    vi.setSystemTime(d(2026, 7, 29)); // Wednesday, scheduled but not completed
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Monday'), scheduleDay('Wednesday')] });
    const workouts = [
      // A single old completed workout, far enough back that the streak is long broken.
      makeWorkout({ routineId: 'r1', day: 'Monday', startedAt: d(2026, 7, 20).getTime(), completedAt: d(2026, 7, 20).getTime() }),
    ];

    const result = getStreakInfo(workouts, [routine]);
    expect(result.status).toBe('expired');
    expect(result.streak).toBe(0);
    const today = result.days[d(2026, 7, 29).toDateString()];
    expect(today).toBeDefined();
    expect(today.completed).toBe(false);
    expect(today.rest).toBe(false);
  });

  it('breaks the streak on a missed scheduled day', () => {
    vi.setSystemTime(d(2026, 7, 31)); // Friday
    const routine = makeRoutine({ id: 'r1', dailySchedule: [scheduleDay('Monday'), scheduleDay('Wednesday'), scheduleDay('Friday')] });
    const workouts = [
      makeWorkout({ routineId: 'r1', day: 'Monday', startedAt: d(2026, 7, 27).getTime(), completedAt: d(2026, 7, 27).getTime() }),
      // Wednesday scheduled but never completed — breaks the chain.
      makeWorkout({ routineId: 'r1', day: 'Friday', startedAt: d(2026, 7, 31).getTime(), completedAt: d(2026, 7, 31).getTime() }),
    ];

    const result = getStreakInfo(workouts, [routine]);
    expect(result.streak).toBe(1); // only today (Friday) — Monday no longer contributes
    expect(result.status).toBe('up_to_date');
  });

  it('excludes completed workouts that belong to an inactive routine', () => {
    vi.setSystemTime(d(2026, 7, 29)); // Wednesday
    const activeRoutine = makeRoutine({ id: 'active-1', active: true, dailySchedule: [scheduleDay('Wednesday')] });
    const inactiveRoutine = makeRoutine({ id: 'inactive-1', active: false, dailySchedule: [scheduleDay('Tuesday')] });
    const workouts = [
      makeWorkout({ routineId: 'active-1', day: 'Wednesday', startedAt: d(2026, 7, 29).getTime(), completedAt: d(2026, 7, 29).getTime() }),
      // Completed yesterday, but under a now-inactive routine — must not count or extend the streak.
      makeWorkout({ routineId: 'inactive-1', day: 'Tuesday', startedAt: d(2026, 7, 28).getTime(), completedAt: d(2026, 7, 28).getTime() }),
    ];

    const result = getStreakInfo(workouts, [activeRoutine, inactiveRoutine]);
    expect(result.streak).toBe(1);
    expect(result.status).toBe('up_to_date');
    expect(result.days[d(2026, 7, 28).toDateString()]).toBeUndefined();
  });
});

describe('getExerciseStats', () => {
  it('counts routines, distinct scheduled days, and workouts referencing an exercise', () => {
    const routine1 = makeRoutine({
      id: 'r1',
      dailySchedule: [scheduleDay('Monday', ['ex1']), scheduleDay('Wednesday', ['ex1', 'ex2'])],
    });
    const routine2 = makeRoutine({
      id: 'r2',
      dailySchedule: [scheduleDay('Friday', ['ex1'])],
    });
    const workouts = [
      makeWorkout({ routineId: 'r1', day: 'Monday', exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10 }] }),
      makeWorkout({ routineId: 'r2', day: 'Friday', exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10 }] }),
      makeWorkout({ routineId: 'r1', day: 'Wednesday', exercises: [{ exerciseId: 'ex2', sets: 3, reps: 10 }] }),
    ];

    const stats = getExerciseStats('ex1', [routine1, routine2], workouts);
    expect(stats.routines).toBe(2);
    expect(stats.days).toBe(3); // Monday, Wednesday (from r1), Friday (from r2)
    expect(stats.workouts).toBe(2); // only the two workouts whose exercises include ex1
  });
});

describe('getRoutineStats', () => {
  it('totals started/completed/perfect workouts and counts missed scheduled days', () => {
    const routine = makeRoutine({
      id: 'r1',
      createdAt: d(2026, 7, 13).getTime(), // a Monday, two weeks before the last workout
      dailySchedule: [scheduleDay('Monday')],
    });
    const perfect = makeWorkout({
      routineId: 'r1',
      day: 'Monday',
      startedAt: d(2026, 7, 27).getTime(),
      completedAt: d(2026, 7, 27).getTime(),
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10, completedAt: d(2026, 7, 27).getTime() }],
    });
    const inProgress = makeWorkout({
      routineId: 'r1',
      day: 'Monday',
      startedAt: d(2026, 7, 20).getTime(),
      exercises: [{ exerciseId: 'ex1', sets: 3, reps: 10 }],
    });

    const stats = getRoutineStats(routine, [perfect, inProgress]);
    expect(stats.totalStarted).toBe(2);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalPerfect).toBe(1);
    // Scheduled Mondays between 7/13 and the last workout (7/27): 7/13, 7/20, 7/27 — one of
    // which (7/13) has no workout record at all.
    expect(stats.missedCount).toBe(1);
  });
});

import { DayOfWeek, Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { isSameWeek, startOfWeek, addDays, isAfter, isSameDay, formatDistanceToNow } from 'date-fns';
import { getSchedulePeriods, scheduledWeekdaysAt } from './schedulePeriods';

export const getDayOfWeek = (date: Date): DayOfWeek => {
  return DAYS_OF_WEEK[date.getDay()];
};

export const getTodayDayOfWeek = (): DayOfWeek => {
  return getDayOfWeek(new Date());
};

// Core utility functions that work with any day
export const hasRoutineForDay = (routines: Routine[], day: DayOfWeek): boolean => {
  return routines
    .filter(routine => routine.active)
    .some((routine) =>
      routine.dailySchedule.some((schedule) => schedule.day === day)
    );
};

export const findRoutineForDay = (routines: Routine[], day: DayOfWeek): Routine | undefined => {
  return routines
    .filter(routine => routine.active)
    .find((routine) =>
      routine.dailySchedule.some((schedule) => schedule.day === day)
    );
};

export const findScheduleForDay = (routines: Routine[], day: DayOfWeek) => {
  const routine = findRoutineForDay(routines, day);
  return routine?.dailySchedule.find(schedule => 
    schedule.day === day
  );
}

export const findWorkoutForDay = (
  workouts: Workout[], 
  routines: Routine[], 
  day: DayOfWeek,
  date: Date = new Date()
): Workout | undefined => {
  const dayRoutine = findRoutineForDay(routines, day);
  if (!dayRoutine) return undefined;
  
  return workouts.find((workout) => {
    const workoutDate = new Date(workout.startedAt);
    return workout.routineId === dayRoutine.id &&
      workout.day === day &&
      isSameWeek(workoutDate, date, { weekStartsOn: 0 }); // 0 = Sunday
  });
};

export const findExercisesForDay = (routine: Routine, day: DayOfWeek) => {
  const schedule = routine.dailySchedule.find(schedule => schedule.day === day);
  return schedule?.exercises ?? [];
};

// Today-specific convenience functions that use the core utilities
export const hasRoutineForToday = (routines: Routine[]): boolean => {
  return hasRoutineForDay(routines, getTodayDayOfWeek());
};

export const findRoutineForToday = (routines: Routine[]): Routine | undefined => {
  return findRoutineForDay(routines, getTodayDayOfWeek());
};

export const findWorkoutForToday = (workouts: Workout[], routines: Routine[]): Workout | undefined => {
  return findWorkoutForDay(workouts, routines, getTodayDayOfWeek(), new Date());
};

export const findExercisesForToday = (routine: Routine) => {
  return findExercisesForDay(routine, getTodayDayOfWeek());
};

export const hasStartedIncompleteWorkoutForToday = (workouts: Workout[], routines: Routine[]): boolean => {
  const workoutForToday = findWorkoutForToday(workouts, routines);
  return workoutForToday ? !workoutForToday.completedAt : false;
};

export type WorkoutStatus = 'not started' | 'in progress' | 'completed';

export const getWorkoutStatusForDay = (
  workouts: Workout[], 
  routines: Routine[], 
  day: DayOfWeek,
  date: Date = new Date()
): WorkoutStatus => {
  const workoutForDay = findWorkoutForDay(workouts, routines, day, date);
  if (!workoutForDay) return 'not started';
  
  return workoutForDay.completedAt ? 'completed' : 'in progress';
};

export const getWorkoutStatusForToday = (workouts: Workout[], routines: Routine[]): WorkoutStatus => {
  return getWorkoutStatusForDay(workouts, routines, getTodayDayOfWeek(), new Date());
};

// ---------------------------------------------------------------------------------------
// Day model: one source of truth for what happened, or is planned, on each calendar day.
// Both the Home streak calendar and the History year grid are built on it.
//
// A day is "scheduled" when some routine scheduled its weekday AT THAT TIME (see
// utils/schedulePeriods.ts): a past day is judged by the schedule in force at the end of it,
// today and future days by the current one. Switching or editing a routine therefore never
// rewrites past days, and a routine adds no misses from before it existed.
// A day is "completed" when any workout dated to it was finished, from any routine.
// ---------------------------------------------------------------------------------------

export interface DayStatus {
  date: Date; // local midnight
  completed: boolean;
  scheduled: boolean;
  /** Routines that scheduled this day (at the time). */
  routineIds: string[];
  future: boolean;
  isToday: boolean;
  /** A scheduled past day with no completed workout. Today never counts as missed. */
  missed: boolean;
}

// Helper to get the scheduled date for a workout (week from startedAt, day from w.day)
function getScheduledDate(workout: Workout): Date {
  const startedAt = new Date(workout.startedAt);
  const weekStart = startOfWeek(startedAt, { weekStartsOn: 0 }); // Sunday
  const dayIdx = DAYS_OF_WEEK.indexOf(workout.day);
  return addDays(weekStart, dayIdx);
}

function completedDateKeys(workouts: Workout[]): Set<string> {
  const keys = new Set<string>();
  for (const w of workouts) {
    if (w.completedAt) keys.add(getScheduledDate(w).toDateString());
  }
  return keys;
}

const startOfToday = (now: Date) => {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  return t;
};

/** Which routines scheduled `date`, judged at the end of that day (or now, if sooner). */
function routinesScheduledOn(routines: Routine[], date: Date, now: number): string[] {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const t = Math.min(endOfDay.getTime(), now);
  const weekday = getDayOfWeek(date);
  return routines.filter(r => scheduledWeekdaysAt(r, t).includes(weekday)).map(r => r.id);
}

/** Status of every day from `start` to `end` inclusive, keyed by toDateString(). */
export function getDayStatuses(
  start: Date,
  end: Date,
  workouts: Workout[],
  routines: Routine[],
  now: Date = new Date(),
): Record<string, DayStatus> {
  const completed = completedDateKeys(workouts);
  const today = startOfToday(now);
  const result: Record<string, DayStatus> = {};
  let d = startOfToday(start);
  const last = startOfToday(end);
  while (!isAfter(d, last)) {
    const key = d.toDateString();
    const routineIds = routinesScheduledOn(routines, d, now.getTime());
    const future = isAfter(d, today);
    const isToday = isSameDay(d, today);
    const isCompleted = !future && completed.has(key);
    result[key] = {
      date: new Date(d),
      completed: isCompleted,
      scheduled: routineIds.length > 0,
      routineIds,
      future,
      isToday,
      missed: routineIds.length > 0 && !isCompleted && !future && !isToday,
    };
    d = addDays(d, 1);
  }
  return result;
}

export interface StreakDay {
  date: Date;
  completed: boolean;
  rest: boolean;
  inStreak: boolean;
}

export interface StreakInfo {
  streak: number; // current streak: days with a completed workout in the unbroken run
  best: number; // longest run ever, same unit
  status: 'pending' | 'up_to_date' | 'expired';
  days: Record<string, StreakDay>; // key: date string (toDateString), value: StreakDay
}

// The first day worth showing: the earliest completed workout or the earliest day any
// routine was scheduled, whichever comes first.
function historyStart(workouts: Workout[], routines: Routine[]): Date | undefined {
  let first: number | undefined;
  for (const w of workouts) {
    if (!w.completedAt) continue;
    const t = getScheduledDate(w).getTime();
    if (first === undefined || t < first) first = t;
  }
  for (const r of routines) {
    const p = getSchedulePeriods(r)[0];
    if (p && p.start > 0 && (first === undefined || p.start < first)) first = p.start;
  }
  return first === undefined ? undefined : new Date(first);
}

/**
 * The streak runs through every completed day (scheduled or a bonus workout on a rest day)
 * and is broken only by a missed scheduled day. Rest days bridge it without adding to the
 * count. Today can't break it: if today is scheduled and not done yet the status is
 * "pending" (expiring today).
 */
export function getStreakInfo(workouts: Workout[], routines: Routine[], now: Date = new Date()): StreakInfo {
  const empty: StreakInfo = { streak: 0, best: 0, status: 'expired', days: {} };
  if (!workouts.some(w => w.completedAt)) return empty;
  const start = historyStart(workouts, routines);
  if (!start || isAfter(start, now)) return empty;

  const statuses = Object.values(getDayStatuses(start, now, workouts, routines, now));
  const days: StreakDay[] = statuses.map(s => ({ date: s.date, completed: s.completed, rest: !s.scheduled, inStreak: false }));

  let best = 0;
  let count = 0;
  let runStart = -1; // index of the run's first completed day, -1 when there's no run
  let lastCompleted = -1;
  const closeRun = (endIdx: number) => {
    for (let j = runStart; j <= endIdx; j++) days[j].inStreak = true;
    best = Math.max(best, count);
  };
  statuses.forEach((s, i) => {
    if (s.completed) {
      if (runStart < 0) runStart = i;
      lastCompleted = i;
      count++;
    } else if (s.missed && runStart >= 0) {
      closeRun(lastCompleted); // the run ends at its last workout, not at the miss
      runStart = -1;
      count = 0;
    }
  });

  const todayStatus = statuses[statuses.length - 1];
  let status: StreakInfo['status'] = 'expired';
  if (runStart >= 0) {
    closeRun(days.length - 1); // still alive: carries through rest days and today
    status = todayStatus.scheduled && !todayStatus.completed ? 'pending' : 'up_to_date';
  } else {
    count = 0;
  }

  const map: Record<string, StreakDay> = {};
  for (const day of days) map[day.date.toDateString()] = day;
  return { streak: count, best, status, days: map };
}

export interface YearDay {
  date: Date;
  completed: boolean;
  rest: boolean;
  future: boolean;
}

// Classifies every day of a calendar year for the History year grid, from the same day model
// as the streak calendar. A day can be both "completed" and "rest" (a bonus workout).
// Future days show the current schedule.
export function getYearActivity(year: number, workouts: Workout[], routines: Routine[], now: Date = new Date()): Record<string, YearDay> {
  const statuses = getDayStatuses(new Date(year, 0, 1), new Date(year, 11, 31), workouts, routines, now);
  const result: Record<string, YearDay> = {};
  for (const [key, s] of Object.entries(statuses)) {
    result[key] = { date: s.date, completed: s.completed, rest: !s.scheduled, future: s.future };
  }
  return result;
}


export type ExerciseStats = {
  routines: number;
  days: number;
  workouts: number;
}

// Returns { routines, days, workouts } for a given exerciseId
export function getExerciseStats(
  exerciseId: string,
  routines: Routine[],
  workouts: Workout[]
): ExerciseStats {
  let routinesCount = 0;
  let daysSet = new Set<string>();
  let workoutsCount = 0;
  for (const routine of routines) {
    let foundInRoutine = false;
    for (const day of routine.dailySchedule) {
      if (day.exercises.some(ex => ex.exerciseId === exerciseId)) {
        foundInRoutine = true;
        daysSet.add(day.day);
      }
    }
    if (foundInRoutine) routinesCount++;
  }
  for (const workout of workouts) {
    if (workout.exercises.some(ex => ex.exerciseId === exerciseId)) {
      workoutsCount++;
    }
  }
  return { routines: routinesCount, days: daysSet.size, workouts: workoutsCount };
}

export function getRoutineStats(routine: Routine, workouts: Workout[]): {
  totalStarted: number;
  totalCompleted: number;
  totalPerfect: number;
  missedCount: number;
  streak: number;
  createdAgo: string;
} {
  // Filter workouts for this routine
  const routineWorkouts = workouts.filter(w => w.routineId === routine.id);
  // Totals
  const totalStarted = routineWorkouts.length;
  const totalCompleted = routineWorkouts.filter(w => w.completedAt).length;
  const totalPerfect = routineWorkouts.filter(w => w.completedAt && w.exercises.length > 0 && w.exercises.every(ex => ex.completedAt && !ex.skipped)).length;
  // Created ago
  const createdAgo = routine.createdAt ? formatDistanceToNow(new Date(routine.createdAt), { addSuffix: true }) : 'Unknown';
  // Streak calculation: use getStreakInfo for this routine only
  const streakInfo = getStreakInfo(routineWorkouts, [routine]);
  const streak = streakInfo.streak;
  // Missed workouts calculation
  const scheduledDays = new Set<string>();
  if (routine.dailySchedule && Array.isArray(routine.dailySchedule) && routine.dailySchedule.length > 0 && routine.createdAt) {
    const scheduleDays = routine.dailySchedule.map(s => s.day);
    const startDate = new Date(routine.createdAt);
    const allWorkoutDates = routineWorkouts.map(w => new Date(w.startedAt));
    const lastWorkoutDate = allWorkoutDates.length > 0 ? new Date(Math.max(...allWorkoutDates.map(d => d.getTime()))) : new Date();
    let d = new Date(startDate);
    while (d <= lastWorkoutDate) {
      const weekday = DAYS_OF_WEEK[d.getDay()];
      if (scheduleDays.includes(weekday)) {
        scheduledDays.add(d.toDateString());
      }
      d.setDate(d.getDate() + 1);
    }
  }
  const workoutDays = new Set(routineWorkouts.map(w => new Date(w.startedAt).toDateString()));
  const missedCount = Array.from(scheduledDays).filter(day => !workoutDays.has(day)).length;
  return { totalStarted, totalCompleted, totalPerfect, missedCount, streak, createdAgo };
}
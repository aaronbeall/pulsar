import { DayOfWeek, Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { isSameWeek, startOfWeek, addDays, isAfter, isBefore, isEqual, subDays, isSameDay, formatDistanceToNow, differenceInDays } from 'date-fns';

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

export interface StreakDay {
  date: Date;
  completed: boolean;
  rest: boolean;
  inStreak: boolean;
}

export interface StreakInfo {
  streak: number; // current streak count (workout days only)
  status: 'pending' | 'up_to_date' | 'expired';
  days: Record<string, StreakDay>; // key: date string (toDateString), value: StreakDay
}

// Helper to get the scheduled date for a workout (week from startedAt, day from w.day)
function getScheduledDate(workout: Workout): Date {
  const startedAt = new Date(workout.startedAt);
  const weekStart = startOfWeek(startedAt, { weekStartsOn: 0 }); // Sunday
  const dayIdx = DAYS_OF_WEEK.indexOf(workout.day);
  return addDays(weekStart, dayIdx);
}

// Builds a Set of toDateString() keys for the scheduled date of each completed workout
// matching the given predicate.
function completedDateKeys(workouts: Workout[], predicate: (w: Workout) => boolean): Set<string> {
  const keys = new Set<string>();
  for (const w of workouts) {
    if (w.completedAt && predicate(w)) {
      keys.add(getScheduledDate(w).toDateString());
    }
  }
  return keys;
}

export function getStreakInfo(workouts: Workout[], routines: Routine[]): StreakInfo {
  const activeRoutineIds = new Set(routines.filter(r => r.active).map(r => r.id));

  // "completed" (exposed on each StreakDay, drives the calendar's day markers) reflects
  // ANY completed workout session — an accurate historical record regardless of whether
  // its routine is still active. Streak continuity — inStreak / the numeric streak count /
  // pending-expired status — is computed separately from completedForStreak, which stays
  // scoped to workouts under routines that are STILL active, so deactivating a routine
  // can't keep extending the streak indefinitely.
  const completedAll = completedDateKeys(workouts, () => true);
  const completedForStreak = completedDateKeys(workouts, w => activeRoutineIds.has(w.routineId));

  if (completedAll.size === 0) return { streak: 0, status: 'expired', days: {} };

  // Walk back to the earliest completed workout of any kind, so history displays fully
  // even on days that only have an inactive-routine workout to show.
  let firstDate: Date | undefined;
  for (const w of workouts) {
    if (!w.completedAt) continue;
    const scheduled = getScheduledDate(w);
    if (!firstDate || isBefore(scheduled, firstDate)) firstDate = scheduled;
  }
  if (!firstDate) return { streak: 0, status: 'expired', days: {} };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the day array (oldest first) alongside a parallel streak-only completion flag —
  // the latter isn't part of the exposed StreakDay shape, it's only needed to compute
  // inStreak/streak/status below.
  const streakDaysArr: StreakDay[] = [];
  const forStreakArr: boolean[] = [];
  let d = today;
  while (!isBefore(d, firstDate)) {
    const key = d.toDateString();
    const dayOfWeek = getDayOfWeek(d);
    const hasRoutine = routines
      .filter(r => r.active)
      .some(r => r.dailySchedule.some(s => s.day === dayOfWeek));
    streakDaysArr.push({
      date: new Date(d),
      completed: completedAll.has(key),
      rest: !hasRoutine,
      inStreak: false,
    });
    forStreakArr.push(completedForStreak.has(key));
    d = subDays(d, 1);
  }
  streakDaysArr.reverse();
  forStreakArr.reverse();

  // Mark all days that are in a streak (consecutive completed scheduled workouts, rest
  // days between are inStreak if between completed workouts or today) — using the
  // active-routine-scoped completion flag, not the display "completed" field.
  let inStreak = false;
  for (let i = 0; i < streakDaysArr.length; i++) {
    const day = streakDaysArr[i];
    const completedForStreakToday = forStreakArr[i];
    if (day.rest) {
      // Mark as inStreak if between completed workouts or today
      if (inStreak || completedForStreakToday) {
        day.inStreak = true;
      }
      continue;
    }
    if (completedForStreakToday) {
      inStreak = true;
      day.inStreak = true;
    } else {
      // Not completed scheduled workout
      if (i === streakDaysArr.length - 1) {
        // Today is a scheduled workout and not completed
        // If the streak is unbroken up to today, mark today as inStreak (for pending)
        if (inStreak) {
          day.inStreak = true;
        }
        continue;
      } else {
        // Missed a scheduled workout in the past, break the streak
        inStreak = false;
      }
    }
  }

  // Calculate current streak and status
  let streak = 0;
  let status: 'pending' | 'up_to_date' | 'expired' = 'expired';
  const todayIdx = streakDaysArr.length - 1;
  const todayDay = streakDaysArr[todayIdx];
  const todayCompletedForStreak = forStreakArr[todayIdx];
  // Find the last inStreak scheduled workout before today (or today if completed)
  for (let i = todayIdx; i >= 0; i--) {
    const day = streakDaysArr[i];
    if (day.rest) continue;
    if (day.inStreak) {
      // If today is pending, do not count today in the streak
      if (i === todayIdx && !todayCompletedForStreak && todayDay.inStreak && !todayDay.rest) {
        continue;
      }
      streak++;
    } else {
      break;
    }
  }
  // Determine status
  if (!todayDay.rest && !todayCompletedForStreak && todayDay.inStreak) {
    status = 'pending';
  } else if (todayDay.inStreak) {
    status = 'up_to_date';
  } else {
    status = 'expired';
    streak = 0;
  }

  // Convert to map
  const days: Record<string, StreakDay> = {};
  for (const day of streakDaysArr) {
    days[day.date.toDateString()] = day;
  }
  return { streak, status, days };
}

export interface YearDay {
  date: Date;
  completed: boolean;
  rest: boolean;
  future: boolean;
}

// Classifies every day of a calendar year for a year-at-a-glance view — unlike
// getStreakInfo (which only walks backward from today to the first workout), this covers
// the full Jan 1 - Dec 31 range, including days before any workout history and days still
// to come. "completed" reflects ANY completed workout session regardless of the routine's
// current active status — an accurate historical record. "rest" reuses the same
// active-routine-schedule check as the rest of the app (hasRoutineForDay), so a day only
// counts as a miss if it was scheduled for a routine that's STILL active — matching how
// the streak calendar reasons about rest days. A day can therefore be both "completed" and
// "rest" at once (e.g. a bonus workout logged under a routine you've since retired).
export function getYearActivity(year: number, workouts: Workout[], routines: Routine[]): Record<string, YearDay> {
  const completedDates = completedDateKeys(workouts, () => true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: Record<string, YearDay> = {};
  const end = new Date(year, 11, 31);
  let d = new Date(year, 0, 1);
  while (!isAfter(d, end)) {
    const key = d.toDateString();
    result[key] = {
      date: new Date(d),
      completed: completedDates.has(key),
      rest: !hasRoutineForDay(routines, getDayOfWeek(d)),
      future: isAfter(d, today),
    };
    d = addDays(d, 1);
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
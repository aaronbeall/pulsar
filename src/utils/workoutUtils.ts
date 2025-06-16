import { DayOfWeek, Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { isSameWeek, startOfWeek, addDays, isAfter, isBefore, isEqual, subDays, isSameDay } from 'date-fns';

export const getDayOfWeek = (date: Date): DayOfWeek => {
  return DAYS_OF_WEEK[date.getDay()];
};

export const getTodayDayOfWeek = (): DayOfWeek => {
  return getDayOfWeek(new Date());
};

// Core utility functions that work with any day
export const hasRoutineForDay = (routines: Routine[], day: DayOfWeek): boolean => {
  return routines.some((routine) =>
    routine.dailySchedule.some((schedule) => schedule.day === day)
  );
};

export const findRoutineForDay = (routines: Routine[], day: DayOfWeek): Routine | undefined => {
  return routines.find((routine) =>
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

export function getStreakInfo(workouts: Workout[], routines: Routine[], daysBack?: number): StreakInfo {
  // 1. Convert workouts to workoutDates, preserving the scheduled date
  const workoutDates: Date[] = workouts
    .filter(w => !!w.completedAt)
    .map(getScheduledDate);
  workoutDates.sort((a, b) => b.getTime() - a.getTime());
  const completedMap = new Map<string, boolean>();
  for (const d of workoutDates) {
    const key = d.toDateString();
    if (!completedMap.has(key)) {
      completedMap.set(key, true);
    }
  }

  // 2. Build a fully populated StreakDay array from today back to the first workout
  const streakDaysArr: StreakDay[] = [];
  if (completedMap.size === 0) return { streak: 0, status: 'expired', days: {} };
  const firstDate = workoutDates.length > 0 ? workoutDates[workoutDates.length - 1] : undefined;
  if (!firstDate) return { streak: 0, status: 'expired', days: {} };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = today;
  while (!isBefore(d, firstDate)) {
    const key = d.toDateString();
    const completed = completedMap.has(key);
    const dayOfWeek = getDayOfWeek(d);
    const hasRoutine = routines.some(r => r.dailySchedule.some(s => s.day === dayOfWeek));
    streakDaysArr.push({
      date: new Date(d),
      completed,
      rest: !hasRoutine,
      inStreak: false,
    });
    d = subDays(d, 1);
  }
  streakDaysArr.reverse(); // oldest first

  // 3. Mark all days that are in a streak (consecutive completed scheduled workouts, rest days between are inStreak if between completed workouts or today)
  let inStreak = false;
  let streakStart = -1;
  for (let i = 0; i < streakDaysArr.length; i++) {
    const day = streakDaysArr[i];
    if (day.rest) {
      // Only mark as inStreak if between completed workouts or today
      if (inStreak) {
        day.inStreak = true;
      }
      continue;
    }
    if (day.completed) {
      if (!inStreak) {
        inStreak = true;
        streakStart = i;
      }
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

  // 4. Calculate current streak and status
  let streak = 0;
  let status: 'pending' | 'up_to_date' | 'expired' = 'expired';
  const todayIdx = streakDaysArr.length - 1;
  const todayDay = streakDaysArr[todayIdx];
  // Find the last inStreak scheduled workout before today (or today if completed)
  for (let i = todayIdx; i >= 0; i--) {
    const day = streakDaysArr[i];
    if (day.rest) continue;
    if (day.inStreak) {
      streak++;
    } else {
      break;
    }
  }
  // Determine status
  if (!todayDay.rest && !todayDay.completed && todayDay.inStreak) {
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
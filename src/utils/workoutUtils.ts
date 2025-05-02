import { DayOfWeek, Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { isSameWeek } from 'date-fns';

export const getTodayDayOfWeek = (): DayOfWeek => {
  const date = new Date();
  const day = date.getDay();
  return DAYS_OF_WEEK[day];
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
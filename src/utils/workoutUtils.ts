import { DayOfWeek, Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';

export const getTodayDayOfWeek = (): DayOfWeek => {
  const date = new Date();
  const day = date.getDay();
  return DAYS_OF_WEEK[day];
};

export const hasRoutineForToday = (routines: Routine[]): boolean => {
  const today = getTodayDayOfWeek();
  return routines.some((routine) =>
    routine.dailySchedule.some((schedule) => schedule.day === today)
  );
};

export const findTodayRoutine = (routines: Routine[]): Routine | undefined => {
  const today = getTodayDayOfWeek();
  return routines.find((routine) =>
    routine.dailySchedule.some((schedule) => schedule.day === today)
  );
};

export const findIncompleteWorkoutForToday = (workouts: Workout[], routines: Routine[]): Workout | undefined => {
  const todayRoutine = findTodayRoutine(routines);
  if (!todayRoutine) return undefined;
  
  return workouts.find(
    (workout) =>
      workout.routineId === todayRoutine.id &&
      new Date(workout.startedAt).toDateString() === new Date().toDateString() &&
      !workout.completedAt
  );
};

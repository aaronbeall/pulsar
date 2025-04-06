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

export const findRoutineForToday = (routines: Routine[]): Routine | undefined => {
  const today = getTodayDayOfWeek();
  return routines.find((routine) =>
    routine.dailySchedule.some((schedule) => schedule.day === today)
  );
};

export const findWorkoutForToday = (workouts: Workout[], routines: Routine[]): Workout | undefined => {
  const todayRoutine = findRoutineForToday(routines);
  if (!todayRoutine) return undefined;
  
  return workouts.find(
    (workout) =>
      workout.routineId === todayRoutine.id &&
      new Date(workout.startedAt).toDateString() === new Date().toDateString()
  );
};

export const hasStartedIncompleteWorkoutForToday = (workouts: Workout[], routines: Routine[]): boolean => {
  const workoutForToday = findWorkoutForToday(workouts, routines);
  return workoutForToday ? !workoutForToday.completedAt : false;
}

export const getWorkoutStatusForToday = (workouts: Workout[], routines: Routine[]) => {
    const workoutForToday = findWorkoutForToday(workouts, routines);
    if (!workoutForToday) return 'not started';
    
    if (workoutForToday.completedAt) {
        return 'completed';
    } else {
        return 'in progress';
    }
}

export const findExercisesForToday = (routine: Routine) => {
  const today = getTodayDayOfWeek();
  const todaySchedule = routine.dailySchedule.find(schedule => schedule.day === today);
  return todaySchedule?.exercises ?? [];
};
import { Routine, Workout } from '../models/types';
import { getRoutineStats, getStreakInfo } from './workoutUtils';

export const isPerfectWorkout = (workout: Workout): boolean =>
  !!workout.completedAt && workout.exercises.length > 0 && workout.exercises.every(ex => ex.completedAt && !ex.skipped);

export interface HistorySummaryStats {
  streak: number;
  totalCompleted: number;
  perfectWorkouts: number;
  totalWorkoutTimeMs: number;
  uniqueExercisesDone: number;
  activeRoutineCount: number;
}

// Single pass over `workouts` for the completed/perfect/duration/exercise-variety totals —
// these all used to be separate .filter()/.reduce() calls in the view.
export function getHistorySummaryStats(workouts: Workout[], routines: Routine[]): HistorySummaryStats {
  const activeRoutines = routines.filter(r => r.active);
  const { streak } = getStreakInfo(workouts, activeRoutines);

  let totalCompleted = 0;
  let perfectWorkouts = 0;
  let totalWorkoutTimeMs = 0;
  const exerciseIds = new Set<string>();

  for (const workout of workouts) {
    if (workout.completedAt) {
      totalCompleted++;
      totalWorkoutTimeMs += workout.completedAt - workout.startedAt;
      if (isPerfectWorkout(workout)) perfectWorkouts++;
    }
    for (const ex of workout.exercises) {
      if (ex.completedAt && !ex.skipped) exerciseIds.add(ex.exerciseId);
    }
  }

  return {
    streak,
    totalCompleted,
    perfectWorkouts,
    totalWorkoutTimeMs,
    uniqueExercisesDone: exerciseIds.size,
    activeRoutineCount: activeRoutines.length,
  };
}

// Compact "18h 42m" / "45m" style — a full date-fns duration breakdown (days/weeks) would
// be overkill for a stat card and this total only ever grows in hours for a personal app.
export function formatTotalDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export interface RoutineTimelineEntry {
  routine: Routine;
  firstDate: number;
  lastDate: number;
  stats: ReturnType<typeof getRoutineStats>;
}

// One entry per routine that has actual workout history, sorted by most recent activity.
// Routines never actually used are excluded — there's no start/stop range to show for them.
export function getRoutineTimeline(routines: Routine[], workouts: Workout[]): RoutineTimelineEntry[] {
  const entries: RoutineTimelineEntry[] = [];
  for (const routine of routines) {
    const routineWorkouts = workouts.filter(w => w.routineId === routine.id);
    if (routineWorkouts.length === 0) continue;
    const sorted = [...routineWorkouts].sort((a, b) => a.startedAt - b.startedAt);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    entries.push({
      routine,
      firstDate: first.startedAt,
      lastDate: last.completedAt ?? last.startedAt,
      stats: getRoutineStats(routine, workouts),
    });
  }
  return entries.sort((a, b) => b.lastDate - a.lastDate);
}

// Every workout ever started, newest first.
export function getWorkoutHistory(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) => b.startedAt - a.startedAt);
}

export type HistoryTimelineItem =
  | { type: 'workout'; date: number; workout: Workout }
  | { type: 'routineCreated'; date: number; routine: Routine };

// Merges every workout with each routine's creation date into one newest-first feed, so
// "routine created" shows up alongside workouts in the global History timeline.
export function getHistoryTimeline(workouts: Workout[], routines: Routine[]): HistoryTimelineItem[] {
  const items: HistoryTimelineItem[] = [
    ...workouts.map((workout): HistoryTimelineItem => ({ type: 'workout', date: workout.startedAt, workout })),
    ...routines.map((routine): HistoryTimelineItem => ({ type: 'routineCreated', date: routine.createdAt, routine })),
  ];
  return items.sort((a, b) => b.date - a.date);
}

export function getRoutineName(routineId: string, routines: Routine[]): string {
  return routines.find(r => r.id === routineId)?.name ?? 'Unknown routine';
}

export function getWorkoutKind(workout: Workout, routines: Routine[]): string | undefined {
  const routine = routines.find(r => r.id === workout.routineId);
  return routine?.dailySchedule.find(d => d.day === workout.day)?.kind || undefined;
}

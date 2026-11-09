import { DayOfWeek, Routine, Workout } from '../models/types';
import { getDayStatuses, getStreakInfo } from './workoutUtils';
import { getSchedulePeriods } from './schedulePeriods';

export const isPerfectWorkout = (workout: Workout): boolean =>
  !!workout.completedAt && workout.exercises.length > 0 && workout.exercises.every(ex => ex.completedAt && !ex.skipped);

export interface HistorySummaryStats {
  streak: number;
  bestStreak: number;
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
  const { streak, best: bestStreak } = getStreakInfo(workouts, routines);

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
    bestStreak,
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

export interface StintChange {
  date: number;
  days: DayOfWeek[];
}

/**
 * One unbroken stretch of a routine being active: the unit the History timeline is grouped
 * by. Schedule edits inside it are listed as changes rather than starting a new stint.
 */
export interface RoutineStint {
  routine: Routine;
  start: number;
  /** Unset while the routine is still active. */
  end?: number;
  /** The weekdays it started with. Empty for a stint inferred from workouts alone. */
  days: DayOfWeek[];
  changes: StintChange[];
  /** Its workouts, newest first. */
  workouts: Workout[];
  completed: number;
  perfect: number;
  /** Days it scheduled that had no workout at all. */
  missed: number;
}

/** Every routine's active stints, most recent activity first. */
export function getRoutineStints(workouts: Workout[], routines: Routine[], now: Date = new Date()): RoutineStint[] {
  const stints: RoutineStint[] = [];
  const nowMs = now.getTime();

  for (const routine of routines) {
    const own = workouts.filter(w => w.routineId === routine.id);
    const mine: RoutineStint[] = [];
    for (const p of getSchedulePeriods(routine)) {
      const prev = mine[mine.length - 1];
      if (prev && prev.end !== undefined && prev.end === p.start) {
        // An edit while active: same stint, new schedule.
        prev.end = p.end;
        prev.changes.push({ date: p.start, days: p.days });
      } else {
        mine.push({ routine, start: p.start, end: p.end, days: p.days, changes: [], workouts: [], completed: 0, perfect: 0, missed: 0 });
      }
    }
    const leftovers: Workout[] = [];
    for (const w of own) {
      const stint = mine.find(s => w.startedAt >= s.start && (s.end === undefined || w.startedAt < s.end));
      if (stint) stint.workouts.push(w);
      else leftovers.push(w);
    }
    if (leftovers.length) {
      // Workouts from when the routine had no recorded active stretch (e.g. data from before
      // the schedule log existed): one stint spanning them.
      const times = leftovers.map(w => w.startedAt);
      const last = Math.max(...leftovers.map(w => w.completedAt ?? w.startedAt));
      mine.push({ routine, start: Math.min(...times), end: last, days: [], changes: [], workouts: leftovers, completed: 0, perfect: 0, missed: 0 });
    }

    for (const s of mine) {
      if (!s.workouts.length && s.end !== undefined && s.end - s.start < 86_400_000) continue; // switched straight back off
      s.workouts.sort((a, b) => b.startedAt - a.startedAt);
      s.completed = s.workouts.filter(w => w.completedAt).length;
      s.perfect = s.workouts.filter(isPerfectWorkout).length;
      if (s.days.length) {
        const statuses = getDayStatuses(new Date(s.start), new Date(Math.min(s.end ?? nowMs, nowMs)), workouts, routines, now);
        s.missed = Object.values(statuses).filter(d => d.missed && d.routineIds.includes(routine.id)).length;
      }
      stints.push(s);
    }
  }

  const lastActivity = (s: RoutineStint) =>
    s.end === undefined ? Infinity : Math.max(s.end, ...s.workouts.map(w => w.completedAt ?? w.startedAt));
  return stints.sort((a, b) => lastActivity(b) - lastActivity(a) || b.start - a.start);
}

export function getRoutineName(routineId: string, routines: Routine[]): string {
  return routines.find(r => r.id === routineId)?.name ?? 'Unknown routine';
}

export function getWorkoutKind(workout: Workout, routines: Routine[]): string | undefined {
  const routine = routines.find(r => r.id === workout.routineId);
  return routine?.dailySchedule.find(d => d.day === workout.day)?.kind || undefined;
}

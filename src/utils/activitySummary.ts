import { addDays, startOfMonth, startOfWeek } from 'date-fns';
import { Routine, Workout } from '../models/types';
import { DayLabel, getDayLabel } from './dayDetail';
import { getDayStatuses, getStreakInfo, StreakInfo } from './workoutUtils';

// The compact "how am I doing" summary shown on Home, the routine page, and the session
// complete screen. Callers scope it: all data for the app-wide summary, or one routine's
// workouts plus [routine] for a routine's own.

export interface WeekDay {
  date: Date;
  label: DayLabel;
}

export interface ActivitySummary {
  streak: number;
  best: number;
  status: StreakInfo['status'];
  /** This week, Sunday first. */
  week: WeekDay[];
  /** Days done this week, and days planned (done plus still-scheduled or missed). */
  weekDone: number;
  weekPlanned: number;
  monthDone: number;
  totalDone: number;
  totalTimeMs: number;
  lastWorkoutAt?: number;
}

export function getActivitySummary(workouts: Workout[], routines: Routine[], now: Date = new Date()): ActivitySummary {
  const { streak, best, status } = getStreakInfo(workouts, routines, now);

  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const statuses = Object.values(getDayStatuses(weekStart, addDays(weekStart, 6), workouts, routines, now));
  const week = statuses.map(s => ({ date: s.date, label: getDayLabel(s) }));

  const monthStart = startOfMonth(now).getTime();
  let monthDone = 0;
  let totalDone = 0;
  let totalTimeMs = 0;
  let lastWorkoutAt: number | undefined;
  for (const w of workouts) {
    if (!w.completedAt) continue;
    totalDone++;
    totalTimeMs += w.completedAt - w.startedAt;
    if (w.startedAt >= monthStart && w.startedAt <= now.getTime()) monthDone++;
    if (lastWorkoutAt === undefined || w.completedAt > lastWorkoutAt) lastWorkoutAt = w.completedAt;
  }

  return {
    streak,
    best,
    status,
    week,
    weekDone: statuses.filter(s => s.completed).length,
    weekPlanned: statuses.filter(s => s.completed || s.scheduled).length,
    monthDone,
    totalDone,
    totalTimeMs,
    lastWorkoutAt,
  };
}

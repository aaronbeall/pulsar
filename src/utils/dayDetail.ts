import { isSameDay } from 'date-fns';
import { Routine, Workout } from '../models/types';
import { DayStatus, getDayOfWeek, getDayStatuses, getScheduledDate } from './workoutUtils';

// What the day sheet shows when you tap a day on the streak calendar or the year grid.

export type DayLabel = 'done' | 'missed' | 'rest' | 'today' | 'planned';

export interface PlannedWorkout {
  routine: Routine;
  kind?: string;
  exerciseCount: number;
}

export interface DayDetail {
  status: DayStatus;
  label: DayLabel;
  /** Every workout dated to this day (finished or not), oldest first. */
  workouts: Workout[];
  /** What the routines that scheduled this day had on it (from their current schedule). */
  planned: PlannedWorkout[];
}

export function getDayLabel(s: DayStatus): DayLabel {
  if (s.completed) return 'done';
  if (s.future) return s.scheduled ? 'planned' : 'rest';
  if (s.isToday && s.scheduled) return 'today';
  if (s.missed) return 'missed';
  return 'rest';
}

export function getDayDetail(date: Date, workouts: Workout[], routines: Routine[], now: Date = new Date()): DayDetail {
  const status = Object.values(getDayStatuses(date, date, workouts, routines, now))[0];
  const weekday = getDayOfWeek(date);
  const planned: PlannedWorkout[] = [];
  for (const id of status.routineIds) {
    const routine = routines.find(r => r.id === id);
    if (!routine) continue;
    const day = routine.dailySchedule.find(s => s.day === weekday);
    planned.push({ routine, kind: day?.kind || undefined, exerciseCount: day?.exercises.length ?? 0 });
  }
  return {
    status,
    label: getDayLabel(status),
    workouts: workouts.filter(w => isSameDay(getScheduledDate(w), date)).sort((a, b) => a.startedAt - b.startedAt),
    planned,
  };
}

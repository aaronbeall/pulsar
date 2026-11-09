import { isSameDay } from 'date-fns';
import { DayOfWeek, Routine, SchedulePeriod } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';

// A routine's schedule history: the spans of time it was active, and which weekdays it
// scheduled during each one. The streak calendar and the History year grid judge every past
// day against the schedule that was in force ON that day, so switching or editing a routine
// never rewrites the past. The store keeps this log up to date on every add/update.

/** The weekdays a routine's current dailySchedule has a workout on, in week order. */
export function scheduledWeekdays(routine: Pick<Routine, 'dailySchedule'>): DayOfWeek[] {
  const days = new Set(routine.dailySchedule.map(s => s.day));
  return DAYS_OF_WEEK.filter(d => days.has(d));
}

/**
 * The routine's schedule log. A routine saved before the log existed has none, so one is
 * inferred: active since it was created, on its current days (the best guess available).
 */
export function getSchedulePeriods(routine: Routine): SchedulePeriod[] {
  if (routine.schedulePeriods) return routine.schedulePeriods;
  if (!routine.active) return [];
  return [{ start: routine.createdAt || 0, days: scheduledWeekdays(routine) }];
}

const sameDays = (a: DayOfWeek[], b: DayOfWeek[]) => a.length === b.length && a.every((d, i) => d === b[i]);

/**
 * The log `next` should be saved with, given the stored version `prev` (undefined for a new
 * routine). Activating opens a period, deactivating closes it, and changing the scheduled
 * weekdays while active closes the current period and opens a new one. A period opened
 * earlier the same day is replaced rather than closed, so a burst of edits doesn't pile up
 * zero-length periods (a day is judged by its last state, so the result is the same).
 */
export function reconcileSchedulePeriods(prev: Routine | undefined, next: Routine, now: number = Date.now()): SchedulePeriod[] {
  const periods = prev ? getSchedulePeriods(prev).map(p => ({ ...p })) : [];
  const open = periods.length && periods[periods.length - 1].end === undefined ? periods[periods.length - 1] : undefined;
  const days = scheduledWeekdays(next);

  if (open && next.active && sameDays(open.days, days)) return periods;

  if (open) {
    if (isSameDay(open.start, now)) periods.pop();
    else open.end = now;
  }
  if (next.active) periods.push({ start: now, days });
  return periods;
}

/** The weekdays a routine scheduled at instant `t` (empty when it wasn't active then). */
export function scheduledWeekdaysAt(routine: Routine, t: number): DayOfWeek[] {
  const period = getSchedulePeriods(routine).find(p => p.start <= t && (p.end === undefined || p.end > t));
  return period?.days ?? [];
}

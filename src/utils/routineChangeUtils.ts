import { DAYS_OF_WEEK } from '../constants/days';
import { Routine, RoutineChange, RoutineDay } from '../models/types';

/**
 * Apply an accepted AI-proposed change to a routine's schedule and description. setDay
 * replaces (or adds) that day's workout, clearDay turns it into a rest day. The result is
 * kept in Sunday-to-Saturday order so a newly added day doesn't land at the end. Pure: returns
 * the new values and leaves the inputs untouched.
 */
export function applyRoutineChange(
  routine: Pick<Routine, 'dailySchedule' | 'description'>,
  change: RoutineChange
): { dailySchedule: RoutineDay[]; description: string } {
  const byDay = new Map(routine.dailySchedule.map(d => [d.day, d]));
  for (const op of change.patch.dailySchedule || []) {
    if (op.op === 'clearDay') {
      byDay.delete(op.day);
    } else {
      byDay.set(op.day, { day: op.day, kind: op.kind, exercises: op.exercises });
    }
  }
  return {
    dailySchedule: DAYS_OF_WEEK.filter(d => byDay.has(d)).map(d => byDay.get(d)!),
    description: change.patch.description ?? routine.description,
  };
}

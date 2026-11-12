import { v4 as uuidv4 } from 'uuid';
import { DAYS_OF_WEEK } from '../constants/days';
import type {
  DayOfWeek,
  Routine,
  RoutineChange,
  RoutineChangeDecision,
  RoutineChangeItemKey,
  RoutineChangeOp,
  RoutineDay,
  RoutineRevision,
  ScheduledExercise,
} from '../models/types';

/**
 * Apply one day op to a schedule. setDay replaces (or adds) that day's workout, clearDay turns
 * it into a rest day. The result is kept in Sunday-to-Saturday order so a newly added day
 * doesn't land at the end. Pure: returns a new array and leaves the input untouched.
 */
export function applyDayOp(schedule: RoutineDay[], op: RoutineChangeOp): RoutineDay[] {
  const byDay = new Map(schedule.map(d => [d.day, d]));
  if (op.op === 'clearDay') {
    byDay.delete(op.day);
  } else {
    byDay.set(op.day, { day: op.day, kind: op.kind, exercises: op.exercises });
  }
  return DAYS_OF_WEEK.filter(d => byDay.has(d)).map(d => byDay.get(d)!);
}

/**
 * Apply every item of an AI-proposed change to a routine's schedule and description, as if
 * all of it were accepted. Pure: returns the new values and leaves the inputs untouched.
 */
export function applyRoutineChange(
  routine: Pick<Routine, 'dailySchedule' | 'description'>,
  change: RoutineChange
): { dailySchedule: RoutineDay[]; description: string } {
  let dailySchedule = routine.dailySchedule;
  for (const op of change.patch.dailySchedule || []) dailySchedule = applyDayOp(dailySchedule, op);
  return { dailySchedule, description: change.patch.description ?? routine.description };
}

/** The reviewable items in a change, in display order: its days, then the description. */
export function getChangeItemKeys(change: RoutineChange): RoutineChangeItemKey[] {
  const keys: RoutineChangeItemKey[] = [];
  for (const op of change.patch.dailySchedule || []) if (!keys.includes(op.day)) keys.push(op.day);
  if (change.patch.description !== undefined) keys.push('description');
  return keys;
}

/** The op a change proposes for a day. If the model repeated a day, the last one wins. */
export function getDayOp(change: RoutineChange, day: DayOfWeek): RoutineChangeOp | undefined {
  const ops = (change.patch.dailySchedule || []).filter(op => op.day === day);
  return ops[ops.length - 1];
}

export type ChangeItemStatus = 'pending' | 'accepted' | 'rejected';

export function getItemStatus(change: RoutineChange, key: RoutineChangeItemKey): ChangeItemStatus {
  const decided = change.decisions?.[key]?.status;
  if (decided) return decided;
  // A change decided as a whole before per-item decisions existed.
  if (change.status === 'accepted' || change.status === 'rejected') return change.status;
  return 'pending';
}

export function deriveChangeStatus(change: RoutineChange): RoutineChange['status'] {
  const statuses = getChangeItemKeys(change).map(k => getItemStatus(change, k));
  if (statuses.length === 0) return change.status;
  if (statuses.includes('pending')) return 'pending';
  if (statuses.every(s => s === 'accepted')) return 'accepted';
  if (statuses.every(s => s === 'rejected')) return 'rejected';
  return 'partial';
}

export function getPendingItemKeys(change: RoutineChange): RoutineChangeItemKey[] {
  return getChangeItemKeys(change).filter(k => getItemStatus(change, k) === 'pending');
}

/** A short human description of what an op does to its day, for history and summaries. */
export function describeDayOp(op: RoutineChangeOp): string {
  if (op.op === 'clearDay') return `${op.day} made a rest day`;
  const n = op.exercises.length;
  return `${op.day} set to ${op.kind || 'a workout'} (${n} exercise${n === 1 ? '' : 's'})`;
}

/**
 * Accept or reject some pending items of one change. Accepted items are applied to the
 * routine right away (recording what they replaced), and accepting anything adds an 'ai'
 * entry to the routine's revision history. Items already decided are left alone. Pure.
 */
export function decideChangeItems(
  routine: Routine,
  changeId: string,
  keys: RoutineChangeItemKey[],
  status: 'accepted' | 'rejected',
  now: number = Date.now()
): Routine {
  const change = routine.changes?.find(c => c.id === changeId);
  if (!change) return routine;

  let dailySchedule = routine.dailySchedule;
  let description = routine.description;
  const decisions = { ...change.decisions };
  const applied: string[] = [];

  for (const key of keys) {
    if (getItemStatus(change, key) !== 'pending') continue;
    if (status === 'rejected') {
      decisions[key] = { status, date: now };
      continue;
    }
    if (key === 'description') {
      if (change.patch.description === undefined) continue;
      decisions[key] = { status, date: now, previousDescription: description };
      description = change.patch.description;
      applied.push('updated the description');
    } else {
      const op = getDayOp(change, key);
      if (!op) continue;
      decisions[key] = { status, date: now, previousDay: dailySchedule.find(d => d.day === key) ?? null };
      dailySchedule = applyDayOp(dailySchedule, op);
      applied.push(describeDayOp(op));
    }
  }

  const updatedChange: RoutineChange = { ...change, decisions };
  updatedChange.status = deriveChangeStatus(updatedChange);

  const revisions = routine.revisions || [];
  const revision: RoutineRevision | undefined = applied.length
    ? { id: uuidv4(), date: now, source: change.source ?? 'ai', summary: capitalize(applied.join(', ')), changeId }
    : undefined;

  return {
    ...routine,
    dailySchedule,
    description,
    changes: (routine.changes || []).map(c => (c.id === changeId ? updatedChange : c)),
    revisions: revision ? [...revisions, revision] : revisions,
  };
}

/**
 * A newer suggestion for the same day (or the description) replaces an older one that's still
 * waiting: the older item is rejected as superseded, so only one suggestion per item is ever
 * pending. Returns the updated list of earlier changes. Pure.
 */
export function supersedePendingItems(
  changes: RoutineChange[],
  newChange: RoutineChange,
  now: number = Date.now()
): RoutineChange[] {
  const newKeys = new Set(getChangeItemKeys(newChange));
  return changes.map(change => {
    const toSupersede = getPendingItemKeys(change).filter(k => newKeys.has(k));
    if (toSupersede.length === 0) return change;
    const decisions = { ...change.decisions };
    for (const key of toSupersede) {
      decisions[key] = { status: 'rejected', date: now, superseded: true } as RoutineChangeDecision;
    }
    const updated = { ...change, decisions };
    return { ...updated, status: deriveChangeStatus(updated) };
  });
}

export interface PendingProposals {
  days: Partial<Record<DayOfWeek, { change: RoutineChange; op: RoutineChangeOp }>>;
  description?: { change: RoutineChange; text: string };
  count: number;
}

/** Every item still awaiting a decision, by day — what the routine list renders inline. */
export function getPendingProposals(routine: Pick<Routine, 'changes'>): PendingProposals {
  const result: PendingProposals = { days: {}, count: 0 };
  for (const change of routine.changes || []) {
    for (const key of getPendingItemKeys(change)) {
      if (key === 'description') {
        if (!result.description) result.count++;
        result.description = { change, text: change.patch.description ?? '' };
      } else {
        const op = getDayOp(change, key);
        if (!op) continue;
        if (!result.days[key]) result.count++;
        result.days[key] = { change, op };
      }
    }
  }
  return result;
}

/** The day a change item would produce, or null for a rest day. */
export function dayAfterOp(op: RoutineChangeOp): RoutineDay | null {
  return op.op === 'clearDay' ? null : { day: op.day, kind: op.kind, exercises: op.exercises };
}

export type ExerciseDiffRow =
  | { type: 'same'; exercise: ScheduledExercise }
  | { type: 'changed'; before: ScheduledExercise; after: ScheduledExercise }
  | { type: 'removed'; exercise: ScheduledExercise }
  | { type: 'added'; exercise: ScheduledExercise };

const sameVolume = (a: ScheduledExercise, b: ScheduledExercise) =>
  a.sets === b.sets && a.reps === b.reps && a.duration === b.duration;

/**
 * Line up a day's exercises before and after a change (longest common subsequence on the
 * exercise), so the UI can strike through what's removed, highlight what's added, and show
 * sets/reps edits in place. Where an exercise is swapped for another, the removed row comes
 * right before the added one so it reads as a replacement.
 */
export function diffExercises(before: ScheduledExercise[], after: ScheduledExercise[]): ExerciseDiffRow[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i].exerciseId === after[j].exerciseId
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows: ExerciseDiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i].exerciseId === after[j].exerciseId) {
      rows.push(sameVolume(before[i], after[j])
        ? { type: 'same', exercise: after[j] }
        : { type: 'changed', before: before[i], after: after[j] });
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      rows.push({ type: 'removed', exercise: before[i] });
      i++;
    } else {
      rows.push({ type: 'added', exercise: after[j] });
      j++;
    }
  }
  return rows;
}

const dayKey = (d: RoutineDay | undefined) =>
  d && d.exercises.length > 0 ? JSON.stringify({ kind: d.kind, exercises: d.exercises }) : '';

/**
 * Describe a manual edit for the routine's history, e.g. "Edited Monday and Friday, updated
 * the description". Returns null when nothing visible changed. Pure.
 */
export function summarizeRoutineEdit(
  before: Pick<Routine, 'name' | 'description' | 'dailySchedule'>,
  after: Pick<Routine, 'name' | 'description' | 'dailySchedule'>
): string | null {
  const days = DAYS_OF_WEEK.filter(day =>
    dayKey(before.dailySchedule.find(d => d.day === day)) !== dayKey(after.dailySchedule.find(d => d.day === day))
  );
  const parts: string[] = [];
  if (after.name !== before.name) parts.push(`renamed to "${after.name}"`);
  if (days.length) parts.push(`edited ${joinList(days)}`);
  if ((after.description || '') !== (before.description || '')) parts.push('updated the description');
  return parts.length ? capitalize(parts.join(', ')) : null;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

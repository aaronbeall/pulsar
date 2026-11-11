// Spots when a routine's recent workouts keep feeling too hard, too easy, too long or too
// short (from the "How was it?" card), and works out a rule-based adjustment for it. The
// detection is always algorithmic; the app then offers the adjustment through Pulsar AI, with
// this rule-based version as the no-AI alternative (see components/RoutineAdjustOffer.tsx).
// Pure logic, no React — see the tests.

import type { Routine, RoutineChangeOp, ScheduledExercise, Workout } from '../models/types';
import { trend } from './learnedPreferences';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

export interface RoutineTrend {
  effort?: 'easier' | 'harder';
  length?: 'shorter' | 'longer';
  /** How many rated workouts of this routine it's based on. */
  rated: number;
}

/**
 * What this routine's latest rated workouts ask for, counting only workouts finished since the
 * user last acted on an offer, so the same feedback isn't offered twice. Null when there's no
 * clear trend.
 */
export function detectRoutineTrend(routine: Routine, workouts: Workout[], now = Date.now()): RoutineTrend | null {
  const since = Math.max(routine.feedbackHandledAt ?? 0, now - WINDOW_DAYS * DAY_MS);
  const rated = workouts
    .filter(w => w.routineId === routine.id && w.completedAt && w.completedAt > since && w.startedAt <= now)
    .filter(w => w.effort || w.lengthFeel)
    .sort((a, b) => b.startedAt - a.startedAt);
  const efforts = rated.map(w => w.effort);
  const lengths = rated.map(w => w.lengthFeel);
  const effort = trend(efforts, 'hard', 'easy') ? 'easier' as const : trend(efforts, 'easy', 'hard') ? 'harder' as const : undefined;
  const length = trend(lengths, 'long', 'short') ? 'shorter' as const : trend(lengths, 'short', 'long') ? 'longer' as const : undefined;
  if (!effort && !length) return null;
  return { effort, length, rated: rated.length };
}

const FELT = { easier: 'too hard', harder: 'too easy', shorter: 'too long', longer: 'too short' } as const;
const WANT = { easier: 'a bit easier', harder: 'a bit harder', shorter: 'shorter', longer: 'longer' } as const;

function both(a?: string, b?: string): string {
  return [a, b].filter(Boolean).join(' and ');
}

/** "Your last few workouts on this routine felt too hard and too long." */
export function describeTrend(t: RoutineTrend): string {
  return `Your last few workouts on this routine felt ${both(t.effort && FELT[t.effort], t.length && FELT[t.length])}.`;
}

/** "a bit easier and shorter" */
export function describeWant(t: RoutineTrend): string {
  return both(t.effort && WANT[t.effort], t.length && WANT[t.length]);
}

/** What to ask Pulsar AI, as if the user had typed it in the routine chat. */
export function adjustmentRequest(t: RoutineTrend): string {
  return `My last few workouts on this routine felt ${both(t.effort && FELT[t.effort], t.length && FELT[t.length])}. ` +
    `Please make it ${describeWant(t)}, keeping the same training days.`;
}

const MIN_SETS = 2;
const MAX_SETS = 5;
const MIN_REPS = 5;
const MIN_EXERCISES = 3;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function easier(ex: ScheduledExercise): ScheduledExercise {
  if (ex.sets > MIN_SETS + 1) return { ...ex, sets: ex.sets - 1 };
  if (ex.duration) return { ...ex, duration: Math.max(10, roundTo(ex.duration * 0.8, 5)) };
  if (ex.reps) return { ...ex, reps: Math.max(MIN_REPS, Math.round(ex.reps * 0.8)) };
  return { ...ex, sets: Math.max(MIN_SETS, ex.sets - 1) };
}

function harder(ex: ScheduledExercise): ScheduledExercise {
  if (ex.sets < 4) return { ...ex, sets: ex.sets + 1 };
  if (ex.duration) return { ...ex, duration: roundTo(ex.duration * 1.2, 5) };
  if (ex.reps) return { ...ex, reps: ex.reps + 2 };
  return { ...ex, sets: Math.min(MAX_SETS, ex.sets + 1) };
}

/**
 * The rule-based adjustment, as one setDay op per training day it changes:
 * - easier: a set fewer (down to 3), else 20% fewer reps or seconds
 * - harder: a set more (up to 4), else 2 more reps or 20% more seconds
 * - shorter: the last exercise of each day goes (keeping at least 3), else a set fewer
 * - longer: a set more on each exercise (up to 5)
 * Effort and length are combined so a day isn't cut twice for the same reason.
 */
export function adjustRoutine(routine: Routine, t: RoutineTrend): RoutineChangeOp[] {
  const ops: RoutineChangeOp[] = [];
  for (const day of routine.dailySchedule) {
    if (!day.exercises.length) continue;
    let exercises = day.exercises.map(ex => ({ ...ex }));
    if (t.effort === 'easier') exercises = exercises.map(easier);
    if (t.effort === 'harder') exercises = exercises.map(harder);
    if (t.length === 'shorter') {
      if (exercises.length > MIN_EXERCISES) exercises = exercises.slice(0, -1);
      else if (t.effort !== 'easier') exercises = exercises.map(ex => ({ ...ex, sets: Math.max(MIN_SETS, ex.sets - 1) }));
    }
    if (t.length === 'longer' && t.effort !== 'harder') {
      exercises = exercises.map(ex => ({ ...ex, sets: Math.min(MAX_SETS, ex.sets + 1) }));
    }
    if (JSON.stringify(exercises) !== JSON.stringify(day.exercises)) {
      ops.push({ op: 'setDay', day: day.day, kind: day.kind, exercises });
    }
  }
  return ops;
}

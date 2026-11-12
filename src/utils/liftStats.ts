import { Workout, WorkoutExercise } from '../models/types';
import { WeightUnit, displayWeight, stepWeightKg } from './units';

// Lift tracking: per-set weights (SetRecord.weightKg) turned into sessions, personal bests,
// progress series and the suggested weight for the next set. All weights are kg.

export interface LiftSet {
  weightKg: number;
  reps: number;
}

/** One workout's sets of one exercise that had a weight logged. */
export interface LiftSession {
  workoutId: string;
  date: number; // ms, when the exercise (or else the workout) started
  sets: LiftSet[];
  topKg: number; // heaviest set
  e1rmKg: number; // best estimated one-rep max over the sets
  volumeKg: number; // sum of weight × reps
}

export type LiftMetric = 'weight' | 'e1rm' | 'volume';
export type LiftRange = '1M' | '3M' | '1Y' | 'All';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<LiftRange, number> = { '1M': 30, '3M': 91, '1Y': 365, All: Infinity };
// Smallest gain that counts as a new best, so float noise and rounding never do.
const BEST_EPSILON_KG = 0.2;

/** Epley's estimate of the most you could lift once, from `kg` lifted for `reps`. */
export function estimateOneRepMax(kg: number, reps: number): number {
  if (reps <= 1) return kg;
  return kg * (1 + reps / 30);
}

/** The sets of one workout exercise that had a weight logged, with the reps done. */
export function getLiftSets(exercise: WorkoutExercise): LiftSet[] {
  return (exercise.setLog ?? [])
    .filter(rec => typeof rec.weightKg === 'number' && rec.weightKg > 0)
    .map(rec => ({ weightKg: rec.weightKg as number, reps: rec.reps ?? exercise.reps ?? 0 }));
}

function toSession(workoutId: string, date: number, sets: LiftSet[]): LiftSession {
  return {
    workoutId,
    date,
    sets,
    topKg: Math.max(...sets.map(s => s.weightKg)),
    e1rmKg: Math.max(...sets.map(s => estimateOneRepMax(s.weightKg, s.reps))),
    volumeKg: sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
  };
}

/** Every session of an exercise with a weight logged, oldest first. */
export function getLiftSessions(exerciseId: string, workouts: Workout[]): LiftSession[] {
  const sessions: LiftSession[] = [];
  for (const w of workouts) {
    const matches = w.exercises.filter(ex => ex.exerciseId === exerciseId);
    const sets = matches.flatMap(getLiftSets);
    if (!sets.length) continue;
    const date = Math.min(...matches.map(ex => ex.startedAt ?? w.startedAt));
    sessions.push(toSession(w.id, date, sets));
  }
  return sessions.sort((a, b) => a.date - b.date);
}

/** The weight of the last set logged for an exercise in any workout but `excludeWorkoutId`. */
export function getLastWeightKg(exerciseId: string, workouts: Workout[], excludeWorkoutId?: string): number | undefined {
  const sessions = getLiftSessions(exerciseId, workouts.filter(w => w.id !== excludeWorkoutId));
  const last = sessions[sessions.length - 1];
  return last?.sets[last.sets.length - 1].weightKg;
}

/** The last session of an exercise before `workoutId`'s, if any. */
export function getPreviousSession(exerciseId: string, workouts: Workout[], excludeWorkoutId?: string): LiftSession | undefined {
  const sessions = getLiftSessions(exerciseId, workouts.filter(w => w.id !== excludeWorkoutId));
  return sessions[sessions.length - 1];
}

/**
 * The weight to show for an exercise's next set: what the person set for it, else the last
 * set they did today, else last session's. Undefined until a weight was ever entered.
 */
export function getNextSetWeightKg(exercise: WorkoutExercise, lastSessionKg: number | undefined): number | undefined {
  if (exercise.weightKg !== undefined) return exercise.weightKg > 0 ? exercise.weightKg : undefined;
  const logged = getLiftSets(exercise);
  if (logged.length) return logged[logged.length - 1].weightKg;
  return lastSessionKg;
}

/**
 * One step heavier than last time, when last session earned it: at least the planned sets,
 * all at one weight, each for at least the planned reps. Otherwise undefined.
 */
export function suggestHeavierKg(
  last: LiftSession | undefined,
  plan: { sets: number; reps?: number },
  unit: WeightUnit,
): number | undefined {
  if (!last || !plan.reps || last.sets.length < plan.sets) return undefined;
  const weights = new Set(last.sets.map(s => displayWeight(s.weightKg, unit)));
  if (weights.size !== 1) return undefined;
  if (last.sets.some(s => s.reps < (plan.reps as number))) return undefined;
  return stepWeightKg(last.topKg, unit, 1);
}

/** "135 lb" when every set was the same, "135–145 lb" when they varied, null when none logged. */
export function summarizeSetWeights(exercise: WorkoutExercise, unit: WeightUnit): string | null {
  const sets = getLiftSets(exercise);
  if (!sets.length) return null;
  const shown = sets.map(s => displayWeight(s.weightKg, unit));
  const lo = Math.min(...shown);
  const hi = Math.max(...shown);
  return lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`;
}

export interface NewBest {
  exerciseId: string;
  kind: 'weight' | 'e1rm';
  valueKg: number;
  previousKg: number;
}

/**
 * Lifts in `workout` that beat every earlier session: a heavier set, or else a higher
 * estimated one-rep max (more reps at a weight). The first time a lift is logged is a
 * starting point, not a best.
 */
export function findNewBests(workout: Workout, workouts: Workout[]): NewBest[] {
  const bests: NewBest[] = [];
  const ids = [...new Set(workout.exercises.map(ex => ex.exerciseId))];
  for (const exerciseId of ids) {
    const sessions = getLiftSessions(exerciseId, [workout, ...workouts.filter(w => w.id !== workout.id)]);
    const current = sessions.find(s => s.workoutId === workout.id);
    if (!current) continue;
    const earlier = sessions.filter(s => s.workoutId !== workout.id && s.date < current.date);
    if (!earlier.length) continue;
    const prevTop = Math.max(...earlier.map(s => s.topKg));
    const prevE1rm = Math.max(...earlier.map(s => s.e1rmKg));
    if (current.topKg > prevTop + BEST_EPSILON_KG) {
      bests.push({ exerciseId, kind: 'weight', valueKg: current.topKg, previousKg: prevTop });
    } else if (current.e1rmKg > prevE1rm + BEST_EPSILON_KG) {
      bests.push({ exerciseId, kind: 'e1rm', valueKg: current.e1rmKg, previousKg: prevE1rm });
    }
  }
  return bests;
}

export const metricValue = (session: LiftSession, metric: LiftMetric): number =>
  metric === 'weight' ? session.topKg : metric === 'e1rm' ? session.e1rmKg : session.volumeKg;

/** Sessions within `range` of `now`. */
export function sessionsInRange(sessions: LiftSession[], range: LiftRange, now: number): LiftSession[] {
  const days = RANGE_DAYS[range];
  if (!Number.isFinite(days)) return sessions;
  const since = now - days * DAY_MS;
  return sessions.filter(s => s.date >= since);
}

/**
 * How much the heaviest set changed over the last `days`: the latest session against the
 * last one before the window (or the first one in it). Null with fewer than two sessions.
 */
export function getChangeKg(sessions: LiftSession[], now: number, days = 91): number | null {
  if (sessions.length < 2) return null;
  const since = now - days * DAY_MS;
  const before = sessions.filter(s => s.date < since);
  const baseline = before.length ? before[before.length - 1] : sessions[0];
  const latest = sessions[sessions.length - 1];
  if (baseline === latest) return null;
  return latest.topKg - baseline.topKg;
}

export interface LiftSummary {
  exerciseId: string;
  sessionCount: number;
  bestKg: number;
  bestE1rmKg: number;
  latestKg: number;
  lastDate: number;
  changeKg: number | null; // over the last 3 months
  series: number[]; // heaviest set of the last 12 sessions, oldest first
}

/** Every exercise with a weight logged, most-logged first. */
export function getLiftSummaries(workouts: Workout[], now: number): LiftSummary[] {
  const ids = new Set<string>();
  for (const w of workouts) for (const ex of w.exercises) if (getLiftSets(ex).length) ids.add(ex.exerciseId);
  return [...ids]
    .map(exerciseId => summarizeLift(exerciseId, getLiftSessions(exerciseId, workouts), now))
    .sort((a, b) => b.sessionCount - a.sessionCount || b.lastDate - a.lastDate);
}

export function summarizeLift(exerciseId: string, sessions: LiftSession[], now: number): LiftSummary {
  const latest = sessions[sessions.length - 1];
  return {
    exerciseId,
    sessionCount: sessions.length,
    bestKg: Math.max(...sessions.map(s => s.topKg)),
    bestE1rmKg: Math.max(...sessions.map(s => s.e1rmKg)),
    latestKg: latest.topKg,
    lastDate: latest.date,
    changeKg: getChangeKg(sessions, now),
    series: sessions.slice(-12).map(s => s.topKg),
  };
}

export interface BestEvent {
  exerciseId: string;
  date: number;
  valueKg: number;
  previousKg: number;
}

/**
 * Heaviest-set records set since `since`, newest first: each session whose heaviest set beat
 * every session before it. For highlight cards ("Heaviest squat").
 */
export function getRecentBests(workouts: Workout[], since: number): BestEvent[] {
  const events: BestEvent[] = [];
  for (const { exerciseId } of getLiftSummaries(workouts, Date.now())) {
    const sessions = getLiftSessions(exerciseId, workouts);
    let best = sessions[0]?.topKg ?? 0;
    for (const s of sessions.slice(1)) {
      if (s.topKg > best + BEST_EPSILON_KG) {
        if (s.date >= since) events.push({ exerciseId, date: s.date, valueKg: s.topKg, previousKg: best });
        best = s.topKg;
      }
    }
  }
  return events.sort((a, b) => b.date - a.date);
}

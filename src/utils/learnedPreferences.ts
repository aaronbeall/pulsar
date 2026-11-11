// What Pulsar has learned about the user from how they use the app: the exercises they like
// and dislike, the ones they keep skipping, and when and how long they usually train. Both
// routine builders use it: the Pulsar Planner (services/routinePlanner) and Pulsar AI (sent
// with plan and chat requests, see services/ai/prompts.ts). It's read fresh from local data
// every time and never stored anywhere else. Pure logic, no React — see the tests.

import { DAYS_OF_WEEK } from '../constants/days';
import type { DayOfWeek, Exercise, Workout } from '../models/types';

export interface LearnedPreferences {
  /** Exercises the user liked or starred. */
  likedExercises: string[];
  /** Exercises the user marked as disliked. */
  dislikedExercises: string[];
  /** Exercises the user keeps leaving undone in workouts they finish. */
  skippedExercises: string[];
  /** Weekdays the user has been training on lately, Monday first. */
  usualDays: DayOfWeek[];
  /** How long the user's workouts usually take, in minutes (rounded to 5). */
  usualMinutes?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NAMES = 15;
const WEEK_ORDER: DayOfWeek[] = [...DAYS_OF_WEEK.slice(1), DAYS_OF_WEEK[0]];

export function emptyPreferences(): LearnedPreferences {
  return { likedExercises: [], dislikedExercises: [], skippedExercises: [], usualDays: [] };
}

export function hasPreferences(p: LearnedPreferences | undefined): p is LearnedPreferences {
  return !!p && (
    p.likedExercises.length > 0 || p.dislikedExercises.length > 0 || p.skippedExercises.length > 0 ||
    p.usualDays.length > 0 || p.usualMinutes !== undefined
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function learnPreferences(exercises: Exercise[], workouts: Workout[], now = Date.now()): LearnedPreferences {
  const names = new Map(exercises.map(e => [e.id, e.name]));
  const likedExercises = exercises.filter(e => (e.liked || e.favorite) && !e.disliked).map(e => e.name).slice(0, MAX_NAMES);
  const dislikedExercises = exercises.filter(e => e.disliked).map(e => e.name).slice(0, MAX_NAMES);

  // Finished workouts from the last 90 days.
  const finished = workouts.filter(w => w.completedAt && now - w.startedAt <= 90 * DAY_MS && w.startedAt <= now);

  // An exercise left undone (no sets, or marked skipped) in at least two finished workouts,
  // and in at least half of the finished workouts it was in.
  const seen = new Map<string, { total: number; undone: number }>();
  for (const workout of finished) {
    for (const ex of workout.exercises) {
      const entry = seen.get(ex.exerciseId) ?? { total: 0, undone: 0 };
      entry.total++;
      if (ex.skipped || !ex.completedSets) entry.undone++;
      seen.set(ex.exerciseId, entry);
    }
  }
  const skippedExercises = [...seen.entries()]
    .filter(([id, { total, undone }]) => undone >= 2 && undone / total >= 0.5 && names.has(id))
    .sort((a, b) => b[1].undone - a[1].undone)
    .map(([id]) => names.get(id)!)
    .filter(name => !likedExercises.includes(name) && !dislikedExercises.includes(name))
    .slice(0, MAX_NAMES);

  // Usual days: weekdays with at least two finished workouts in the last eight weeks, once
  // there are at least four to go on.
  const recent = finished.filter(w => now - w.startedAt <= 56 * DAY_MS);
  let usualDays: DayOfWeek[] = [];
  if (recent.length >= 4) {
    const byDay = new Map<DayOfWeek, number>();
    for (const w of recent) {
      const day = DAYS_OF_WEEK[new Date(w.startedAt).getDay()];
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    usualDays = WEEK_ORDER.filter(d => (byDay.get(d) ?? 0) >= 2);
  }

  // Usual length: the median of plausible workout lengths, once there are three.
  const lengths = finished
    .map(w => (w.completedAt! - w.startedAt) / 60000)
    .filter(m => m >= 5 && m <= 180);
  const usualMinutes = lengths.length >= 3 ? Math.max(10, Math.round(median(lengths) / 5) * 5) : undefined;

  return { likedExercises, dislikedExercises, skippedExercises, usualDays, usualMinutes };
}

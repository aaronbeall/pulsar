import { WorkoutExercise } from '../models/types';

export interface SetTimerState {
  /** Whole seconds since the set started (never negative). */
  elapsedSec: number;
  /** Whole seconds left for a timed set (rounded up, so it reads 1 until it hits 0); null for rep sets. */
  remainingSec: number | null;
  /** 0-100 for a timed set; 0 for rep sets. */
  progress: number;
  /** True once a timed set has run its full duration. Always false for rep sets. */
  isDone: boolean;
}

/**
 * Derive a set's timer from wall-clock timestamps rather than counting interval ticks.
 * Browsers throttle or freeze timers when the screen locks or the app is backgrounded, so
 * a tick counter falls behind; computing from `startedAt` is right whenever it's read.
 */
export function getSetTimer(startedAt: number, durationSec: number | undefined, now: number): SetTimerState {
  const elapsedMs = Math.max(0, now - startedAt);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (!durationSec) {
    return { elapsedSec, remainingSec: null, progress: 0, isDone: false };
  }
  const durationMs = durationSec * 1000;
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  return {
    elapsedSec: Math.min(elapsedSec, durationSec),
    remainingSec: Math.ceil(remainingMs / 1000),
    progress: Math.min(100, (elapsedMs / durationMs) * 100),
    isDone: remainingMs === 0,
  };
}

/** When a timed set started at `startedAt` ends (ms). */
export const setEndsAt = (startedAt: number, durationSec: number) => startedAt + durationSec * 1000;

export function startSet(exercise: WorkoutExercise, now: number): WorkoutExercise {
  if (exercise.currentSetStartedAt) return exercise;
  return {
    ...exercise,
    startedAt: exercise.startedAt ?? now,
    completedSets: exercise.completedSets ?? 0,
    completedDuration: exercise.completedDuration ?? 0,
    currentSetStartedAt: now,
  };
}

/**
 * Record one finished set. For timed exercises `durationDoneSec` is how long was actually
 * done (the full duration when the timer ran out, less if ended early). The exercise is
 * completed once all its sets are.
 */
export function completeSet(exercise: WorkoutExercise, now: number, durationDoneSec?: number): WorkoutExercise {
  const completedSets = (exercise.completedSets ?? 0) + 1;
  const done = completedSets >= exercise.sets;
  return {
    ...exercise,
    startedAt: exercise.startedAt ?? now,
    completedSets,
    completedDuration: exercise.duration
      ? (exercise.completedDuration ?? 0) + Math.max(0, Math.round(durationDoneSec ?? exercise.duration))
      : exercise.completedDuration,
    currentSetStartedAt: undefined,
    completedAt: done ? exercise.completedAt ?? now : exercise.completedAt,
  };
}

/** 45 -> "45s", 90 -> "1:30" */
export function formatSeconds(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

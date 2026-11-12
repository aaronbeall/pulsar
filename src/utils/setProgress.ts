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
 * Record one finished set, ending at `endedAt` (for a timed set that ran out, that's its
 * scheduled end, not when the app noticed). For timed exercises `durationDoneSec` is how
 * long was actually done (the full duration when the timer ran out, less if ended early).
 * The exercise is completed once all its sets are. `weightKg` is the weight lifted on the set,
 * for weighted exercises; `reps` the reps done, when different from the plan.
 */
export function completeSet(exercise: WorkoutExercise, endedAt: number, durationDoneSec?: number, weightKg?: number, reps?: number): WorkoutExercise {
  const completedSets = (exercise.completedSets ?? 0) + 1;
  const done = completedSets >= exercise.sets;
  // A set completed without a recorded start (e.g. tapped before the start was saved)
  // gets a zero-length record rather than none, so the set count and the log agree.
  const setStartedAt = Math.min(exercise.currentSetStartedAt ?? endedAt, endedAt);
  return {
    ...exercise,
    startedAt: exercise.startedAt ?? setStartedAt,
    completedSets,
    completedDuration: exercise.duration
      ? (exercise.completedDuration ?? 0) + Math.max(0, Math.round(durationDoneSec ?? exercise.duration))
      : exercise.completedDuration,
    currentSetStartedAt: undefined,
    setLog: [
      ...(exercise.setLog ?? []),
      {
        startedAt: setStartedAt,
        endedAt,
        ...(weightKg && weightKg > 0 ? { weightKg } : {}),
        ...(reps !== undefined && reps !== exercise.reps ? { reps } : {}),
      },
    ],
    completedAt: done ? exercise.completedAt ?? endedAt : exercise.completedAt,
  };
}

/** Change a finished set's weight (kg, or undefined to clear it) and reps done. */
export function editSet(exercise: WorkoutExercise, index: number, change: { weightKg?: number; reps?: number }): WorkoutExercise {
  const log = exercise.setLog ?? [];
  if (!log[index]) return exercise;
  const { weightKg: _w, reps: _r, ...times } = log[index];
  const record = {
    ...times,
    ...(change.weightKg && change.weightKg > 0 ? { weightKg: change.weightKg } : {}),
    ...(change.reps !== undefined && change.reps !== exercise.reps ? { reps: change.reps } : {}),
  };
  return { ...exercise, setLog: log.map((rec, i) => (i === index ? record : rec)) };
}

/** 45 -> "45s", 90 -> "1:30", 3725 -> "1:02:05" */
export function formatSeconds(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 60) return `${s}s`;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s < 3600) return `${Math.floor(s / 60)}:${pad(s % 60)}`;
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

import { SetRecord, Workout, WorkoutExercise } from '../models/types';

export interface ExerciseTiming {
  /** Seconds spent in this exercise's sets. */
  activeSec: number;
  /** Seconds of rest before this exercise's sets (including the change-over from the previous exercise). */
  restSec: number;
  /** Seconds each finished set took, in order. */
  setSec: number[];
}

export interface WorkoutTiming {
  activeSec: number;
  restSec: number;
  /** First set start to last set end. */
  totalSec: number;
  exercises: ExerciseTiming[];
}

const seconds = (ms: number) => Math.max(0, ms) / 1000;
const setLength = (set: SetRecord) => seconds(set.endedAt - set.startedAt);

/**
 * Exercise and rest time for a workout, from each set's start/end. Rest is the gap between
 * one set ending and the next starting, in the order they were actually done, and counts
 * toward the exercise whose set it comes before. So per-exercise times add up to the
 * workout totals, and the time before the very first set (setting up) isn't rest.
 */
export function getWorkoutTiming(workout: Pick<Workout, 'exercises'>): WorkoutTiming {
  const exercises: ExerciseTiming[] = workout.exercises.map((ex: WorkoutExercise) => {
    const setSec = (ex.setLog ?? []).map(setLength);
    return { activeSec: setSec.reduce((a, b) => a + b, 0), restSec: 0, setSec };
  });

  const sets = workout.exercises
    .flatMap((ex, exerciseIndex) => (ex.setLog ?? []).map(set => ({ set, exerciseIndex })))
    .sort((a, b) => a.set.startedAt - b.set.startedAt);

  for (let i = 1; i < sets.length; i++) {
    exercises[sets[i].exerciseIndex].restSec += seconds(sets[i].set.startedAt - sets[i - 1].set.endedAt);
  }

  const sum = (pick: (e: ExerciseTiming) => number) => exercises.reduce((a, e) => a + pick(e), 0);
  return {
    activeSec: sum(e => e.activeSec),
    restSec: sum(e => e.restSec),
    totalSec: sets.length
      ? seconds(Math.max(...sets.map(s => s.set.endedAt)) - sets[0].set.startedAt)
      : 0,
    exercises,
  };
}

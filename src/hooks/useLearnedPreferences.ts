import { useMemo } from 'react';
import { useExercises, useWorkouts } from '../store/pulsarStore';
import { learnPreferences, LearnedPreferences } from '../utils/learnedPreferences';

/** What the app has learned from the user's likes, dislikes and workouts (recomputed as they change). */
export function useLearnedPreferences(): LearnedPreferences {
  const exercises = useExercises();
  const workouts = useWorkouts();
  return useMemo(() => learnPreferences(exercises, workouts), [exercises, workouts]);
}

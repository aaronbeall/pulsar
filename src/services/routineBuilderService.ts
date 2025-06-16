// NOTE: All DB access for exercises/routines/workouts should go through the Zustand store (pulsarStore.ts).
// This service now expects exercises to be passed in from the store, and add operations to use the store's addExercise.
// Direct DB calls (getExercises, addExercise) have been removed from this file.

import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { getSearchUrl, getHowToQuery, fetchExerciseSearchImageUrl } from '../utils/webUtils';
import { exerciseTemplates, ExerciseTemplate } from './exerciseTemplates';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a new Exercise from a template (ExerciseTemplate).
 * Fetches how-to and image URLs, and returns a new Exercise object.
 */
export async function createNewExercise(template: ExerciseTemplate): Promise<Exercise> {
  const howToUrl = getSearchUrl(getHowToQuery(template.name));
  const imageUrl = await fetchExerciseSearchImageUrl(template.name);
  return {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    targetMuscles: template.targetMuscles,
    howToUrl,
    coverImageUrl: imageUrl || '',
    iconImageUrl: imageUrl || '',
    liked: false,
    disliked: false,
    favorite: false,
    timed: !!template.timed,
  };
}

/**
 * Normalize a string for forgiving search (lowercase, alphanum, no trailing plural 's').
 */
export function normalizeExerciseName(str: string) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Remove non-alphanum
    .replace(/s$/, ''); // Remove trailing plural s
}

/**
 * Find an existing Exercise or ExerciseTemplate by name (forgiving match).
 * Returns the Exercise or ExerciseTemplate if found, otherwise null.
 */
export function findExistingExercise(name: string, exercises: Exercise[]): Exercise | ExerciseTemplate | null {
  const norm = normalizeExerciseName(name);
  // Search in existing exercises
  for (const ex of exercises) {
    if (normalizeExerciseName(ex.name) === norm) return ex;
  }
  // Search in suggestions
  for (const suggestion of exerciseTemplates) {
    if (normalizeExerciseName(suggestion.name) === norm) return suggestion;
  }
  return null;
}

/**
 * Find or create and add an Exercise by name.
 * Returns an existing Exercise if found, otherwise creates from template or stub and expects caller to add to store.
 */
export async function getAddedExercise(name: string, exercises: Exercise[], addExercise: (ex: Exercise) => Promise<void>): Promise<Exercise> {
  const norm = normalizeExerciseName(name);
  // 1. Search in existing exercises
  for (const ex of exercises) {
    if (normalizeExerciseName(ex.name) === norm) return ex;
  }
  // 2. Search in templates
  let template = exerciseTemplates.find(t => normalizeExerciseName(t.name) === norm);
  // 3. If not found, create ad hoc template stub
  if (!template) {
    template = {
      name,
      description: '',
      targetMuscles: [],
      timed: false,
    };
  }
  // 4. Create and add to store
  const newExercise = await createNewExercise(template);
  await addExercise(newExercise);
  return newExercise;
}

/**
 * Search for exercises or templates matching a search string, sorted by match score.
 * Score: +2 for name match, +1 for each targetMuscles match, +3 for liked, -3 for disliked.
 * Only returns matches with score > 0.
 */
export function searchExerciseSuggestions(
  allExercises: Array<Exercise | ExerciseTemplate>,
  search: string
): Array<Exercise | ExerciseTemplate> {
  const norm = normalizeExerciseName(search);
  // Helper to match name or targetMuscles and tally score
  function matchScore(ex: { name: string; targetMuscles?: string[]; liked?: boolean; disliked?: boolean }) {
    let score = 0;
    if (normalizeExerciseName(ex.name).includes(norm)) score += 2;
    if (ex.targetMuscles) {
      for (const m of ex.targetMuscles) {
        if (normalizeExerciseName(m).includes(norm)) score += 1;
      }
    }
    if (ex.liked) score += 3;
    if (ex.disliked) score -= 3;
    return score;
  }
  // Only return matches with score > 0
  const matches = allExercises
    .map(ex => ({ ex, score: matchScore(ex) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ ex }) => ex);
  return matches;
}

const funnyWords = [
  'Wacky', 'Zany', 'Bouncy', 'Funky', 'Snazzy', 'Quirky', 'Spunky', 'Jazzy', 'Peppy', 'Sassy',
  'Loopy', 'Goofy', 'Nutty', 'Cheeky', 'Perky', 'Zippy', 'Bubbly', 'Jolly', 'Frisky', 'Chirpy'
];

const generateRandomName = () => {
  const shuffled = funnyWords.sort(() => 0.5 - Math.random());
  return `${shuffled[0]} ${shuffled[1]} ${shuffled[2]}`;
};

/**
 * Generate a routine and exercises. Expects addExercise to be passed in from the store.
 */
export const generateRoutine = async (
  responses: { [key: string]: string },
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>
): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  await delay(2000);
  const routineId = uuidv4();
  const routineName = generateRandomName();
  // Pick a few exercises randomly
  const shuffledSuggestions = exerciseTemplates.slice().sort(() => Math.random() - 0.5);
  const pickedSuggestions = shuffledSuggestions.slice(0, 5);

  const allExercises = [...exercises];
  const newExercises: Exercise[] = [];

  for (const suggestion of pickedSuggestions) {
    // Try to find an existing exercise (forgiving match)
    let found = allExercises.find(ex => normalizeExerciseName(ex.name) === normalizeExerciseName(suggestion.name));
    if (found) {
      newExercises.push(found);
    } else {
      const created = await createNewExercise(suggestion);
      await addExercise(created);
      allExercises.push(created);
      newExercises.push(created);
    }
  }

  const routine: Routine = {
    id: routineId,
    name: routineName,
    description: 'A routine tailored to your preferences.',
    active: true,
    createdAt: Date.now(),
    dailySchedule: [
      {
        day: 'Monday',
        kind: 'Strength',
        exercises: [
          { exerciseId: newExercises[0].id, reps: 10, sets: 3 },
          { exerciseId: newExercises[1].id, reps: 15, sets: 3 },
          { exerciseId: newExercises[2].id, duration: 60, sets: 1 },
        ],
      },
      {
        day: 'Wednesday',
        kind: 'Cardio',
        exercises: [
          { exerciseId: newExercises[3].id, reps: 12, sets: 3 },
          { exerciseId: newExercises[4].id, duration: 90, sets: 1 },
        ],
      },
      {
        day: 'Friday',
        kind: 'Flexibility',
        exercises: [
          { exerciseId: newExercises[2].id, duration: 120, sets: 1 },
          { exerciseId: newExercises[3].id, reps: 10, sets: 2 },
        ],
      },
    ],
    prompts: {
      goals: responses.goals || '',
      equipment: responses.equipment || '',
      time: responses.time || '',
      additionalInfo: responses.additionalInfo || '',
    },
    responses: [
      {
        date: Date.now(),
        prompt: 'Make my routine!',
        response: 'Here is your custom routine based on your preferences.',
        dismissed: false,
      }
    ],
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: newExercises };
};

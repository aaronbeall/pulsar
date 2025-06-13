import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { getSearchUrl, getHowToQuery, fetchExerciseSearchImageUrl } from '../utils/webUtils';
import { getExercises } from '../db/indexedDb';
import { exerciseTemplates, ExerciseTemplate } from './exerciseTemplates';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Create a new Exercise from a template ---
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

// --- Forgiving search for an existing exercise or template ---
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Remove non-alphanum
    .replace(/s$/, ''); // Remove trailing plural s
}

export function findExistingExercise(name: string, exercises: Exercise[]): Exercise | ExerciseTemplate | null {
  const norm = normalize(name);
  // Search in existing exercises
  for (const ex of exercises) {
    if (normalize(ex.name) === norm) return ex;
  }
  // Search in templates
  for (const template of exerciseTemplates) {
    if (normalize(template.name) === norm) return template;
  }
  return null;
}

// --- Suggestions for exercises/templates matching a search ---
export function getExerciseSuggestions(search: string, exercises: Exercise[]): Array<Exercise | ExerciseTemplate> {
  const norm = normalize(search);
  // Helper to match name or targetMuscles
  function matches(ex: { name: string; targetMuscles?: string[] }) {
    if (normalize(ex.name).includes(norm)) return true;
    if (ex.targetMuscles && ex.targetMuscles.some(m => normalize(m).includes(norm))) return true;
    return false;
  }
  // Gather all matches (existing and templates not already in exercises)
  const existingMatches = exercises.filter(matches);
  const templateMatches = exerciseTemplates.filter(template => matches(template) && !exercises.some(ex => normalize(ex.name) === normalize(template.name)));
  // Sort: liked first, then neutral, then disliked
  function sortFn(a: Exercise | ExerciseTemplate, b: Exercise | ExerciseTemplate) {
    const getScore = (x: any) => x.liked ? 2 : x.disliked ? 0 : 1;
    return getScore(b) - getScore(a);
  }
  return [...existingMatches, ...templateMatches].sort(sortFn);
}

// --- Routine generation (placeholder for API) ---
const funnyWords = [
  'Wacky', 'Zany', 'Bouncy', 'Funky', 'Snazzy', 'Quirky', 'Spunky', 'Jazzy', 'Peppy', 'Sassy',
  'Loopy', 'Goofy', 'Nutty', 'Cheeky', 'Perky', 'Zippy', 'Bubbly', 'Jolly', 'Frisky', 'Chirpy'
];

const generateRandomName = () => {
  const shuffled = funnyWords.sort(() => 0.5 - Math.random());
  return `${shuffled[0]} ${shuffled[1]} ${shuffled[2]}`;
};

export const generateRoutine = async (responses: { [key: string]: string }): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  await delay(2000);
  const routineId = uuidv4();
  const routineName = generateRandomName();
  // Pick a few exercises randomly
  const shuffledTemplates = exerciseTemplates.slice().sort(() => Math.random() - 0.5);
  const pickedTemplates = shuffledTemplates.slice(0, 5);

  // Fetch all existing exercises from the db
  const existingExercises = await getExercises();
  const exercises: Exercise[] = [];

  for (const template of pickedTemplates) {
    // Try to find an existing exercise (forgiving match)
    let found = existingExercises.find(ex => normalize(ex.name) === normalize(template.name));
    if (found) {
      exercises.push(found);
    } else {
      exercises.push(await createNewExercise(template));
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
          { exerciseId: exercises[0].id, reps: 10, sets: 3 },
          { exerciseId: exercises[1].id, reps: 15, sets: 3 },
          { exerciseId: exercises[2].id, duration: 60, sets: 1 },
        ],
      },
      {
        day: 'Wednesday',
        kind: 'Cardio',
        exercises: [
          { exerciseId: exercises[3].id, reps: 12, sets: 3 },
          { exerciseId: exercises[4].id, duration: 90, sets: 1 },
        ],
      },
      {
        day: 'Friday',
        kind: 'Flexibility',
        exercises: [
          { exerciseId: exercises[2].id, duration: 120, sets: 1 },
          { exerciseId: exercises[3].id, reps: 10, sets: 2 },
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
  return { routine, exercises };
};

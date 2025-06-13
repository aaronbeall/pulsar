import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { getSearchUrl, getHowToQuery, fetchExerciseSearchImageUrl } from '../utils/webUtils';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Exercise Definitions ---
export interface ExerciseSuggestion {
  name: string;
  description: string;
  targetMuscles: string[];
  timed?: boolean;
}

const exerciseSuggestionsData = `
Push-up           | Chest,Triceps,Shoulders          |         | A basic upper body exercise.                |
Squat             | Quadriceps,Glutes,Hamstrings     |         | A fundamental lower body exercise.          |
Plank             | Abs,Back,Shoulders               | timed   | A core strengthening exercise.              |
Lunge             | Quadriceps,Glutes,Hamstrings     |         | A lower body exercise for balance and strength. |
Burpee            | Full Body                        | timed   | A full-body cardio exercise.                |
Pull-up           | Back,Biceps,Shoulders            |         | An upper body pulling exercise.             |
Sit-up            | Abs,Hip Flexors                  |         | A classic core exercise.                    |
Crunch            | Abs                              |         | A focused abdominal exercise.               |
Mountain Climber  | Abs,Shoulders,Legs               | timed   | A dynamic core and cardio move.             |
Jumping Jack      | Full Body                        | timed   | A full-body warmup and cardio move.         |
Tricep Dip        | Triceps,Shoulders                |         | Targets the triceps and shoulders.          |
Glute Bridge      | Glutes,Hamstrings                |         | Strengthens glutes and hamstrings.          |
Russian Twist     | Abs,Obliques                     |         | A rotational core exercise.                 |
Superman          | Back,Glutes,Hamstrings           |         | Back and posterior chain exercise.          |
High Knees        | Legs,Abs                         | timed   | Cardio and leg endurance.                   |
Wall Sit          | Quadriceps,Glutes,Abs            | timed   | Isometric leg and core hold.                |
Side Plank        | Obliques,Abs,Shoulders           | timed   | Oblique and core isometric hold.            |
Calf Raise        | Calves                           |         | Strengthens calves.                         |
Bicycle Crunch    | Abs,Obliques                     |         | Dynamic core exercise.                      |
Step-up           | Quadriceps,Glutes,Hamstrings     |         | Leg and glute strength.                     |
Shoulder Tap      | Shoulders,Abs                    | timed   | Core and shoulder stability.                |
Bear Crawl        | Full Body                        | timed   | Full-body movement.                         |
Dead Bug          | Abs,Hip Flexors                  |         | Core stability exercise.                    |
Reverse Lunge     | Quadriceps,Glutes,Hamstrings     |         | Leg and glute strength.                     |
Hip Thrust        | Glutes,Hamstrings                |         | Glute and hamstring strength.               |
Leg Raise         | Abs,Hip Flexors                  |         | Lower abs exercise.                         |
Jump Squat        | Quadriceps,Glutes,Hamstrings     | timed   | Explosive leg power.                        |
Forearm Plank     | Abs,Shoulders,Back               | timed   | Core and shoulder isometric hold.           |
Side Lunge        | Quadriceps,Glutes,Hamstrings     |         | Lateral leg strength.                       |
Box Jump          | Quadriceps,Glutes,Hamstrings     |         | Plyometric leg power.                       |
Jump Rope         | Full Body                        | timed   | Cardio and coordination.                    |
`;

export const exerciseSuggestions: ExerciseSuggestion[] = exerciseSuggestionsData
  .trim()
  .split('\n')
  .map(line => {
    const [name, muscles, timed, description] = line.split('|');
    return {
      name: name.trim(),
      description: description.trim(),
      targetMuscles: muscles.split(',').map(m => m.trim()),
      ...(timed && timed.trim().toLowerCase() === 'timed' ? { timed: true } : {}),
    };
  });

// --- Create a new Exercise from a suggestion ---
export async function createNewExercise(suggestion: ExerciseSuggestion): Promise<Exercise> {
  const howToUrl = getSearchUrl(getHowToQuery(suggestion.name));
  const imageUrl = await fetchExerciseSearchImageUrl(suggestion.name);
  return {
    id: uuidv4(),
    name: suggestion.name,
    description: suggestion.description,
    targetMuscles: suggestion.targetMuscles,
    howToUrl,
    coverImageUrl: imageUrl || '',
    iconImageUrl: imageUrl || '',
    liked: false,
    disliked: false,
    favorite: false,
    timed: !!suggestion.timed,
  };
}

// --- Forgiving search for an existing exercise or suggestion ---
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Remove non-alphanum
    .replace(/s$/, ''); // Remove trailing plural s
}

export function findExistingExercise(name: string, exercises: Exercise[]): Exercise | ExerciseSuggestion | null {
  const norm = normalize(name);
  // Search in existing exercises
  for (const ex of exercises) {
    if (normalize(ex.name) === norm) return ex;
  }
  // Search in suggestions
  for (const suggestion of exerciseSuggestions) {
    if (normalize(suggestion.name) === norm) return suggestion;
  }
  return null;
}

// --- Suggestions for exercises/suggestions matching a search ---
export function getExerciseSuggestions(search: string, exercises: Exercise[]): Array<Exercise | ExerciseSuggestion> {
  const norm = normalize(search);
  // Helper to match name or targetMuscles
  function matches(ex: { name: string; targetMuscles?: string[] }) {
    if (normalize(ex.name).includes(norm)) return true;
    if (ex.targetMuscles && ex.targetMuscles.some(m => normalize(m).includes(norm))) return true;
    return false;
  }
  // Gather all matches (existing and suggestions not already in exercises)
  const existingMatches = exercises.filter(matches);
  const suggestionMatches = exerciseSuggestions.filter(suggestion => matches(suggestion) && !exercises.some(ex => normalize(ex.name) === normalize(suggestion.name)));
  // Sort: liked first, then neutral, then disliked
  function sortFn(a: Exercise | ExerciseSuggestion, b: Exercise | ExerciseSuggestion) {
    const getScore = (x: any) => x.liked ? 2 : x.disliked ? 0 : 1;
    return getScore(b) - getScore(a);
  }
  return [...existingMatches, ...suggestionMatches].sort(sortFn);
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
  const routineName = generateRandomName(); // Use the generated name
  // Pick a few exercises randomly
  const shuffledSuggestions = exerciseSuggestions.slice().sort(() => Math.random() - 0.5);
  const pickedSuggestions = shuffledSuggestions.slice(0, 5);
  const exercises: Exercise[] = [];
  for (const suggestion of pickedSuggestions) {
    exercises.push(await createNewExercise(suggestion));
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

import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for unique IDs
import { getSearchUrl, getHowToQuery, fetchExerciseSearchImageUrl } from '../utils/webUtils';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)); // Fake delay function

const funnyWords = [
  'Wacky', 'Zany', 'Bouncy', 'Funky', 'Snazzy', 'Quirky', 'Spunky', 'Jazzy', 'Peppy', 'Sassy',
  'Loopy', 'Goofy', 'Nutty', 'Cheeky', 'Perky', 'Zippy', 'Bubbly', 'Jolly', 'Frisky', 'Chirpy'
];

const generateRandomName = () => {
  const shuffled = funnyWords.sort(() => 0.5 - Math.random());
  return `${shuffled[0]} ${shuffled[1]} ${shuffled[2]}`;
};

export const generateRoutine = async (responses: { [key: string]: string }): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  await delay(2000); // Add a 2000ms delay

  const routineId = uuidv4();
  const routineName = generateRandomName(); // Generate a random name

  // Define exercise names, descriptions, and target muscles
  const exerciseDefs = [
    { name: 'Push-ups', description: 'A basic upper body exercise.', targetMuscles: ['Chest', 'Triceps', 'Shoulders'] },
    { name: 'Squats', description: 'A fundamental lower body exercise.', targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'] },
    { name: 'Plank', description: 'A core strengthening exercise.', targetMuscles: ['Abs', 'Back', 'Shoulders'] },
    { name: 'Lunges', description: 'A lower body exercise for balance and strength.', targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'] },
    { name: 'Burpees', description: 'A full-body cardio exercise.', targetMuscles: ['Full Body'] },
  ];

  // Generate exercises with real search URLs and images
  const exercises: Exercise[] = [];
  for (const def of exerciseDefs) {
    const howToUrl = getSearchUrl(getHowToQuery(def.name));
    const imageUrl = await fetchExerciseSearchImageUrl(def.name);
    exercises.push({
      id: uuidv4(),
      name: def.name,
      howToUrl,
      coverImageUrl: imageUrl || '',
      iconImageUrl: imageUrl || '',
      description: def.description,
      targetMuscles: def.targetMuscles,
      liked: false,
      disliked: false,
      favorite: false,
      timed: def.name === 'Plank' || def.name === 'Burpees',
    });
  }

  const routine: Routine = {
    id: routineId,
    name: routineName, // Use the generated name
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

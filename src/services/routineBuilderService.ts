import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for unique IDs

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
  const exercises: Exercise[] = [
    {
      id: uuidv4(),
      name: 'Push-ups',
      howToUrl: 'https://example.com/push-ups',
      coverImageUrl: 'https://example.com/push-ups.jpg',
      iconImageUrl: 'https://example.com/push-ups.jpg',
      description: 'A basic upper body exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
    {
      id: uuidv4(),
      name: 'Squats',
      howToUrl: 'https://example.com/squats',
      coverImageUrl: 'https://example.com/squats.jpg',
      iconImageUrl: 'https://example.com/squats.jpg',
      description: 'A fundamental lower body exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
    {
      id: uuidv4(),
      name: 'Plank',
      howToUrl: 'https://example.com/plank',
      coverImageUrl: 'https://example.com/plank.jpg',
      iconImageUrl: 'https://example.com/plank.jpg',
      description: 'A core strengthening exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
    {
      id: uuidv4(),
      name: 'Lunges',
      howToUrl: 'https://example.com/lunges',
      coverImageUrl: 'https://example.com/lunges.jpg',
      iconImageUrl: 'https://example.com/lunges.jpg',
      description: 'A lower body exercise for balance and strength.',
      liked: false,
      disliked: false,
      favorite: false,
    },
    {
      id: uuidv4(),
      name: 'Burpees',
      howToUrl: 'https://example.com/burpees',
      coverImageUrl: 'https://example.com/burpees.jpg',
      iconImageUrl: 'https://example.com/burpees.jpg',
      description: 'A full-body cardio exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
  ];

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

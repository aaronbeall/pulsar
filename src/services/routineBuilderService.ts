import { Routine, Exercise } from '../models/types';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for unique IDs

export const generateRoutine = async (responses: { [key: string]: string }): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  const routineId = uuidv4();
  const exercises: Exercise[] = [
    {
      id: uuidv4(),
      name: 'Push-ups',
      howToUrl: 'https://example.com/push-ups',
      imageUrl: 'https://example.com/push-ups.jpg',
      description: 'A basic upper body exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
    {
      id: uuidv4(),
      name: 'Squats',
      howToUrl: 'https://example.com/squats',
      imageUrl: 'https://example.com/squats.jpg',
      description: 'A fundamental lower body exercise.',
      liked: false,
      disliked: false,
      favorite: false,
    },
  ];

  const routine: Routine = {
    id: routineId,
    name: 'Custom Routine',
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
        ],
      },
      {
        day: 'Wednesday',
        kind: 'Cardio',
        exercises: [
          { exerciseId: exercises[0].id, duration: 60 },
        ],
      },
    ],
    prompts: {
      goals: responses.goals || '',
      equipment: responses.equipment || '',
      time: responses.time || '',
      additionalInfo: responses.additionalInfo || '',
    },
    aiResponses: [
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

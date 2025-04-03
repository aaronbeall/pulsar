import { Routine } from '../models/types';

export const generateRoutine = async (responses: Routine["prompts"]): Promise<Routine> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `routine-${Date.now()}`,
        name: "My Custom Routine",
        dailySchedule: [
          {
            day: "Monday",
            exercises: [
              { exerciseId: "exercise-1", reps: 10, sets: 3 },
              { exerciseId: "exercise-2", duration: 30 },
            ],
          },
          {
            day: "Wednesday",
            exercises: [
              { exerciseId: "exercise-3", reps: 15, sets: 2 },
              { exerciseId: "exercise-4", duration: 20 },
            ],
          },
        ],
        prompts: responses,
        aiResponses: ["Here ya go!"],
        liked: false,
        disliked: false,
        favorite: false,
      });
    }, 2000); // Simulate a 2-second API call
  });
};

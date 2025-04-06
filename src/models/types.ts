import { DAYS_OF_WEEK } from "../constants/days";

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface Exercise {
  id: string; // Unique identifier
  name: string;
  description: string; // Optional description
  howToUrl: string;
  coverImageUrl: string;
  iconImageUrl: string;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
}

export interface Routine {
  id: string; // Unique identifier
  name: string;
  description: string;
  active: boolean;
  createdAt: number;
  dailySchedule: Array<{
    day: DayOfWeek; // e.g., "Monday", "Tuesday"
    kind: string;
    exercises: Array<{
      exerciseId: string; // Reference to Exercise
      reps?: number;
      sets?: number;
      duration?: number; // In seconds
    }>;
  }>;
  prompts: {
    goals: string; // User's workout goals
    equipment: string; // Equipment the user will use
    time: string; // Time available for workouts
    additionalInfo: string; // Additional information provided by the user
  };
  aiResponses: Array<{
    date: number;
    prompt: string;
    response: string;
    dismissed: boolean;
  }>;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
}

export type RoutinePromptKey = keyof Routine["prompts"];

export interface Workout {
  id: string; // Unique identifier
  nickname: string;
  routineId: string;
  startedAt: number;
  completedAt?: number;
  completedExercises: Array<{
    exerciseId: string; // Reference to Exercise
    completed: boolean; // True if completed, false if skipped
  }>;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
}

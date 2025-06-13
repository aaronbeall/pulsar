import { DAYS_OF_WEEK } from "../constants/days";

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface Exercise {
  id: string; // Unique identifier
  name: string;
  description: string; // Optional description
  targetMuscles?: string[]; // Optional target muscle group
  howToUrl: string;
  coverImageUrl: string;
  iconImageUrl: string;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
  timed?: boolean;
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
    exercises: ScheduledExercise[];
  }>;
  prompts: {
    goals: string; // User's workout goals
    equipment: string; // Equipment the user will use
    time: string; // Time available for workouts
    additionalInfo: string; // Additional information provided by the user
  };
  responses: Array<{
    date: number;
    prompt: string;
    response: string;
    dismissed: boolean;
  }>;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
}

export interface ScheduledExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  duration?: number;  // In seconds
}

export type RoutinePromptKey = keyof Routine["prompts"];

export interface Workout {
  id: string; // Unique identifier
  nickname: string;
  routineId: string;
  day: DayOfWeek;
  startedAt: number;
  completedAt?: number;
  exercises: WorkoutExercise[];
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
  feedback?: string;
}

export interface WorkoutExercise extends ScheduledExercise {
  weight?: number;
  startedAt?: number;
  completedAt?: number;
  skipped?: boolean; // Counts as completed but not or partially performed
  completedSets?: number; // Track completed sets
  completedDuration?: number; // Track completed duration for timed exercises
}
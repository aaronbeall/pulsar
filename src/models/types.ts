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

export interface RoutineDay {
    day: DayOfWeek; // e.g., "Monday", "Tuesday"
    kind: string;
    exercises: ScheduledExercise[];
  }

// A single turn in a routine's AI chat — covers both the initial setup-wizard Q&A (seeded
// once at creation) and any later back-and-forth, in one flexible, appendable stream.
export interface RoutineChatMessage {
  id: string;
  role: 'user' | 'ai';
  message: string;
  date: number;
  dismissed?: boolean; // 'ai' messages not yet acknowledged (e.g. a "new update" indicator)
}

export interface Routine {
  id: string; // Unique identifier
  name: string;
  description: string;
  active: boolean;
  createdAt: number;
  dailySchedule: Array<RoutineDay>;
  chatHistory: RoutineChatMessage[];
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
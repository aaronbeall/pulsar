export interface Exercise {
  id: string; // Unique identifier
  name: string;
  howToUrl: string;
  imageUrl: string;
  liked: boolean;
  disliked: boolean;
  favorite: boolean;
}

export interface Routine {
  id: string; // Unique identifier
  name: string;
  dailySchedule: Array<{
    day: string; // e.g., "Monday", "Tuesday"
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
  aiResponses: string[]; // AI-generated responses based on user input
  liked: boolean;
  disliked: boolean;
  favorite: boolean;
}

export interface Workout {
  id: string; // Unique identifier
  date: string; // ISO date string
  routineId: string; // Reference to Routine
  completedExercises: Array<{
    exerciseId: string; // Reference to Exercise
    completed: boolean; // True if completed, false if skipped
  }>;
}

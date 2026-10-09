import { DayOfWeek, Routine } from '../../models/types';

// Raw exercise entry as returned by the LLM — a name, not yet resolved to a real Exercise
// record. Resolving names -> Exercise (creating new ones as needed) happens client-side via
// the same pipeline routine templates already use (routineBuilderService.ts: getAddedExercise).
export interface AIExerciseEntry {
  name: string;
  sets: number;
  reps?: number;
  duration?: number; // seconds
}

export interface AIRoutineResponse {
  name: string;
  description: string;
  commentary: string; // shown to the user as the AI's chat message
  schedule: Array<{
    day: DayOfWeek;
    kind: string;
    exercises: AIExerciseEntry[];
  }>;
}

// The LLM proposes changes using exercise names, same as initial generation — resolved to
// real ScheduledExercise (with exerciseId) before being stored as a RoutineChange.
export interface AIChangeResponse {
  commentary: string;
  patch: {
    dailySchedule?: Array<
      | { op: 'setDay'; day: DayOfWeek; kind: string; exercises: AIExerciseEntry[] }
      | { op: 'clearDay'; day: DayOfWeek }
    >;
    description?: string;
  };
}

export class AIError extends Error {
  code: 'invalid_key' | 'rate_limited' | 'network' | 'empty_response' | 'parse_error';
  constructor(code: AIError['code'], message: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

export interface WizardAnswer {
  question: string;
  answer: string;
}

// Everything upstream (the setup wizard, the chat UI, the diff/accept card) only ever talks
// to this interface — never to OpenAI or a backend directly. That's what lets a later hosted
// implementation (calling a Supabase Edge Function instead) slot in with zero UI changes.
// See PLAN-ai-features.md.
export interface AIProvider {
  generateRoutine(qa: WizardAnswer[]): Promise<AIRoutineResponse>;
  suggestRoutineChange(
    routine: Routine,
    scheduleForPrompt: Array<{ day: DayOfWeek; kind: string; exercises: Array<{ name: string; sets: number; reps?: number; duration?: number }> }>,
    userMessage: string
  ): Promise<AIChangeResponse>;
}

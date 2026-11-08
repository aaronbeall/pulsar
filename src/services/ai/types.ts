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
  code:
    | 'no_key' | 'invalid_key' | 'rate_limited' | 'quota' | 'model' | 'network' | 'empty_response' | 'parse_error'
    // Hosted Pulsar AI (hostedProvider.ts)
    | 'signin_required' | 'allowance_used' | 'busy';
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

// The routine as the model sees it: exercise names, never internal ids.
export type ScheduleForPrompt = Array<{
  day: DayOfWeek;
  kind: string;
  exercises: Array<{ name: string; sets: number; reps?: number; duration?: number }>;
}>;

// Prior chat turns sent along with a new message, so follow-ups ("yes, do that", "make it
// shorter") have the context they refer to.
export interface ChatTurn {
  role: 'user' | 'ai';
  message: string;
}

// Everything upstream (the setup wizard, the chat UI, the diff/accept card) only ever talks
// to this interface — never to OpenAI or a backend directly. Two implementations: the user's
// own key (byokProvider.ts) and hosted Pulsar AI through the site's API (hostedProvider.ts).
export interface AIProvider {
  generateRoutine(qa: WizardAnswer[], options?: StreamOptions): Promise<AIRoutineResponse>;
  suggestRoutineChange(
    routine: Routine,
    scheduleForPrompt: ScheduleForPrompt,
    history: ChatTurn[],
    userMessage: string,
    options?: StreamOptions
  ): Promise<AIChangeResponse>;
}

export interface StreamOptions {
  /** Called as the reply's commentary is written: the text so far, and whether it's finished.
   *  The full response (routine or change) still only arrives when the promise resolves. */
  onCommentary?: (text: string, done: boolean) => void;
  /** Routine generation only: the schedule's days as each one is written ("Monday", "Upper Push"). */
  onScheduleDays?: (days: Array<{ day: string; kind: string }>) => void;
}

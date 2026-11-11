// The prompts behind Pulsar AI, shared by the bring-your-own-key provider (byokProvider.ts,
// in the browser) and the hosted API (worker/ai.ts, on the server), so both build exactly the
// same requests. Keep this module free of browser-only imports: the Worker bundles it.
import type { Routine } from '../../models/types';
import { exerciseTemplates } from '../exerciseTemplates';
import type { ChatTurn, ScheduleForPrompt, WizardAnswer } from './types';
import type { LearnedPreferences } from '../../utils/learnedPreferences';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const MAX_HISTORY_TURNS = 12;

// Names from the curated catalog: the model is nudged toward these so most exercises
// resolve to entries with good metadata (timed vs reps, images) instead of ad hoc stubs.
const KNOWN_EXERCISE_NAMES = exerciseTemplates.map(t => t.name).join(', ');

const EXERCISE_RULES = `Exercise rules:
- Every exercise is { "name": string, "sets": number, "reps": number } for rep-based moves, or { "name": string, "sets": number, "duration": number } (seconds) for timed moves like planks, holds, stretches and cardio intervals. Never both reps and duration.
- Strictly respect the user's equipment, injuries, dislikes and available time. If they only have certain equipment, use only that equipment or bodyweight.
- Prefer these exercise names when one fits (spelled exactly like this): ${KNOWN_EXERCISE_NAMES}. Use other common, well-known names only when none of these fit.`;

const ROUTINE_SYSTEM_PROMPT = `You are a fitness coach designing a weekly workout routine for a user based on their answers to a short intake questionnaire.

Respond with ONLY a JSON object matching exactly this shape:
{
  "name": string,              // short, fun routine name
  "description": string,       // one sentence description of the routine
  "commentary": string,        // 2-3 friendly sentences to the user explaining your reasoning
  "schedule": [
    {
      "day": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday",
      "kind": string,          // short category label, e.g. "Upper Body", "Cardio", "Mobility"
      "exercises": [ ... ]
    }
  ]
}
Only include days that have a workout; omit rest days entirely. Match the number of workout days and the session length to what the user said they can do.

${EXERCISE_RULES}`;

const CHANGE_SYSTEM_PROMPT = `You are a fitness coach helping a user adjust their existing weekly workout routine through chat.

Respond with ONLY a JSON object matching exactly this shape:
{
  "commentary": string,        // friendly reply explaining what you're changing, or answering their question
  "patch": {
    "dailySchedule": [
      { "op": "setDay", "day": "Monday", "kind": string, "exercises": [ ... ] },
      { "op": "clearDay", "day": "Friday" }
    ],
    "description": string      // optional — only if the routine's description should change
  }
}
- "setDay" replaces that day's whole workout (list every exercise the day should have, including unchanged ones). "clearDay" turns a day into a rest day.
- Only include days that are actually changing.
- If the user is asking a question or chatting rather than requesting a change, return "patch": {} and just answer in "commentary".

${EXERCISE_RULES}`;

/**
 * What the app has learned about the user, as a note for the model, or '' when there's
 * nothing. These are soft preferences: what the user asks for always comes first.
 */
export function describePreferences(p: LearnedPreferences | undefined): string {
  if (!p) return '';
  const lines = [
    p.likedExercises.length ? `- Exercises they liked: ${p.likedExercises.join(', ')}` : '',
    p.dislikedExercises.length ? `- Exercises they disliked: ${p.dislikedExercises.join(', ')}` : '',
    p.skippedExercises.length ? `- Exercises they often skip in workouts: ${p.skippedExercises.join(', ')}` : '',
    p.usualDays.length ? `- Days they've usually trained on lately: ${p.usualDays.join(', ')}` : '',
    p.usualMinutes ? `- Their workouts usually take about ${p.usualMinutes} minutes` : '',
  ].filter(Boolean);
  if (!lines.length) return '';
  return [
    "What the app has learned from how this user trains. Treat it as soft preferences: favor exercises they liked, and avoid ones they disliked or skip when there's a good alternative. Anything they ask for in their answers or messages comes first, even if it's on these lists. If you leave something out because of this, say so briefly.",
    ...lines,
  ].join('\n');
}

export function buildRoutineMessages(qa: WizardAnswer[], preferences?: LearnedPreferences): OpenAIMessage[] {
  const learned = describePreferences(preferences);
  const userPrompt = [qa.map(({ question, answer }) => `${question}\n${answer}`).join('\n\n'), learned].filter(Boolean).join('\n\n');
  return [
    { role: 'system', content: ROUTINE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

export function buildChangeMessages(
  routine: Pick<Routine, 'name' | 'description'>,
  scheduleForPrompt: ScheduleForPrompt,
  history: ChatTurn[],
  userMessage: string,
  preferences?: LearnedPreferences
): OpenAIMessage[] {
  const context = [
    `The user's current routine is "${routine.name}".`,
    routine.description ? `Description: ${routine.description}` : '',
    `Current schedule (days not listed are rest days): ${JSON.stringify(scheduleForPrompt)}`,
    describePreferences(preferences),
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: `${CHANGE_SYSTEM_PROMPT}\n\n${context}` },
    ...history.slice(-MAX_HISTORY_TURNS).map((turn): OpenAIMessage => ({
      role: turn.role === 'ai' ? 'assistant' : 'user',
      content: turn.message,
    })),
    { role: 'user', content: userMessage },
  ];
}

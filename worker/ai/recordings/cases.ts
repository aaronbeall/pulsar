import { workoutPrompts } from '../../../src/constants/prompts';
import type { AIKind } from '../plans';

// The AI requests whose real OpenAI replies are recorded (scripts/record-ai-replies.ts) and
// replayed by the e2e tests and for tester accounts (../replay.ts). Each input is exactly what
// the app sends to /api/ai/<kind>; the bring-your-own-key path builds the same prompt from it.
//
// Adding or changing a case, or changing the prompts (src/services/ai/prompts.ts), makes its
// recording stale: replies.test.ts fails until it's re-recorded with `npm run ai:record`.

export interface RecordingCase {
  id: string;
  kind: AIKind;
  /** What the request is, for people reading the recordings. */
  label: string;
  input: Record<string, unknown>;
}

/** Setup answers in the order the app asks its questions. */
const answers = (...replies: string[]) =>
  workoutPrompts.map(({ question }, i) => ({ question, answer: replies[i] ?? '' }));

const lifts = (names: Array<[string, number, number]>) => names.map(([name, sets, reps]) => ({ name, sets, reps }));
const POWER_DAY = lifts([['Deadlift', 5, 5], ['Bench Press', 5, 5], ['Squat', 5, 5], ['Pull-up', 3, 8]]);

/** The "Strength Builder" template as the app describes it in a chat request. */
export const STRENGTH_BUILDER = {
  routine: { name: 'Strength Builder', description: 'Focuses on building maximum strength with heavy compound lifts.' },
  schedule: ['Monday', 'Wednesday', 'Friday'].map((day) => ({ day, kind: 'Powerlifting', exercises: POWER_DAY })),
};

const chat = (message: string) => ({ ...STRENGTH_BUILDER, history: [], message });

export const RECORDING_CASES: RecordingCase[] = [
  {
    id: 'plan-dumbbells-knees',
    kind: 'plan',
    label: 'Plan: get stronger with dumbbells, 3 days, bad knees',
    input: { answers: answers('get stronger', 'dumbbells only', '3 days a week', 'bad knees') },
  },
  {
    id: 'plan-bodyweight-beginner',
    kind: 'plan',
    label: 'Plan: beginner, no equipment, short sessions',
    input: { answers: answers('lose weight and feel healthier', 'nothing, just bodyweight', '20 minutes, 4 days a week', "I'm a complete beginner") },
  },
  {
    id: 'plan-gym-muscle',
    kind: 'plan',
    label: 'Plan: build muscle in a full gym, 5 days',
    input: { answers: answers('build muscle, especially arms and chest', 'full gym', '5 days a week, about an hour', 'I hate running') },
  },
  {
    id: 'edit-friday-rest',
    kind: 'edit',
    label: 'Edit (Strength Builder): make Friday a rest day',
    input: chat('make friday a rest day'),
  },
  {
    id: 'edit-knee-friendly',
    kind: 'edit',
    label: 'Edit (Strength Builder): swap squats for something easier on the knees',
    input: chat('my knees hurt when I squat, swap squats for something easier on them'),
  },
  {
    id: 'edit-add-cardio',
    kind: 'edit',
    label: 'Edit (Strength Builder): add a short cardio day on Saturday',
    input: chat('add a short cardio day on Saturday'),
  },
  {
    id: 'question-rest-time',
    kind: 'edit',
    label: 'Question (Strength Builder): how long to rest between sets',
    input: chat('how long should I rest between sets?'),
  },
];

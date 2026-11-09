import { buildChangeMessages, buildRoutineMessages, type OpenAIMessage } from '../../src/services/ai/prompts';
import { DAYS_OF_WEEK } from '../../src/constants/days';
import type { AIKind } from './plans';

// Turns an app request into the OpenAI messages, using the same prompt code as the
// bring-your-own-key path. The server always builds the prompt itself, so the endpoint can't
// be used as a general-purpose chatbot on Pulsar's key; anything oversized is refused.

const MAX_TEXT = 2000; // one answer, chat message or description
const MAX_NAME = 120;
const MAX_ANSWERS = 12;
const MAX_HISTORY = 12;
const MAX_EXERCISES_PER_DAY = 30;

export class BadRequest extends Error {}

const text = (value: unknown, max: number, field: string): string => {
  if (typeof value !== 'string') throw new BadRequest(`${field} must be text`);
  if (value.length > max) throw new BadRequest(`${field} is too long`);
  return value;
};

const count = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000) throw new BadRequest(`${field} must be a number`);
  return value;
};

export function messagesFor(kind: AIKind, body: unknown): OpenAIMessage[] {
  if (!body || typeof body !== 'object') throw new BadRequest('Expected a JSON body');
  const b = body as Record<string, unknown>;

  if (kind === 'plan') {
    if (!Array.isArray(b.answers) || b.answers.length === 0 || b.answers.length > MAX_ANSWERS) throw new BadRequest('answers must be a short list');
    const qa = b.answers.map((a, i) => {
      const item = (a ?? {}) as Record<string, unknown>;
      return { question: text(item.question, MAX_TEXT, `answers[${i}].question`), answer: text(item.answer, MAX_TEXT, `answers[${i}].answer`) };
    });
    return buildRoutineMessages(qa);
  }

  const routine = (b.routine ?? {}) as Record<string, unknown>;
  const name = text(routine.name ?? '', MAX_NAME, 'routine.name');
  const description = text(routine.description ?? '', MAX_TEXT, 'routine.description');
  if (!Array.isArray(b.schedule) || b.schedule.length > 7) throw new BadRequest('schedule must list at most 7 days');
  const schedule = b.schedule.map((d, i) => {
    const day = (d ?? {}) as Record<string, unknown>;
    if (!DAYS_OF_WEEK.includes(day.day as never)) throw new BadRequest(`schedule[${i}].day is not a day`);
    if (!Array.isArray(day.exercises) || day.exercises.length > MAX_EXERCISES_PER_DAY) throw new BadRequest(`schedule[${i}].exercises is too long`);
    return {
      day: day.day as (typeof DAYS_OF_WEEK)[number],
      kind: text(day.kind ?? '', MAX_NAME, `schedule[${i}].kind`),
      exercises: day.exercises.map((e, j) => {
        const ex = (e ?? {}) as Record<string, unknown>;
        return {
          name: text(ex.name, MAX_NAME, `schedule[${i}].exercises[${j}].name`),
          sets: count(ex.sets, 'sets') ?? 0,
          reps: count(ex.reps, 'reps'),
          duration: count(ex.duration, 'duration'),
        };
      }),
    };
  });
  const history = Array.isArray(b.history) ? b.history.slice(-MAX_HISTORY) : [];
  const turns = history.map((t, i) => {
    const turn = (t ?? {}) as Record<string, unknown>;
    return { role: turn.role === 'ai' ? ('ai' as const) : ('user' as const), message: text(turn.message, MAX_TEXT, `history[${i}].message`) };
  });
  const message = text(b.message, MAX_TEXT, 'message');
  if (!message.trim()) throw new BadRequest('message is empty');
  return buildChangeMessages({ name, description }, schedule, turns, message);
}

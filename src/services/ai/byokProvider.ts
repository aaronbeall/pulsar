import { Routine } from '../../models/types';
import { getOpenAiApiKey, getOpenAiModel } from '../../store/aiSettingsStore';
import { exerciseTemplates } from '../exerciseTemplates';
import { normalizeChangeResponse, normalizeRoutineResponse } from './normalize';
import { AIChangeResponse, AIError, AIProvider, AIRoutineResponse, ChatTurn, ScheduleForPrompt, WizardAnswer } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_TURNS = 12;

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

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// gpt-5 and o-series models are reasoning models: they accept reasoning_effort, and a low
// setting keeps a routine generation to a few seconds. Older models reject the parameter.
function isReasoningModel(model: string) {
  return /^(gpt-5|o\d)/.test(model);
}

async function readOpenAIError(res: Response): Promise<{ message?: string; code?: string }> {
  try {
    const body = await res.json();
    return { message: body?.error?.message, code: body?.error?.code };
  } catch {
    return {};
  }
}

async function callOpenAI(messages: OpenAIMessage[]): Promise<unknown> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new AIError('no_key', 'Add your OpenAI API key in Settings to use AI.');
  const model = getOpenAiModel();

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages,
        ...(isReasoningModel(model) ? { reasoning_effort: 'low' } : {}),
      }),
    });
  } catch {
    throw new AIError('network', 'Could not reach OpenAI. Check your connection and try again.');
  }

  if (!res.ok) {
    const err = await readOpenAIError(res);
    if (res.status === 401) throw new AIError('invalid_key', 'OpenAI rejected your API key. Check it in Settings.');
    if (res.status === 429 && err.code === 'insufficient_quota') {
      throw new AIError('quota', 'Your OpenAI account is out of credit. Add billing on platform.openai.com.');
    }
    if (res.status === 429) throw new AIError('rate_limited', 'OpenAI is rate-limiting requests. Wait a moment and try again.');
    if (res.status === 404 || err.code === 'model_not_found') {
      throw new AIError('model', `Your key can't use the model "${model}". Change the model in Settings.`);
    }
    throw new AIError('network', `OpenAI request failed (${res.status})${err.message ? `: ${err.message}` : '.'}`);
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new AIError('empty_response', 'OpenAI returned an empty response. Try again.');

  try {
    return JSON.parse(content);
  } catch {
    throw new AIError('parse_error', 'Could not understand the AI response. Try again.');
  }
}

/** Cheap, no-completion-cost way to validate a key before relying on it. */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildChangeMessages(
  routine: Routine,
  scheduleForPrompt: ScheduleForPrompt,
  history: ChatTurn[],
  userMessage: string
): OpenAIMessage[] {
  const context = [
    `The user's current routine is "${routine.name}".`,
    routine.description ? `Description: ${routine.description}` : '',
    `Current schedule (days not listed are rest days): ${JSON.stringify(scheduleForPrompt)}`,
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

export const byokProvider: AIProvider = {
  async generateRoutine(qa: WizardAnswer[]): Promise<AIRoutineResponse> {
    const userPrompt = qa.map(({ question, answer }) => `${question}\n${answer}`).join('\n\n');
    const raw = await callOpenAI([
      { role: 'system', content: ROUTINE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    return normalizeRoutineResponse(raw);
  },

  async suggestRoutineChange(routine, scheduleForPrompt, history, userMessage): Promise<AIChangeResponse> {
    const raw = await callOpenAI(buildChangeMessages(routine, scheduleForPrompt, history, userMessage));
    return normalizeChangeResponse(raw);
  },
};

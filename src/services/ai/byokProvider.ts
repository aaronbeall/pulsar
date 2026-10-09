import { Routine } from '../../models/types';
import { getOpenAiApiKey } from '../../store/aiSettingsStore';
import { AIChangeResponse, AIError, AIProvider, AIRoutineResponse, WizardAnswer } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini'; // cheap, supports JSON mode

const ROUTINE_SYSTEM_PROMPT = `You are a fitness coach designing a weekly workout routine for a user based on their answers to a short intake questionnaire.

Respond with ONLY a JSON object (no markdown, no commentary outside the JSON) matching exactly this shape:
{
  "name": string,              // short, fun routine name
  "description": string,       // one sentence description of the routine
  "commentary": string,        // 2-3 friendly sentences to the user explaining your reasoning
  "schedule": [
    {
      "day": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday",
      "kind": string,          // short category label, e.g. "Strength", "Cardio", "Flexibility"
      "exercises": [
        { "name": string, "sets": number, "reps": number }
      ]
      // Use "duration" (seconds) instead of "reps" for timed exercises — never both on one exercise.
    }
  ]
}
Only include days that actually have a workout — omit rest days from "schedule" entirely.
Use common, well-known exercise names a fitness app would recognize.`;

const CHANGE_SYSTEM_PROMPT = `You are a fitness coach helping a user modify their existing workout routine through chat.

Respond with ONLY a JSON object (no markdown, no commentary outside the JSON) matching exactly this shape:
{
  "commentary": string,        // friendly reply explaining what you're changing, or answering their question
  "patch": {
    "dailySchedule": [
      { "op": "setDay", "day": "Monday", "kind": string, "exercises": [{ "name": string, "sets": number, "reps": number }] }
    ],
    "description": string      // optional — only if you're also updating the routine's description
  }
}
"dailySchedule" ops may also be { "op": "clearDay", "day": "Monday" } to turn a day into a rest day.
Use "duration" (seconds) instead of "reps" for timed exercises — never both on one exercise.
Only include days in "dailySchedule" that are actually changing — leave everything else out.
If the user is just asking a question or chatting and not requesting an actual change, return
"patch": {} (empty object) and just answer in "commentary".`;

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new AIError('invalid_key', 'No OpenAI API key set.');

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch {
    throw new AIError('network', 'Could not reach OpenAI. Check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401) throw new AIError('invalid_key', 'That OpenAI API key was rejected. Check it in Settings.');
    if (res.status === 429) throw new AIError('rate_limited', 'OpenAI rate-limited this request. Try again shortly.');
    throw new AIError('network', `OpenAI request failed (${res.status}).`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new AIError('empty_response', 'OpenAI returned an empty response.');

  try {
    return JSON.parse(content);
  } catch {
    throw new AIError('parse_error', 'Could not understand the AI response. Try again.');
  }
}

/** Cheap, no-completion-cost way to validate a key before saving it in Settings. */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const byokProvider: AIProvider = {
  async generateRoutine(qa: WizardAnswer[]): Promise<AIRoutineResponse> {
    const userPrompt = qa.map(({ question, answer }) => `${question}\n${answer}`).join('\n\n');
    return callOpenAI(ROUTINE_SYSTEM_PROMPT, userPrompt);
  },

  async suggestRoutineChange(routine: Routine, scheduleForPrompt, userMessage: string): Promise<AIChangeResponse> {
    const userPrompt = [
      `Routine name: ${routine.name}`,
      routine.description ? `Description: ${routine.description}` : '',
      `Current schedule (JSON): ${JSON.stringify(scheduleForPrompt)}`,
      '',
      `User: ${userMessage}`,
    ].filter(Boolean).join('\n');
    return callOpenAI(CHANGE_SYSTEM_PROMPT, userPrompt);
  },
};

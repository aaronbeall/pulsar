import { getOpenAiApiKey, getOpenAiModel } from '../../store/aiSettingsStore';
import { normalizeChangeResponse, normalizeRoutineResponse } from './normalize';
import { buildChangeMessages, buildRoutineMessages, OpenAIMessage } from './prompts';
import { commentaryStreamer, readStreamedContent } from './streaming';
import { AIChangeResponse, AIError, AIProvider, AIRoutineResponse, StreamOptions, WizardAnswer } from './types';

export { buildChangeMessages } from './prompts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
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

/**
 * Send a chat completion and return the parsed JSON reply. With `onContent`, the reply is
 * streamed and `onContent` gets the partial JSON text as it arrives (see streaming.ts).
 */
async function callOpenAI(messages: OpenAIMessage[], onContent?: (content: string) => void): Promise<unknown> {
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
        ...(onContent ? { stream: true } : {}),
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

  let content: string | undefined;
  if (onContent && res.body && res.headers.get('content-type')?.includes('text/event-stream')) {
    content = await readStreamedContent(res, onContent);
  } else {
    const data = await res.json().catch(() => null);
    content = data?.choices?.[0]?.message?.content;
  }
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

export const byokProvider: AIProvider = {
  async generateRoutine(qa: WizardAnswer[], options?: StreamOptions): Promise<AIRoutineResponse> {
    const raw = await callOpenAI(buildRoutineMessages(qa, options?.preferences), commentaryStreamer(options));
    return normalizeRoutineResponse(raw);
  },

  async suggestRoutineChange(routine, scheduleForPrompt, history, userMessage, options?: StreamOptions): Promise<AIChangeResponse> {
    const raw = await callOpenAI(buildChangeMessages(routine, scheduleForPrompt, history, userMessage, options?.preferences), commentaryStreamer(options));
    return normalizeChangeResponse(raw);
  },
};

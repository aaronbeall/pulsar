import { queryClient } from '../../queryClient';
import { ACCOUNT_QUERY_KEY, apiUrl } from '../account';
import { normalizeChangeResponse, normalizeRoutineResponse } from './normalize';
import { commentaryStreamer, readStreamedContent } from './streaming';
import { AIChangeResponse, AIError, AIProvider, AIRoutineResponse, StreamOptions } from './types';

// Hosted Pulsar AI: the same requests as the bring-your-own-key provider, sent to the site's
// own API (worker/ai/routes.ts), which builds the prompt, checks the account's allowance and
// calls OpenAI with Pulsar's key. The reply is OpenAI's event stream, passed through.

async function readError(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function callHosted(path: 'plan' | 'edit', body: unknown, onContent?: (content: string) => void): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`ai/${path}`), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AIError('network', 'Could not reach Pulsar AI. Check your connection and try again.');
  }

  try {
    if (!res.ok) {
      const err = await readError(res);
      const message = err.message || `Pulsar AI request failed (${res.status}).`;
      if (res.status === 401) throw new AIError('signin_required', message);
      if (err.code === 'allowance_used' || err.code === 'cost_cap') throw new AIError('allowance_used', message);
      if (err.code === 'daily_limit') throw new AIError('rate_limited', message);
      if (err.code === 'busy') throw new AIError('busy', message);
      throw new AIError('network', message);
    }
    const content = res.body ? await readStreamedContent(res, onContent ?? (() => {})) : '';
    if (!content) throw new AIError('empty_response', 'Pulsar AI returned an empty response. Try again.');
    try {
      return JSON.parse(content);
    } catch {
      throw new AIError('parse_error', 'Could not understand the AI response. Try again.');
    }
  } finally {
    // The allowance changed (or turned out to be used up): refresh what the app shows.
    queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
  }
}

export const hostedProvider: AIProvider = {
  async generateRoutine(qa, options?: StreamOptions): Promise<AIRoutineResponse> {
    const raw = await callHosted('plan', { answers: qa, preferences: options?.preferences }, commentaryStreamer(options));
    return normalizeRoutineResponse(raw);
  },

  async suggestRoutineChange(routine, scheduleForPrompt, history, userMessage, options?: StreamOptions): Promise<AIChangeResponse> {
    const raw = await callHosted(
      'edit',
      {
        routine: { name: routine.name, description: routine.description ?? '' },
        schedule: scheduleForPrompt,
        history,
        message: userMessage,
        preferences: options?.preferences,
      },
      commentaryStreamer(options)
    );
    return normalizeChangeResponse(raw);
  },
};

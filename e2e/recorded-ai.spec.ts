import type { Page } from '@playwright/test';
import { test, expect, type AIReplay } from './fixtures';
import { answerSetupQuestions, createRoutineFromTemplate } from './helpers';
import { RECORDING_CASES } from '../worker/ai/recordings/cases';
import type { RecordedReply } from '../worker/ai/replay';

// Real model output, replayed: every recorded plan, edit and question (worker/ai/recordings/)
// goes through both AI paths, the user's own key and hosted Pulsar AI. These check that the
// app copes with what the model really says; ai.spec.ts and hosted-ai.spec.ts cover the UI
// details with hand-made replies. A prompt change fails these until `npm run ai:record`.

type Path = 'own key' | 'Pulsar AI';

/** Turns on one AI path before the app loads: a saved key, or a signed-in free account. */
async function useAIPath(page: Page, aiReplay: AIReplay, path: Path, id: string) {
  if (path === 'own key') {
    await page.addInitScript(() => localStorage.setItem('pulsar:openaiApiKey', 'sk-replay'));
    return (await aiReplay.openai(page, id))[0];
  }
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        signInAvailable: true,
        hostedAI: true,
        user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null },
        ai: { tier: 'pulsar_ai', plan: { used: 0, limit: 20 }, edit: { used: 0, limit: 200 }, resetsAt: Date.UTC(2026, 11, 1) },
      },
    }),
  );
  return (await aiReplay.hosted(page, id))[0];
}

/** The start of the coach's reply: enough to find it on screen whatever follows. */
const opening = (rec: RecordedReply) => (JSON.parse(rec.content).commentary as string).trim().slice(0, 40);

for (const path of ['own key', 'Pulsar AI'] as Path[]) {
  test.describe(`recorded AI, ${path}`, () => {
    for (const c of RECORDING_CASES.filter((c) => c.kind === 'plan')) {
      test(`builds a routine: ${c.label}`, async ({ page, aiReplay }) => {
        const rec = await useAIPath(page, aiReplay, path, c.id);
        const reply = JSON.parse(rec.content);
        await page.goto('/app/workout/setup');
        await answerSetupQuestions(page, (c.input.answers as Array<{ answer: string }>).map((a) => a.answer));
        await page.getByRole('button', { name: 'Make my routine!' }).click();

        const progress = page.getByTestId('routine-build-progress');
        await expect(progress.getByText('Your routine is ready')).toBeVisible();
        await expect(progress.getByText(opening(rec), { exact: false })).toBeVisible();
        await progress.getByRole('button', { name: 'See my routine & make changes' }).click();
        await expect(page).toHaveURL(/\/workout\/routine\/[\w-]+$/);
        await expect(page.getByText(reply.name).first()).toBeVisible();
        expect(aiReplay.requests).toHaveLength(1);
      });
    }

    for (const c of RECORDING_CASES.filter((c) => c.kind === 'edit')) {
      test(`answers in chat: ${c.label}`, async ({ page, aiReplay }) => {
        await createRoutineFromTemplate(page, 'Strength Builder');
        const rec = await useAIPath(page, aiReplay, path, c.id);
        // The key or account takes effect on load.
        await page.reload();
        const reply = JSON.parse(rec.content);

        const chat = page.getByPlaceholder('Suggest changes or ask a question...');
        await chat.fill(c.input.message as string);
        await chat.press('Enter');
        await expect(page.getByText(opening(rec), { exact: false }).first()).toBeVisible();
        await expect(page.getByTestId('ai-streaming-reply')).toHaveCount(0);

        const changesDays = Boolean(reply.patch?.dailySchedule?.length);
        if (changesDays || reply.patch?.description !== undefined) {
          await page.getByRole('button', { name: 'Accept all' }).click();
          await expect(page.getByText('Accepted', { exact: true })).toBeVisible();
        } else {
          // A question gets an answer, not a change to accept.
          await expect(page.getByRole('button', { name: 'Accept all' })).toHaveCount(0);
        }
        expect(aiReplay.requests).toHaveLength(1);
      });
    }
  });
}

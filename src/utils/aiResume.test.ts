import { describe, expect, it } from 'vitest';
import { AI_RESUME_TTL_MS, clearAIResume, peekAIResume, saveAIResume } from './aiResume';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

describe('aiResume', () => {
  it('finds the action again on the same page', () => {
    const s = memoryStorage();
    saveAIResume(s, { key: 'setup-plan', path: '/app/workout/setup', via: 'signin' }, 1000);
    expect(peekAIResume(s, 'setup-plan', '/app/workout/setup', 2000)).toMatchObject({ key: 'setup-plan', via: 'signin' });
  });

  it('ignores another action or another page', () => {
    const s = memoryStorage();
    saveAIResume(s, { key: 'chat:r1', path: '/app/workout/routine/r1', via: 'checkout' }, 1000);
    expect(peekAIResume(s, 'chat:r2', '/app/workout/routine/r1', 2000)).toBeNull();
    expect(peekAIResume(s, 'chat:r1', '/app/workout/routine/r2', 2000)).toBeNull();
    // still there for the right page
    expect(peekAIResume(s, 'chat:r1', '/app/workout/routine/r1', 2000)).not.toBeNull();
  });

  it('drops an entry that is too old', () => {
    const s = memoryStorage();
    saveAIResume(s, { key: 'setup-plan', path: '/p', via: 'signin' }, 1000);
    expect(peekAIResume(s, 'setup-plan', '/p', 1000 + AI_RESUME_TTL_MS + 1)).toBeNull();
    expect(s.getItem('pulsar:aiResume')).toBeNull();
  });

  it('is gone once cleared, and survives junk in storage', () => {
    const s = memoryStorage();
    saveAIResume(s, { key: 'setup-plan', path: '/p', via: 'signin' }, 1000);
    clearAIResume(s);
    expect(peekAIResume(s, 'setup-plan', '/p', 2000)).toBeNull();
    s.setItem('pulsar:aiResume', '{not json');
    expect(peekAIResume(s, 'setup-plan', '/p', 2000)).toBeNull();
  });
});

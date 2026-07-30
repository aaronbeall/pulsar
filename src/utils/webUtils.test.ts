import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSearchUrl, getHowToQuery, getExerciseSearchImageUrl } from './webUtils';
import { normalizeExerciseName } from '../services/routineBuilderService';

function createFakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

describe('getSearchUrl', () => {
  it('URL-encodes the query into a DuckDuckGo search link', () => {
    const url = getSearchUrl('how to squat site:youtube.com');
    expect(url).toContain('duckduckgo.com');
    expect(url).toContain(encodeURIComponent('how to squat site:youtube.com'));
  });
});

describe('getHowToQuery', () => {
  it('builds a YouTube-restricted how-to search query', () => {
    expect(getHowToQuery('Push Up')).toBe('how to Push Up site:youtube.com');
  });
});

describe('getExerciseSearchImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createFakeLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns a cached URL without making a network request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const norm = normalizeExerciseName('Push Up');
    localStorage.setItem(`pulsar:imageUrl:${norm}`, 'https://cached.example/push-up.jpg');

    const result = await getExerciseSearchImageUrl('Push Up');

    expect(result).toBe('https://cached.example/push-up.jpg');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches, caches, and returns a fresh image URL on a cache miss', async () => {
    vi.stubEnv('VITE_GOOGLE_CSE_ID', 'test-cx');
    vi.stubEnv('VITE_GOOGLE_CSE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [{ link: 'https://fresh.example/squat.jpg' }] }),
    })));

    const result = await getExerciseSearchImageUrl('Squat');

    expect(result).toBe('https://fresh.example/squat.jpg');
    const norm = normalizeExerciseName('Squat');
    expect(localStorage.getItem(`pulsar:imageUrl:${norm}`)).toBe('https://fresh.example/squat.jpg');
  });

  it('returns null and does not cache when no API key is configured', async () => {
    vi.stubEnv('VITE_GOOGLE_CSE_ID', '');
    vi.stubEnv('VITE_GOOGLE_CSE_API_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await getExerciseSearchImageUrl('Lunge');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    const norm = normalizeExerciseName('Lunge');
    expect(localStorage.getItem(`pulsar:imageUrl:${norm}`)).toBeNull();
  });
});

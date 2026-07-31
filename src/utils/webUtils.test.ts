import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSearchUrl, getHowToQuery, getExerciseSearchImageUrl, searchExerciseImages } from './webUtils';
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
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            '12345': {
              pageid: 12345,
              title: 'File:Squat.jpg',
              imageinfo: [{ url: 'https://fresh.example/squat.jpg' }],
            },
          },
        },
      }),
    })));

    const result = await getExerciseSearchImageUrl('Squat');

    expect(result).toBe('https://fresh.example/squat.jpg');
    const norm = normalizeExerciseName('Squat');
    expect(localStorage.getItem(`pulsar:imageUrl:${norm}`)).toBe('https://fresh.example/squat.jpg');
  });

  it('returns null and does not cache when no search results are found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ query: { pages: {} } }),
    })));

    const result = await getExerciseSearchImageUrl('Some Made Up Nonexistent Exercise');

    expect(result).toBeNull();
    const norm = normalizeExerciseName('Some Made Up Nonexistent Exercise');
    expect(localStorage.getItem(`pulsar:imageUrl:${norm}`)).toBeNull();
  });

  it('returns null without throwing when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    const result = await getExerciseSearchImageUrl('Lunge');

    expect(result).toBeNull();
  });
});

describe('searchExerciseImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sorts results by the API\'s relevance index, not object/pageid iteration order', async () => {
    // MediaWiki keys results by pageid, and JS iterates integer-like keys in ascending
    // numeric order regardless of relevance — pageid 999 here is the best match (index 0)
    // despite sorting last by key. If this test fails, the ranking-by-index fix regressed.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            '999': { index: 0, imageinfo: [{ url: 'https://example/best-match.jpg' }] },
            '111': { index: 1, imageinfo: [{ url: 'https://example/second-match.jpg' }] },
          },
        },
      }),
    })));

    const results = await searchExerciseImages('squat', 2);

    expect(results).toEqual(['https://example/best-match.jpg', 'https://example/second-match.jpg']);
  });

  it('returns an empty array when nothing is found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ query: { pages: {} } }) })));

    expect(await searchExerciseImages('nonsense')).toEqual([]);
  });
});

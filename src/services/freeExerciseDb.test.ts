import { describe, it, expect, afterEach, vi } from 'vitest';

// The module memoizes its fetch in a module-level singleton, so each test that needs a
// fresh index (i.e. a different mocked fetch response) imports a fresh module instance
// via vi.resetModules() + dynamic import rather than the static top-level import.
async function freshModule() {
  vi.resetModules();
  return import('./freeExerciseDb');
}

describe('isTimedCategory', () => {
  it('treats cardio and stretching as timed, everything else as rep-based', async () => {
    const { isTimedCategory } = await freshModule();
    expect(isTimedCategory('cardio')).toBe(true);
    expect(isTimedCategory('stretching')).toBe(true);
    expect(isTimedCategory('strength')).toBe(false);
    expect(isTimedCategory('powerlifting')).toBe(false);
  });
});

describe('getFreeExerciseDbImageUrl', () => {
  it('builds a full raw-content URL from a relative image path', async () => {
    const { getFreeExerciseDbImageUrl } = await freshModule();
    const url = getFreeExerciseDbImageUrl({
      name: 'Barbell Squat', category: 'strength', primaryMuscles: [], secondaryMuscles: [],
      description: '', image: 'Barbell_Squat/0.jpg',
    });
    expect(url).toBe('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg');
  });

  it('returns undefined when the entry has no image', async () => {
    const { getFreeExerciseDbImageUrl } = await freshModule();
    const url = getFreeExerciseDbImageUrl({
      name: 'Made Up', category: 'strength', primaryMuscles: [], secondaryMuscles: [],
      description: '', image: null,
    });
    expect(url).toBeUndefined();
  });
});

describe('findFreeExerciseDbEntry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds an entry by forgiving name match against the fetched dataset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ([
        { name: 'Barbell Squat', category: 'strength', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], description: 'Squat down.', image: 'Barbell_Squat/0.jpg' },
      ]),
    })));
    const { findFreeExerciseDbEntry } = await freshModule();

    const entry = await findFreeExerciseDbEntry('barbell squats'); // trailing 's', different case
    expect(entry?.name).toBe('Barbell Squat');
  });

  it('returns null when nothing matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ([
        { name: 'Barbell Squat', category: 'strength', primaryMuscles: [], secondaryMuscles: [], description: '', image: 'x.jpg' },
      ]),
    })));
    const { findFreeExerciseDbEntry } = await freshModule();

    const entry = await findFreeExerciseDbEntry('Some Made Up Nonexistent Exercise');
    expect(entry).toBeNull();
  });

  it('returns null (not throw) when the dataset fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const { findFreeExerciseDbEntry } = await freshModule();

    const entry = await findFreeExerciseDbEntry('Squat');
    expect(entry).toBeNull();
  });

  it('only fetches the dataset once across repeated calls', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ([
        { name: 'Push Up', category: 'strength', primaryMuscles: [], secondaryMuscles: [], description: '', image: 'x.jpg' },
      ]),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const { findFreeExerciseDbEntry } = await freshModule();

    await findFreeExerciseDbEntry('Push Up');
    await findFreeExerciseDbEntry('Push Up');
    await findFreeExerciseDbEntry('anything else');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

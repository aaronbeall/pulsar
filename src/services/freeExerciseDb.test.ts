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

describe('getFreeExerciseDbImageUrls', () => {
  it('builds full raw-content URLs from an entry\'s relative image paths', async () => {
    const { getFreeExerciseDbImageUrls } = await freshModule();
    const urls = getFreeExerciseDbImageUrls({
      name: 'Barbell Squat', category: 'strength', primaryMuscles: [], secondaryMuscles: [],
      description: '', images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'],
    });
    expect(urls).toEqual([
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg',
    ]);
  });

  it('returns an empty array when the entry has no images', async () => {
    const { getFreeExerciseDbImageUrls } = await freshModule();
    const urls = getFreeExerciseDbImageUrls({
      name: 'Made Up', category: 'strength', primaryMuscles: [], secondaryMuscles: [],
      description: '', images: [],
    });
    expect(urls).toEqual([]);
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
        { name: 'Barbell Squat', category: 'strength', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], description: 'Squat down.', images: ['Barbell_Squat/0.jpg'] },
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
        { name: 'Barbell Squat', category: 'strength', primaryMuscles: [], secondaryMuscles: [], description: '', images: ['x.jpg'] },
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
        { name: 'Push Up', category: 'strength', primaryMuscles: [], secondaryMuscles: [], description: '', images: ['x.jpg'] },
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

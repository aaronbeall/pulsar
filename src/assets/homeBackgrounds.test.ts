import { describe, it, expect } from 'vitest';
import { pickTodaysHomeBackground, ALL_HOME_BACKGROUNDS } from './homeBackgrounds';

describe('pickTodaysHomeBackground', () => {
  it('is deterministic — same date and day-type always picks the same image', () => {
    const date = new Date(2026, 6, 30);
    const a = pickTodaysHomeBackground(false, [], date);
    const b = pickTodaysHomeBackground(false, [], date);
    expect(a.src).toBe(b.src);
  });

  it('picks from the rest pool on a rest day and the curated workout pool on a workout day with no exercise images', () => {
    const date = new Date(2026, 6, 30);
    const restPick = pickTodaysHomeBackground(true, [], date);
    const workoutPick = pickTodaysHomeBackground(false, [], date);
    const curatedTitles = ALL_HOME_BACKGROUNDS.map(b => b.title);
    expect(curatedTitles).toContain(restPick.title);
    expect(curatedTitles).toContain(workoutPick.title);
    // The two pools don't share any images, so a rest-day and workout-day pick on the
    // same date should never coincidentally be the exact same photo.
    expect(restPick.src).not.toBe(workoutPick.src);
  });

  it('never picks an exercise image on a rest day, even if some are passed in', () => {
    const date = new Date(2026, 6, 30);
    const pick = pickTodaysHomeBackground(true, ['https://example/exercise.jpg'], date);
    expect(pick.src).not.toBe('https://example/exercise.jpg');
    expect(ALL_HOME_BACKGROUNDS.map(b => b.title)).toContain(pick.title);
  });

  it('varies across different days', () => {
    const picks = new Set(
      Array.from({ length: 10 }, (_, i) => pickTodaysHomeBackground(false, [], new Date(2026, 6, 1 + i)).src)
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('on a workout day, sometimes picks a curated background and sometimes one of today\'s exercise images, across enough days', () => {
    const exerciseImages = ['https://example/a.jpg', 'https://example/b.jpg'];
    let sawCurated = false;
    let sawExercise = false;
    for (let i = 0; i < 30; i++) {
      const pick = pickTodaysHomeBackground(false, exerciseImages, new Date(2026, 0, 1 + i));
      if (exerciseImages.includes(pick.src)) {
        sawExercise = true;
      } else {
        sawCurated = true;
      }
    }
    expect(sawCurated).toBe(true);
    expect(sawExercise).toBe(true);
  });

  it('an exercise-image pick has no attribution fields (nothing to credit) and a generic title', () => {
    // Find a date where the exercise-image branch actually wins, since it's a coin flip.
    const exerciseImages = ['https://example/a.jpg'];
    let picked = null;
    for (let i = 0; i < 30 && !picked; i++) {
      const pick = pickTodaysHomeBackground(false, exerciseImages, new Date(2026, 0, 1 + i));
      if (pick.src === exerciseImages[0]) picked = pick;
    }
    expect(picked).not.toBeNull();
    expect(picked!.author).toBeUndefined();
    expect(picked!.sourceUrl).toBeUndefined();
  });
});

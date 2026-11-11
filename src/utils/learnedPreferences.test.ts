import { describe, it, expect } from 'vitest';
import { learnPreferences, hasPreferences } from './learnedPreferences';
import type { Exercise, Workout, WorkoutExercise } from '../models/types';

const NOW = new Date('2026-11-11T12:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

const exercise = (id: string, extra: Partial<Exercise> = {}): Exercise => ({
  id, name: id[0].toUpperCase() + id.slice(1), description: '', howToUrl: '', coverImageUrl: '', iconImageUrl: '', ...extra,
});

const done = (exerciseId: string, completedSets = 3): WorkoutExercise => ({ exerciseId, sets: 3, completedSets });

/** A finished workout `daysAgo` days before NOW, lasting `minutes`. */
const workout = (daysAgo: number, exercises: WorkoutExercise[], minutes = 40, finished = true): Workout => {
  const startedAt = NOW - daysAgo * DAY;
  return { id: `w${daysAgo}`, nickname: '', routineId: 'r', day: 'Monday', startedAt, completedAt: finished ? startedAt + minutes * 60000 : undefined, exercises };
};

describe('learnPreferences', () => {
  it('starts empty', () => {
    const p = learnPreferences([], [], NOW);
    expect(hasPreferences(p)).toBe(false);
  });

  it('reads liked, starred and disliked exercises', () => {
    const p = learnPreferences([
      exercise('squat', { liked: true }),
      exercise('plank', { favorite: true }),
      exercise('burpee', { disliked: true }),
      exercise('lunge'),
    ], [], NOW);
    expect(p.likedExercises).toEqual(['Squat', 'Plank']);
    expect(p.dislikedExercises).toEqual(['Burpee']);
  });

  it('finds exercises the user keeps leaving undone', () => {
    const exercises = [exercise('squat'), exercise('lunge'), exercise('plank')];
    const p = learnPreferences(exercises, [
      workout(2, [done('squat'), done('lunge', 0), done('plank', 0)]),
      workout(5, [done('squat'), done('lunge', 0), done('plank')]),
      workout(9, [done('squat'), { ...done('lunge', 3), skipped: true }, done('plank')]),
    ], NOW);
    expect(p.skippedExercises).toEqual(['Lunge']);
  });

  it('ignores unfinished and old workouts', () => {
    const p = learnPreferences([exercise('lunge')], [
      workout(2, [done('lunge', 0)], 40, false),
      workout(3, [done('lunge', 0)], 40, false),
      workout(120, [done('lunge', 0)]),
      workout(130, [done('lunge', 0)]),
    ], NOW);
    expect(p.skippedExercises).toEqual([]);
  });

  it('learns the usual days and session length', () => {
    // NOW is a Wednesday: 0, 7, 14 days ago are Wednesdays; 2, 9 are Mondays; 4 is a Saturday.
    const p = learnPreferences([], [0, 7, 14, 2, 9, 4].map(d => workout(d, [], d === 4 ? 90 : 32)), NOW);
    expect(p.usualDays).toEqual(['Monday', 'Wednesday']);
    expect(p.usualMinutes).toBe(30);
  });

  it('needs a few workouts before guessing a pattern', () => {
    const p = learnPreferences([], [workout(0, []), workout(7, [])], NOW);
    expect(p.usualDays).toEqual([]);
    expect(p.usualMinutes).toBeUndefined();
  });
});

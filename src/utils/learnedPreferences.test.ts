import { describe, it, expect } from 'vitest';
import { learnPreferences, hasPreferences } from './learnedPreferences';
import type { Exercise, Routine, Workout, WorkoutExercise } from '../models/types';

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
    const p = learnPreferences([], [], [], NOW);
    expect(hasPreferences(p)).toBe(false);
  });

  it('reads liked, starred and disliked exercises', () => {
    const p = learnPreferences([
      exercise('squat', { liked: true }),
      exercise('plank', { favorite: true }),
      exercise('burpee', { disliked: true }),
      exercise('lunge'),
    ], [], [], NOW);
    expect(p.likedExercises).toEqual(['Squat', 'Plank']);
    expect(p.dislikedExercises).toEqual(['Burpee']);
  });

  it('finds exercises the user keeps leaving undone', () => {
    const exercises = [exercise('squat'), exercise('lunge'), exercise('plank')];
    const p = learnPreferences(exercises, [
      workout(2, [done('squat'), done('lunge', 0), done('plank', 0)]),
      workout(5, [done('squat'), done('lunge', 0), done('plank')]),
      workout(9, [done('squat'), { ...done('lunge', 3), skipped: true }, done('plank')]),
    ], [], NOW);
    expect(p.skippedExercises).toEqual(['Lunge']);
  });

  it('ignores unfinished and old workouts', () => {
    const p = learnPreferences([exercise('lunge')], [
      workout(2, [done('lunge', 0)], 40, false),
      workout(3, [done('lunge', 0)], 40, false),
      workout(120, [done('lunge', 0)]),
      workout(130, [done('lunge', 0)]),
    ], [], NOW);
    expect(p.skippedExercises).toEqual([]);
  });

  it('learns the usual days and session length', () => {
    // NOW is a Wednesday: 0, 7, 14 days ago are Wednesdays; 2, 9 are Mondays; 4 is a Saturday.
    const p = learnPreferences([], [0, 7, 14, 2, 9, 4].map(d => workout(d, [], d === 4 ? 90 : 32)), [], NOW);
    expect(p.usualDays).toEqual(['Monday', 'Wednesday']);
    expect(p.usualMinutes).toBe(30);
  });

  it('needs a few workouts before guessing a pattern', () => {
    const p = learnPreferences([], [workout(0, []), workout(7, [])], [], NOW);
    expect(p.usualDays).toEqual([]);
    expect(p.usualMinutes).toBeUndefined();
  });

  it('reads routine ratings', () => {
    const routine = (name: string, extra: Partial<Routine>): Routine =>
      ({ id: name, name, description: '', active: false, createdAt: 0, dailySchedule: [], chatHistory: [], ...extra });
    const p = learnPreferences([], [], [routine('Upper Lower', { liked: true }), routine('HIIT', { disliked: true }), routine('Plain', {})], NOW);
    expect(p.likedRoutines).toEqual(['Upper Lower']);
    expect(p.dislikedRoutines).toEqual(['HIIT']);
    expect(hasPreferences(p)).toBe(true);
  });

  describe('how recent workouts felt', () => {
    const felt = (daysAgo: number, extra: Partial<Workout>) => ({ ...workout(daysAgo, []), ...extra });

    it('goes easier and shorter when recent workouts keep feeling too hard and too long', () => {
      const p = learnPreferences([], [
        felt(1, { effort: 'hard', lengthFeel: 'long' }),
        felt(3, { effort: 'hard', lengthFeel: 'right' }),
        felt(5, { effort: 'right', lengthFeel: 'long' }),
      ], [], NOW);
      expect(p.effort).toBe('easier');
      expect(p.length).toBe('shorter');
    });

    it('goes harder and longer the other way', () => {
      const p = learnPreferences([], [felt(1, { effort: 'easy', lengthFeel: 'short' }), felt(3, { effort: 'easy', lengthFeel: 'short' })], [], NOW);
      expect(p.effort).toBe('harder');
      expect(p.length).toBe('longer');
    });

    it('needs a clear trend', () => {
      const one = learnPreferences([], [felt(1, { effort: 'hard' })], [], NOW);
      expect(one.effort).toBeUndefined();
      const mixed = learnPreferences([], [felt(1, { effort: 'hard' }), felt(2, { effort: 'easy' }), felt(3, { effort: 'hard' }), felt(4, { effort: 'easy' })], [], NOW);
      expect(mixed.effort).toBeUndefined();
      const mostlyRight = learnPreferences([], [1, 2, 3, 4, 5].map(d => felt(d, { effort: d < 3 ? 'hard' : 'right' })), [], NOW);
      expect(mostlyRight.effort).toBeUndefined();
    });

    it('only looks at the latest ratings from the last month', () => {
      const p = learnPreferences([], [
        ...[1, 2, 3, 4, 5].map(d => felt(d, { effort: 'right' as const })),
        felt(6, { effort: 'hard' }), felt(7, { effort: 'hard' }), felt(8, { effort: 'hard' }),
        felt(40, { lengthFeel: 'long' }), felt(41, { lengthFeel: 'long' }),
      ], [], NOW);
      expect(p.effort).toBeUndefined();
      expect(p.length).toBeUndefined();
    });

    it('keeps the latest notes, newest first and trimmed', () => {
      const p = learnPreferences([], [
        felt(9, { feedback: 'old one' }), felt(1, { feedback: '  my  knee hurt  ' }), felt(2, { feedback: 'x'.repeat(500) }),
        felt(3, { feedback: 'fun' }), felt(4, { feedback: '   ' }),
      ], [], NOW);
      expect(p.workoutNotes?.[0]).toBe('my knee hurt');
      expect(p.workoutNotes?.[1]).toHaveLength(200);
      expect(p.workoutNotes).toHaveLength(3);
      expect(p.workoutNotes).not.toContain('old one');
    });
  });
});

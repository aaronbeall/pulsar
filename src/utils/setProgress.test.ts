import { describe, expect, it } from 'vitest';
import { completeSet, getSetTimer, setEndsAt, startSet } from './setProgress';
import { WorkoutExercise } from '../models/types';

const timed: WorkoutExercise = { exerciseId: 'plank', sets: 2, duration: 30 };
const reps: WorkoutExercise = { exerciseId: 'pushup', sets: 3, reps: 10 };

describe('getSetTimer', () => {
  it('counts down from wall-clock time, however long since the last tick', () => {
    const t = getSetTimer(1_000, 30, 1_000 + 12_400);
    expect(t).toEqual({ elapsedSec: 12, remainingSec: 18, progress: expect.closeTo(41.33, 1), isDone: false });
  });

  it('is done (not negative) when the app comes back long after the set ended', () => {
    // e.g. phone locked for 5 minutes during a 30s set
    expect(getSetTimer(0, 30, 300_000)).toEqual({ elapsedSec: 30, remainingSec: 0, progress: 100, isDone: true });
  });

  it('shows 1s until the very end rather than 0 early', () => {
    expect(getSetTimer(0, 30, 29_100).remainingSec).toBe(1);
    expect(getSetTimer(0, 30, 29_100).isDone).toBe(false);
    expect(getSetTimer(0, 30, 30_000).isDone).toBe(true);
  });

  it('counts up for rep sets and never finishes on its own', () => {
    expect(getSetTimer(0, undefined, 75_000)).toEqual({ elapsedSec: 75, remainingSec: null, progress: 0, isDone: false });
  });

  it('clamps clock skew to zero', () => {
    expect(getSetTimer(5_000, 30, 1_000).elapsedSec).toBe(0);
  });

  it('computes the end time', () => {
    expect(setEndsAt(1_000, 30)).toBe(31_000);
  });
});

describe('startSet / completeSet', () => {
  it('starts a set once and keeps the original start time', () => {
    const started = startSet(timed, 100);
    expect(started).toMatchObject({ startedAt: 100, currentSetStartedAt: 100, completedSets: 0, completedDuration: 0 });
    expect(startSet(started, 999)).toBe(started);
  });

  it('records each timed set and completes after the last one', () => {
    let ex = completeSet(startSet(timed, 0), 30_000);
    expect(ex).toMatchObject({ completedSets: 1, completedDuration: 30, currentSetStartedAt: undefined, completedAt: undefined });
    ex = completeSet(startSet(ex, 60_000), 75_000, 15); // ended early
    expect(ex).toMatchObject({ completedSets: 2, completedDuration: 45, completedAt: 75_000 });
  });

  it('records rep sets without touching duration', () => {
    let ex = startSet(reps, 0);
    for (let i = 0; i < 3; i++) ex = completeSet(startSet(ex, i * 1000), i * 1000 + 500);
    expect(ex).toMatchObject({ completedSets: 3, completedDuration: 0, completedAt: 2_500 });
  });
});

describe('formatSeconds', () => {
  it('formats short and long durations', async () => {
    const { formatSeconds } = await import('./setProgress');
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(605)).toBe('10:05');
    expect(formatSeconds(3725)).toBe('1:02:05');
  });
});

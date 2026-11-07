import { describe, expect, it } from 'vitest';
import { getWorkoutTiming } from './workoutTiming';
import { completeSet, startSet } from './setProgress';
import { WorkoutExercise } from '../models/types';

const s = (sec: number) => sec * 1000;

describe('getWorkoutTiming', () => {
  it('splits exercise time and rest, attributing rest to the set it precedes', () => {
    const timing = getWorkoutTiming({
      exercises: [
        // Plank: 30s, rest 60s, 30s
        { exerciseId: 'plank', sets: 2, duration: 30, setLog: [
          { startedAt: s(0), endedAt: s(30) },
          { startedAt: s(90), endedAt: s(120) },
        ] },
        // Push-ups: 45s after 90s change-over
        { exerciseId: 'pushup', sets: 1, reps: 10, setLog: [{ startedAt: s(210), endedAt: s(255) }] },
        { exerciseId: 'squat', sets: 3, reps: 10 }, // not started
      ],
    });
    expect(timing.exercises).toEqual([
      { activeSec: 60, restSec: 60, setSec: [30, 30] },
      { activeSec: 45, restSec: 90, setSec: [45] },
      { activeSec: 0, restSec: 0, setSec: [] },
    ]);
    expect(timing).toMatchObject({ activeSec: 105, restSec: 150, totalSec: 255 });
  });

  it('follows the order sets were actually done, not exercise order', () => {
    const timing = getWorkoutTiming({
      exercises: [
        { exerciseId: 'a', sets: 1, setLog: [{ startedAt: s(100), endedAt: s(110) }] },
        { exerciseId: 'b', sets: 1, setLog: [{ startedAt: s(0), endedAt: s(10) }] },
      ],
    });
    expect(timing.exercises.map(e => e.restSec)).toEqual([90, 0]);
  });

  it('is all zeros for a workout with no finished sets', () => {
    expect(getWorkoutTiming({ exercises: [{ exerciseId: 'a', sets: 3 }] })).toMatchObject({
      activeSec: 0, restSec: 0, totalSec: 0,
    });
  });

  it('works on logs recorded by startSet/completeSet', () => {
    let ex: WorkoutExercise = { exerciseId: 'plank', sets: 2, duration: 30 };
    ex = completeSet(startSet(ex, s(0)), s(30));
    ex = completeSet(startSet(ex, s(50)), s(80));
    expect(ex.setLog).toEqual([{ startedAt: 0, endedAt: s(30) }, { startedAt: s(50), endedAt: s(80) }]);
    expect(getWorkoutTiming({ exercises: [ex] })).toMatchObject({ activeSec: 60, restSec: 20 });
  });
});

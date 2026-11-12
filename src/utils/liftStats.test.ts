import { describe, expect, it } from 'vitest';
import { Workout, WorkoutExercise } from '../models/types';
import {
  estimateOneRepMax,
  findNewBests,
  getChangeKg,
  getLastWeightKg,
  getLiftSessions,
  getLiftSummaries,
  getNextSetWeightKg,
  getRecentBests,
  sessionsInRange,
  suggestHeavierKg,
  summarizeSetWeights,
} from './liftStats';
import { displayWeight, toKg } from './units';

const DAY = 24 * 60 * 60 * 1000;
const lb = (n: number) => toKg(n, 'lb');

function bench(weightsLb: (number | undefined)[], reps: (number | undefined)[] = []): WorkoutExercise {
  return {
    exerciseId: 'bench',
    sets: 3,
    reps: 8,
    setLog: weightsLb.map((w, i) => ({
      startedAt: i * 1000,
      endedAt: i * 1000 + 500,
      ...(w ? { weightKg: lb(w) } : {}),
      ...(reps[i] !== undefined ? { reps: reps[i] } : {}),
    })),
  };
}

function workout(id: string, day: number, exercises: WorkoutExercise[]): Workout {
  return { id, nickname: id, routineId: 'r', day: 'Monday', startedAt: day * DAY, completedAt: day * DAY + 1, exercises };
}

const history = [
  workout('w1', 1, [bench([135, 135, 135])]),
  workout('w2', 5, [bench([135, 135, 135], [8, 8, 6])]),
  workout('w3', 40, [bench([140, 140, 145])]),
  workout('w4', 41, [{ exerciseId: 'plank', sets: 3, duration: 30, setLog: [{ startedAt: 0, endedAt: 1 }] }]),
];

describe('estimateOneRepMax', () => {
  it('uses Epley, and a single is its own max', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1);
  });
});

describe('getLiftSessions', () => {
  it('builds one session per workout with weights, oldest first, using reps done', () => {
    const sessions = getLiftSessions('bench', [...history].reverse());
    expect(sessions.map(s => s.workoutId)).toEqual(['w1', 'w2', 'w3']);
    expect(displayWeight(sessions[2].topKg, 'lb')).toBe(145);
    expect(sessions[1].sets.map(s => s.reps)).toEqual([8, 8, 6]);
    expect(displayWeight(sessions[0].volumeKg, 'lb')).toBe(135 * 24);
  });

  it('ignores sets with no weight and exercises never weighed', () => {
    expect(getLiftSessions('plank', history)).toEqual([]);
    expect(getLiftSessions('bench', [workout('x', 1, [bench([undefined, 100])])])[0].sets).toHaveLength(1);
  });
});

describe('next set weight', () => {
  it("takes the person's choice, then today's last set, then last session", () => {
    expect(getLastWeightKg('bench', history, 'w3')).toBeCloseTo(lb(135));
    const fresh: WorkoutExercise = { exerciseId: 'bench', sets: 3, reps: 8 };
    expect(getNextSetWeightKg(fresh, lb(135))).toBe(lb(135));
    expect(getNextSetWeightKg(bench([140]), lb(135))).toBe(lb(140));
    expect(getNextSetWeightKg({ ...fresh, weightKg: lb(150) }, lb(135))).toBe(lb(150));
    expect(getNextSetWeightKg({ ...fresh, weightKg: 0 }, lb(135))).toBeUndefined();
    expect(getNextSetWeightKg(fresh, undefined)).toBeUndefined();
  });
});

describe('suggestHeavierKg', () => {
  const sessions = getLiftSessions('bench', history);
  it('suggests one step up after every planned set was done at one weight', () => {
    expect(displayWeight(suggestHeavierKg(sessions[0], { sets: 3, reps: 8 }, 'lb')!, 'lb')).toBe(140);
    expect(suggestHeavierKg(sessions[0], { sets: 3, reps: 8 }, 'kg')).toBe(62.5);
  });
  it('holds off after missed reps, mixed weights, or fewer sets', () => {
    expect(suggestHeavierKg(sessions[1], { sets: 3, reps: 8 }, 'lb')).toBeUndefined();
    expect(suggestHeavierKg(sessions[2], { sets: 3, reps: 8 }, 'lb')).toBeUndefined();
    expect(suggestHeavierKg(sessions[0], { sets: 4, reps: 8 }, 'lb')).toBeUndefined();
    expect(suggestHeavierKg(undefined, { sets: 3, reps: 8 }, 'lb')).toBeUndefined();
  });
});

describe('summarizeSetWeights', () => {
  it('shows one weight or a range', () => {
    expect(summarizeSetWeights(bench([135, 135]), 'lb')).toBe('135 lb');
    expect(summarizeSetWeights(bench([135, 145]), 'lb')).toBe('135–145 lb');
    expect(summarizeSetWeights(bench([]), 'lb')).toBeNull();
  });
});

describe('findNewBests', () => {
  it('finds a heavier set', () => {
    const bests = findNewBests(history[2], history);
    expect(bests).toHaveLength(1);
    expect(bests[0]).toMatchObject({ exerciseId: 'bench', kind: 'weight' });
    expect(displayWeight(bests[0].valueKg, 'lb')).toBe(145);
    expect(displayWeight(bests[0].previousKg, 'lb')).toBe(135);
  });
  it('finds more reps at the same top weight as a 1RM best', () => {
    const more = workout('w5', 50, [bench([145, 145], [10, 8])]);
    expect(findNewBests(more, [...history, more])[0]).toMatchObject({ kind: 'e1rm' });
  });
  it('does not count the first time, or a repeat', () => {
    expect(findNewBests(history[0], history)).toEqual([]);
    expect(findNewBests(history[1], history)).toEqual([]);
  });
});

describe('ranges and summaries', () => {
  const sessions = getLiftSessions('bench', history);
  it('filters by range', () => {
    expect(sessionsInRange(sessions, '1M', 45 * DAY)).toHaveLength(1);
    expect(sessionsInRange(sessions, 'All', 45 * DAY)).toHaveLength(3);
  });
  it('measures change against the last session before the window', () => {
    expect(displayWeight(getChangeKg(sessions, 45 * DAY, 30)!, 'lb')).toBe(10);
    expect(displayWeight(getChangeKg(sessions, 45 * DAY)!, 'lb')).toBe(10);
    expect(getChangeKg(sessions.slice(0, 1), 45 * DAY)).toBeNull();
  });
  it('summarizes each lift, most-logged first', () => {
    const summaries = getLiftSummaries(history, 45 * DAY);
    expect(summaries.map(s => s.exerciseId)).toEqual(['bench']);
    expect(summaries[0].sessionCount).toBe(3);
    expect(displayWeight(summaries[0].bestKg, 'lb')).toBe(145);
    expect(summaries[0].series).toHaveLength(3);
  });
  it('lists recent heaviest-set records', () => {
    const events = getRecentBests(history, 30 * DAY);
    expect(events).toHaveLength(1);
    expect(displayWeight(events[0].valueKg, 'lb')).toBe(145);
    expect(getRecentBests(history, 45 * DAY)).toEqual([]);
  });
});

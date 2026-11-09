import { describe, it, expect } from 'vitest';
import { getDayDetail } from './dayDetail';
import type { DayOfWeek, Routine, Workout } from '../models/types';

const d = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);
const now = d(7, 29); // Wednesday

const routine: Routine = {
  id: 'r1', name: 'Strength', description: '', active: true, createdAt: d(7, 1).getTime(), chatHistory: [],
  dailySchedule: [
    { day: 'Monday', kind: 'Push', exercises: [{ exerciseId: 'a', sets: 3 }, { exerciseId: 'b', sets: 3 }] },
    { day: 'Wednesday', kind: 'Pull', exercises: [{ exerciseId: 'c', sets: 3 }] },
    { day: 'Friday', kind: 'Legs', exercises: [{ exerciseId: 'd', sets: 3 }] },
  ],
};
const workout = (day: DayOfWeek, at: Date, completed = true): Workout => ({
  id: `${day}-${at.getTime()}`, nickname: day, routineId: 'r1', day, startedAt: at.getTime(),
  completedAt: completed ? at.getTime() + 3600_000 : undefined, exercises: [],
});

describe('getDayDetail', () => {
  const workouts = [workout('Monday', d(7, 27)), workout('Tuesday', d(7, 28))];

  it('labels each kind of day', () => {
    expect(getDayDetail(d(7, 27, 0), workouts, [routine], now).label).toBe('done');
    expect(getDayDetail(d(7, 28, 0), workouts, [routine], now).label).toBe('done'); // a bonus workout on a rest day
    expect(getDayDetail(d(7, 24, 0), workouts, [routine], now).label).toBe('missed');
    expect(getDayDetail(d(7, 25, 0), workouts, [routine], now).label).toBe('rest');
    expect(getDayDetail(d(7, 29, 0), workouts, [routine], now).label).toBe('today');
    expect(getDayDetail(d(7, 31, 0), workouts, [routine], now).label).toBe('planned');
    expect(getDayDetail(d(8, 1, 0), workouts, [routine], now).label).toBe('rest');
  });

  it("lists the day's workouts and what was planned", () => {
    const detail = getDayDetail(d(7, 27, 0), workouts, [routine], now);
    expect(detail.workouts.map(w => w.day)).toEqual(['Monday']);
    expect(detail.planned).toEqual([{ routine, kind: 'Push', exerciseCount: 2 }]);
  });
});

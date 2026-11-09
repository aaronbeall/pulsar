import { describe, it, expect } from 'vitest';
import { getActivitySummary } from './activitySummary';
import type { DayOfWeek, Routine, Workout } from '../models/types';

const d = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);
const now = d(7, 29); // Wednesday

const routine: Routine = {
  id: 'r1', name: 'Strength', description: '', active: true, createdAt: d(7, 1).getTime(), chatHistory: [],
  dailySchedule: (['Monday', 'Wednesday', 'Friday'] as DayOfWeek[]).map(day => ({ day, kind: 'Full', exercises: [] })),
};
const done = (day: DayOfWeek, at: Date, minutes = 45): Workout => ({
  id: `${day}-${at.getTime()}`, nickname: 'x', routineId: 'r1', day, startedAt: at.getTime(),
  completedAt: at.getTime() + minutes * 60_000, exercises: [],
});

describe('getActivitySummary', () => {
  const workouts = [done('Friday', d(6, 26)), done('Monday', d(7, 20)), done('Wednesday', d(7, 22)), done('Friday', d(7, 24)), done('Monday', d(7, 27))];
  const s = getActivitySummary(workouts, [routine], now);

  it("labels this week's days", () => {
    expect(s.week.map(w => w.label)).toEqual(['rest', 'done', 'rest', 'today', 'rest', 'planned', 'rest']);
  });

  it('counts the week, the month and all time', () => {
    expect(s.weekDone).toBe(1);
    expect(s.weekPlanned).toBe(3); // Mon done, Wed today, Fri planned
    expect(s.monthDone).toBe(4); // the June workout isn't this month
    expect(s.totalDone).toBe(5);
    expect(s.totalTimeMs).toBe(5 * 45 * 60_000);
    expect(s.lastWorkoutAt).toBe(d(7, 27).getTime() + 45 * 60_000);
  });

  it('carries the streak', () => {
    expect(s.status).toBe('pending');
    expect(s.streak).toBe(4);
  });
});

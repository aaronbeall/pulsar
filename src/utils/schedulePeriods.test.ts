import { describe, it, expect } from 'vitest';
import { getSchedulePeriods, reconcileSchedulePeriods, scheduledWeekdaysAt, scheduledWeekdays } from './schedulePeriods';
import type { DayOfWeek, Routine } from '../models/types';

const t = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour).getTime();

function routine(days: DayOfWeek[], overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'r1', name: 'R', description: '', active: true, createdAt: t(7, 1), chatHistory: [],
    dailySchedule: days.map(day => ({ day, kind: 'Strength', exercises: [] })),
    ...overrides,
  };
}

describe('scheduledWeekdays', () => {
  it('lists unique weekdays in week order', () => {
    expect(scheduledWeekdays(routine(['Friday', 'Monday', 'Monday']))).toEqual(['Monday', 'Friday']);
  });
});

describe('getSchedulePeriods', () => {
  it('infers an open period from createdAt for a routine saved without a log', () => {
    expect(getSchedulePeriods(routine(['Monday']))).toEqual([{ start: t(7, 1), days: ['Monday'] }]);
    expect(getSchedulePeriods(routine(['Monday'], { active: false }))).toEqual([]);
  });
});

describe('reconcileSchedulePeriods', () => {
  it('opens a period for a new active routine and none for an inactive one', () => {
    expect(reconcileSchedulePeriods(undefined, routine(['Monday']), t(7, 5))).toEqual([{ start: t(7, 5), days: ['Monday'] }]);
    expect(reconcileSchedulePeriods(undefined, routine(['Monday'], { active: false }), t(7, 5))).toEqual([]);
  });

  it('leaves the log alone when nothing schedule-related changed', () => {
    const prev = routine(['Monday'], { schedulePeriods: [{ start: t(7, 1), days: ['Monday'] }] });
    expect(reconcileSchedulePeriods(prev, { ...prev, name: 'Renamed' }, t(7, 10))).toEqual(prev.schedulePeriods);
  });

  it('closes the period on deactivate and opens a new one on reactivate', () => {
    const prev = routine(['Monday'], { schedulePeriods: [{ start: t(7, 1), days: ['Monday'] }] });
    const off = reconcileSchedulePeriods(prev, { ...prev, active: false }, t(7, 10));
    expect(off).toEqual([{ start: t(7, 1), end: t(7, 10), days: ['Monday'] }]);
    const on = reconcileSchedulePeriods({ ...prev, active: false, schedulePeriods: off }, prev, t(7, 20));
    expect(on).toEqual([...off, { start: t(7, 20), days: ['Monday'] }]);
  });

  it('starts a new period when the weekdays change', () => {
    const prev = routine(['Monday'], { schedulePeriods: [{ start: t(7, 1), days: ['Monday'] }] });
    const next = routine(['Monday', 'Wednesday'], { schedulePeriods: prev.schedulePeriods });
    expect(reconcileSchedulePeriods(prev, next, t(7, 10))).toEqual([
      { start: t(7, 1), end: t(7, 10), days: ['Monday'] },
      { start: t(7, 10), days: ['Monday', 'Wednesday'] },
    ]);
  });

  it('replaces a period opened earlier the same day instead of stacking another', () => {
    const prev = routine(['Monday'], { schedulePeriods: [{ start: t(7, 10, 9), days: ['Monday'] }] });
    expect(reconcileSchedulePeriods(prev, routine(['Tuesday']), t(7, 10, 15))).toEqual([{ start: t(7, 10, 15), days: ['Tuesday'] }]);
    expect(reconcileSchedulePeriods(prev, { ...prev, active: false }, t(7, 10, 15))).toEqual([]);
  });

  it("uses the stored log, ignoring a stale copy's", () => {
    const prev = routine(['Monday'], { active: false, schedulePeriods: [{ start: t(7, 1), end: t(7, 5), days: ['Monday'] }] });
    const staleCopy = routine(['Monday'], { schedulePeriods: [] });
    expect(reconcileSchedulePeriods(prev, staleCopy, t(7, 10))).toEqual([...prev.schedulePeriods!, { start: t(7, 10), days: ['Monday'] }]);
  });
});

describe('scheduledWeekdaysAt', () => {
  it('returns the weekdays of the period covering an instant', () => {
    const r = routine(['Tuesday'], {
      schedulePeriods: [
        { start: t(7, 1), end: t(7, 10), days: ['Monday'] },
        { start: t(7, 10), days: ['Tuesday'] },
      ],
    });
    expect(scheduledWeekdaysAt(r, t(6, 30))).toEqual([]);
    expect(scheduledWeekdaysAt(r, t(7, 5))).toEqual(['Monday']);
    expect(scheduledWeekdaysAt(r, t(7, 10))).toEqual(['Tuesday']);
  });
});

import { describe, it, expect } from 'vitest';
import { TEST_PRESETS, getTestPreset } from './testPresets';
import { createBackup, parseBackup } from './backup';
import { getScheduledDate, getStreakInfo } from './workoutUtils';
import { getPendingProposals } from './routineChangeUtils';
import { routineTemplates } from '../services/routineTemplates';

// A week of "nows", one per weekday and at awkward times of day, since which days are
// scheduled (and so which days get a workout) depends on today's weekday.
const NOWS = [
  new Date(2026, 10, 8, 9, 30), // Sunday
  new Date(2026, 10, 9, 0, 20), // Monday, just after midnight
  new Date(2026, 10, 10, 13, 0),
  new Date(2026, 10, 11, 18, 45),
  new Date(2026, 10, 12, 7, 0),
  new Date(2026, 10, 13, 23, 50), // Friday, just before midnight
  new Date(2026, 10, 14, 12, 0),
];

const build = (id: string, now: Date) => getTestPreset(id)!.build(now.getTime());

describe('test presets', () => {
  it('have unique ids', () => {
    const ids = TEST_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const preset of TEST_PRESETS) {
    describe(preset.id, () => {
      it.each(NOWS.map(n => [n.toDateString() + ' ' + n.getHours() + 'h', n] as const))('is consistent at %s', (_, now) => {
        const data = preset.build(now.getTime());
        // Round-trips through the backup format the restore path uses.
        const parsed = parseBackup(JSON.stringify(createBackup(data)));
        expect(parsed.workouts.length).toBe(data.workouts.length);

        const exerciseIds = new Set(data.exercises.map(e => e.id));
        const routineIds = new Set(data.routines.map(r => r.id));
        const workoutIds = new Set<string>();
        const workoutDays = new Set<string>();
        for (const w of data.workouts) {
          expect(workoutIds.has(w.id), `duplicate workout id ${w.id}`).toBe(false);
          workoutIds.add(w.id);
          expect(routineIds.has(w.routineId)).toBe(true);
          w.exercises.forEach(ex => expect(exerciseIds.has(ex.exerciseId)).toBe(true));
          // Nothing in the future, and the workout's day is the day it was started.
          expect(w.startedAt).toBeLessThanOrEqual(now.getTime());
          if (w.completedAt) expect(w.completedAt).toBeLessThanOrEqual(now.getTime());
          expect(getScheduledDate(w).toDateString()).toBe(new Date(w.startedAt).toDateString());
          // One workout per routine per day.
          const key = `${w.routineId}:${new Date(w.startedAt).toDateString()}`;
          expect(workoutDays.has(key), `two workouts for ${key}`).toBe(false);
          workoutDays.add(key);
        }
        for (const r of data.routines) {
          r.dailySchedule.forEach(d => d.exercises.forEach(ex => expect(exerciseIds.has(ex.exerciseId)).toBe(true)));
          const periods = r.schedulePeriods ?? [];
          periods.forEach((p, i) => {
            expect(p.start).toBeLessThanOrEqual(now.getTime());
            if (i < periods.length - 1) expect(p.end).toBeDefined();
          });
          expect(r.active).toBe(periods.length > 0 && periods[periods.length - 1].end === undefined);
        }
      });
    });
  }

  it('names routines and workouts like the real flows do', () => {
    const routineTemplateNames = new Set(routineTemplates.flatMap(t => [t.name, ...(t.nicknames ?? [])]));
    for (const preset of TEST_PRESETS) {
      const { routines, workouts } = preset.build(NOWS[0].getTime());
      // A template's name or nickname, or generateRandomRoutineName()'s three words.
      routines.forEach(r => expect(routineTemplateNames.has(r.name) || r.name.split(' ').length === 3, r.name).toBe(true));
      workouts.forEach(w => expect(w.nickname).toMatch(/^\S+ \S+$/)); // generateRandomName(): adjective noun
    }
  });

  it('empty has no data', () => {
    const data = build('empty', NOWS[0]);
    expect(data.routines.length + data.workouts.length + data.exercises.length).toBe(0);
  });

  it.each(NOWS)('long-streak has an unbroken six-month streak (%s)', now => {
    const { workouts, routines } = build('long-streak', now);
    const info = getStreakInfo(workouts, routines, now);
    expect(info.status).not.toBe('expired');
    expect(info.streak).toBeGreaterThan(70);
    expect(info.streak).toBe(info.best);
  });

  it.each(NOWS)('broken-streak has a best streak longer than the current one (%s)', now => {
    const { workouts, routines } = build('broken-streak', now);
    const info = getStreakInfo(workouts, routines, now);
    expect(info.status).not.toBe('expired');
    expect(info.best).toBeGreaterThan(info.streak);
    expect(info.streak).toBeGreaterThan(0);
    expect(workouts.some(w => w.exercises.some(ex => ex.skipped))).toBe(true);
  });

  it.each(NOWS)('lapsed has an expired streak (%s)', now => {
    const { workouts, routines } = build('lapsed', now);
    const info = getStreakInfo(workouts, routines, now);
    expect(info.status).toBe('expired');
    expect(info.streak).toBe(0);
    expect(info.best).toBeGreaterThan(10);
  });

  it.each(NOWS)('multiple-active has two active routines and a rest-day bonus workout (%s)', now => {
    const { workouts, routines } = build('multiple-active', now);
    expect(routines.filter(r => r.active).length).toBe(2);
    const bonus = workouts.filter(w => !routines.find(r => r.id === w.routineId)!.dailySchedule.some(d => d.day === w.day));
    expect(bonus.length).toBeGreaterThan(0);
  });

  it.each(NOWS)('routine-switches has a retired routine with two schedule periods and an unused one (%s)', now => {
    const { workouts, routines } = build('routine-switches', now);
    const retired = routines.find(r => r.id === 'r-bodyweight')!;
    expect(retired.active).toBe(false);
    expect(retired.schedulePeriods).toHaveLength(2);
    expect(workouts.some(w => w.routineId === 'r-bodyweight' && w.day === 'Wednesday')).toBe(true); // old days only
    expect(routines.find(r => r.id === 'r-unused')!.schedulePeriods).toEqual([]);
    expect(routines.filter(r => r.active).map(r => r.id)).toEqual(['r-strength']);
  });

  it('ai-history has one pending suggestion and decided ones of every kind', () => {
    const { routines } = build('ai-history', NOWS[0]);
    const r = routines[0];
    expect(r.changes!.map(c => c.status).sort()).toEqual(['accepted', 'partial', 'pending', 'rejected', 'rejected']);
    expect(getPendingProposals(r)).toBeTruthy();
    expect(r.chatHistory.some(m => m.pendingChangeId === 'chg-5')).toBe(true);
    expect(r.revisions!.some(rev => rev.source === 'manual')).toBe(true);
  });

  it.each(NOWS)("mid-workout has today's workout in progress (%s)", now => {
    const { workouts } = build('mid-workout', now);
    const open = workouts.filter(w => !w.completedAt);
    expect(open).toHaveLength(1);
    expect(open[0].exercises.filter(ex => ex.completedSets === ex.sets)).toHaveLength(2);
  });
});

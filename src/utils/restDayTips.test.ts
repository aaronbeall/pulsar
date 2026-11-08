import { describe, it, expect } from 'vitest';
import { getRestDayTips, matchTipThemes, GENERIC_TIPS, TIP_THEMES } from './restDayTips';

const themeIds = (texts: string[]) => matchTipThemes(texts).map(t => t.id);

describe('matchTipThemes', () => {
  it('finds leg work from exercise names', () => {
    expect(themeIds(['Barbell Back Squat', 'Walking Lunges'])).toContain('legs');
  });

  it('finds cardio from running words', () => {
    expect(themeIds(['Easy Run', 'Treadmill Sprints'])).toEqual(['running']);
  });

  it('orders themes by how many exercises match', () => {
    const ids = themeIds(['Squat', 'Lunges', 'Calf Raises', 'Push-Ups']);
    expect(ids[0]).toBe('legs');
    expect(ids).toContain('push');
  });

  it('matches whole words only', () => {
    expect(themeIds(['Medicine Ball Throw'])).not.toContain('pull'); // "row" inside "throw"
    expect(themeIds(['Running'])).not.toContain('push');
  });

  it('matches target muscles too', () => {
    expect(themeIds(['Mystery Move quadriceps, glutes'])).toEqual(['legs']);
  });

  it('returns nothing for no exercises', () => {
    expect(themeIds([])).toEqual([]);
  });
});

describe('getRestDayTips', () => {
  it('gives only generic tips when nothing matches', () => {
    const tips = getRestDayTips([], 'Mon Nov 02 2026');
    expect(tips).toHaveLength(5);
    expect(tips.every(t => !t.reason)).toBe(true);
    const genericIds = new Set(GENERIC_TIPS.map(t => t.id));
    expect(tips.every(t => genericIds.has(t.id))).toBe(true);
  });

  it('leads with routine tips, one per matched theme, with a reason', () => {
    const tips = getRestDayTips(['Squat', 'Lunges', '5k Run'], 'seed');
    expect(tips).toHaveLength(5);
    const legTipIds = TIP_THEMES.find(t => t.id === 'legs')!.tips.map(t => t.id);
    expect(legTipIds).toContain(tips[0].id);
    expect(tips[0].reason).toMatch(/legs/);
    expect(tips[1].reason).toMatch(/cardio/);
    expect(tips.slice(2).every(t => !t.reason)).toBe(true);
  });

  it('caps the routine tips', () => {
    const tips = getRestDayTips(['Squat', 'Run', 'Push-Up', 'Pull-Up', 'Plank'], 'seed', { total: 4, routineCount: 2 });
    expect(tips).toHaveLength(4);
    expect(tips.filter(t => t.reason)).toHaveLength(2);
  });

  it('is stable for a seed and has no duplicates', () => {
    const a = getRestDayTips(['Squat'], 'day-1');
    expect(getRestDayTips(['Squat'], 'day-1')).toEqual(a);
    expect(new Set(a.map(t => t.id)).size).toBe(a.length);
  });
});

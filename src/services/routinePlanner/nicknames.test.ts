import { describe, it, expect } from 'vitest';
import { planNicknames } from './nicknames';
import { parseAnswers } from './parseAnswers';
import { planRoutine } from './planRoutine';
import { applyLearned } from './learned';
import { emptyPreferences } from '../../utils/learnedPreferences';

const namesFor = (answers: string[], seed = 0) => {
  const profile = parseAnswers(answers);
  return planNicknames(planRoutine(profile), profile, seed);
};

describe('planNicknames', () => {
  it('gives five different names, none the plain plan name', () => {
    const profile = parseAnswers(['get stronger', 'dumbbells', '3 days', '']);
    const plan = planRoutine(profile);
    const names = planNicknames(plan, profile);
    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
    expect(names).not.toContain(plan.name);
  });

  it('leads with what is most specific about the plan', () => {
    expect(['Bump & Pump', 'Baby on Board', 'Growing Strong']).toContain(namesFor(['stay fit', 'nothing', '3 days', "I'm pregnant"])[0]);
    const bodyweight = namesFor(['get stronger', 'no equipment', '3 days', '']);
    expect(bodyweight.some(n => ['Gravity Is My Gym', 'Living Room Legend', 'Carpet Crusher', 'No Gym, No Problem'].includes(n))).toBe(true);
    const glutes = namesFor(['build my glutes', 'full gym', '4 days', '']);
    expect(['Cheeky Business', 'Glute Expectations', 'Back That Up']).toContain(glutes[0]);
  });

  it('names the weekend, short sessions and the day count', () => {
    const names = namesFor(['lose weight', 'nothing', 'saturday and sunday, 20 minutes', ''], 3);
    expect(names.some(n => ['Weekend Warrior', 'Sunday Funday'].includes(n))).toBe(true);
    expect(names.some(n => ['Lunch Break Legend', 'Express Lane', 'Snack-Size Sweat'].includes(n))).toBe(true);
  });

  it('celebrates a liked exercise the plan includes', () => {
    const profile = applyLearned(parseAnswers(['get stronger', 'dumbbells', '3 days', '']), { ...emptyPreferences(), likedExercises: ['Goblet Squat'] });
    const plan = planRoutine(profile);
    expect(plan.days.some(d => d.exercises.some(e => e.name === 'Goblet Squat'))).toBe(true);
    expect(planNicknames(plan, profile)[0]).toBe('Goblet Squat Fan Club');
  });

  it('picks other names with another seed, and the same ones with the same seed', () => {
    const answers = ['build muscle', 'full gym', '4 days', ''];
    expect(namesFor(answers, 1)).toEqual(namesFor(answers, 1));
    const all = new Set([0, 1, 2, 3, 4, 5].flatMap(s => namesFor(answers, s)));
    expect(all.size).toBeGreaterThan(5);
  });
});

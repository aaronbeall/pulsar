import { describe, it, expect } from 'vitest';
import { parseAnswers, extractDaysPerWeek, extractMinutes, normalize } from './parseAnswers';
import { primaryGoal } from './profile';

/** Answers in wizard order: goals, equipment, schedule, anything else. */
const parse = (goals = '', equipment = '', schedule = '', other = '') => parseAnswers([goals, equipment, schedule, other]);

describe('normalize', () => {
  it('expands contractions and day shorthands', () => {
    expect(normalize("I can't do M/W/F")).toBe('i can not do monday wednesday friday');
    expect(normalize('Mon-Fri')).toBe('monday and tuesday and wednesday and thursday and friday');
  });

  it('does not read "work out" as a job or "get back into it" as a back', () => {
    expect(normalize('I want to work out')).toBe('i want to train');
    expect(normalize('getting back into it')).toBe('returning it');
  });
});

describe('days a week and minutes', () => {
  it.each([
    ['3 days a week', 3],
    ['3x a week', 3],
    ['3x/week', 3],
    ['three times a week', 3],
    ['3-4 days', 3],
    ['4 or 5 times per week', 4],
    ['twice a week', 2],
    ['a couple days a week', 2],
    ['daily', 7],
    ['every day', 7],
    ['every other day', 4],
    ['45 min 3x a week', 3],
  ])('%s → %i', (text, days) => {
    expect(extractDaysPerWeek(normalize(text))).toBe(days);
  });

  it('ignores counts that are not a weekly schedule', () => {
    expect(extractDaysPerWeek(normalize('30 days'))).toBeUndefined();
    expect(extractDaysPerWeek(normalize('30 min'))).toBeUndefined();
  });

  it.each([
    ['30 min daily', 30],
    ['45 minutes', 45],
    ['20-30 mins', 25],
    ['an hour', 60],
    ['half an hour', 30],
    ['1.5 hours', 90],
    ['an hour and a half', 90],
  ])('%s → %i minutes', (text, minutes) => {
    expect(extractMinutes(normalize(text))).toBe(minutes);
  });
});

describe('weekdays and negation', () => {
  it('reads named days as the days to train', () => {
    const p = parse('', '', 'Monday, Wednesday and Friday');
    expect(p.preferredDays).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(p.daysPerWeek).toBe(3);
  });

  it('rules out a negated day instead of choosing it', () => {
    const p = parse('', '', '3 days a week, not Thursday');
    expect(p.blockedDays).toEqual(['Thursday']);
    expect(p.preferredDays).toEqual([]);
    expect(p.daysPerWeek).toBe(3);
  });

  it('handles "any day but" and "except"', () => {
    expect(parse('', '', 'any day but thursday').blockedDays).toEqual(['Thursday']);
    expect(parse('', '', 'every day except Sunday').blockedDays).toEqual(['Sunday']);
  });

  it('carries a negation along a list', () => {
    expect(parse('', '', 'no mondays, tuesdays or fridays').blockedDays).toEqual(['Monday', 'Tuesday', 'Friday']);
  });

  it('ends a negation at "but"', () => {
    const p = parse('', '', 'not weekends but weekdays are fine');
    expect(p.blockedDays).toEqual(['Saturday', 'Sunday']);
    expect(p.preferredDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  });

  it('reads a negation that comes after the day', () => {
    expect(parse('', '', "Thursdays don't work for me").blockedDays).toEqual(['Thursday']);
  });

  it('reads busy days as ruled out', () => {
    expect(parse('', '', 'I work Saturdays').blockedDays).toEqual(['Saturday']);
    expect(parse('', '', "I'm busy on tuesdays").blockedDays).toEqual(['Tuesday']);
  });

  it('keeps a positive day after a negated one', () => {
    const p = parse('', '', 'Monday, not Thursday');
    expect(p.preferredDays).toEqual(['Monday']);
    expect(p.blockedDays).toEqual(['Thursday']);
  });

  it('expands ranges and weekends', () => {
    expect(parse('', '', 'mon-fri').preferredDays).toHaveLength(5);
    expect(parse('', '', 'weekends only').preferredDays).toEqual(['Saturday', 'Sunday']);
  });
});

describe('goals', () => {
  it.each([
    ['lose weight', 'fatLoss'],
    ['get stronger', 'strength'],
    ['build muscle', 'muscle'],
    ['be healthier', 'general'],
    ['run a 5k', 'endurance'],
    ['be more flexible', 'mobility'],
    ['jump higher for basketball', 'athletic'],
    ['arms and upper body', 'general'],
  ])('%s → %s', (text, goal) => {
    expect(primaryGoal(parse(text))).toBe(goal);
  });

  it('weighs mixed goals', () => {
    const p = parse('lose weight and get a bit stronger');
    expect(p.goals.fatLoss).toBeGreaterThan(0);
    expect(p.goals.strength).toBeGreaterThan(0);
  });

  it('drops a negated goal', () => {
    const p = parse("tone up but I don't want to get bulky");
    expect(p.goals.muscle).toBeUndefined();
    expect(p.goals.fatLoss).toBeGreaterThan(0);
  });

  it('reads body areas as focus', () => {
    expect(parse('arms and upper body').focus).toEqual(['arms', 'upper']);
    expect(parse('bigger glutes and abs').focus).toEqual(['glutes', 'core']);
  });

  it('reads a skipped area', () => {
    expect(parse('', '', '', 'I hate leg day').skipFocus).toEqual(['legs']);
  });
});

describe('equipment', () => {
  it.each([
    ['dumbbells, bands', ['dumbbell', 'band']],
    ['nothing', []],
    ['no equipment', []],
    ['bodyweight only', []],
    ['a pull-up bar and some kettlebells', ['kettlebell', 'pullupBar']],
    ['dumbbells and a bench, nothing else', ['dumbbell', 'bench']],
    ['treadmill', ['treadmill']],
  ])('%s', (text, equipment) => {
    const p = parse('', text);
    expect(p.equipment).toEqual(equipment);
    expect(p.equipmentAssumed).toBe(false);
  });

  it('reads a gym, or "whatever I need", as everything', () => {
    expect(parse('', 'full gym').equipment).toContain('barbell');
    expect(parse('', 'whatever I need').equipment).toContain('machine');
    expect(parse('', 'anything').equipment).toContain('cable');
  });

  it('removes negated equipment', () => {
    const p = parse('', "gym, but I don't like machines");
    expect(p.equipment).toContain('barbell');
    expect(p.equipment).not.toContain('machine');
  });

  it('marks equipment as assumed when nothing was said', () => {
    expect(parse('get stronger').equipmentAssumed).toBe(true);
  });

  it('only reads "nothing" as equipment in the equipment answer', () => {
    expect(parse('', 'dumbbells', '', 'nothing').equipment).toEqual(['dumbbell']);
  });
});

describe('limits, dislikes and conditions', () => {
  it('turns an injured body part into a limit, not a focus', () => {
    const p = parse('', '', '', 'I have bad knees');
    expect(p.limits).toEqual(['knee']);
    expect(p.focus).toEqual([]);
  });

  it.each([
    ['my lower back hurts', 'back'],
    ['torn ACL last year', 'knee'],
    ['shoulder surgery in 2022', 'shoulder'],
    ['sciatica', 'back'],
    ['carpal tunnel', 'wrist'],
    ['sprained ankle', 'ankle'],
  ])('%s → %s', (text, limit) => {
    expect(parse('', '', '', text).limits).toEqual([limit]);
  });

  it('reads several injuries in a list next to a dislike', () => {
    const p = parse('', '', '', 'bad shoulder, bad wrists, bad knees, hate floor work');
    expect(p.limits).toEqual(['shoulder', 'wrist', 'knee']);
    expect(p.avoid).toEqual(['floor']);
  });

  it('ignores "no injuries"', () => {
    const p = parse('', '', '', 'no injuries, I am healthy');
    expect(p.limits).toEqual([]);
  });

  it('reads dislikes', () => {
    expect(parse('', '', '', 'I hate running').avoid).toEqual(['running']);
    expect(parse('', '', '', 'no running, jumping or burpees').avoid).toEqual(['running', 'jumping', 'burpees']);
    expect(parse('', '', '', 'burpees are the worst').avoid).toEqual(['burpees']);
    expect(parse('', '', '', 'not a fan of cardio').avoid).toEqual(['cardio']);
  });

  it('reads likes', () => {
    const p = parse('', '', '', 'I love swimming but hate running');
    expect(p.likes).toEqual(['swimming']);
    expect(p.avoid).toEqual(['running']);
    expect(p.equipment).toContain('pool');
  });

  it("does not flip a dislike with \"don't mind\"", () => {
    expect(parse('', '', '', "I don't mind running").likes).toEqual(['running']);
  });

  it('reads an exercise that hurts as one to avoid', () => {
    expect(parse('', '', '', 'squats hurt my knees')).toMatchObject({ avoid: ['squats'], limits: ['knee'] });
  });

  it.each([
    ['I have asthma', 'asthma'],
    ["I'm overweight", 'overweight'],
    ["I'm pregnant", 'pregnant'],
    ["I'm 67", 'senior'],
    ['I weigh 300 lbs', 'overweight'],
    ['high blood pressure', 'heart'],
  ])('%s → %s', (text, condition) => {
    expect(parse('', '', '', text).conditions).toEqual([condition]);
  });

  it('reads experience', () => {
    expect(parse('', '', '', "I'm a beginner").level).toBe('beginner');
    expect(parse('', '', '', "I've never really worked out").level).toBe('beginner');
    expect(parse('', '', '', '5 years of lifting').level).toBe('advanced');
    expect(parse('', '', '', "I'm not a beginner").level).toBe('intermediate');
  });
});

describe('the wizard placeholders', () => {
  it('reads the example answers', () => {
    const p = parse('lose weight, get stronger', 'dumbbells, bands, treadmill', '45 min 3x a week', "I have asthma and I hate running");
    expect(p).toMatchObject({
      daysPerWeek: 3,
      minutes: 45,
      equipment: ['dumbbell', 'band', 'treadmill'],
      conditions: ['asthma'],
      avoid: ['running'],
    });
    expect(primaryGoal(p)).toBe('fatLoss');
  });
});

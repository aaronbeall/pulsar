import { describe, it, expect } from 'vitest';
import { planRoutine, chooseSessions } from './planRoutine';
import { parseAnswers } from './parseAnswers';
import { exerciseCatalog } from './exerciseCatalog';
import { ALL_EQUIPMENT, Profile, emptyProfile } from './profile';

const profile = (p: Partial<Profile>): Profile => ({ ...emptyProfile(), ...p });
const catalog = new Map(exerciseCatalog.map(e => [e.name, e]));
const allExercises = (plan: ReturnType<typeof planRoutine>) => plan.days.flatMap(d => d.exercises.map(e => catalog.get(e.name)!));
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

describe('exercise catalog', () => {
  it('has unique names and known equipment', () => {
    expect(new Set(exerciseCatalog.map(e => e.name)).size).toBe(exerciseCatalog.length);
    for (const ex of exerciseCatalog) {
      expect(ex.slots.length, ex.name).toBeGreaterThan(0);
      for (const alt of ex.equipment) for (const e of alt) expect(ALL_EQUIPMENT, ex.name).toContain(e);
    }
  });
});

describe('planRoutine schedule', () => {
  it('trains the number of days asked for, avoiding blocked days', () => {
    const plan = planRoutine(profile({ daysPerWeek: 4, blockedDays: ['Thursday'] }));
    expect(plan.days).toHaveLength(4);
    expect(plan.days.map(d => d.day)).not.toContain('Thursday');
  });

  it('uses the named days', () => {
    const plan = planRoutine(profile({ daysPerWeek: 3, preferredDays: ['Tuesday', 'Thursday', 'Saturday'] }));
    expect(plan.days.map(d => d.day)).toEqual(['Tuesday', 'Thursday', 'Saturday']);
  });

  it('spreads 3 days out with rest between', () => {
    const days = planRoutine(profile({ daysPerWeek: 3 })).days.map(d => WEEK.indexOf(d.day));
    for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1]).toBeGreaterThan(1);
  });

  it('keeps an upper/lower split from repeating a session on back-to-back days', () => {
    const plan = planRoutine(profile({ daysPerWeek: 4, goals: { muscle: 1 }, equipment: ALL_EQUIPMENT }));
    const byDay = new Map(plan.days.map(d => [WEEK.indexOf(d.day), d.kind.replace(/ [A-Z]$/, '')]));
    for (const [i, kind] of byDay) expect(byDay.get((i + 1) % 7)).not.toBe(kind);
  });

  it('fits sessions to the goal', () => {
    expect(chooseSessions(profile({ goals: { fatLoss: 1 } }), 3)).toEqual(['full', 'conditioning', 'full']);
    expect(chooseSessions(profile({ goals: { endurance: 1 } }), 3)).toEqual(['cardio', 'full', 'cardio']);
    expect(chooseSessions(profile({ goals: { strength: 1 } }), 4)).toEqual(['upper', 'lower', 'upper', 'lower']);
  });

  it('drops cardio days for someone who hates cardio', () => {
    expect(chooseSessions(profile({ goals: { fatLoss: 1 }, avoid: ['cardio'] }), 4)).not.toContain('conditioning');
  });

  it('drops leg days for someone skipping legs', () => {
    expect(chooseSessions(profile({ goals: { muscle: 1 }, skipFocus: ['legs'] }), 4)).toEqual(['upper', 'upper', 'upper', 'upper']);
  });
});

describe('planRoutine exercises', () => {
  it('uses only bodyweight exercises with no equipment', () => {
    for (const ex of allExercises(planRoutine(profile({ daysPerWeek: 5, goals: { strength: 1 } })))) {
      expect(ex.equipment.some(alt => alt.length === 0), ex.name).toBe(true);
    }
  });

  it('uses the equipment there is', () => {
    const names = allExercises(planRoutine(profile({ equipment: ['dumbbell', 'bench'], goals: { muscle: 1 } }))).map(e => e.name);
    expect(names.some(n => /Dumbbell|Goblet|Curl/.test(n))).toBe(true);
  });

  it('leaves out exercises that load an injured knee', () => {
    const exercises = allExercises(planRoutine(profile({ daysPerWeek: 4, limits: ['knee'], equipment: ALL_EQUIPMENT })));
    expect(exercises.length).toBeGreaterThan(10);
    for (const ex of exercises) expect(ex.limits, ex.name).not.toContain('knee');
  });

  it('leaves out disliked activities', () => {
    const exercises = allExercises(planRoutine(profile({ daysPerWeek: 5, goals: { endurance: 1 }, avoid: ['running', 'burpees'] })));
    for (const ex of exercises) {
      expect(ex.tags, ex.name).not.toContain('running');
      expect(ex.tags, ex.name).not.toContain('burpees');
    }
  });

  it('keeps pregnancy-safe', () => {
    const exercises = allExercises(planRoutine(profile({ daysPerWeek: 4, goals: { fatLoss: 1 }, conditions: ['pregnant'], equipment: ['dumbbell'] })));
    for (const ex of exercises) {
      for (const tag of ['supine', 'prone', 'impact', 'heavy', 'crunches']) expect(ex.tags, ex.name).not.toContain(tag);
    }
  });

  it('includes liked activities', () => {
    const plan = planRoutine(profile({ goals: { endurance: 1 }, likes: ['swimming'], equipment: ['pool'] }));
    expect(allExercises(plan).map(e => e.name)).toContain('Swimming');
  });

  it('adds work for focus areas', () => {
    const names = allExercises(planRoutine(profile({ focus: ['arms'], equipment: ['dumbbell'] }))).map(e => e.name);
    expect(names.some(n => /Curl|Tricep/.test(n))).toBe(true);
  });

  it('fits more exercises into longer sessions', () => {
    const short = planRoutine(profile({ minutes: 30, equipment: ALL_EQUIPMENT })).days[0].exercises.length;
    const long = planRoutine(profile({ minutes: 75, equipment: ALL_EQUIPMENT })).days[0].exercises.length;
    expect(long).toBeGreaterThan(short);
  });

  it('uses low reps for strength and higher reps otherwise', () => {
    const strength = planRoutine(profile({ goals: { strength: 1 }, equipment: ['barbell', 'bench'], level: 'advanced' }));
    expect(strength.days[0].exercises[0].reps).toBe(5);
    const general = planRoutine(profile({ equipment: ['dumbbell'] }));
    expect(general.days[0].exercises[0].reps).toBeGreaterThanOrEqual(10);
  });
});

describe('planRoutine variations', () => {
  const p = parseAnswers(['lose weight', 'dumbbells', '4 days a week', '']);

  it('builds the same week for the same seed', () => {
    expect(planRoutine(p, 3)).toEqual(planRoutine(p, 3));
  });

  it('builds a different week for another seed', () => {
    const names = (seed: number) => planRoutine(p, seed).days.flatMap(d => d.exercises.map(e => e.name)).join();
    expect(new Set([0, 1, 2, 3].map(names)).size).toBeGreaterThan(1);
  });

  it('names and describes the plan', () => {
    const plan = planRoutine(p);
    expect(plan.name).toBe('4-Day Fat Burn');
    expect(plan.description).toContain('4 days a week');
    expect(plan.notes[0]).toMatch(/minutes each/);
  });
});

describe('planRoutine on any answers', () => {
  const answers = [
    ['', '', '', ''],
    ['get huge', 'gym', 'daily, 90 min', ''],
    ['be healthier', 'nothing', '1 day', "I'm 72 and have arthritis"],
    ['lose weight', 'no equipment', 'weekends only', "I'm pregnant"],
    ['abs', 'bands', 'any day but monday or friday', 'bad shoulder, bad wrists, bad knees, hate floor work'],
    ['strength', 'pull-up bar', '6x a week', 'asthma'],
  ];
  it.each(answers)('%s / %s / %s / %s builds a usable week', (...a) => {
    const plan = planRoutine(parseAnswers(a));
    expect(plan.days.length).toBeGreaterThan(0);
    for (const day of plan.days) {
      expect(day.exercises.length, day.kind).toBeGreaterThanOrEqual(2);
      for (const ex of day.exercises) expect(ex.reps ?? ex.duration, ex.name).toBeGreaterThan(0);
    }
  });
});

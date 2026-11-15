import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exerciseTemplates } from '../exerciseTemplates';
import { FREE_EXERCISE_DB_ALIASES } from '../freeExerciseDb';
import { normalizeExerciseName } from '../routineBuilderService';
import { exerciseCatalog } from './exerciseCatalog';

describe('exerciseCatalog', () => {
  it('has unique names', () => {
    const names = exerciseCatalog.map(e => normalizeExerciseName(e.name));
    expect(names.length).toBe(new Set(names).size);
  });

  it('names exercises the app already knows, so they get a description and photo', () => {
    const db = JSON.parse(readFileSync('public/free-exercise-db.json', 'utf8')) as { name: string }[];
    const known = new Set([...exerciseTemplates, ...db].map(e => normalizeExerciseName(e.name)));
    expect(exerciseCatalog.map(e => e.name).filter(n => !known.has(normalizeExerciseName(n)))).toEqual([]);
  });

  it('parses every row', () => {
    for (const e of exerciseCatalog) {
      expect(e.slots.length, e.name).toBeGreaterThan(0);
      expect([1, 2, 3], e.name).toContain(e.level);
      expect(e.priority, e.name).toBeGreaterThanOrEqual(1);
      expect(e.priority, e.name).toBeLessThanOrEqual(3);
    }
  });
});

describe('FREE_EXERCISE_DB_ALIASES', () => {
  const db = JSON.parse(readFileSync('public/free-exercise-db.json', 'utf8')) as { name: string }[];
  const dbNames = new Set(db.map(e => normalizeExerciseName(e.name)));
  const curated = new Set([...exerciseTemplates, ...exerciseCatalog].map(e => normalizeExerciseName(e.name)));

  it('maps curated names that free-exercise-db lacks to entries it has', () => {
    for (const [from, to] of Object.entries(FREE_EXERCISE_DB_ALIASES)) {
      expect(curated.has(normalizeExerciseName(from)), from).toBe(true);
      expect(dbNames.has(normalizeExerciseName(from)), `${from} already matches`).toBe(false);
      expect(dbNames.has(normalizeExerciseName(to)), to).toBe(true);
    }
  });
});


describe('catalog poses match resolved exercise instructions', () => {
  // These cases are checked against the actual descriptions, not inferred from catalog tags.
  const poses = [
    ['Leg Curl', 'prone', /lie face down/i],
    ['Rear Delt Fly', 'prone', /chest and stomach pressing against/i],
    ['Incline Dumbbell Press', 'supine', /lie back/i],
    ['Incline Bench Press', 'supine', /lie back/i],
    ['Decline Bench Press', 'supine', /lay down on the bench/i],
    ['Incline Dumbbell Flyes', 'supine', /lie on an incline bench/i],
    ['Hamstring Stretch', 'supine', /lie on your back/i],
    ['Oblique Crunches', 'supine', /lower back pressed/i],
    ['Air Bike', 'supine', /lower back pressed/i],
    ['Flutter Kick', 'prone', /lie facedown/i],
  ] as const;
  const db = JSON.parse(readFileSync('public/free-exercise-db.json', 'utf8')) as { name: string; description: string }[];
  it.each(poses)('%s is tagged %s', (name, pose, description) => {
    const resolved = FREE_EXERCISE_DB_ALIASES[name] ?? name;
    const entry = db.find(e => normalizeExerciseName(e.name) === normalizeExerciseName(resolved));
    expect(entry?.description).toMatch(description);
    expect(exerciseCatalog.find(e => e.name === name)?.tags).toContain(pose);
  });
});

import { describe, expect, it } from 'vitest';
import { inferWeighted, isWeightedExercise } from './weightedExercise';

describe('inferWeighted', () => {
  it('uses the curated catalog: lifts track weight, bodyweight moves do not', () => {
    expect(inferWeighted({ name: 'Bench Press' })).toBe(true);
    expect(inferWeighted({ name: 'bicep curls' })).toBe(true);
    expect(inferWeighted({ name: 'Push-up' })).toBe(false);
    expect(inferWeighted({ name: 'Chin-up' })).toBe(false);
  });

  it('never tracks timed exercises by default', () => {
    expect(inferWeighted({ name: "Farmer's Walk", timed: true })).toBe(false);
  });

  it('uses free-exercise-db equipment when given', () => {
    expect(inferWeighted({ name: 'Barbell Hack Squat', equipment: 'barbell' })).toBe(true);
    expect(inferWeighted({ name: 'Kettlebell Swing Thing', equipment: 'kettlebells' })).toBe(true);
    expect(inferWeighted({ name: 'Mystery Move', equipment: 'body only' })).toBe(false);
  });

  it('falls back to words in the name', () => {
    expect(inferWeighted({ name: 'Incline Dumbbell Curl' })).toBe(true);
    expect(inferWeighted({ name: 'Back Squat' })).toBe(true);
    expect(inferWeighted({ name: 'Single-arm Cable Row' })).toBe(true);
    expect(inferWeighted({ name: 'Weighted Pull-up' })).toBe(true);
    expect(inferWeighted({ name: 'Wide Pull-up' })).toBe(false);
    expect(inferWeighted({ name: 'Bodyweight Squat' })).toBe(false);
    expect(inferWeighted({ name: 'Bear Crawl' })).toBe(false);
  });
});

describe('isWeightedExercise', () => {
  it("lets the person's switch win either way", () => {
    expect(isWeightedExercise({ name: 'Pull-up', weighted: true })).toBe(true);
    expect(isWeightedExercise({ name: 'Bench Press', weighted: false })).toBe(false);
    expect(isWeightedExercise({ name: 'Bench Press' })).toBe(true);
    expect(isWeightedExercise(undefined)).toBe(false);
  });
});

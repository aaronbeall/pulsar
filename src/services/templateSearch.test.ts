import { describe, it, expect } from 'vitest';
import { rankTemplates, scoreTemplate, tokenize } from './templateSearch';
import { routineTemplates } from './routineTemplates';

const top = (input: string, n = 3) => rankTemplates(routineTemplates, input).slice(0, n).map(r => r.template.name);

describe('tokenize', () => {
  it('drops stopwords, short words and numbers, and singularizes', () => {
    expect(tokenize('I want to build 3 Dumbbells!')).toEqual(['build', 'dumbbell']);
  });

  it('maps everyday phrasings onto template vocabulary', () => {
    expect(tokenize('lose some weight')).toEqual(['fat', 'loss', 'burn']);
    expect(tokenize('get stronger')).toEqual(['strength']);
  });

  it('keeps double-s words intact', () => {
    expect(tokenize('fitness')).toEqual(['fitness']);
  });

  it('returns nothing for filler-only input', () => {
    expect(tokenize('I just want to do whatever')).toEqual([]);
  });
});

describe('rankTemplates', () => {
  it('matches equipment answers to the equipment-specific template', () => {
    expect(top('get stronger dumbbells only 3 days a week')[0]).toBe('Dumbbell Only');
    expect(top('no equipment, at home, bodyweight')[0]).toBe('Bodyweight Only');
  });

  it('matches goal answers', () => {
    expect(top('lose weight, fat loss, HIIT')).toContain('Fat Loss HIIT');
    expect(top('lose weight, treadmill')[0]).toBe('Fat Loss HIIT');
    expect(top('run a marathon')[0]).toBe('Endurance Athlete');
    expect(top('flexibility and core, bad back')).toContain('Core & Mobility');
  });

  it('is not swayed by filler words that appear in every template', () => {
    const filler = rankTemplates(routineTemplates, 'I want to do a workout and be the best');
    expect(filler.every(r => r.score === 0)).toBe(true);
  });

  it('returns every template, best first, with a stable order for ties', () => {
    const ranked = rankTemplates(routineTemplates, '');
    expect(ranked).toHaveLength(routineTemplates.length);
    const names = ranked.map(r => r.template.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gives partial credit for related word forms', () => {
    const t = routineTemplates.find(t => t.name === 'Strength Builder')!;
    expect(scoreTemplate(t, tokenize('strengthening'))).toBeGreaterThan(0);
  });
});

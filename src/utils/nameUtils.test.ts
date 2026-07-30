import { describe, it, expect } from 'vitest';
import { generateRandomName } from './nameUtils';

describe('generateRandomName', () => {
  it('returns two capitalized words separated by a space', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateRandomName();
      expect(name).toMatch(/^[A-Z][a-zA-Z]* [A-Z][a-zA-Z]*$/);
    }
  });

  it('produces some variety across repeated calls', () => {
    const names = new Set(Array.from({ length: 30 }, () => generateRandomName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

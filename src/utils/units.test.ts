import { describe, expect, it } from 'vitest';
import { defaultWeightUnit, displayWeight, formatWeight, stepWeightKg, toKg, fromKg } from './units';

describe('units', () => {
  it('defaults to lb in the US and kg elsewhere', () => {
    expect(defaultWeightUnit('en-US')).toBe('lb');
    expect(defaultWeightUnit('en-GB')).toBe('kg');
    expect(defaultWeightUnit('de')).toBe('kg');
    expect(defaultWeightUnit(undefined)).toBe('kg');
  });

  it('round-trips pounds through kg exactly as entered', () => {
    for (const lb of [2.5, 45, 135, 137.5, 315]) {
      expect(displayWeight(toKg(lb, 'lb'), 'lb')).toBe(lb);
    }
    expect(formatWeight(toKg(135, 'lb'), 'lb')).toBe('135 lb');
    expect(formatWeight(toKg(135, 'lb'), 'kg')).toBe('61 kg');
    expect(formatWeight(62.5, 'kg', false)).toBe('62.5');
    expect(fromKg(10, 'kg')).toBe(10);
  });

  it('steps by 5 lb or 2.5 kg, snapping odd weights to the step', () => {
    expect(displayWeight(stepWeightKg(toKg(135, 'lb'), 'lb', 1), 'lb')).toBe(140);
    expect(displayWeight(stepWeightKg(toKg(135, 'lb'), 'lb', -1), 'lb')).toBe(130);
    expect(displayWeight(stepWeightKg(toKg(137.5, 'lb'), 'lb', 1), 'lb')).toBe(140);
    expect(displayWeight(stepWeightKg(toKg(137.5, 'lb'), 'lb', -1), 'lb')).toBe(135);
    expect(stepWeightKg(60, 'kg', 1)).toBe(62.5);
    expect(stepWeightKg(2, 'kg', -1)).toBe(0);
  });
});

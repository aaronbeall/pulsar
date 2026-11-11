import { describe, expect, it } from 'vitest';
import { stageLabel } from './stage';

describe('stageLabel', () => {
  it('is empty in production and local builds', () => {
    expect(stageLabel(undefined, undefined)).toBeNull();
    expect(stageLabel('', '')).toBeNull();
  });

  it('names staging and PR previews', () => {
    expect(stageLabel('staging', undefined)).toBe('Staging');
    expect(stageLabel(undefined, '42')).toBe('PR #42');
  });
});

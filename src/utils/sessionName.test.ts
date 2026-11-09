import { describe, it, expect } from 'vitest';
import { formatSessionName } from './sessionName';

describe('formatSessionName', () => {
  it('wraps the name in curly quotes', () => {
    expect(formatSessionName('Mighty Tiger')).toBe('“Mighty Tiger”');
  });
  it('trims, and leaves an empty name empty', () => {
    expect(formatSessionName('  Iron Wolf ')).toBe('“Iron Wolf”');
    expect(formatSessionName('   ')).toBe('');
  });
});

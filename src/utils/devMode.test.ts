import { describe, expect, it } from 'vitest';
import { parseDevParam, stripDevParam } from './devMode';

describe('parseDevParam', () => {
  it('turns dev mode on', () => {
    expect(parseDevParam('?dev')).toBe(true);
    expect(parseDevParam('?dev=1')).toBe(true);
    expect(parseDevParam('?dev=true')).toBe(true);
    expect(parseDevParam('?a=b&dev=ON')).toBe(true);
  });

  it('turns dev mode off', () => {
    expect(parseDevParam('?dev=0')).toBe(false);
    expect(parseDevParam('?dev=false')).toBe(false);
    expect(parseDevParam('?dev=off')).toBe(false);
  });

  it('leaves the setting alone when the param is absent or unknown', () => {
    expect(parseDevParam('')).toBeNull();
    expect(parseDevParam('?activity=1')).toBeNull();
    expect(parseDevParam('?dev=maybe')).toBeNull();
  });
});

describe('stripDevParam', () => {
  it('removes only the dev param', () => {
    expect(stripDevParam('?dev=1')).toBe('');
    expect(stripDevParam('?routineId=abc&dev=1&day=monday')).toBe('?routineId=abc&day=monday');
    expect(stripDevParam('?activity=1')).toBe('?activity=1');
  });
});

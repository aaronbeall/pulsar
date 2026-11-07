import { describe, it, expect } from 'vitest';
import { extractPartialJsonString, SSEParser } from './streaming';

describe('extractPartialJsonString', () => {
  it('returns null until the value has started', () => {
    expect(extractPartialJsonString('', 'commentary')).toBeNull();
    expect(extractPartialJsonString('{"comm', 'commentary')).toBeNull();
    expect(extractPartialJsonString('{"commentary": ', 'commentary')).toBeNull();
  });

  it('reads a value that is still being written', () => {
    expect(extractPartialJsonString('{"commentary": "Swapping Wedn', 'commentary')).toEqual({ text: 'Swapping Wedn', done: false });
  });

  it('marks the value done at the closing quote and ignores what follows', () => {
    const json = '{"commentary": "Done.", "patch": {"dailySchedule": [';
    expect(extractPartialJsonString(json, 'commentary')).toEqual({ text: 'Done.', done: true });
  });

  it('decodes escapes, holding back one that is cut off', () => {
    expect(extractPartialJsonString('{"commentary":"Say \\"hi\\"\\nok', 'commentary')?.text).toBe('Say "hi"\nok');
    expect(extractPartialJsonString('{"commentary":"caf\\u00e9', 'commentary')?.text).toBe('café');
    expect(extractPartialJsonString('{"commentary":"caf\\u00', 'commentary')?.text).toBe('caf');
    expect(extractPartialJsonString('{"commentary":"a\\', 'commentary')?.text).toBe('a');
  });

  it('finds the field after earlier fields', () => {
    const json = '{"name":"Iron Week","description":"Lift","commentary":"Three days';
    expect(extractPartialJsonString(json, 'commentary')).toEqual({ text: 'Three days', done: false });
    expect(extractPartialJsonString(json, 'name')).toEqual({ text: 'Iron Week', done: true });
  });
});

describe('SSEParser', () => {
  it('returns data payloads, keeping a line split across chunks for the next push', () => {
    const parser = new SSEParser();
    expect(parser.push('data: {"a":1}\n\ndata: {"b"')).toEqual(['{"a":1}']);
    expect(parser.push(':2}\n\n: keep-alive\ndata: [DONE]\n\n')).toEqual(['{"b":2}', '[DONE]']);
  });

  it('flushes a final line with no trailing newline', () => {
    const parser = new SSEParser();
    expect(parser.push('data: {"a":1}')).toEqual([]);
    expect(parser.flush()).toEqual(['{"a":1}']);
  });
});

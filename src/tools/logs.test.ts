import { describe, expect, it } from 'vitest';
import { parseLogContent } from './logs.js';

describe('parseLogContent', () => {
  it('decodes valid base64-encoded JSONL', () => {
    const lines = [
      JSON.stringify({ level: 'info', msg: 'hello' }),
      JSON.stringify({ level: 'error', msg: 'fail' }),
    ];
    const base64 = Buffer.from(lines.join('\n')).toString('base64');

    const result = parseLogContent(base64);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ level: 'info', msg: 'hello' });
    expect(result[1]).toEqual({ level: 'error', msg: 'fail' });
  });

  it('returns empty array for empty content', () => {
    const base64 = Buffer.from('').toString('base64');

    expect(parseLogContent(base64)).toEqual([]);
  });

  it('skips blank lines', () => {
    const content = `${JSON.stringify({ a: 1 })}\n\n\n${JSON.stringify({ b: 2 })}\n`;
    const base64 = Buffer.from(content).toString('base64');

    const result = parseLogContent(base64);
    expect(result).toHaveLength(2);
  });

  it('returns raw line for invalid JSON', () => {
    const content = `${JSON.stringify({ valid: true })}\nnot valid json\n`;
    const base64 = Buffer.from(content).toString('base64');

    const result = parseLogContent(base64);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ valid: true });
    expect(result[1]).toEqual({ raw: 'not valid json' });
  });

  it('handles trailing newline without empty entry', () => {
    const content = `${JSON.stringify({ a: 1 })}\n`;
    const base64 = Buffer.from(content).toString('base64');

    const result = parseLogContent(base64);
    expect(result).toHaveLength(1);
  });
});

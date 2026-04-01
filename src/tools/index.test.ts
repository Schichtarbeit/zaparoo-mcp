import { describe, expect, it } from 'vitest';
import { filterTools } from './index.js';

const ALL_TOOLS = ['zaparoo_run', 'zaparoo_stop', 'zaparoo_media', 'zaparoo_admin'];

describe('filterTools', () => {
  it('returns all tools when neither allowedTools nor blockedTools is set', () => {
    const result = filterTools(ALL_TOOLS, {});

    expect(result).toEqual(new Set(ALL_TOOLS));
  });

  it('returns only allowed tools when allowedTools is set', () => {
    const result = filterTools(ALL_TOOLS, {
      allowedTools: ['zaparoo_run', 'zaparoo_stop'],
    });

    expect(result).toEqual(new Set(['zaparoo_run', 'zaparoo_stop']));
  });

  it('excludes blocked tools when blockedTools is set', () => {
    const result = filterTools(ALL_TOOLS, {
      blockedTools: ['zaparoo_admin'],
    });

    expect(result).toEqual(new Set(['zaparoo_run', 'zaparoo_stop', 'zaparoo_media']));
  });

  it('returns empty set when allowedTools is empty', () => {
    const result = filterTools(ALL_TOOLS, { allowedTools: [] });

    expect(result).toEqual(new Set());
  });

  it('allows unknown names in allowedTools without error', () => {
    const result = filterTools(ALL_TOOLS, {
      allowedTools: ['zaparoo_run', 'zaparoo_nonexistent'],
    });

    expect(result).toEqual(new Set(['zaparoo_run', 'zaparoo_nonexistent']));
  });
});

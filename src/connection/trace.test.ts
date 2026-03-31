import { describe, expect, it } from 'vitest';
import type { TraceEntry } from './trace.js';
import { TraceBuffer } from './trace.js';

function makeEntry(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    timestamp: new Date().toISOString(),
    deviceId: 'device1',
    direction: 'request',
    method: 'media.search',
    id: '1',
    data: null,
    ...overrides,
  };
}

describe('TraceBuffer', () => {
  it('does not store entries when disabled', () => {
    const buffer = new TraceBuffer();
    buffer.push(makeEntry());
    expect(buffer.getRecent()).toHaveLength(0);
  });

  it('stores entries when enabled', () => {
    const buffer = new TraceBuffer();
    buffer.enabled = true;
    buffer.push(makeEntry());
    expect(buffer.getRecent()).toHaveLength(1);
  });

  it('trims at maxSize', () => {
    const buffer = new TraceBuffer(3);
    buffer.enabled = true;
    buffer.push(makeEntry({ id: '1', method: 'a' }));
    buffer.push(makeEntry({ id: '2', method: 'b' }));
    buffer.push(makeEntry({ id: '3', method: 'c' }));
    buffer.push(makeEntry({ id: '4', method: 'd' }));

    const entries = buffer.getRecent(10);
    expect(entries).toHaveLength(3);
    // Oldest entry (method 'a') should be gone
    expect(entries.map((e) => e.method)).toEqual(['d', 'c', 'b']);
  });

  it('returns entries newest-first', () => {
    const buffer = new TraceBuffer();
    buffer.enabled = true;
    buffer.push(makeEntry({ id: '1', method: 'first' }));
    buffer.push(makeEntry({ id: '2', method: 'second' }));
    buffer.push(makeEntry({ id: '3', method: 'third' }));

    const entries = buffer.getRecent();
    expect(entries[0].method).toBe('third');
    expect(entries[2].method).toBe('first');
  });

  it('respects count limit', () => {
    const buffer = new TraceBuffer();
    buffer.enabled = true;
    for (let i = 0; i < 10; i++) {
      buffer.push(makeEntry({ id: String(i) }));
    }

    expect(buffer.getRecent(3)).toHaveLength(3);
  });

  it('filters by deviceId', () => {
    const buffer = new TraceBuffer();
    buffer.enabled = true;
    buffer.push(makeEntry({ deviceId: 'dev1', id: '1' }));
    buffer.push(makeEntry({ deviceId: 'dev2', id: '2' }));
    buffer.push(makeEntry({ deviceId: 'dev1', id: '3' }));

    const entries = buffer.getRecent(50, 'dev1');
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.deviceId === 'dev1')).toBe(true);
  });

  it('clears all entries', () => {
    const buffer = new TraceBuffer();
    buffer.enabled = true;
    buffer.push(makeEntry());
    buffer.push(makeEntry());
    buffer.clear();

    expect(buffer.getRecent()).toHaveLength(0);
  });
});

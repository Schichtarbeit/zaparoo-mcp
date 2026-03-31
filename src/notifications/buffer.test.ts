import { describe, expect, it } from 'vitest';
import type { BufferedNotification } from './buffer.js';
import { NotificationBuffer } from './buffer.js';

function makeEntry(overrides: Partial<BufferedNotification> = {}): BufferedNotification {
  return {
    timestamp: new Date().toISOString(),
    deviceId: '192.168.1.50:7497',
    method: 'tokens.added',
    params: { uid: 'abc123' },
    message: '[192.168.1.50:7497] Token scanned: abc123',
    ...overrides,
  };
}

describe('NotificationBuffer', () => {
  it('push adds entries and emits notification event', () => {
    const buffer = new NotificationBuffer();
    const emitted: BufferedNotification[] = [];
    buffer.on('notification', (entry) => emitted.push(entry));

    const entry = makeEntry();
    buffer.push(entry);

    expect(buffer.getRecent()).toHaveLength(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBe(entry);
  });

  it('trims oldest entries when exceeding maxSize', () => {
    const buffer = new NotificationBuffer(5);

    for (let i = 0; i < 8; i++) {
      buffer.push(makeEntry({ method: `method.${i}` }));
    }

    const recent = buffer.getRecent();
    expect(recent).toHaveLength(5);
    // Newest first, so first entry should be method.7
    expect(recent[0].method).toBe('method.7');
    expect(recent[4].method).toBe('method.3');
  });

  it('getRecent returns entries newest-first', () => {
    const buffer = new NotificationBuffer();
    buffer.push(makeEntry({ method: 'first' }));
    buffer.push(makeEntry({ method: 'second' }));
    buffer.push(makeEntry({ method: 'third' }));

    const recent = buffer.getRecent();
    expect(recent[0].method).toBe('third');
    expect(recent[2].method).toBe('first');
  });

  it('getRecent limits results by count', () => {
    const buffer = new NotificationBuffer();
    buffer.push(makeEntry({ method: 'first' }));
    buffer.push(makeEntry({ method: 'second' }));
    buffer.push(makeEntry({ method: 'third' }));

    const recent = buffer.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].method).toBe('third');
    expect(recent[1].method).toBe('second');
  });

  it('getRecent filters by since timestamp', () => {
    const buffer = new NotificationBuffer();
    buffer.push(makeEntry({ timestamp: '2026-01-01T00:00:00Z', method: 'old' }));
    buffer.push(makeEntry({ timestamp: '2026-06-01T00:00:00Z', method: 'new' }));

    const recent = buffer.getRecent(undefined, '2026-03-01T00:00:00Z');
    expect(recent).toHaveLength(1);
    expect(recent[0].method).toBe('new');
  });

  it('getRecent filters by method names', () => {
    const buffer = new NotificationBuffer();
    buffer.push(makeEntry({ method: 'tokens.added' }));
    buffer.push(makeEntry({ method: 'media.started' }));
    buffer.push(makeEntry({ method: 'tokens.removed' }));

    const recent = buffer.getRecent(undefined, undefined, ['tokens.added', 'tokens.removed']);
    expect(recent).toHaveLength(2);
    expect(recent[0].method).toBe('tokens.removed');
    expect(recent[1].method).toBe('tokens.added');
  });

  it('clear empties the buffer', () => {
    const buffer = new NotificationBuffer();
    buffer.push(makeEntry());
    buffer.push(makeEntry());

    buffer.clear();

    expect(buffer.getRecent()).toHaveLength(0);
  });

  it('returns empty array when buffer is empty', () => {
    const buffer = new NotificationBuffer();

    expect(buffer.getRecent()).toEqual([]);
    expect(buffer.getRecent(10)).toEqual([]);
    expect(buffer.getRecent(undefined, '2026-01-01T00:00:00Z')).toEqual([]);
    expect(buffer.getRecent(undefined, undefined, ['tokens.added'])).toEqual([]);
  });
});

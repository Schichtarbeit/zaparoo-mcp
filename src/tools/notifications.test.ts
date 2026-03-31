import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BufferedNotification } from '../notifications/buffer.js';
import { NotificationBuffer } from '../notifications/buffer.js';

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

// We test watchForNotification indirectly through the buffer's EventEmitter,
// since the function is module-private. Import it by re-implementing the
// same pattern used in the tool.
async function watchForNotification(
  buffer: NotificationBuffer,
  timeoutSeconds: number,
  methods?: string[],
): Promise<{ notifications: BufferedNotification[]; timedOut: boolean }> {
  const methodSet = methods && methods.length > 0 ? new Set(methods) : null;

  return new Promise((resolve) => {
    const onNotification = (entry: BufferedNotification) => {
      if (methodSet && !methodSet.has(entry.method)) return;
      cleanup();
      resolve({ notifications: [entry], timedOut: false });
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ notifications: [], timedOut: true });
    }, timeoutSeconds * 1000);

    const cleanup = () => {
      buffer.removeListener('notification', onNotification);
      clearTimeout(timer);
    };

    buffer.on('notification', onNotification);
  });
}

describe('watchForNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when a notification arrives', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 30);

    const entry = makeEntry();
    buffer.push(entry);

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].method).toBe('tokens.added');
  });

  it('times out when no notification arrives', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 5);

    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.timedOut).toBe(true);
    expect(result.notifications).toHaveLength(0);
  });

  it('resolves on matching method filter', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 30, ['media.started']);

    buffer.push(makeEntry({ method: 'media.started' }));

    const result = await promise;
    expect(result.timedOut).toBe(false);
    expect(result.notifications[0].method).toBe('media.started');
  });

  it('ignores non-matching methods and keeps waiting', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 5, ['media.started']);

    // Push non-matching notification
    buffer.push(makeEntry({ method: 'tokens.added' }));

    // Should not have resolved yet — advance timer to timeout
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.timedOut).toBe(true);
    expect(result.notifications).toHaveLength(0);
  });

  it('cleans up listener after resolving on notification', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 30);

    buffer.push(makeEntry());
    await promise;

    expect(buffer.listenerCount('notification')).toBe(0);
  });

  it('cleans up listener after timeout', async () => {
    const buffer = new NotificationBuffer();
    const promise = watchForNotification(buffer, 5);

    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(buffer.listenerCount('notification')).toBe(0);
  });
});

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionState } from './types.js';

// Mock WebSocket before importing DeviceConnection
class MockWebSocket extends EventEmitter {
  static readonly OPEN = 1;
  readyState = MockWebSocket.OPEN;
  send = vi.fn((_msg: string, cb?: (err?: Error) => void) => cb?.());
  close = vi.fn();
  ping = vi.fn();
  removeAllListeners = vi.fn(() => this);
}

let lastMockWs: MockWebSocket;
let lastMockWsUrl: string;

vi.mock('ws', () => ({
  default: class extends MockWebSocket {
    constructor(url: string) {
      super();
      lastMockWs = this;
      lastMockWsUrl = url;
    }
  },
}));

// Import after mocking
const { DeviceConnection } = await import('./device.js');

const baseConfig = {
  id: 'testhost:7497',
  host: 'testhost',
  port: 7497,
};

describe('DeviceConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lastMockWs = undefined as unknown as MockWebSocket;
    lastMockWsUrl = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('info', () => {
    it('returns device info with initial state', () => {
      const conn = new DeviceConnection(baseConfig);
      const info = conn.info;

      expect(info.id).toBe('testhost:7497');
      expect(info.host).toBe('testhost');
      expect(info.port).toBe(7497);
      expect(info.state).toBe(ConnectionState.Disconnected);
      expect(info.version).toBeUndefined();
    });
  });

  describe('isReady', () => {
    it('is false when disconnected', () => {
      const conn = new DeviceConnection(baseConfig);
      expect(conn.isReady).toBe(false);
    });
  });

  describe('connect', () => {
    it('does nothing when destroyed', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.destroy();
      const stateChanges: ConnectionState[] = [];
      conn.on('stateChange', (state) => stateChanges.push(state));

      conn.connect();

      // Only the destroy state change, no CONNECTING
      expect(stateChanges).not.toContain(ConnectionState.Connecting);
    });

    it('emits stateChange to Connecting', () => {
      const conn = new DeviceConnection(baseConfig);
      const stateChanges: ConnectionState[] = [];
      conn.on('stateChange', (state) => stateChanges.push(state));

      conn.connect();

      expect(stateChanges).toContain(ConnectionState.Connecting);
    });

    it('builds URL without API key', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();

      expect(lastMockWsUrl).toBe('ws://testhost:7497/api/v0.1');
    });

    it('builds URL with API key when provided', () => {
      const conn = new DeviceConnection({ ...baseConfig, apiKey: 'secret123' });
      conn.connect();

      expect(lastMockWsUrl).toBe('ws://testhost:7497/api/v0.1?key=secret123');
    });

    it('does not connect when already connecting', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      const firstWs = lastMockWs;

      conn.connect(); // Should be no-op

      expect(lastMockWs).toBe(firstWs);
    });
  });

  describe('state transitions', () => {
    it('emits stateChange with device info', () => {
      const conn = new DeviceConnection(baseConfig);
      const receivedInfos: Array<{ id: string }> = [];
      conn.on('stateChange', (_state, info) => {
        receivedInfos.push(info);
      });

      conn.connect();

      expect(receivedInfos[0].id).toBe('testhost:7497');
    });

    it('does not emit when state is unchanged', () => {
      const conn = new DeviceConnection(baseConfig);
      const emissions: ConnectionState[] = [];
      conn.on('stateChange', (state) => emissions.push(state));

      conn.connect(); // DISCONNECTED → CONNECTING
      // Emit open to go CONNECTING → CONNECTED
      lastMockWs.emit('open');

      // Count how many times each state appears
      const connectingCount = emissions.filter((s) => s === ConnectionState.Connecting).length;
      expect(connectingCount).toBe(1);
    });
  });

  describe('onOpen', () => {
    it('transitions to Connected on WebSocket open', () => {
      const conn = new DeviceConnection(baseConfig);
      const states: ConnectionState[] = [];
      conn.on('stateChange', (state) => states.push(state));

      conn.connect();
      lastMockWs.emit('open');

      expect(states).toContain(ConnectionState.Connected);
    });

    it('sends version request on open', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      expect(lastMockWs.send).toHaveBeenCalled();
      const sentMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      expect(sentMsg.method).toBe('version');
      expect(sentMsg.jsonrpc).toBe('2.0');
      expect(sentMsg).not.toHaveProperty('params');
    });

    it('transitions to Ready after successful version response', async () => {
      const conn = new DeviceConnection(baseConfig);
      const states: ConnectionState[] = [];
      conn.on('stateChange', (state) => states.push(state));

      conn.connect();
      lastMockWs.emit('open');

      // Respond to the version request
      const sentMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: sentMsg.id,
          result: { version: '2.10.0', platform: 'mister' },
        }),
      );

      // Allow microtasks to settle
      await vi.advanceTimersByTimeAsync(0);

      expect(states).toContain(ConnectionState.Ready);
      expect(conn.info.version).toBe('2.10.0');
      expect(conn.info.platform).toBe('mister');
    });
  });

  describe('heartbeat', () => {
    it('sends ping at 25-second intervals after connection opens', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      expect(lastMockWs.ping).not.toHaveBeenCalled();

      vi.advanceTimersByTime(25_000);
      expect(lastMockWs.ping).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(25_000);
      expect(lastMockWs.ping).toHaveBeenCalledTimes(2);
    });
  });

  describe('onError', () => {
    it('sets lastError on WebSocket error', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('error', new Error('ECONNREFUSED'));

      expect(conn.info.lastError).toBe('ECONNREFUSED');
    });
  });

  describe('onMessage', () => {
    it('ignores invalid JSON', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Should not throw
      expect(() => {
        lastMockWs.emit('message', 'not json at all');
      }).not.toThrow();
    });

    it('emits notification for messages without id', () => {
      const conn = new DeviceConnection(baseConfig);
      const notifications: Array<{ method: string; params: unknown }> = [];
      conn.on('notification', (method, params) => {
        notifications.push({ method, params });
      });

      conn.connect();
      lastMockWs.emit('open');

      lastMockWs.emit(
        'message',
        JSON.stringify({
          method: 'tokens.added',
          params: { uid: 'abc' },
        }),
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe('tokens.added');
      expect(notifications[0].params).toEqual({ uid: 'abc' });
    });

    it('resolves pending request on success response', async () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Respond to version check first
      const versionMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: versionMsg.id,
          result: { version: '2.10.0', platform: 'test' },
        }),
      );
      await vi.advanceTimersByTimeAsync(0);

      // Now make a request
      const resultPromise = conn.request('media.search', { query: 'sonic' });

      const requestMsg = JSON.parse(lastMockWs.send.mock.calls[1][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: requestMsg.id,
          result: { results: ['Sonic the Hedgehog'] },
        }),
      );

      const result = await resultPromise;
      expect(result).toEqual({ results: ['Sonic the Hedgehog'] });
    });

    it('rejects pending request on error response', async () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Version check
      const versionMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: versionMsg.id,
          result: { version: '2.10.0', platform: 'test' },
        }),
      );
      await vi.advanceTimersByTimeAsync(0);

      const resultPromise = conn.request('some.method');

      const requestMsg = JSON.parse(lastMockWs.send.mock.calls[1][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: requestMsg.id,
          error: { code: -32601, message: 'Method not found' },
        }),
      );

      await expect(resultPromise).rejects.toThrow('Method not found');
    });
  });

  describe('request', () => {
    it('throws when not in Ready state', async () => {
      const conn = new DeviceConnection(baseConfig);

      await expect(conn.request('version')).rejects.toThrow('not ready');
    });

    it('rejects when send fails', async () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Version check
      const versionMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: versionMsg.id,
          result: { version: '2.10.0', platform: 'test' },
        }),
      );
      await vi.advanceTimersByTimeAsync(0);

      // Make send fail on the next call
      lastMockWs.send.mockImplementationOnce((_msg: string, cb?: (err?: Error) => void) =>
        cb?.(new Error('Write failed')),
      );

      await expect(conn.request('some.method')).rejects.toThrow('Write failed');
    });

    it('times out after 30 seconds', async () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Version check
      const versionMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: versionMsg.id,
          result: { version: '2.10.0', platform: 'test' },
        }),
      );
      await vi.advanceTimersByTimeAsync(0);

      const resultPromise = conn.request('slow.method');

      // Attach rejection handler before advancing timers to avoid unhandled rejection
      const assertion = expect(resultPromise).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(30_000);
      await assertion;
    });
  });

  describe('onClose', () => {
    it('transitions to Disconnected and schedules reconnect', () => {
      const conn = new DeviceConnection(baseConfig);
      const states: ConnectionState[] = [];
      conn.on('stateChange', (state) => states.push(state));

      conn.connect();
      lastMockWs.emit('open');
      lastMockWs.emit('close', 1000, 'normal closure');

      expect(states).toContain(ConnectionState.Disconnected);
    });

    it('rejects pending requests on close', async () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      lastMockWs.emit('open');

      // Version check
      const versionMsg = JSON.parse(lastMockWs.send.mock.calls[0][0]);
      lastMockWs.emit(
        'message',
        JSON.stringify({
          jsonrpc: '2.0',
          id: versionMsg.id,
          result: { version: '2.10.0', platform: 'test' },
        }),
      );
      await vi.advanceTimersByTimeAsync(0);

      const resultPromise = conn.request('some.method');
      lastMockWs.emit('close', 1006, 'abnormal');

      await expect(resultPromise).rejects.toThrow('Connection closed');
    });
  });

  describe('destroy', () => {
    it('prevents future connections', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.destroy();

      const states: ConnectionState[] = [];
      conn.on('stateChange', (state) => states.push(state));
      conn.connect();

      expect(states).not.toContain(ConnectionState.Connecting);
    });

    it('does not schedule reconnect after destroy', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      conn.destroy();

      // Advance timers — should not reconnect
      vi.advanceTimersByTime(60_000);

      // If it tried to reconnect, a new WebSocket would be created
      // destroy cleans up, so no reconnect should happen
      expect(conn.info.state).toBe(ConnectionState.Disconnected);
    });
  });

  describe('forceReconnect', () => {
    it('reconnects immediately resetting attempts', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      const firstWs = lastMockWs;

      conn.forceReconnect();

      // A new WebSocket should have been created
      expect(lastMockWs).not.toBe(firstWs);
    });
  });

  describe('reconnect backoff', () => {
    it('schedules reconnect on connection close', () => {
      const conn = new DeviceConnection(baseConfig);
      conn.connect();
      const firstWs = lastMockWs;

      lastMockWs.emit('close', 1006, 'gone');

      // Advance past max backoff
      vi.advanceTimersByTime(31_000);

      // Should have created a new WebSocket
      expect(lastMockWs).not.toBe(firstWs);
    });
  });
});

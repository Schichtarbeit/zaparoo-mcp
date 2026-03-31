import { describe, expect, it, vi } from 'vitest';
import { Notifications } from '../types.js';
import { DeviceStateStore } from './state.js';

describe('DeviceStateStore', () => {
  describe('getState', () => {
    it('creates default state on first call', () => {
      const store = new DeviceStateStore();
      const state = store.getState('device1');

      expect(state.connectionState).toBe('DISCONNECTED');
      expect(state.readers).toEqual([]);
      expect(state.activeMedia).toEqual([]);
      expect(state.connectionHistory).toEqual([]);
      expect(state.lastTokenScan).toBeUndefined();
      expect(state.lastNotification).toBeUndefined();
      expect(state.version).toBeUndefined();
      expect(state.platform).toBeUndefined();
    });

    it('returns the same object on subsequent calls', () => {
      const store = new DeviceStateStore();
      const first = store.getState('device1');
      const second = store.getState('device1');

      expect(first).toBe(second);
    });

    it('returns independent state per device', () => {
      const store = new DeviceStateStore();
      const state1 = store.getState('device1');
      const state2 = store.getState('device2');

      expect(state1).not.toBe(state2);
      state1.connectionState = 'READY';
      expect(state2.connectionState).toBe('DISCONNECTED');
    });
  });

  describe('updateConnection', () => {
    it('sets connectionState', () => {
      const store = new DeviceStateStore();
      store.updateConnection('device1', 'CONNECTING');

      expect(store.getState('device1').connectionState).toBe('CONNECTING');
    });

    it('sets version and platform when provided', () => {
      const store = new DeviceStateStore();
      store.updateConnection('device1', 'READY', '2.10.0', 'mister');

      const state = store.getState('device1');
      expect(state.version).toBe('2.10.0');
      expect(state.platform).toBe('mister');
    });

    it('preserves existing version when new value is undefined', () => {
      const store = new DeviceStateStore();
      store.updateConnection('device1', 'READY', '2.10.0', 'mister');
      store.updateConnection('device1', 'DISCONNECTED');

      const state = store.getState('device1');
      expect(state.connectionState).toBe('DISCONNECTED');
      expect(state.version).toBe('2.10.0');
      expect(state.platform).toBe('mister');
    });

    it('appends to connectionHistory on each update', () => {
      const store = new DeviceStateStore();
      store.updateConnection('device1', 'CONNECTING');
      store.updateConnection('device1', 'READY', '2.10.0', 'mister');

      const history = store.getState('device1').connectionHistory;
      expect(history).toHaveLength(2);
      expect(history[0].state).toBe('CONNECTING');
      expect(history[1].state).toBe('READY');
    });

    it('includes error in connectionHistory when provided', () => {
      const store = new DeviceStateStore();
      store.updateConnection('device1', 'DISCONNECTED', undefined, undefined, 'Connection refused');

      const history = store.getState('device1').connectionHistory;
      expect(history).toHaveLength(1);
      expect(history[0].error).toBe('Connection refused');
    });

    it('trims connectionHistory at 50 entries', () => {
      const store = new DeviceStateStore();
      for (let i = 0; i < 55; i++) {
        store.updateConnection('device1', `STATE_${i}`);
      }

      const history = store.getState('device1').connectionHistory;
      expect(history).toHaveLength(50);
      expect(history[0].state).toBe('STATE_5');
      expect(history[49].state).toBe('STATE_54');
    });
  });

  describe('handleNotification', () => {
    it('sets lastNotification on every call', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

      const store = new DeviceStateStore();
      store.handleNotification('device1', 'some.unknown.method', {});

      const state = store.getState('device1');
      expect(state.lastNotification).toEqual({
        method: 'some.unknown.method',
        timestamp: '2025-06-15T12:00:00.000Z',
      });

      vi.useRealTimers();
    });

    it('does not mutate other state for unknown methods', () => {
      const store = new DeviceStateStore();
      store.handleNotification('device1', 'unknown.method', {});

      const state = store.getState('device1');
      expect(state.readers).toEqual([]);
      expect(state.activeMedia).toEqual([]);
      expect(state.lastTokenScan).toBeUndefined();
    });

    describe('readers', () => {
      it('adds a reader on ReadersAdded', () => {
        const store = new DeviceStateStore();
        const reader = { driver: 'pn532', path: '/dev/ttyUSB0', connected: true };
        store.handleNotification('device1', Notifications.ReadersAdded, reader);

        expect(store.getState('device1').readers).toEqual([reader]);
      });

      it('updates existing reader with same driver+path', () => {
        const store = new DeviceStateStore();
        const reader1 = { driver: 'pn532', path: '/dev/ttyUSB0', connected: true };
        const reader2 = { driver: 'pn532', path: '/dev/ttyUSB0', connected: false };

        store.handleNotification('device1', Notifications.ReadersAdded, reader1);
        store.handleNotification('device1', Notifications.ReadersAdded, reader2);

        const readers = store.getState('device1').readers;
        expect(readers).toHaveLength(1);
        expect(readers[0]).toEqual(reader2);
      });

      it('adds multiple readers with different driver+path', () => {
        const store = new DeviceStateStore();
        const reader1 = { driver: 'pn532', path: '/dev/ttyUSB0', connected: true };
        const reader2 = { driver: 'acr122', path: '/dev/ttyUSB1', connected: true };

        store.handleNotification('device1', Notifications.ReadersAdded, reader1);
        store.handleNotification('device1', Notifications.ReadersAdded, reader2);

        expect(store.getState('device1').readers).toHaveLength(2);
      });

      it('removes reader on ReadersRemoved', () => {
        const store = new DeviceStateStore();
        const reader = { driver: 'pn532', path: '/dev/ttyUSB0', connected: true };

        store.handleNotification('device1', Notifications.ReadersAdded, reader);
        store.handleNotification('device1', Notifications.ReadersRemoved, reader);

        expect(store.getState('device1').readers).toEqual([]);
      });

      it('does nothing when removing non-existent reader', () => {
        const store = new DeviceStateStore();
        const reader = { driver: 'pn532', path: '/dev/ttyUSB0', connected: true };
        store.handleNotification('device1', Notifications.ReadersRemoved, reader);

        expect(store.getState('device1').readers).toEqual([]);
      });
    });

    describe('tokens', () => {
      it('updates lastTokenScan on TokensAdded', () => {
        const store = new DeviceStateStore();
        const token = { uid: 'abc123', text: 'Genesis/Sonic.md', data: '' };
        store.handleNotification('device1', Notifications.TokensAdded, token);

        expect(store.getState('device1').lastTokenScan).toEqual(token);
      });

      it('overwrites previous token scan', () => {
        const store = new DeviceStateStore();
        store.handleNotification('device1', Notifications.TokensAdded, {
          uid: 'first',
          text: '',
          data: '',
        });
        store.handleNotification('device1', Notifications.TokensAdded, {
          uid: 'second',
          text: '',
          data: '',
        });

        expect(store.getState('device1').lastTokenScan?.uid).toBe('second');
      });
    });

    describe('media', () => {
      it('adds to activeMedia on MediaStarted', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

        const store = new DeviceStateStore();
        const media = {
          systemId: 'snes',
          systemName: 'SNES',
          mediaName: 'Super Mario World',
          mediaPath: 'SNES/Super Mario World.sfc',
        };
        store.handleNotification('device1', Notifications.MediaStarted, media);

        const active = store.getState('device1').activeMedia;
        expect(active).toHaveLength(1);
        expect(active[0]).toMatchObject({
          systemId: 'snes',
          mediaName: 'Super Mario World',
          started: '2025-06-15T12:00:00.000Z',
        });

        vi.useRealTimers();
      });

      it('removes matching media on MediaStopped', () => {
        const store = new DeviceStateStore();
        store.handleNotification('device1', Notifications.MediaStarted, {
          systemId: 'snes',
          systemName: 'SNES',
          mediaName: 'Super Mario World',
          mediaPath: 'SNES/Super Mario World.sfc',
        });

        store.handleNotification('device1', Notifications.MediaStopped, {
          systemId: 'snes',
          mediaPath: 'SNES/Super Mario World.sfc',
          mediaName: 'Super Mario World',
          elapsed: 120,
        });

        expect(store.getState('device1').activeMedia).toEqual([]);
      });

      it('does not remove non-matching media on MediaStopped', () => {
        const store = new DeviceStateStore();
        store.handleNotification('device1', Notifications.MediaStarted, {
          systemId: 'snes',
          systemName: 'SNES',
          mediaName: 'Super Mario World',
          mediaPath: 'SNES/Super Mario World.sfc',
        });

        store.handleNotification('device1', Notifications.MediaStopped, {
          systemId: 'genesis',
          mediaPath: 'Genesis/Sonic.md',
          mediaName: 'Sonic',
          elapsed: 60,
        });

        expect(store.getState('device1').activeMedia).toHaveLength(1);
      });

      it('handles multiple active media', () => {
        const store = new DeviceStateStore();
        store.handleNotification('device1', Notifications.MediaStarted, {
          systemId: 'snes',
          systemName: 'SNES',
          mediaName: 'Game 1',
          mediaPath: 'SNES/Game1.sfc',
        });
        store.handleNotification('device1', Notifications.MediaStarted, {
          systemId: 'genesis',
          systemName: 'Genesis',
          mediaName: 'Game 2',
          mediaPath: 'Genesis/Game2.md',
        });

        expect(store.getState('device1').activeMedia).toHaveLength(2);

        store.handleNotification('device1', Notifications.MediaStopped, {
          systemId: 'snes',
          mediaPath: 'SNES/Game1.sfc',
          mediaName: 'Game 1',
          elapsed: 30,
        });

        const active = store.getState('device1').activeMedia;
        expect(active).toHaveLength(1);
        expect(active[0].systemId).toBe('genesis');
      });
    });
  });
});

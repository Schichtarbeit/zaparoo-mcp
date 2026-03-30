import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceConfig } from '../config.js';
import { ConnectionState } from './types.js';

// Create mock DeviceConnection class
class MockDeviceConnection extends EventEmitter {
  config: DeviceConfig;
  private _isReady: boolean;

  constructor(config: DeviceConfig) {
    super();
    this.config = config;
    this._isReady = false;
  }

  get isReady() {
    return this._isReady;
  }

  set ready(value: boolean) {
    this._isReady = value;
  }

  get info() {
    return {
      id: this.config.id,
      host: this.config.host,
      port: this.config.port,
      state: this._isReady ? ConnectionState.Ready : ConnectionState.Disconnected,
    };
  }

  connect = vi.fn();
  destroy = vi.fn();
  forceReconnect = vi.fn();
}

// Store created instances so tests can access them
const createdDevices: MockDeviceConnection[] = [];

vi.mock('./device.js', () => ({
  DeviceConnection: class extends MockDeviceConnection {
    constructor(config: DeviceConfig) {
      super(config);
      createdDevices.push(this);
    }
  },
}));

const { DeviceManager } = await import('./manager.js');

const configs: DeviceConfig[] = [
  { id: 'host1:7497', host: 'host1', port: 7497 },
  { id: 'host2:7497', host: 'host2', port: 7497 },
];

describe('DeviceManager', () => {
  beforeEach(() => {
    createdDevices.length = 0;
  });

  it('creates connections for all configs', () => {
    new DeviceManager(configs);

    expect(createdDevices).toHaveLength(2);
    expect(createdDevices[0].config.id).toBe('host1:7497');
    expect(createdDevices[1].config.id).toBe('host2:7497');
  });

  describe('connectAll', () => {
    it('calls connect on all devices', () => {
      const manager = new DeviceManager(configs);
      manager.connectAll();

      for (const device of createdDevices) {
        expect(device.connect).toHaveBeenCalled();
      }
    });
  });

  describe('destroyAll', () => {
    it('calls destroy on all devices and clears the map', async () => {
      const manager = new DeviceManager(configs);
      await manager.destroyAll();

      for (const device of createdDevices) {
        expect(device.destroy).toHaveBeenCalled();
      }
      expect(manager.getAllDeviceInfo()).toHaveLength(0);
    });
  });

  describe('getDevice', () => {
    it('returns specific device by id', () => {
      const manager = new DeviceManager(configs);
      const device = manager.getDevice('host2:7497');

      expect(device.config.id).toBe('host2:7497');
    });

    it('throws for unknown device id', () => {
      const manager = new DeviceManager(configs);

      expect(() => manager.getDevice('unknown:9999')).toThrow('Unknown device');
      expect(() => manager.getDevice('unknown:9999')).toThrow('host1:7497');
    });

    it('returns first ready device when no id given', () => {
      const manager = new DeviceManager(configs);
      (createdDevices[1] as MockDeviceConnection).ready = true;

      const device = manager.getDevice();
      expect(device.config.id).toBe('host2:7497');
    });

    it('returns first ready device in insertion order', () => {
      const manager = new DeviceManager(configs);
      (createdDevices[0] as MockDeviceConnection).ready = true;
      (createdDevices[1] as MockDeviceConnection).ready = true;

      const device = manager.getDevice();
      expect(device.config.id).toBe('host1:7497');
    });

    it('throws when no devices are ready', () => {
      const manager = new DeviceManager(configs);

      expect(() => manager.getDevice()).toThrow('No devices are ready');
    });

    it('includes device states in error message', () => {
      const manager = new DeviceManager(configs);

      expect(() => manager.getDevice()).toThrow('host1:7497');
    });
  });

  describe('getDeviceInfo', () => {
    it('returns info for known device', () => {
      const manager = new DeviceManager(configs);
      const info = manager.getDeviceInfo('host1:7497');

      expect(info).toBeDefined();
      expect(info?.id).toBe('host1:7497');
    });

    it('returns undefined for unknown device', () => {
      const manager = new DeviceManager(configs);
      const info = manager.getDeviceInfo('unknown:9999');

      expect(info).toBeUndefined();
    });
  });

  describe('getAllDeviceInfo', () => {
    it('returns info for all devices', () => {
      const manager = new DeviceManager(configs);
      const infos = manager.getAllDeviceInfo();

      expect(infos).toHaveLength(2);
      expect(infos[0].id).toBe('host1:7497');
      expect(infos[1].id).toBe('host2:7497');
    });
  });

  describe('reconnect', () => {
    it('calls forceReconnect on the specified device', () => {
      const manager = new DeviceManager(configs);
      manager.reconnect('host1:7497');

      expect(createdDevices[0].forceReconnect).toHaveBeenCalled();
    });

    it('throws for unknown device', () => {
      const manager = new DeviceManager(configs);

      expect(() => manager.reconnect('unknown:9999')).toThrow('Unknown device');
    });
  });

  describe('event forwarding', () => {
    it('forwards stateChange events from devices', () => {
      const manager = new DeviceManager(configs);
      const events: Array<{ state: ConnectionState; id: string }> = [];
      manager.on('stateChange', (state, device) => {
        events.push({ state, id: device.id });
      });

      createdDevices[0].emit('stateChange', ConnectionState.Ready, createdDevices[0].info);

      expect(events).toHaveLength(1);
      expect(events[0].state).toBe(ConnectionState.Ready);
      expect(events[0].id).toBe('host1:7497');
    });

    it('forwards notification events from devices', () => {
      const manager = new DeviceManager(configs);
      const notifications: Array<{ method: string; deviceId: string }> = [];
      manager.on('notification', (method, _params, deviceId) => {
        notifications.push({ method, deviceId });
      });

      createdDevices[1].emit('notification', 'tokens.added', { uid: 'abc' }, 'host2:7497');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe('tokens.added');
      expect(notifications[0].deviceId).toBe('host2:7497');
    });
  });

  describe('addDevice', () => {
    it('creates connection and calls connect', () => {
      const manager = new DeviceManager([]);
      manager.addDevice({ id: 'new:7497', host: 'new', port: 7497 });

      expect(createdDevices).toHaveLength(1);
      expect(createdDevices[0].connect).toHaveBeenCalled();
    });

    it('device appears in getAllDeviceInfo', () => {
      const manager = new DeviceManager([]);
      manager.addDevice({ id: 'new:7497', host: 'new', port: 7497 });

      expect(manager.getAllDeviceInfo()).toHaveLength(1);
      expect(manager.getAllDeviceInfo()[0].id).toBe('new:7497');
    });

    it('is a no-op for existing device ID', () => {
      const manager = new DeviceManager(configs);
      const countBefore = createdDevices.length;

      manager.addDevice({ id: 'host1:7497', host: 'host1', port: 7497 });

      expect(createdDevices).toHaveLength(countBefore);
    });

    it('forwards stateChange events from dynamically added device', () => {
      const manager = new DeviceManager([]);
      const events: Array<{ state: ConnectionState }> = [];
      manager.on('stateChange', (state) => events.push({ state }));

      manager.addDevice({ id: 'new:7497', host: 'new', port: 7497 });
      createdDevices[0].emit('stateChange', ConnectionState.Ready, createdDevices[0].info);

      expect(events).toHaveLength(1);
      expect(events[0].state).toBe(ConnectionState.Ready);
    });

    it('forwards notification events from dynamically added device', () => {
      const manager = new DeviceManager([]);
      const notifications: Array<{ method: string; deviceId: string }> = [];
      manager.on('notification', (method, _params, deviceId) => {
        notifications.push({ method, deviceId });
      });

      manager.addDevice({ id: 'new:7497', host: 'new', port: 7497 });
      createdDevices[0].emit('notification', 'tokens.added', { uid: 'abc' }, 'new:7497');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe('tokens.added');
      expect(notifications[0].deviceId).toBe('new:7497');
    });
  });

  describe('removeDevice', () => {
    it('destroys and removes the device', () => {
      const manager = new DeviceManager(configs);
      manager.removeDevice('host1:7497');

      expect(createdDevices[0].destroy).toHaveBeenCalled();
      expect(manager.getAllDeviceInfo()).toHaveLength(1);
      expect(manager.getAllDeviceInfo()[0].id).toBe('host2:7497');
    });

    it('is a no-op for unknown device', () => {
      const manager = new DeviceManager(configs);

      expect(() => manager.removeDevice('unknown:9999')).not.toThrow();
      expect(manager.getAllDeviceInfo()).toHaveLength(2);
    });
  });

  describe('hasDevice', () => {
    it('returns true for known device', () => {
      const manager = new DeviceManager(configs);

      expect(manager.hasDevice('host1:7497')).toBe(true);
    });

    it('returns false for unknown device', () => {
      const manager = new DeviceManager(configs);

      expect(manager.hasDevice('unknown:9999')).toBe(false);
    });
  });
});

import { EventEmitter } from 'node:events';
import type { DeviceConfig } from '../config.js';
import { DeviceConnection } from './device.js';
import type { ConnectionState, DeviceInfo } from './types.js';

export interface DeviceManagerEvents {
  stateChange: [state: ConnectionState, device: DeviceInfo];
  notification: [method: string, params: unknown, deviceId: string];
}

export class DeviceManager extends EventEmitter<DeviceManagerEvents> {
  private devices = new Map<string, DeviceConnection>();

  constructor(configs: DeviceConfig[]) {
    super();
    for (const config of configs) {
      const device = new DeviceConnection(config);
      device.on('stateChange', (state, info) => {
        this.emit('stateChange', state, info);
      });
      device.on('notification', (method, params, deviceId) => {
        this.emit('notification', method, params, deviceId);
      });
      this.devices.set(config.id, device);
    }
  }

  connectAll(): void {
    for (const device of this.devices.values()) {
      device.connect();
    }
  }

  async destroyAll(): Promise<void> {
    for (const device of this.devices.values()) {
      device.destroy();
    }
    this.devices.clear();
  }

  getDevice(id?: string): DeviceConnection {
    if (id) {
      const device = this.devices.get(id);
      if (!device) {
        throw new Error(
          `Unknown device "${id}". Available: ${[...this.devices.keys()].join(', ')}`,
        );
      }
      return device;
    }

    // Return first READY device
    for (const device of this.devices.values()) {
      if (device.isReady) return device;
    }

    const states = [...this.devices.values()]
      .map((d) => `${d.config.id} (${d.info.state})`)
      .join(', ');
    throw new Error(`No devices are ready. Device states: ${states}`);
  }

  getDeviceInfo(id: string): DeviceInfo | undefined {
    return this.devices.get(id)?.info;
  }

  getAllDeviceInfo(): DeviceInfo[] {
    return [...this.devices.values()].map((d) => d.info);
  }

  reconnect(id: string): void {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Unknown device "${id}"`);
    }
    device.forceReconnect();
  }
}

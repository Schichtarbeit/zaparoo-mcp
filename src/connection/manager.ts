import { EventEmitter } from 'node:events';
import type { DeviceConfig } from '../config.js';
import { DeviceConnection } from './device.js';
import type { TraceBuffer } from './trace.js';
import type { ConnectionState, DeviceInfo } from './types.js';

export interface DeviceManagerEvents {
  stateChange: [state: ConnectionState, device: DeviceInfo];
  notification: [method: string, params: unknown, deviceId: string];
}

export class DeviceManager extends EventEmitter<DeviceManagerEvents> {
  private devices = new Map<string, DeviceConnection>();
  private defaultDeviceId: string | null = null;
  private traceBuffer: TraceBuffer | null = null;

  constructor(configs: DeviceConfig[], traceBuffer?: TraceBuffer) {
    super();
    this.traceBuffer = traceBuffer ?? null;
    for (const config of configs) {
      const device = this.createDevice(config);
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

    // Try default device first
    if (this.defaultDeviceId) {
      const defaultDevice = this.devices.get(this.defaultDeviceId);
      if (defaultDevice?.isReady) return defaultDevice;
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

  setDefaultDevice(id: string | null): void {
    if (id !== null && !this.devices.has(id)) {
      throw new Error(`Unknown device "${id}". Available: ${[...this.devices.keys()].join(', ')}`);
    }
    this.defaultDeviceId = id;
  }

  getDefaultDeviceId(): string | null {
    return this.defaultDeviceId;
  }

  getDeviceInfo(id: string): DeviceInfo | undefined {
    return this.devices.get(id)?.info;
  }

  getAllDeviceInfo(): DeviceInfo[] {
    return [...this.devices.values()].map((d) => d.info);
  }

  addDevice(config: DeviceConfig): void {
    if (this.devices.has(config.id)) return;

    const device = this.createDevice(config);
    this.devices.set(config.id, device);
    device.connect();
  }

  private createDevice(config: DeviceConfig): DeviceConnection {
    const device = new DeviceConnection(config, this.traceBuffer ?? undefined);
    device.on('stateChange', (state, info) => {
      this.emit('stateChange', state, info);
    });
    device.on('notification', (method, params, deviceId) => {
      this.emit('notification', method, params, deviceId);
    });
    return device;
  }

  removeDevice(id: string): void {
    const device = this.devices.get(id);
    if (!device) return;

    device.removeAllListeners();
    device.destroy();
    this.devices.delete(id);
  }

  hasDevice(id: string): boolean {
    return this.devices.has(id);
  }

  reconnect(id: string): void {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Unknown device "${id}"`);
    }
    device.forceReconnect();
  }
}

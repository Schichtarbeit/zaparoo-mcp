import { EventEmitter } from 'node:events';
import { Bonjour, type Browser, type Service } from 'bonjour-service';

const SERVICE_TYPE = 'zaparoo';
const DEFAULT_PORT = 7497;

export interface DiscoveredDevice {
  id: string;
  host: string;
  port: number;
  txtRecord: {
    id?: string;
    version?: string;
    platform?: string;
  };
}

export interface MdnsDiscoveryEvents {
  discovered: [device: DiscoveredDevice];
  removed: [deviceId: string];
}

export class MdnsDiscovery extends EventEmitter<MdnsDiscoveryEvents> {
  private bonjour: Bonjour | null = null;
  private browser: Browser | null = null;
  private knownDevices = new Set<string>();

  start(): void {
    if (this.bonjour) return;

    this.bonjour = new Bonjour();
    this.browser = this.bonjour.find({ type: SERVICE_TYPE, protocol: 'tcp' }, (service) =>
      this.onServiceUp(service),
    );
    this.browser.on('down', (service: Service) => this.onServiceDown(service));
  }

  stop(): void {
    this.browser?.stop();
    this.browser = null;
    this.bonjour?.destroy();
    this.bonjour = null;
    this.knownDevices.clear();
  }

  private resolveHost(service: Service): string {
    if (service.addresses && service.addresses.length > 0) {
      return service.addresses[0];
    }
    return service.host;
  }

  private onServiceUp(service: Service): void {
    const host = this.resolveHost(service);
    const port = service.port || DEFAULT_PORT;
    const id = `${host}:${port}`;

    if (this.knownDevices.has(id)) return;
    this.knownDevices.add(id);

    const txt = (service.txt ?? {}) as Record<string, string>;
    this.emit('discovered', {
      id,
      host,
      port,
      txtRecord: {
        id: txt.id,
        version: txt.version,
        platform: txt.platform,
      },
    });
  }

  private onServiceDown(service: Service): void {
    const host = this.resolveHost(service);
    const port = service.port || DEFAULT_PORT;
    const id = `${host}:${port}`;

    if (!this.knownDevices.has(id)) return;
    this.knownDevices.delete(id);

    this.emit('removed', id);
  }
}

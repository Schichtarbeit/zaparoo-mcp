import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockBrowser extends EventEmitter {
  stop = vi.fn();
}

let lastBrowser: MockBrowser;
let lastFindOpts: { type: string; protocol: string } | undefined;
let lastOnUp: ((service: unknown) => void) | undefined;

const mockDestroy = vi.fn();

vi.mock('bonjour-service', () => ({
  Bonjour: class {
    find(opts: { type: string; protocol: string }, onup: (service: unknown) => void) {
      lastFindOpts = opts;
      lastOnUp = onup;
      lastBrowser = new MockBrowser();
      return lastBrowser;
    }
    destroy = mockDestroy;
  },
}));

const { MdnsDiscovery } = await import('./mdns.js');

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    host: 'mister.local',
    port: 7497,
    addresses: ['192.168.1.50'],
    txt: { id: 'device-uuid', version: '2.10.0', platform: 'mister' },
    ...overrides,
  };
}

describe('MdnsDiscovery', () => {
  beforeEach(() => {
    lastBrowser = undefined as unknown as MockBrowser;
    lastFindOpts = undefined;
    lastOnUp = undefined;
    mockDestroy.mockClear();
  });

  it('browses for _zaparoo._tcp services', () => {
    const discovery = new MdnsDiscovery();
    discovery.start();

    expect(lastFindOpts).toEqual({ type: 'zaparoo', protocol: 'tcp' });
  });

  it('emits discovered with correct device shape', () => {
    const discovery = new MdnsDiscovery();
    const devices: Array<{ id: string; host: string; port: number }> = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    lastOnUp?.(makeService());

    expect(devices).toHaveLength(1);
    expect(devices[0]).toEqual({
      id: '192.168.1.50:7497',
      host: '192.168.1.50',
      port: 7497,
      txtRecord: { id: 'device-uuid', version: '2.10.0', platform: 'mister' },
    });
  });

  it('prefers addresses[0] over host', () => {
    const discovery = new MdnsDiscovery();
    const devices: Array<{ host: string }> = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    lastOnUp?.(makeService({ host: 'mister.local', addresses: ['10.0.0.5'] }));

    expect(devices[0].host).toBe('10.0.0.5');
  });

  it('falls back to host when addresses is empty', () => {
    const discovery = new MdnsDiscovery();
    const devices: Array<{ host: string }> = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    lastOnUp?.(makeService({ addresses: [], host: 'fallback.local' }));

    expect(devices[0].host).toBe('fallback.local');
  });

  it('deduplicates by host:port', () => {
    const discovery = new MdnsDiscovery();
    const devices: unknown[] = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    lastOnUp?.(makeService());
    lastOnUp?.(makeService());

    expect(devices).toHaveLength(1);
  });

  it('emits removed on service down', () => {
    const discovery = new MdnsDiscovery();
    const removed: string[] = [];
    discovery.on('removed', (id) => removed.push(id));

    discovery.start();
    lastOnUp?.(makeService());
    lastBrowser.emit('down', makeService());

    expect(removed).toEqual(['192.168.1.50:7497']);
  });

  it('ignores down for unknown service', () => {
    const discovery = new MdnsDiscovery();
    const removed: string[] = [];
    discovery.on('removed', (id) => removed.push(id));

    discovery.start();
    lastBrowser.emit('down', makeService());

    expect(removed).toHaveLength(0);
  });

  it('uses default port when service port is 0', () => {
    const discovery = new MdnsDiscovery();
    const devices: Array<{ port: number; id: string }> = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    lastOnUp?.(makeService({ port: 0 }));

    expect(devices[0].port).toBe(7497);
    expect(devices[0].id).toBe('192.168.1.50:7497');
  });

  it('stops browser and destroys bonjour on stop', () => {
    const discovery = new MdnsDiscovery();
    discovery.start();
    discovery.stop();

    expect(lastBrowser.stop).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('start after stop works', () => {
    const discovery = new MdnsDiscovery();
    const devices: unknown[] = [];
    discovery.on('discovered', (device) => devices.push(device));

    discovery.start();
    discovery.stop();
    discovery.start();
    lastOnUp?.(makeService());

    expect(devices).toHaveLength(1);
  });

  it('start is no-op when already started', () => {
    const discovery = new MdnsDiscovery();
    discovery.start();
    const firstBrowser = lastBrowser;

    discovery.start();

    expect(lastBrowser).toBe(firstBrowser);
  });
});

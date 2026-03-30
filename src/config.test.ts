import { parseArgs } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

// Mock parseArgs to avoid reading real process.argv
vi.mock('node:util', () => ({
  parseArgs: vi.fn(() => ({ values: {} })),
}));

const mockParseArgs = vi.mocked(parseArgs);

describe('loadConfig', () => {
  beforeEach(() => {
    delete process.env.ZAPAROO_DEVICES;
    delete process.env.ZAPAROO_KEYS;
    delete process.env.ZAPAROO_NO_DISCOVERY;
    mockParseArgs.mockReturnValue({ values: {}, positionals: [], tokens: undefined });
  });

  afterEach(() => {
    delete process.env.ZAPAROO_DEVICES;
    delete process.env.ZAPAROO_KEYS;
    delete process.env.ZAPAROO_NO_DISCOVERY;
  });

  it('enables discovery when no devices configured', () => {
    const config = loadConfig();

    expect(config.devices).toHaveLength(0);
    expect(config.discovery).toBe(true);
  });

  it('throws when no devices configured and --no-discovery', () => {
    mockParseArgs.mockReturnValue({
      values: { 'no-discovery': true },
      positionals: [],
      tokens: undefined,
    });

    expect(() => loadConfig()).toThrow('No devices configured');
  });

  it('throws when no devices configured and ZAPAROO_NO_DISCOVERY=1', () => {
    process.env.ZAPAROO_NO_DISCOVERY = '1';

    expect(() => loadConfig()).toThrow('No devices configured');
  });

  it('sets discovery to false when devices are specified', () => {
    process.env.ZAPAROO_DEVICES = 'host:7497';
    const config = loadConfig();

    expect(config.discovery).toBe(false);
  });

  it('parses a single device with host and port', () => {
    process.env.ZAPAROO_DEVICES = '192.168.1.100:7497';
    const config = loadConfig();

    expect(config.devices).toHaveLength(1);
    expect(config.devices[0]).toEqual({
      id: '192.168.1.100:7497',
      host: '192.168.1.100',
      port: 7497,
      apiKey: undefined,
    });
  });

  it('uses default port when not specified', () => {
    process.env.ZAPAROO_DEVICES = 'myhost';
    const config = loadConfig();

    expect(config.devices[0].port).toBe(7497);
    expect(config.devices[0].id).toBe('myhost:7497');
  });

  it('parses multiple comma-separated devices', () => {
    process.env.ZAPAROO_DEVICES = '10.0.0.1:7497,10.0.0.2:8000';
    const config = loadConfig();

    expect(config.devices).toHaveLength(2);
    expect(config.devices[0].host).toBe('10.0.0.1');
    expect(config.devices[0].port).toBe(7497);
    expect(config.devices[1].host).toBe('10.0.0.2');
    expect(config.devices[1].port).toBe(8000);
  });

  it('matches API keys positionally to devices', () => {
    process.env.ZAPAROO_DEVICES = 'host1:7497,host2:7497';
    process.env.ZAPAROO_KEYS = 'key1,key2';
    const config = loadConfig();

    expect(config.devices[0].apiKey).toBe('key1');
    expect(config.devices[1].apiKey).toBe('key2');
  });

  it('leaves apiKey undefined when fewer keys than devices', () => {
    process.env.ZAPAROO_DEVICES = 'host1:7497,host2:7497,host3:7497';
    process.env.ZAPAROO_KEYS = 'key1';
    const config = loadConfig();

    expect(config.devices[0].apiKey).toBe('key1');
    expect(config.devices[1].apiKey).toBeUndefined();
    expect(config.devices[2].apiKey).toBeUndefined();
  });

  it('trims whitespace from device strings', () => {
    process.env.ZAPAROO_DEVICES = '  host1:7497 , host2:7497  ';
    const config = loadConfig();

    expect(config.devices[0].host).toBe('host1');
    expect(config.devices[1].host).toBe('host2');
  });

  it('ignores empty segments in device list', () => {
    process.env.ZAPAROO_DEVICES = 'host1:7497,,host2:7497,';
    const config = loadConfig();

    expect(config.devices).toHaveLength(2);
  });

  it('throws on invalid port (too high)', () => {
    process.env.ZAPAROO_DEVICES = 'host:99999';
    expect(() => loadConfig()).toThrow('Invalid port');
  });

  it('throws on invalid port (zero)', () => {
    process.env.ZAPAROO_DEVICES = 'host:0';
    expect(() => loadConfig()).toThrow('Invalid port');
  });

  it('throws on non-numeric port', () => {
    process.env.ZAPAROO_DEVICES = 'host:abc';
    expect(() => loadConfig()).toThrow('Invalid port');
  });

  it('handles IPv6-style host with port', () => {
    process.env.ZAPAROO_DEVICES = '::1:7497';
    const config = loadConfig();

    // lastIndexOf(':') splits on the rightmost colon
    expect(config.devices[0].host).toBe('::1');
    expect(config.devices[0].port).toBe(7497);
  });

  describe('CLI args precedence', () => {
    it('CLI --devices overrides ZAPAROO_DEVICES env var', () => {
      process.env.ZAPAROO_DEVICES = 'envhost:7497';
      mockParseArgs.mockReturnValue({
        values: { devices: 'clihost:8000' },
        positionals: [],
        tokens: undefined,
      });

      const config = loadConfig();

      expect(config.devices[0].host).toBe('clihost');
      expect(config.devices[0].port).toBe(8000);
    });

    it('CLI --keys overrides ZAPAROO_KEYS env var', () => {
      process.env.ZAPAROO_DEVICES = 'host:7497';
      process.env.ZAPAROO_KEYS = 'envkey';
      mockParseArgs.mockReturnValue({
        values: { devices: 'host:7497', keys: 'clikey' },
        positionals: [],
        tokens: undefined,
      });

      const config = loadConfig();

      expect(config.devices[0].apiKey).toBe('clikey');
    });
  });
});

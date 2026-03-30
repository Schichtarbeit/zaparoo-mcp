import { parseArgs } from 'node:util';

const DEFAULT_PORT = 7497;

export interface DeviceConfig {
  id: string;
  host: string;
  port: number;
  apiKey?: string;
}

export interface Config {
  devices: DeviceConfig[];
  discovery: boolean;
}

function parseDeviceList(raw: string, keys: string): DeviceConfig[] {
  const hosts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const apiKeys = keys
    ? keys
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return hosts.map((hostStr, i) => {
    const [host, portStr] = hostStr.includes(':')
      ? [hostStr.slice(0, hostStr.lastIndexOf(':')), hostStr.slice(hostStr.lastIndexOf(':') + 1)]
      : [hostStr, undefined];

    const port = portStr ? Number.parseInt(portStr, 10) : DEFAULT_PORT;
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port for device "${hostStr}": ${portStr}`);
    }

    const id = `${host}:${port}`;
    return {
      id,
      host,
      port,
      apiKey: apiKeys[i],
    };
  });
}

export function loadConfig(): Config {
  const { values } = parseArgs({
    options: {
      devices: { type: 'string' },
      keys: { type: 'string' },
      'no-discovery': { type: 'boolean' },
    },
    strict: false,
  });

  const devicesRaw = (values.devices as string | undefined) ?? process.env.ZAPAROO_DEVICES ?? '';
  const keysRaw = (values.keys as string | undefined) ?? process.env.ZAPAROO_KEYS ?? '';
  const noDiscovery =
    (values['no-discovery'] as boolean | undefined) ?? process.env.ZAPAROO_NO_DISCOVERY === '1';

  if (!devicesRaw) {
    if (noDiscovery) {
      throw new Error(
        'No devices configured. Use --devices <host:port,...> or set ZAPAROO_DEVICES env var.',
      );
    }
    return { devices: [], discovery: true };
  }

  return {
    devices: parseDeviceList(devicesRaw, keysRaw),
    discovery: false,
  };
}

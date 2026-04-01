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
  allowedTools?: string[];
  blockedTools?: string[];
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
      'allowed-tools': { type: 'string' },
      'blocked-tools': { type: 'string' },
    },
    strict: false,
  });

  const devicesRaw = (values.devices as string | undefined) ?? process.env.ZAPAROO_DEVICES ?? '';
  const keysRaw = (values.keys as string | undefined) ?? process.env.ZAPAROO_KEYS ?? '';
  const noDiscovery =
    (values['no-discovery'] as boolean | undefined) ?? process.env.ZAPAROO_NO_DISCOVERY === '1';

  const allowedToolsRaw =
    (values['allowed-tools'] as string | undefined) ?? process.env.ZAPAROO_ALLOWED_TOOLS ?? '';
  const blockedToolsRaw =
    (values['blocked-tools'] as string | undefined) ?? process.env.ZAPAROO_BLOCKED_TOOLS ?? '';

  const allowedTools = allowedToolsRaw
    ? allowedToolsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const blockedTools = blockedToolsRaw
    ? blockedToolsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  if (allowedTools && blockedTools) {
    throw new Error(
      'Cannot use both allowed and blocked tools. Set only --allowed-tools/ZAPAROO_ALLOWED_TOOLS or --blocked-tools/ZAPAROO_BLOCKED_TOOLS, not both.',
    );
  }

  if (!devicesRaw) {
    if (noDiscovery) {
      throw new Error(
        'No devices configured. Use --devices <host:port,...> or set ZAPAROO_DEVICES env var.',
      );
    }
    return { devices: [], discovery: true, allowedTools, blockedTools };
  }

  return {
    devices: parseDeviceList(devicesRaw, keysRaw),
    discovery: false,
    allowedTools,
    blockedTools,
  };
}

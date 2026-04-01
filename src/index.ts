import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { DeviceManager } from './connection/manager.js';
import { TraceBuffer } from './connection/trace.js';
import { MdnsDiscovery } from './discovery/mdns.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const traceBuffer = new TraceBuffer();
  const manager = new DeviceManager(config.devices, traceBuffer);
  const server = createServer(manager, traceBuffer, config);

  let discovery: MdnsDiscovery | null = null;

  if (config.discovery) {
    discovery = new MdnsDiscovery();

    discovery.on('discovered', (device) => {
      console.error(
        `[discovery] found device: ${device.id}` +
          (device.txtRecord.platform ? ` (platform=${device.txtRecord.platform})` : ''),
      );
      manager.addDevice({
        id: device.id,
        host: device.host,
        port: device.port,
      });
    });

    discovery.on('removed', (deviceId) => {
      console.error(`[discovery] device removed from network: ${deviceId} (connection maintained)`);
    });

    discovery.start();

    console.error('zaparoo-mcp started with mDNS discovery (no devices configured)');
  } else {
    manager.connectAll();
    console.error(
      `zaparoo-mcp started with ${config.devices.length} device(s): ${config.devices.map((d) => d.id).join(', ')}`,
    );
  }

  const shutdown = () => {
    discovery?.stop();
    manager.destroyAll();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

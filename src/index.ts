import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { DeviceManager } from './connection/manager.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const manager = new DeviceManager(config.devices);
  const server = createServer(manager);

  // Start device connections (non-blocking, reconnects on failure)
  manager.connectAll();

  // Connect MCP server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for JSON-RPC)
  console.error(
    `zaparoo-mcp started with ${config.devices.length} device(s): ${config.devices.map((d) => d.id).join(', ')}`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

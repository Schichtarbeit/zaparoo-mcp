import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from './connection/manager.js';
import { NotificationHandler } from './notifications/handler.js';
import { registerDeviceStateResources } from './resources/device-state.js';
import { registerZapScriptReference } from './resources/zapscript-ref.js';
import { registerAllTools } from './tools/index.js';

const SERVER_INSTRUCTIONS = `This server controls Zaparoo devices — NFC-based game launchers for retro gaming systems. Before writing or explaining ZapScript commands, read the zaparoo://reference/zapscript resource. Use zaparoo_run to execute ZapScript on a connected device. Use zaparoo_devices to check which devices are available and their connection state.`;

export function createServer(manager: DeviceManager): McpServer {
  const server = new McpServer(
    { name: 'zaparoo-mcp', version: '0.1.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        logging: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // Wire up notification pipeline
  const notificationHandler = new NotificationHandler(server.server, manager);

  // Register all tools
  registerAllTools(server, manager);

  // Register resources
  registerDeviceStateResources(server, manager, notificationHandler);
  registerZapScriptReference(server);

  return server;
}

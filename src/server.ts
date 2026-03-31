import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from './connection/manager.js';
import type { TraceBuffer } from './connection/trace.js';
import { NotificationBuffer } from './notifications/buffer.js';
import { NotificationHandler } from './notifications/handler.js';
import { registerAllPrompts } from './prompts/index.js';
import { registerDeviceStateResources } from './resources/device-state.js';
import { registerZapScriptReference } from './resources/zapscript-ref.js';
import { registerAllTools } from './tools/index.js';

const SERVER_INSTRUCTIONS = `This server controls Zaparoo devices — NFC-based game launchers for retro gaming systems.

Devices: Multiple Zaparoo devices may be connected, each identified by host:port (e.g. "192.168.1.50:7497"). Each device has a platform (e.g. "mister", "windows", "batocera", "steamos", "linux", "mac"). Use zaparoo_devices list to see connected devices and match user references like "my MiSTer" or "the Steam Deck" to the correct device by platform. Pass the device parameter to target a specific device. If no device is specified, the default or first available device is used.

ZapScript: Before writing or explaining ZapScript commands, read the zaparoo://reference/zapscript resource.

Key tools: Use zaparoo_run to execute ZapScript. Use zaparoo_media search to find games. Use zaparoo_devices set_default to set a session default device.`;

export function createServer(manager: DeviceManager, traceBuffer: TraceBuffer): McpServer {
  const server = new McpServer(
    { name: 'zaparoo-mcp', version: '0.1.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // Wire up notification pipeline
  const notificationBuffer = new NotificationBuffer();
  const notificationHandler = new NotificationHandler(server.server, manager, notificationBuffer);

  // Register all tools, prompts, and resources
  registerAllTools(server, manager, notificationBuffer, traceBuffer);
  registerAllPrompts(server);
  registerDeviceStateResources(server, manager, notificationHandler);
  registerZapScriptReference(server);

  return server;
}

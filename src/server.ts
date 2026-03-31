import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from './connection/manager.js';
import type { TraceBuffer } from './connection/trace.js';
import { NotificationBuffer } from './notifications/buffer.js';
import { NotificationHandler } from './notifications/handler.js';
import { registerAllPrompts } from './prompts/index.js';
import { registerDeviceStateResources } from './resources/device-state.js';
import { registerZapScriptReference } from './resources/zapscript-ref.js';
import { registerAllTools } from './tools/index.js';

declare const PACKAGE_VERSION: string;

const SERVER_INSTRUCTIONS = `This server controls Zaparoo devices. Zaparoo is the open source universal loading system that lets users launch games and media instantly using physical objects like NFC cards.

Devices: Multiple Zaparoo devices may be connected, each identified by host:port (e.g. "192.168.1.50:7497"). Each device has a platform (e.g. "mister", "windows", "batocera", "steamos", "linux", "mac"). Use zaparoo_devices list to see connected devices and match user references like "my MiSTer" or "the Steam Deck" to the correct device by platform. Pass the device parameter to target a specific device. If no device is specified, the default or first available device is used.

ZapScript: Before writing or explaining ZapScript commands, read the zaparoo://reference/zapscript resource.

Workflows: To launch a game, search with zaparoo_media first, then execute with zaparoo_run. To pause/resume without exiting, use zaparoo_media_control — use zaparoo_stop only to fully exit. To write NFC tags, check readers with zaparoo_readers first, then write with zaparoo_readers_write.`;

export function createServer(manager: DeviceManager, traceBuffer: TraceBuffer): McpServer {
  const server = new McpServer(
    { name: 'zaparoo-mcp', version: PACKAGE_VERSION },
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

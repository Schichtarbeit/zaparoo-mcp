import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from '../connection/manager.js';
import { registerAdminTool } from './admin.js';
import { registerDevicesTool } from './devices.js';
import { registerInboxTool } from './inbox.js';
import { registerInputTool } from './input.js';
import { registerMappingsTool } from './mappings.js';
import { registerMediaTool } from './media.js';
import { registerReadersTool } from './readers.js';
import { registerRunTool } from './run.js';
import { registerScreenshotTool } from './screenshot.js';
import { registerSettingsTool } from './settings.js';
import { registerStopTool } from './stop.js';
import { registerSystemsTool } from './systems.js';
import { registerTokensTool } from './tokens.js';

export function registerAllTools(server: McpServer, manager: DeviceManager): void {
  registerDevicesTool(server, manager);
  registerRunTool(server, manager);
  registerStopTool(server, manager);
  registerTokensTool(server, manager);
  registerMediaTool(server, manager);
  registerSettingsTool(server, manager);
  registerReadersTool(server, manager);
  registerMappingsTool(server, manager);
  registerSystemsTool(server, manager);
  registerScreenshotTool(server, manager);
  registerAdminTool(server, manager);
  registerInputTool(server, manager);
  registerInboxTool(server, manager);
}

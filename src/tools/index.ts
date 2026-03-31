import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from '../connection/manager.js';
import type { TraceBuffer } from '../connection/trace.js';
import type { NotificationBuffer } from '../notifications/buffer.js';
import { registerAdminTool } from './admin.js';
import { registerAdminManageTool } from './admin-manage.js';
import { registerDevicesTool } from './devices.js';
import { registerInboxTool } from './inbox.js';
import { registerInputTool } from './input.js';
import { registerLogsTool } from './logs.js';
import { registerMappingsTool } from './mappings.js';
import { registerMediaTool } from './media.js';
import { registerMediaControlTool } from './media-control.js';
import { registerMediaIndexTool } from './media-index.js';
import { registerNotificationsTool } from './notifications.js';
import { registerReadersTool } from './readers.js';
import { registerReadersWriteTool } from './readers-write.js';
import { registerRunTool } from './run.js';
import { registerScreenshotTool } from './screenshot.js';
import { registerSettingsTool } from './settings.js';
import { registerSettingsUpdateTool } from './settings-update.js';
import { registerStopTool } from './stop.js';
import { registerSystemsTool } from './systems.js';
import { registerTokensTool } from './tokens.js';

export function registerAllTools(
  server: McpServer,
  manager: DeviceManager,
  notificationBuffer: NotificationBuffer,
  traceBuffer: TraceBuffer,
): void {
  registerDevicesTool(server, manager);
  registerRunTool(server, manager);
  registerStopTool(server, manager);
  registerTokensTool(server, manager);
  registerMediaTool(server, manager);
  registerMediaControlTool(server, manager);
  registerMediaIndexTool(server, manager);
  registerSettingsTool(server, manager);
  registerSettingsUpdateTool(server, manager);
  registerReadersTool(server, manager);
  registerReadersWriteTool(server, manager);
  registerMappingsTool(server, manager);
  registerSystemsTool(server, manager);
  registerScreenshotTool(server, manager);
  registerAdminTool(server, manager);
  registerAdminManageTool(server, manager);
  registerInputTool(server, manager);
  registerInboxTool(server, manager);
  registerNotificationsTool(server, notificationBuffer);
  registerLogsTool(server, manager, traceBuffer);
}

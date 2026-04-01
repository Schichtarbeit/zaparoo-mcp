import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../config.js';
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

export function filterTools(
  allNames: string[],
  config: Pick<Config, 'allowedTools' | 'blockedTools'>,
): Set<string> {
  if (config.allowedTools) {
    return new Set(config.allowedTools);
  }
  if (config.blockedTools) {
    const blocked = new Set(config.blockedTools);
    return new Set(allNames.filter((name) => !blocked.has(name)));
  }
  return new Set(allNames);
}

export function registerAllTools(
  server: McpServer,
  manager: DeviceManager,
  notificationBuffer: NotificationBuffer,
  traceBuffer: TraceBuffer,
  config: Config,
): void {
  // Names here must match the first argument to server.registerTool() in each tool file.
  const registry: Array<{ name: string; register: () => void }> = [
    { name: 'zaparoo_devices', register: () => registerDevicesTool(server, manager) },
    { name: 'zaparoo_run', register: () => registerRunTool(server, manager) },
    { name: 'zaparoo_stop', register: () => registerStopTool(server, manager) },
    { name: 'zaparoo_tokens', register: () => registerTokensTool(server, manager) },
    { name: 'zaparoo_media', register: () => registerMediaTool(server, manager) },
    { name: 'zaparoo_media_control', register: () => registerMediaControlTool(server, manager) },
    { name: 'zaparoo_media_index', register: () => registerMediaIndexTool(server, manager) },
    { name: 'zaparoo_settings', register: () => registerSettingsTool(server, manager) },
    {
      name: 'zaparoo_settings_update',
      register: () => registerSettingsUpdateTool(server, manager),
    },
    { name: 'zaparoo_readers', register: () => registerReadersTool(server, manager) },
    { name: 'zaparoo_readers_write', register: () => registerReadersWriteTool(server, manager) },
    { name: 'zaparoo_mappings', register: () => registerMappingsTool(server, manager) },
    { name: 'zaparoo_systems', register: () => registerSystemsTool(server, manager) },
    { name: 'zaparoo_screenshot', register: () => registerScreenshotTool(server, manager) },
    { name: 'zaparoo_admin', register: () => registerAdminTool(server, manager) },
    { name: 'zaparoo_admin_manage', register: () => registerAdminManageTool(server, manager) },
    { name: 'zaparoo_input', register: () => registerInputTool(server, manager) },
    { name: 'zaparoo_inbox', register: () => registerInboxTool(server, manager) },
    {
      name: 'zaparoo_notifications',
      register: () => registerNotificationsTool(server, notificationBuffer),
    },
    {
      name: 'zaparoo_logs',
      register: () => registerLogsTool(server, manager, traceBuffer),
    },
  ];

  const allNames = registry.map((t) => t.name);
  const enabled = filterTools(allNames, config);

  if (config.allowedTools) {
    const knownNames = new Set(allNames);
    for (const name of config.allowedTools) {
      if (!knownNames.has(name)) {
        console.error(`[config] warning: allowed tool "${name}" does not match any known tool`);
      }
    }
  }

  for (const entry of registry) {
    if (enabled.has(entry.name)) {
      entry.register();
    }
  }
}

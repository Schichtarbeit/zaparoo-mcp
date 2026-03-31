import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import type { PlaytimeLimitsResponse, SettingsResponse } from '../types.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerSettingsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_settings',
    {
      title: 'Zaparoo Settings',
      annotations: { readOnlyHint: true },
      description: `Read Zaparoo device configuration.

Actions:
- get: Get all settings including playtime limits (merged response)
- logs: Download device log file. Response contains a base64-encoded JSONL log file. Decode the base64 "content" field to read the logs. Each line is a JSON object. The most recent entries are at the end of the file — read from the bottom for the latest activity.`,
      inputSchema: z.object({
        action: z.enum(['get', 'logs']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ action, device }) => {
      switch (action) {
        case 'get': {
          try {
            const dev = manager.getDevice(device);
            const [settings, limits] = await Promise.all([
              dev.request<SettingsResponse>(Methods.Settings),
              dev.request<PlaytimeLimitsResponse>(Methods.PlaytimeLimits),
            ]);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ settings, playtimeLimits: limits }, null, 2),
                },
              ],
            };
          } catch (err) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${err instanceof Error ? err.message : String(err)}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'logs':
          return toolRequest(manager, device, Methods.SettingsLogsDownload);

        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

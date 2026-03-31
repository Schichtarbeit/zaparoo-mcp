import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import type { PlaytimeLimitsResponse, SettingsResponse } from '../types.js';
import { Methods } from '../types.js';

export function registerSettingsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_settings',
    {
      title: 'Zaparoo Settings',
      annotations: { readOnlyHint: true },
      description:
        'Get all Zaparoo device settings. Returns general configuration (scan mode, audio feedback, debug logging, reader connections) and playtime limit settings. Use zaparoo_settings_update to modify settings, or zaparoo_logs for device log access.',
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }) => {
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
    },
  );
}

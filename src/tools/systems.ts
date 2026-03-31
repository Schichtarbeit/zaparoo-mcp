import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerSystemsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_systems',
    {
      title: 'Zaparoo Systems',
      annotations: { readOnlyHint: true },
      description:
        'List all game systems available on a Zaparoo device (e.g. "snes", "genesis", "n64"). System IDs returned here can be used to filter searches in zaparoo_media and target random launches in zaparoo_run.',
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }) => {
      return toolRequest(manager, device, Methods.Systems);
    },
  );
}

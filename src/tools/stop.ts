import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerStopTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_stop',
    {
      title: 'Zaparoo Stop',
      description: 'Stop the currently running media/game on a Zaparoo device.',
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }) => {
      return toolRequest(manager, device, Methods.Stop);
    },
  );
}

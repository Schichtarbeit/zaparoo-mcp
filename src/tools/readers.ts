import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerReadersTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_readers',
    {
      title: 'Zaparoo Readers',
      annotations: { readOnlyHint: true },
      description:
        "List NFC readers connected to a Zaparoo device. Returns each reader's driver, device path, and connection status. Use this to check reader availability before writing NFC tags with zaparoo_readers_write.",
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }) => {
      return toolRequest(manager, device, Methods.Readers);
    },
  );
}

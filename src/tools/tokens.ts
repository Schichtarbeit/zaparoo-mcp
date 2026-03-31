import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerTokensTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_tokens',
    {
      title: 'Zaparoo Tokens',
      annotations: { readOnlyHint: true },
      description:
        'Query NFC tokens on a Zaparoo device. Use "list" to see tokens currently on a reader, or "history" to see a log of past token scans with timestamps and the text/UID that was read.',
      inputSchema: z.object({
        action: z.enum(['list', 'history']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ action, device }) => {
      const method = action === 'list' ? Methods.Tokens : Methods.TokensHistory;
      return toolRequest(manager, device, method);
    },
  );
}

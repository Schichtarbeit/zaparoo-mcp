import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerReadersWriteTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_readers_write',
    {
      title: 'Zaparoo Readers Write',
      annotations: { readOnlyHint: false, openWorldHint: true },
      description: `Write to NFC tags via a connected reader.

Actions:
- write: Write text to an NFC tag (text required, readerId optional)
- cancel: Cancel a pending write operation`,
      inputSchema: z.object({
        action: z.enum(['write', 'cancel']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        text: z.string().optional().describe('Text to write to NFC tag (write action)'),
        readerId: z.string().optional().describe('Specific reader to use'),
      }),
    },
    async ({ action, device, text, readerId }) => {
      switch (action) {
        case 'write':
          if (!text) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "text" parameter is required for write action',
                },
              ],
              isError: true,
            };
          }
          return toolRequest(
            manager,
            device,
            Methods.ReadersWrite,
            { text, readerId },
            'Write operation started — place NFC tag on reader',
          );
        case 'cancel':
          return toolRequest(
            manager,
            device,
            Methods.ReadersWriteCancel,
            readerId ? { readerId } : undefined,
            'Write operation cancelled',
          );
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

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
      description: `Manage NFC readers connected to a Zaparoo device.

Actions:
- list: List connected readers and their capabilities
- write: Write text to an NFC tag via a connected reader (text required, readerId optional)
- cancel_write: Cancel a pending write operation`,
      inputSchema: z.object({
        action: z.enum(['list', 'write', 'cancel_write']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        text: z.string().optional().describe('Text to write to NFC tag (write action)'),
        readerId: z
          .string()
          .optional()
          .describe('Specific reader to use (write/cancel_write actions)'),
      }),
    },
    async ({ action, device, text, readerId }) => {
      switch (action) {
        case 'list':
          return toolRequest(manager, device, Methods.Readers);
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
          return toolRequest(manager, device, Methods.ReadersWrite, { text, readerId });
        case 'cancel_write':
          return toolRequest(
            manager,
            device,
            Methods.ReadersWriteCancel,
            readerId ? { readerId } : undefined,
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

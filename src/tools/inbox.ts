import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerInboxTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_inbox',
    {
      title: 'Zaparoo Inbox',
      annotations: { readOnlyHint: false, destructiveHint: true },
      description: `Manage device inbox messages.

Actions:
- list: List all inbox messages
- delete: Delete a specific message (id required)
- clear: Delete all inbox messages`,
      inputSchema: z.object({
        action: z.enum(['list', 'delete', 'clear']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        id: z.number().optional().describe('Message ID (delete action)'),
      }),
    },
    async ({ action, device, id }) => {
      switch (action) {
        case 'list':
          return toolRequest(manager, device, Methods.Inbox);
        case 'delete':
          if (!id) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "id" parameter is required for delete action',
                },
              ],
              isError: true,
            };
          }
          return toolRequest(manager, device, Methods.InboxDelete, { id }, 'Inbox message deleted');
        case 'clear':
          return toolRequest(manager, device, Methods.InboxClear, undefined, 'Inbox cleared');
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

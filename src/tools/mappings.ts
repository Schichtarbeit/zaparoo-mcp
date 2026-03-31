import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerMappingsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_mappings',
    {
      title: 'Zaparoo Mappings',
      annotations: { readOnlyHint: false, destructiveHint: true },
      description: `Manage token-to-action mappings on a Zaparoo device. Mappings define what happens when a specific NFC token is scanned.

Actions:
- list: List all configured mappings
- create: Create a new mapping (type, match, pattern required)
- update: Update an existing mapping (id required)
- delete: Delete a mapping (id required)
- reload: Reload mappings from disk`,
      inputSchema: z.object({
        action: z
          .enum(['list', 'create', 'update', 'delete', 'reload'])
          .describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        id: z.number().optional().describe('Mapping ID (update/delete actions)'),
        label: z.string().optional().describe('Human-readable label'),
        type: z
          .enum(['id', 'value', 'data', 'uid', 'text'])
          .optional()
          .describe('Token field to match against'),
        match: z.enum(['exact', 'partial', 'regex']).optional().describe('Match strategy'),
        pattern: z.string().optional().describe('Pattern to match'),
        override: z.string().optional().describe('ZapScript override when matched'),
        enabled: z.boolean().optional().describe('Whether the mapping is active'),
      }),
    },
    async (args) => {
      const { action, device } = args;

      switch (action) {
        case 'list':
          return toolRequest(manager, device, Methods.Mappings);

        case 'create':
          return toolRequest(
            manager,
            device,
            Methods.MappingsNew,
            {
              label: args.label,
              type: args.type,
              match: args.match,
              pattern: args.pattern,
              override: args.override,
              enabled: args.enabled ?? true,
            },
            'Mapping created',
          );

        case 'update': {
          if (!args.id) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "id" parameter is required for update action',
                },
              ],
              isError: true,
            };
          }
          const params: Record<string, unknown> = { id: args.id };
          for (const key of ['label', 'type', 'match', 'pattern', 'override', 'enabled'] as const) {
            if (args[key] !== undefined) params[key] = args[key];
          }
          return toolRequest(manager, device, Methods.MappingsUpdate, params, 'Mapping updated');
        }

        case 'delete':
          if (!args.id) {
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
          return toolRequest(
            manager,
            device,
            Methods.MappingsDelete,
            { id: args.id },
            'Mapping deleted',
          );

        case 'reload':
          return toolRequest(
            manager,
            device,
            Methods.MappingsReload,
            undefined,
            'Mappings reloaded from disk',
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

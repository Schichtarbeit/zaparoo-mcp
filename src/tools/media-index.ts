import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { pick, toolRequest } from './helpers.js';

export function registerMediaIndexTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_media_index',
    {
      title: 'Zaparoo Media Index',
      annotations: { readOnlyHint: false, destructiveHint: false },
      description: `Manage the Zaparoo media database index. Run generate after adding new games to make them searchable. Indexing can take a long time depending on library size.

Actions:
- generate: Start media database indexing (systems optional)
- cancel: Cancel ongoing indexing`,
      inputSchema: z.object({
        action: z.enum(['generate', 'cancel']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        systems: z
          .array(z.string())
          .optional()
          .describe(
            'System IDs to index, e.g. ["snes", "genesis"]. Omit to index all systems (generate action).',
          ),
      }),
    },
    async (args) => {
      switch (args.action) {
        case 'generate':
          return toolRequest(
            manager,
            args.device,
            Methods.MediaGenerate,
            { ...pick(args, ['systems']), fuzzySystem: true },
            'Media indexing started',
          );
        case 'cancel':
          return toolRequest(
            manager,
            args.device,
            Methods.MediaGenerateCancel,
            undefined,
            'Media indexing cancelled',
          );
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${args.action}` }],
            isError: true,
          };
      }
    },
  );
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerAdminManageTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_admin_manage',
    {
      title: 'Zaparoo Admin Manage',
      annotations: { readOnlyHint: false, destructiveHint: true },
      description: `Perform device administration actions. Use zaparoo_admin to query info before taking action.

Actions:
- refresh_launchers: Refresh the launcher cache (use after adding or removing games)
- apply_update: Apply a pending software update (restarts the device — check availability first with zaparoo_admin check_update)`,
      inputSchema: z.object({
        action: z.enum(['refresh_launchers', 'apply_update']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ action, device }) => {
      switch (action) {
        case 'refresh_launchers':
          return toolRequest(
            manager,
            device,
            Methods.LaunchersRefresh,
            undefined,
            'Launcher cache refreshed',
          );
        case 'apply_update':
          return toolRequest(manager, device, Methods.UpdateApply);
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

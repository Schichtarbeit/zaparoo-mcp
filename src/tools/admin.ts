import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

const ACTION_MAP: Record<string, string> = {
  version: Methods.Version,
  health: Methods.Health,
  refresh_launchers: Methods.LaunchersRefresh,
  check_update: Methods.UpdateCheck,
  apply_update: Methods.UpdateApply,
};

export function registerAdminTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_admin',
    {
      title: 'Zaparoo Admin',
      description: `Device administration commands.

Actions:
- version: Get the Zaparoo Core version and platform
- health: Health check (returns "ok" if running)
- refresh_launchers: Refresh the launcher cache
- check_update: Check if a software update is available
- apply_update: Apply a pending software update`,
      inputSchema: z.object({
        action: z
          .enum(['version', 'health', 'refresh_launchers', 'check_update', 'apply_update'])
          .describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ action, device }) => {
      const method = ACTION_MAP[action];
      return toolRequest(manager, device, method);
    },
  );
}

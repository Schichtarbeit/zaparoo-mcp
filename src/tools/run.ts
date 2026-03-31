import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerRunTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_run',
    {
      title: 'Zaparoo Run',
      annotations: { readOnlyHint: false, openWorldHint: true },
      description:
        'Execute ZapScript on a Zaparoo device. ZapScript can launch games by path or title, send keyboard/gamepad input, control playlists, make HTTP requests, and chain multiple commands. Use zaparoo_media search to find the correct game path before launching. Consult the zaparoo://reference/zapscript resource for full syntax before composing commands.',
      inputSchema: z.object({
        zapscript: z
          .string()
          .min(1)
          .describe(
            'ZapScript command to execute (e.g. "SNES/Super Metroid.sfc", "**launch.random:snes", "**stop")',
          ),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ zapscript, device }) => {
      return toolRequest(
        manager,
        device,
        Methods.Run,
        { text: zapscript },
        'ZapScript executed successfully',
      );
    },
  );
}

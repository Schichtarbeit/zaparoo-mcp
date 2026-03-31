import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerMediaControlTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_media_control',
    {
      title: 'Zaparoo Media Control',
      annotations: { readOnlyHint: false, openWorldHint: true },
      description:
        'Send a control command to the active launcher on a Zaparoo device without stopping it. Available actions depend on the launcher but commonly include: toggle_pause, save_state, fast_forward, rewind, next, previous. Use zaparoo_stop instead to fully exit the current media.',
      inputSchema: z.object({
        controlAction: z
          .string()
          .describe(
            'Control action to send (e.g. "toggle_pause", "save_state", "fast_forward", "rewind", "next", "previous")',
          ),
        controlArgs: z
          .record(z.string())
          .optional()
          .describe('Optional key-value arguments for the control action'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ controlAction, controlArgs, device }) => {
      return toolRequest(
        manager,
        device,
        Methods.MediaControl,
        { action: controlAction, args: controlArgs },
        'Control command sent',
      );
    },
  );
}

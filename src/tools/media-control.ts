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
        'Send a control action to the active launcher on a Zaparoo device (e.g. pause, resume).',
      inputSchema: z.object({
        controlAction: z.string().describe('Control action name'),
        controlArgs: z.record(z.string()).optional().describe('Control action arguments'),
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

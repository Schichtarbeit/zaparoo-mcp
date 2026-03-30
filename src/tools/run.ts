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
      description:
        'Execute ZapScript on a Zaparoo device. Consult the zaparoo://reference/zapscript resource for syntax before writing ZapScript.',
      inputSchema: z.object({
        zapscript: z.string().describe('ZapScript command to execute'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ zapscript, device }) => {
      return toolRequest(manager, device, Methods.Run, { text: zapscript });
    },
  );
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerScreenshotTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_screenshot',
    {
      title: 'Zaparoo Screenshot',
      description:
        'Capture a screenshot from a Zaparoo device. Returns the image as base64-encoded data.',
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }) => {
      return toolRequest(manager, device, Methods.Screenshot);
    },
  );
}

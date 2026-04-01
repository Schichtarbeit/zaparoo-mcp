import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import type { ScreenshotResponse } from '../types.js';
import { Methods } from '../types.js';

export function registerScreenshotTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_screenshot',
    {
      title: 'Zaparoo Screenshot',
      annotations: { readOnlyHint: true },
      description:
        'Capture a screenshot from a Zaparoo device. Returns the current display as a base64-encoded PNG image. Use this to verify what game is running, check the current screen state, or help identify an unknown game.',
      inputSchema: z.object({
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ device }): Promise<CallToolResult> => {
      try {
        const dev = manager.getDevice(device);
        const result = await dev.request<ScreenshotResponse>(Methods.Screenshot);
        return {
          content: [{ type: 'image', data: result.data, mimeType: 'image/png' }],
        };
      } catch (err) {
        return {
          content: [
            { type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` },
          ],
          isError: true,
        };
      }
    },
  );
}

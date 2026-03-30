import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';

export function registerDevicesTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_devices',
    {
      title: 'Zaparoo Devices',
      description:
        'Manage Zaparoo device connections. Use "list" to see all configured devices and their connection state, or "reconnect" to force a reconnection to a specific device.',
      inputSchema: z.object({
        action: z.enum(['list', 'reconnect']).describe('Action to perform'),
        device: z.string().optional().describe('Device ID (host:port) for reconnect action'),
      }),
    },
    async ({ action, device }) => {
      switch (action) {
        case 'list': {
          const devices = manager.getAllDeviceInfo();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(devices, null, 2),
              },
            ],
          };
        }

        case 'reconnect': {
          if (!device) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "device" parameter is required for reconnect',
                },
              ],
              isError: true,
            };
          }
          try {
            manager.reconnect(device);
            return {
              content: [{ type: 'text' as const, text: `Reconnecting to ${device}...` }],
            };
          } catch (err) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${err instanceof Error ? err.message : String(err)}`,
                },
              ],
              isError: true,
            };
          }
        }
      }
    },
  );
}

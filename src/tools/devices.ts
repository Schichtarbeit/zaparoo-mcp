import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';

export function registerDevicesTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_devices',
    {
      title: 'Zaparoo Devices',
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      description: `Manage Zaparoo device connections.

Actions:
- list: List all configured devices and their connection state
- reconnect: Force a reconnection to a specific device (device required)
- set_default: Set a device as the session default (device to set, omit to clear)`,
      inputSchema: z.object({
        action: z.enum(['list', 'reconnect', 'set_default']).describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port) for reconnect/set_default actions'),
      }),
    },
    async ({ action, device }) => {
      switch (action) {
        case 'list': {
          const defaultId = manager.getDefaultDeviceId();
          const devices = manager.getAllDeviceInfo().map((d) => ({
            ...d,
            isDefault: d.id === defaultId,
          }));
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

        case 'set_default': {
          try {
            manager.setDefaultDevice(device ?? null);
            const message = device
              ? `Default device set to ${device}`
              : 'Default device cleared — will auto-select first available device';
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ success: true, message }),
                },
              ],
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

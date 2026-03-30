import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DeviceManager } from '../connection/manager.js';
import type { NotificationHandler } from '../notifications/handler.js';

export function registerDeviceStateResources(
  server: McpServer,
  manager: DeviceManager,
  notificationHandler: NotificationHandler,
): void {
  // Static resource: all devices overview
  server.registerResource(
    'devices',
    'zaparoo://devices',
    {
      description: 'All configured Zaparoo devices and their connection state',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'zaparoo://devices',
          mimeType: 'application/json',
          text: JSON.stringify(manager.getAllDeviceInfo(), null, 2),
        },
      ],
    }),
  );

  // Dynamic resource template: per-device state
  server.registerResource(
    'device-state',
    new ResourceTemplate('zaparoo://{deviceId}/state', { list: undefined }),
    {
      description:
        'Detailed state for a specific Zaparoo device including readers, active media, and recent notifications',
      mimeType: 'application/json',
    },
    async (uri, { deviceId }) => {
      const id = Array.isArray(deviceId) ? deviceId[0] : deviceId;
      const state = notificationHandler.stateStore.getState(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    },
  );
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod/v3';
import type { BufferedNotification, NotificationBuffer } from '../notifications/buffer.js';

export function registerNotificationsTool(server: McpServer, buffer: NotificationBuffer): void {
  server.registerTool(
    'zaparoo_notifications',
    {
      title: 'Zaparoo Notifications',
      annotations: { readOnlyHint: false },
      description: `Watch for real-time notifications from Zaparoo devices.

Actions:
- recent: Return buffered notifications (up to 200). Use "count" to limit, "since" to filter by timestamp, and "methods" to filter by notification type.
- watch: Long-poll — blocks until a matching notification arrives or timeout expires. Returns the notification received, or an empty array on timeout. Use "methods" to watch for specific types (e.g. ["tokens.added"]).
- clear: Reset the notification buffer.

Notification methods: tokens.added, tokens.removed, media.started, media.stopped, media.indexing, readers.added, readers.removed, playtime.limit.reached, playtime.limit.warning, inbox.added`,
      inputSchema: z.object({
        action: z.enum(['recent', 'watch', 'clear']).describe('Action to perform'),
        count: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('Maximum notifications to return (default 50)'),
        since: z
          .string()
          .optional()
          .describe('ISO 8601 timestamp — only return notifications after this time'),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(60)
          .optional()
          .describe('Seconds to wait in watch mode (default 30)'),
        methods: z
          .array(z.string())
          .optional()
          .describe(
            'Filter by notification method names (e.g. ["tokens.added", "media.started"]). Defaults to all.',
          ),
      }),
    },
    async ({ action, count, since, timeout, methods }) => {
      switch (action) {
        case 'recent': {
          const entries = buffer.getRecent(count ?? 50, since, methods);
          return {
            content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
          };
        }

        case 'watch':
          return watchForNotification(buffer, timeout ?? 30, methods);

        case 'clear':
          buffer.clear();
          return {
            content: [
              { type: 'text', text: JSON.stringify({ success: true, message: 'Buffer cleared' }) },
            ],
          };

        default:
          return {
            content: [{ type: 'text', text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

function watchForNotification(
  buffer: NotificationBuffer,
  timeoutSeconds: number,
  methods?: string[],
): Promise<CallToolResult> {
  const methodSet = methods && methods.length > 0 ? new Set(methods) : null;

  return new Promise<CallToolResult>((resolve) => {
    const onNotification = (entry: BufferedNotification) => {
      if (methodSet && !methodSet.has(entry.method)) return;
      cleanup();
      resolve({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ notifications: [entry], timedOut: false }, null, 2),
          },
        ],
      });
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({
        content: [
          { type: 'text', text: JSON.stringify({ notifications: [], timedOut: true }, null, 2) },
        ],
      });
    }, timeoutSeconds * 1000);

    const cleanup = () => {
      buffer.removeListener('notification', onNotification);
      clearTimeout(timer);
    };

    buffer.on('notification', onNotification);
  });
}

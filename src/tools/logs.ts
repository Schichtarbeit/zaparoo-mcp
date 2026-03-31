import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import type { LogDownloadResponse } from '../types.js';
import { Methods } from '../types.js';

export interface LogEntry {
  [key: string]: unknown;
}

const deviceLineOffsets = new Map<string, number>();

export function parseLogContent(base64Content: string): LogEntry[] {
  const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
  return decoded
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return { raw: line } as LogEntry;
      }
    });
}

export function registerLogsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_logs',
    {
      title: 'Zaparoo Logs',
      annotations: { readOnlyHint: true },
      description: `Access device logs.

Actions:
- tail: Download and parse the device log file (JSONL format). First call returns the last N lines (default 50). Subsequent calls return only new lines since the last check.
- full: Download and return the entire log file. Warning: can be very large.
- reset: Forget the stored offset and start fresh on the next tail call.`,
      inputSchema: z.object({
        action: z.enum(['tail', 'full', 'reset']).describe('Action to perform'),
        count: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Number of lines to return on first call (default 50)'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
      }),
    },
    async ({ action, count, device }) => {
      switch (action) {
        case 'tail': {
          try {
            const dev = manager.getDevice(device);
            const deviceId = dev.config.id;
            const result = await dev.request<LogDownloadResponse>(Methods.SettingsLogsDownload);

            const allLines = parseLogContent(result.content);
            const totalLines = allLines.length;
            const previousOffset = deviceLineOffsets.get(deviceId);

            let outputLines: LogEntry[];
            let logRotated = false;
            if (previousOffset === undefined || totalLines < previousOffset) {
              if (previousOffset !== undefined) logRotated = true;
              const n = count ?? 50;
              outputLines = allLines.slice(-n);
            } else {
              outputLines = allLines.slice(previousOffset);
            }

            deviceLineOffsets.set(deviceId, totalLines);

            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      lines: outputLines,
                      totalLines,
                      newLines: outputLines.length,
                      device: deviceId,
                      ...(logRotated && { logRotated: true }),
                    },
                    null,
                    2,
                  ),
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

        case 'full': {
          try {
            const dev = manager.getDevice(device);
            const result = await dev.request<LogDownloadResponse>(Methods.SettingsLogsDownload);
            const allLines = parseLogContent(result.content);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    { lines: allLines, totalLines: allLines.length, device: dev.config.id },
                    null,
                    2,
                  ),
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

        case 'reset': {
          if (device) {
            const dev = manager.getDevice(device);
            deviceLineOffsets.delete(dev.config.id);
          } else {
            deviceLineOffsets.clear();
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ success: true, message: 'Log offset reset' }),
              },
            ],
          };
        }

        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

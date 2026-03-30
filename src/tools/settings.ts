import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import type { PlaytimeLimitsResponse, SettingsResponse } from '../types.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

// Fields that belong to playtime limits vs general settings
const PLAYTIME_FIELDS = new Set([
  'enabled',
  'daily',
  'session',
  'sessionReset',
  'warnings',
  'retention',
]);
const SETTINGS_FIELDS = new Set([
  'runZapScript',
  'debugLogging',
  'audioScanFeedback',
  'readersAutoDetect',
  'errorReporting',
  'readersScanMode',
  'readersScanExitDelay',
  'readersScanIgnoreSystems',
  'readersConnect',
]);

export function registerSettingsTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_settings',
    {
      title: 'Zaparoo Settings',
      description: `Manage Zaparoo device configuration.

Actions:
- get: Get all settings including playtime limits (merged response)
- update: Update settings. Routes automatically to the correct API based on fields:
  - General fields: runZapScript, debugLogging, audioScanFeedback, readersAutoDetect, errorReporting, readersScanMode, readersScanExitDelay, readersScanIgnoreSystems, readersConnect
  - Playtime fields: enabled, daily, session, sessionReset, warnings, retention
- reload: Reload settings from disk
- logs: Download device log file (returns base64)
- claim_auth: Claim auth via wellKnown URL (claimUrl, token required)`,
      inputSchema: z.object({
        action: z
          .enum(['get', 'update', 'reload', 'logs', 'claim_auth'])
          .describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        // General settings fields
        runZapScript: z.boolean().optional(),
        debugLogging: z.boolean().optional(),
        audioScanFeedback: z.boolean().optional(),
        readersAutoDetect: z.boolean().optional(),
        errorReporting: z.boolean().optional(),
        readersScanMode: z.enum(['tap', 'hold']).optional(),
        readersScanExitDelay: z.number().optional(),
        readersScanIgnoreSystems: z.array(z.string()).optional(),
        readersConnect: z
          .array(
            z.object({
              driver: z.string(),
              path: z.string(),
              idSource: z.string().optional(),
            }),
          )
          .optional(),
        // Playtime limits fields
        enabled: z.boolean().optional().describe('Enable/disable playtime limits'),
        daily: z.string().optional().describe('Daily limit duration'),
        session: z.string().optional().describe('Session limit duration'),
        sessionReset: z.string().optional().describe('Session reset cooldown duration'),
        warnings: z.array(z.string()).optional().describe('Warning intervals'),
        retention: z.number().optional().describe('History retention days'),
        // Auth claim fields
        claimUrl: z.string().optional().describe('WellKnown claim URL (claim_auth action)'),
        token: z.string().optional().describe('Auth token (claim_auth action)'),
      }),
    },
    async (args) => {
      const { action, device } = args;

      switch (action) {
        case 'get': {
          try {
            const dev = manager.getDevice(device);
            const [settings, limits] = await Promise.all([
              dev.request<SettingsResponse>(Methods.Settings),
              dev.request<PlaytimeLimitsResponse>(Methods.PlaytimeLimits),
            ]);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ settings, playtimeLimits: limits }, null, 2),
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

        case 'update': {
          const settingsParams: Record<string, unknown> = {};
          const playtimeParams: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(args)) {
            if (value === undefined || key === 'action' || key === 'device') continue;
            if (PLAYTIME_FIELDS.has(key)) {
              playtimeParams[key] = value;
            } else if (SETTINGS_FIELDS.has(key)) {
              settingsParams[key] = value;
            }
          }

          try {
            const dev = manager.getDevice(device);
            const results: unknown[] = [];

            if (Object.keys(settingsParams).length > 0) {
              results.push(await dev.request(Methods.SettingsUpdate, settingsParams));
            }
            if (Object.keys(playtimeParams).length > 0) {
              results.push(await dev.request(Methods.PlaytimeLimitsUpdate, playtimeParams));
            }

            if (results.length === 0) {
              return {
                content: [
                  { type: 'text' as const, text: 'No valid settings fields provided to update.' },
                ],
                isError: true,
              };
            }

            return {
              content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
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

        case 'reload':
          return toolRequest(manager, device, Methods.SettingsReload);

        case 'logs':
          return toolRequest(manager, device, Methods.SettingsLogsDownload);

        case 'claim_auth':
          return toolRequest(manager, device, Methods.SettingsAuthClaim, {
            claimUrl: args.claimUrl,
            token: args.token,
          });

        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

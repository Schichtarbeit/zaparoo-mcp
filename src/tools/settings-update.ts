import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { isEmpty, toolRequest } from './helpers.js';

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

export function registerSettingsUpdateTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_settings_update',
    {
      title: 'Zaparoo Settings Update',
      annotations: { readOnlyHint: false, destructiveHint: false },
      description: `Update Zaparoo device configuration.

Actions:
- update: Update settings. Routes automatically to the correct API based on fields:
  - General fields: runZapScript, debugLogging, audioScanFeedback, readersAutoDetect, errorReporting, readersScanMode, readersScanExitDelay, readersScanIgnoreSystems, readersConnect
  - Playtime fields: enabled, daily, session, sessionReset, warnings, retention
- reload: Reload settings from disk
- claim_auth: Claim auth via wellKnown URL (claimUrl, token required)`,
      inputSchema: z.object({
        action: z.enum(['update', 'reload', 'claim_auth']).describe('Action to perform'),
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

          if (
            Object.keys(settingsParams).length === 0 &&
            Object.keys(playtimeParams).length === 0
          ) {
            return {
              content: [
                { type: 'text' as const, text: 'No valid settings fields provided to update.' },
              ],
              isError: true,
            };
          }

          try {
            const dev = manager.getDevice(device);

            if (Object.keys(settingsParams).length > 0) {
              const result = await dev.request(Methods.SettingsUpdate, settingsParams);
              if (!isEmpty(result)) {
                return {
                  content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
              }
            }
            if (Object.keys(playtimeParams).length > 0) {
              const result = await dev.request(Methods.PlaytimeLimitsUpdate, playtimeParams);
              if (!isEmpty(result)) {
                return {
                  content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
              }
            }

            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ success: true, message: 'Settings updated' }),
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

        case 'reload':
          return toolRequest(
            manager,
            device,
            Methods.SettingsReload,
            undefined,
            'Settings reloaded from disk',
          );

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

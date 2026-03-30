import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

const ACTION_MAP: Record<string, string> = {
  status: Methods.Media,
  search: Methods.MediaSearch,
  browse: Methods.MediaBrowse,
  tags: Methods.MediaTags,
  active: Methods.MediaActive,
  history: Methods.MediaHistory,
  top: Methods.MediaHistoryTop,
  lookup: Methods.MediaLookup,
  control: Methods.MediaControl,
  generate: Methods.MediaGenerate,
  cancel_generate: Methods.MediaGenerateCancel,
  playtime: Methods.Playtime,
};

export function registerMediaTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_media',
    {
      title: 'Zaparoo Media',
      description: `Interact with the Zaparoo media database and playback.

Actions:
- status: Get media database stats and currently active media
- search: Search the media database (query, systems, maxResults, cursor, tags, letter)
- browse: Browse media by path (path, maxResults, cursor, letter, sort)
- tags: Get available filter tags
- active: Get currently playing media
- history: Get play history (systems, limit, cursor)
- top: Get top played games (systems, since, limit)
- lookup: Resolve a game name and system to a database match (name, system required)
- control: Send a control action to the active launcher (controlAction required, controlArgs optional)
- generate: Start media database indexing (systems optional)
- cancel_generate: Cancel ongoing indexing
- playtime: Get current playtime session status`,
      inputSchema: z.object({
        action: z
          .enum([
            'status',
            'search',
            'browse',
            'tags',
            'active',
            'history',
            'top',
            'lookup',
            'control',
            'generate',
            'cancel_generate',
            'playtime',
          ])
          .describe('Action to perform'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        // search params
        query: z.string().optional().describe('Search query (search action)'),
        systems: z.array(z.string()).optional().describe('Filter by system IDs'),
        fuzzySystem: z.boolean().optional().describe('Enable fuzzy system matching'),
        maxResults: z.number().optional().describe('Max results to return'),
        cursor: z.string().optional().describe('Pagination cursor'),
        tags: z.array(z.string()).optional().describe('Filter by tags (search action)'),
        letter: z.string().optional().describe('Filter by starting letter'),
        // browse params
        path: z.string().optional().describe('Browse path'),
        sort: z
          .enum(['name-asc', 'name-desc', 'filename-asc', 'filename-desc'])
          .optional()
          .describe('Sort order (browse action)'),
        // history params
        limit: z.number().optional().describe('Max entries (history/top actions)'),
        since: z.string().optional().describe('Since date (top action)'),
        // lookup params
        name: z.string().optional().describe('Game name (lookup action, required)'),
        system: z.string().optional().describe('System ID (lookup action, required)'),
        // control params
        controlAction: z
          .string()
          .optional()
          .describe('Control action name (control action, required)'),
        controlArgs: z.record(z.string()).optional().describe('Control action arguments'),
      }),
    },
    async (args) => {
      const method = ACTION_MAP[args.action];
      if (!method) {
        return {
          content: [{ type: 'text' as const, text: `Unknown action: ${args.action}` }],
          isError: true,
        };
      }

      const params = buildParams(args);
      return toolRequest(manager, args.device, method, params);
    },
  );
}

function buildParams(args: Record<string, unknown>): unknown {
  const { action } = args;

  switch (action) {
    case 'search':
      return pick(args, [
        'query',
        'systems',
        'fuzzySystem',
        'maxResults',
        'cursor',
        'tags',
        'letter',
      ]);
    case 'browse':
      return pick(args, ['path', 'maxResults', 'cursor', 'letter', 'sort']);
    case 'history':
      return pick(args, ['systems', 'fuzzySystem', 'limit', 'cursor']);
    case 'top':
      return pick(args, ['systems', 'fuzzySystem', 'since', 'limit']);
    case 'lookup':
      return pick(args, ['name', 'system', 'fuzzySystem']);
    case 'control':
      return { action: args.controlAction, args: args.controlArgs };
    case 'generate':
      return pick(args, ['systems', 'fuzzySystem']);
    default:
      return undefined;
  }
}

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return Object.keys(result).length > 0
    ? result
    : (undefined as unknown as Record<string, unknown>);
}

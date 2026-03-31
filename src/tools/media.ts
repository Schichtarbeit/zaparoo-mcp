import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { pick, toolRequest } from './helpers.js';

const ACTION_MAP: Record<string, string> = {
  status: Methods.Media,
  search: Methods.MediaSearch,
  browse: Methods.MediaBrowse,
  tags: Methods.MediaTags,
  active: Methods.MediaActive,
  history: Methods.MediaHistory,
  top: Methods.MediaHistoryTop,
  lookup: Methods.MediaLookup,
  playtime: Methods.Playtime,
};

export function registerMediaTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_media',
    {
      title: 'Zaparoo Media',
      annotations: { readOnlyHint: true },
      description: `Query the Zaparoo media database.

Actions:
- status: Get media database stats and currently active media
- search: Search the media database (query, systems, maxResults, cursor, tags, letter)
- browse: Browse media by path (path, maxResults, cursor, letter, sort)
- tags: Get available filter tags
- active: Get currently playing media
- history: Get play history (systems, limit, cursor)
- top: Get top played games (systems, since, limit)
- lookup: Resolve a game name and system to a database match (name, system required)
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
      return {
        ...pick(args, ['query', 'systems', 'maxResults', 'cursor', 'tags', 'letter']),
        fuzzySystem: true,
      };
    case 'browse':
      return pick(args, ['path', 'maxResults', 'cursor', 'letter', 'sort']);
    case 'history':
      return { ...pick(args, ['systems', 'limit', 'cursor']), fuzzySystem: true };
    case 'top':
      return { ...pick(args, ['systems', 'since', 'limit']), fuzzySystem: true };
    case 'lookup':
      return { ...pick(args, ['name', 'system']), fuzzySystem: true };
    default:
      return undefined;
  }
}

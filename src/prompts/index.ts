import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';

export function registerAllPrompts(server: McpServer): void {
  server.registerPrompt(
    'write-nfc-tag',
    {
      title: 'Write NFC Tag',
      description:
        'Write a ZapScript command to an NFC tag. Optionally search for a game first, or provide ZapScript text directly.',
      argsSchema: {
        game: z.string().optional().describe('Game name to search for'),
        text: z.string().optional().describe('ZapScript text to write directly to the tag'),
      },
    },
    ({ game, text }) => {
      if (text) {
        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `I want to write the following ZapScript to an NFC tag: ${text}\n\nPlease use zaparoo_readers to check for connected readers, then use zaparoo_readers_write to write this text to a tag. Let me know when the tag is ready to be scanned.`,
              },
            },
          ],
        };
      }

      const searchHint = game ? `Search for "${game}"` : 'Ask me what game or command I want';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `I want to write an NFC tag for my Zaparoo setup.\n\n${searchHint}. Use zaparoo_media search to find matching games, show me the options with their system names, and let me pick one. Then compose the appropriate ZapScript launch command and use zaparoo_readers_write to write it to a tag.\n\nIf I want something other than a game launch (like a ZapScript command, playlist, or HTTP hook), help me compose the right ZapScript. Read the zaparoo://reference/zapscript resource if needed.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'find-and-launch',
    {
      title: 'Find & Launch Game',
      description: 'Search for a game in your library and launch it on a connected device.',
      argsSchema: {
        game: z.string().optional().describe('Game name to search for'),
        system: z.string().optional().describe('System to filter by (e.g. "snes", "genesis")'),
      },
    },
    ({ game, system }) => {
      const parts: string[] = ['I want to find and launch a game.'];

      if (game) parts.push(`Search for "${game}".`);
      if (system) parts.push(`Filter to the ${system} system.`);

      parts.push(
        '\nUse zaparoo_media search to find matching games. Show me the results and let me pick one. Once I choose, launch it using zaparoo_run with the appropriate ZapScript launch command.',
      );

      if (!game) {
        parts.push(
          "\nIf I haven't specified a game, ask me what I'd like to play, or use zaparoo_media browse to show me what's available.",
        );
      }

      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: parts.join(' ') },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'create-mapping',
    {
      title: 'Create Token Mapping',
      description:
        'Create a mapping that links NFC token scans to actions. Maps token UIDs or text patterns to ZapScript commands.',
      argsSchema: {
        type: z
          .string()
          .optional()
          .describe('Mapping type: "uid" (exact UID), "text" (exact text), or "regex" (pattern)'),
        match: z.string().optional().describe('The pattern to match against'),
        pattern: z.string().optional().describe('The ZapScript command to execute on match'),
      },
    },
    ({ type, match, pattern }) => {
      const parts: string[] = [
        'I want to create a token mapping for my Zaparoo setup.',
        '\nMappings link NFC token scans to actions. When a token is scanned, Zaparoo checks if its UID or text matches any mapping and executes the associated ZapScript command.',
      ];

      if (type || match || pattern) {
        parts.push(`\nHere's what I have so far:`);
        if (type) parts.push(`- Type: ${type}`);
        if (match) parts.push(`- Match pattern: ${match}`);
        if (pattern) parts.push(`- ZapScript action: ${pattern}`);
      }

      parts.push(
        '\nUse zaparoo_mappings list to show existing mappings for context. Help me define the match criteria and the ZapScript command to run, then use zaparoo_mappings create to set it up. Read the zaparoo://reference/zapscript resource if I need help composing the action.',
      );

      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: parts.join('\n') },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'review-play-history',
    {
      title: 'Review Play History',
      description:
        'See what games have been played recently, top games by play count, and playtime statistics.',
      argsSchema: {
        system: z.string().optional().describe('Filter to a specific system (e.g. "snes")'),
      },
    },
    ({ system }) => {
      const systemFilter = system ? ` Filter results to the ${system} system.` : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Show me my Zaparoo play history and statistics.${systemFilter}\n\nUse zaparoo_media history to see recently played games, zaparoo_media top to see most-played games, and zaparoo_media playtime for overall playtime statistics. Summarize the data in a readable way — what I've been playing lately, my most-played games, and total time spent.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'whats-playing',
    {
      title: "What's Playing?",
      description:
        'Quick status check of all connected devices — active media, readers, and recent activity.',
    },
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: "Give me a quick status of all my Zaparoo devices.\n\nUse zaparoo_devices list to see all connected devices. For each device that's ready, read the zaparoo://{deviceId}/state resource to check what's currently playing, which readers are connected, and any recent token scans. Give me a concise dashboard-style summary.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'explore-library',
    {
      title: 'Explore Game Library',
      description:
        'Browse and explore your game library. Get recommendations, discover unplayed games, find hidden gems, or get a random pick.',
      argsSchema: {
        system: z
          .string()
          .optional()
          .describe('Focus on a specific system (e.g. "snes", "genesis")'),
        mood: z
          .string()
          .optional()
          .describe(
            'What kind of experience you want: "surprise me", "something new", "classic", "quick session", "hidden gem", or a genre/theme',
          ),
      },
    },
    ({ system, mood }) => {
      const parts: string[] = ['I want to explore my game library and find something to play.'];

      if (system) parts.push(`Focus on ${system} games.`);
      if (mood) parts.push(`I'm in the mood for: ${mood}.`);

      parts.push(`
Here's how to help me discover games:

1. Use zaparoo_systems to see what systems are available, and zaparoo_media tags to see what game tags/genres exist.
2. Use zaparoo_media search or zaparoo_media browse to explore the library. Use zaparoo_media top and zaparoo_media history to see what I've played before.
3. Cross-reference the library against my play history to find games I haven't tried yet.
4. Make recommendations based on what you find — suggest games I might enjoy, highlight anything interesting or unusual in the collection.
5. If I want a random pick, you can use zaparoo_run with a **launch.random ZapScript command.

Be creative and enthusiastic about the collection. Tell me interesting things about the games you find. When I pick something, launch it.`);

      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: parts.join('\n') },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'zapscript-help',
    {
      title: 'ZapScript Help',
      description:
        'Get help writing ZapScript commands — game launching, input simulation, playlists, HTTP hooks, command chaining, conditionals, and more.',
      argsSchema: {
        goal: z
          .string()
          .optional()
          .describe('What you want the ZapScript to do (e.g. "launch a random SNES game")'),
      },
    },
    ({ goal }) => {
      const goalText = goal
        ? `I want to write a ZapScript command that does the following: ${goal}`
        : 'I need help writing a ZapScript command.';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${goalText}\n\nRead the zaparoo://reference/zapscript resource to understand the full ZapScript language. Then help me compose the right command. Show me the ZapScript syntax and explain what each part does. If I want to test it, use zaparoo_run to execute it on a connected device.`,
            },
          },
        ],
      };
    },
  );
}

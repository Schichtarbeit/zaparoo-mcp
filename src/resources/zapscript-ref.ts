import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ZAPSCRIPT_REFERENCE = `# ZapScript Quick Reference

ZapScript is the command language used by Zaparoo to control media launching and device interaction.

## Syntax

- **Command prefix:** \`**\` (two asterisks) — required for explicit commands
- **Auto-launch:** Omitting \`**\` assumes \`launch\` command (e.g., \`SNES/Super Metroid.sfc\`)
- **Title lookup:** \`@\` prefix for media title lookup (e.g., \`@SNES/Super Metroid\`)
- **Command separator:** \`||\` chains multiple commands (execution stops on first error)
- **Argument separator:** \`:\` after command name (e.g., \`**launch.system:snes\`)
- **Multiple args:** \`,\` between positional values
- **Advanced args:** \`?\` followed by key=value pairs with \`&\` separator
- **Escaping:** \`^\` escapes special characters (\`^?\`, \`^,\`, \`^&\`, \`^|\`, \`^n\`, \`^t\`, \`^r\`)
- **Quoting:** \`"\` or \`'\` to preserve special characters in arguments
- **JSON args:** Arguments starting with \`{\` are parsed as JSON until matching \`}\`
- **Expressions:** \`[[...]]\` for inline expressions using the [expr](https://github.com/expr-lang/expr) library
- **Conditional:** All commands support \`?when=[[expression]]\` for conditional execution

## Launch Commands

| Command | Description | Example |
|---------|-------------|---------|
| \`**launch:<path>\` | Launch by file path | \`**launch:SNES/Game.sfc\` |
| (no prefix) | Auto-launch shorthand | \`SNES/Game.sfc\` |
| \`@<system>/<title>\` | Title lookup | \`@SNES/Super Metroid\` |
| \`**launch.title:<system>/<title>\` | Explicit title lookup | \`**launch.title:Genesis/Sonic the Hedgehog\` |
| \`**launch.system:<id>\` | Launch system/emulator only | \`**launch.system:Atari2600\` |
| \`**launch.random:<query>\` | Random game | \`**launch.random:snes\` |
| \`**launch.search:<pattern>\` | Glob pattern match (case insensitive) | \`**launch.search:SNES/*mario*\` |

**Launch advanced arguments:** \`launcher\` (override launcher), \`system\` (apply system defaults), \`action\` (\`run\` or \`details\`), \`name\` (display name for remote files)

**launch.random query formats:** single system (\`snes\`), multiple systems (\`snes,nes,genesis\`), all systems (\`all\`), folder path (\`/media/fat/_#Favorites\`), glob (\`Genesis/*sonic*\`)

**Title tag operators:** \`(tag:value)\` must have, \`(-tag:value)\` must not, \`(~tag:value)\` any match. Example: \`@SNES/Super Mario World (region:us)\`

**Path formats:** absolute (\`/media/fat/games/SNES/Game.sfc\`), relative (\`SNES/Game.sfc\`), URI (\`steam://1145360\`), remote (\`http://\`, \`smb://\` — requires \`system\` arg), glob (\`*sonic*\`)

## Input Commands

All input commands are **blocked from remote/Zap Link sources** for security.

### input.keyboard

Simulates keyboard key presses. Regular characters are typed directly with a 100ms delay between each.

**Special keys** use curly braces: \`{esc}\`, \`{backspace}\`, \`{tab}\`, \`{enter}\`, \`{lctrl}\`, \`{lshift}\`, \`{rshift}\`, \`{lalt}\`, \`{space}\`, \`{caps}\`, \`{num}\`, \`{scroll}\`, \`{f1}\`–\`{f12}\`, \`{home}\`, \`{up}\`, \`{pgup}\`, \`{left}\`, \`{right}\`, \`{end}\`, \`{down}\`, \`{pgdn}\`, \`{ins}\`, \`{del}\`, \`{volup}\`, \`{voldn}\`

**Key combos:** \`+\` between keys inside braces: \`{shift+esc}\`, \`{lctrl+c}\`

**Escaping:** \`\\{\` and \`\\}\` for literal braces, \`\\\\\` for literal backslash

**Examples:**
\`\`\`
**input.keyboard:{f12}                     -- F12 key
**input.keyboard:qWeRty{enter}{up}aaa      -- type text, press Enter, Up, more text
**input.keyboard:{shift+esc}               -- Shift+Escape combo
**input.keyboard:{lctrl+c}                 -- Ctrl+C
\`\`\`

### input.gamepad

Simulates gamepad button presses via a virtual gamepad device. The virtual gamepad must be manually mapped in the game/emulator.

**Button mappings:**
- D-pad: \`^\` or \`{up}\`, \`V\` or \`{down}\`, \`<\` or \`{left}\`, \`>\` or \`{right}\`
- Face buttons: \`A\`/\`a\` (east), \`B\`/\`b\` (south), \`X\`/\`x\` (north), \`Y\`/\`y\` (west)
- Bumpers/triggers: \`L\`/\`l\`/\`{l1}\`, \`R\`/\`r\`/\`{r1}\`, \`{l2}\`, \`{r2}\`
- Menu: \`{start}\`, \`{select}\`, \`{menu}\`

**Examples:**
\`\`\`
**input.gamepad:^^VV<><>BA{start}{select}   -- Konami code
**input.gamepad:{start}                     -- Start button
**input.gamepad:AABB                        -- A, A, B, B
\`\`\`

### input.coinp1 / input.coinp2

Insert coins for player 1 or player 2 in arcade games. Presses the \`5\` key (P1) or \`6\` key (P2) — standard coin keys for MiSTer arcade cores and MAME.

**Syntax:** \`**input.coinp1:<count>\` — count is optional, defaults to 1

**Examples:**
\`\`\`
**input.coinp1:1                             -- 1 coin for P1
**input.coinp2:3                             -- 3 coins for P2
**input.coinp1:2||**input.coinp2:2           -- 2 coins each
\`\`\`

## HTTP Commands

Both commands run **asynchronously in the background** with a 30-second timeout (won't block script execution).

| Command | Description | Example |
|---------|-------------|---------|
| \`**http.get:<url>\` | HTTP GET request | \`**http.get:https://example.com/webhook\` |
| \`**http.post:<url>,<content-type>,<body>\` | HTTP POST with body | \`**http.post:https://example.com/api,application/json,{"event":"scan"}\` |

URL must include protocol. Special characters can be escaped with \`^\`, quoted, or URL-encoded (\`%2C\` for \`,\`, \`%7C%7C\` for \`||\`).

**Examples:**
\`\`\`
**http.get:"https://example.com/search?q=test&page=1"
**http.post:https://example.com/api,application/json,{"event":"scan"}
**http.post:https://hooks.example.com/notify,text/plain,Token scanned!
\`\`\`

## Playlist Commands

**Sources:** folder path, \`.pls\` file, or inline JSON (\`{"id":"...","name":"...","items":[...]}\`)

| Command | Description | Example |
|---------|-------------|---------|
| \`**playlist.play:[<source>]\` | Load and play (omit source to resume) | \`**playlist.play:favorites.pls\` |
| \`**playlist.load:<source>\` | Load without playing | \`**playlist.load:queue.pls\` |
| \`**playlist.open:[<source>]\` | Interactive picker (omit to reopen) | \`**playlist.open:all.pls\` |
| \`**playlist.stop\` | Stop and clear from memory | |
| \`**playlist.pause\` | Pause without clearing | |
| \`**playlist.next\` | Next item | |
| \`**playlist.previous\` | Previous item | |
| \`**playlist.goto:<n>\` | Jump to position (1-based) | \`**playlist.goto:5\` |

**Advanced argument:** \`mode=shuffle\` for random order

## Utility Commands

| Command | Description | Example |
|---------|-------------|---------|
| \`**stop\` | Stop current media, return to menu | |
| \`**echo:<message>\` | Log message at info level | \`**echo:Platform is [[platform]]\` |
| \`**execute:<cmd>\` | Run host command (2s timeout, no shell features) | \`**execute:reboot\` |
| \`**delay:<ms>\` | Pause execution (blocking) | \`**delay:2000\` |
| \`**control:<action>\` | Send control to active launcher | \`**control:toggle_pause\` |
| \`**screenshot\` | Capture display (MiSTer only) | |

**execute** requires \`allow_execute\` config option. Always blocked from remote sources.

**control actions:** \`toggle_pause\`, \`save_state\`, \`stop\`, \`fast_forward\`, \`rewind\`, \`next\`, \`previous\` (available actions depend on the launcher)

## MiSTer-Specific Commands

Ignored on non-MiSTer platforms.

| Command | Description | Example |
|---------|-------------|---------|
| \`**mister.ini:<index>\` | Load MiSTer.ini config (1–4) | \`**mister.ini:1\` |
| \`**mister.core:<path>\` | Launch core .rbf file | \`**mister.core:_Console/SNES\` |
| \`**mister.script:<script>\` | Run script from /media/fat/Scripts | \`**mister.script:update_all.sh\` |
| \`**mister.mgl:<content>\` | Execute MGL XML content | |
| \`**mister.wallpaper:[<file>]\` | Set wallpaper (omit to unset) | \`**mister.wallpaper:bg.png\` |

**mister.script** supports \`?hidden=yes\` to run in background.

## Expression Variables

Available inside \`[[...]]\`:

| Variable | Type | Description |
|----------|------|-------------|
| \`platform\` | string | Platform (e.g., \`batocera\`, \`mister\`, \`windows\`) |
| \`version\` | string | Core version |
| \`scan_mode\` | string | Reader scan mode (\`tap\` or \`hold\`) |
| \`media_playing\` | bool | Whether media is currently playing |
| \`device.hostname\` | string | Host device hostname |
| \`device.os\` | string | OS (\`linux\`, \`windows\`, \`darwin\`) |
| \`device.arch\` | string | Architecture (\`arm\`, \`amd64\`) |
| \`active_media.launcher_id\` | string | Active launcher ID |
| \`active_media.system_id\` | string | Active system ID |
| \`active_media.system_name\` | string | Human-readable system name |
| \`active_media.path\` | string | Path to active media |
| \`active_media.name\` | string | Name of active media |
| \`last_scanned.id\` | string | UID of last scanned token |
| \`last_scanned.value\` | string | Text of last scanned token |
| \`last_scanned.data\` | string | Raw data as hex string |

## Chaining Examples

\`\`\`
**mister.ini:1||**launch.system:snes
_Console/SNES||**delay:10000||**input.keyboard:{f12}
**stop?when=[[media_playing]]||**launch.random:snes
Genesis/Game.md?when=[[platform == "mister"]]||PCEngine/Game.pce?when=[[platform != "mister"]]
**input.coinp1:2||**input.coinp2:2
\`\`\`
`;

export function registerZapScriptReference(server: McpServer): void {
  server.registerResource(
    'zapscript-reference',
    'zaparoo://reference/zapscript',
    {
      description: 'ZapScript language reference — syntax, commands, expressions, and examples',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'zaparoo://reference/zapscript',
          mimeType: 'text/markdown',
          text: ZAPSCRIPT_REFERENCE,
        },
      ],
    }),
  );
}

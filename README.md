# Zaparoo MCP

An [MCP](https://modelcontextprotocol.io) server for controlling [Zaparoo](https://zaparoo.org/) devices, allowing AI assistants to interact with Zaparoo.

## Quick Start

```bash
npx -y zaparoo-mcp
```

By default, devices on the local network are discovered automatically via mDNS. To specify devices manually:

```bash
npx -y zaparoo-mcp --devices 192.168.1.100
```

## Configuration

### Claude Code

```bash
claude mcp add zaparoo -- npx -y zaparoo-mcp
```

With manual device configuration:

```bash
claude mcp add zaparoo --env ZAPAROO_DEVICES=192.168.1.100 -- npx -y zaparoo-mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zaparoo": {
      "command": "npx",
      "args": ["-y", "zaparoo-mcp"]
    }
  }
}
```

### Codex

```bash
codex mcp add zaparoo -- npx -y zaparoo-mcp
```

Or add to `~/.codex/config.toml`:

```toml
[mcp_servers.zaparoo]
command = "npx"
args = ["-y", "zaparoo-mcp"]
```

### OpenClaw

```bash
openclaw mcp set zaparoo '{"command":"npx","args":["-y","zaparoo-mcp"]}'
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "zaparoo": {
      "command": "npx",
      "args": ["-y", "zaparoo-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "zaparoo": {
      "command": "npx",
      "args": ["-y", "zaparoo-mcp"]
    }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "zaparoo": {
      "command": "npx",
      "args": ["-y", "zaparoo-mcp"]
    }
  }
}
```

## Options

By default, the server discovers Zaparoo devices on the local network using mDNS. No configuration is needed if your devices are on the same network.

To manually specify devices, use CLI arguments or environment variables. CLI arguments take precedence.

| Setting      | CLI Argument                          | Environment Variable     |
| ------------ | ------------------------------------- | ------------------------ |
| Devices      | `--devices host:port[,host:port,...]` | `ZAPAROO_DEVICES`        |
| API keys     | `--keys key1[,key2,...]`              | `ZAPAROO_KEYS`           |
| No discovery | `--no-discovery`                      | `ZAPAROO_NO_DISCOVERY=1` |

The default port is 7497 if not specified. When devices are specified manually, mDNS discovery is disabled.

## Features

### Tools

| Category          | Tools                                                                                                                           |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Launch & Control  | `zaparoo_run`, `zaparoo_stop`, `zaparoo_media_control`, `zaparoo_input`                                                         |
| Media Library     | `zaparoo_media`, `zaparoo_media_index`, `zaparoo_systems`                                                                       |
| NFC & Tokens      | `zaparoo_readers`, `zaparoo_readers_write`, `zaparoo_tokens`, `zaparoo_mappings`                                                |
| Device Management | `zaparoo_devices`, `zaparoo_settings`, `zaparoo_settings_update`, `zaparoo_admin`, `zaparoo_admin_manage`, `zaparoo_screenshot` |
| Monitoring        | `zaparoo_notifications`, `zaparoo_logs`, `zaparoo_inbox`                                                                        |

### Resources

- `zaparoo://devices` — all connected device states
- `zaparoo://{deviceId}/state` — per-device state (readers, active media, tokens)
- `zaparoo://reference/zapscript` — ZapScript language reference

### Prompts

- **Write NFC Tag** — search for a game and write it to an NFC tag
- **Find & Launch Game** — search your library and launch a game
- **Create Token Mapping** — map NFC token scans to actions
- **Review Play History** — play statistics and recent activity
- **What's Playing?** — quick status dashboard of all devices
- **Explore Game Library** — browse games, get recommendations, discover hidden gems
- **ZapScript Help** — help composing ZapScript commands

## Prerequisites

- Node.js 22+
- One or more [Zaparoo Core](https://zaparoo.org/) devices accessible on the network

## Development

```bash
git clone https://github.com/ZaparooProject/zaparoo-mcp.git
cd zaparoo-mcp
npm install
npm run build
```

| Command              | Description            |
| -------------------- | ---------------------- |
| `npm run dev`        | Build in watch mode    |
| `npm run lint:fix`   | Auto-fix lint issues   |
| `npm run format`     | Format code            |
| `npm test`           | Run tests              |
| `npm run test:watch` | Tests in watch mode    |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) or later.

# zaparoo-mcp

MCP server that bridges AI assistants to Zaparoo Core devices (NFC-based game launchers) over WebSocket using JSON-RPC 2.0.

## Commands

```bash
npm run build        # Build to build/index.js
npm run dev          # Build in watch mode
npm run lint:fix     # Auto-fix lint issues (Biome)
npm run format       # Format code (Biome)
npm run check        # CI lint+format check
npm test             # Run tests (Vitest)
npm run test:watch   # Tests in watch mode
```

## Architecture

### Connection layer (`src/connection/`)
- `DeviceConnection` — WebSocket client for a single Zaparoo device. Handles JSON-RPC request/response correlation, automatic reconnection with exponential backoff, and heartbeat pings.
- `DeviceManager` — orchestrates multiple connections. `getDevice(id?)` returns a specific device or the first READY one.

### Tools (`src/tools/`)
Each file registers one MCP tool via `registerXxxTool(server, manager)`. All tools are wired up in `src/tools/index.ts` through `registerAllTools()`.

### Resources (`src/resources/`)
- `zaparoo://devices` — all device states
- `zaparoo://{deviceId}/state` — per-device state (readers, media, tokens)
- `zaparoo://reference/zapscript` — ZapScript language reference

### Notifications (`src/notifications/`)
`NotificationHandler` listens for device events, updates `DeviceStateStore` (in-memory cache), and pushes MCP resource change notifications.

### Config (`src/config.ts`)
CLI args take precedence over env vars. Required: `--devices` or `ZAPAROO_DEVICES`. Optional: `--keys`/`ZAPAROO_KEYS`, `--log-level`/`ZAPAROO_LOG_LEVEL`. Default port is 7497.

## Adding a new tool

1. Create `src/tools/mytool.ts` with a `registerMyTool(server, manager)` function
2. Define input schema with Zod, use `toolRequest()` from `src/tools/helpers.ts` to call the device
3. Register it in `src/tools/index.ts` inside `registerAllTools()`

## Conventions

- Tool names MUST be prefixed with `zaparoo_`
- Resource URIs MUST use the `zaparoo://` scheme
- All tool inputs MUST be validated with Zod schemas
- Use `import type` for type-only imports — Biome enforces this (`useImportType`)
- Zod is imported from `zod/v3` (Zod v4 package, v3-compatible API)
- Error responses from tools MUST use the `{ isError: true }` pattern (see `src/tools/helpers.ts`)
- Device IDs use `host:port` format
- NEVER use CommonJS (`require`/`module.exports`) — this is an ESM-only project

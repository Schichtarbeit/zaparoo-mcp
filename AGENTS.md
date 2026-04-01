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
- `DeviceManager` — orchestrates multiple connections. `getDevice(id?)` returns a specific device or the first READY one. Supports dynamic `addDevice()`/`removeDevice()` for mDNS discovery.

### Discovery (`src/discovery/`)
- `MdnsDiscovery` — browses for `_zaparoo._tcp` services via mDNS using `bonjour-service`. Emits `discovered`/`removed` events. Runs automatically when no devices are manually configured.

### Tools (`src/tools/`)
Each file registers one MCP tool via `registerXxxTool(server, manager)`. All tools are wired up in `src/tools/index.ts` through `registerAllTools()`.

### Resources (`src/resources/`)
- `zaparoo://devices` — all device states
- `zaparoo://{deviceId}/state` — per-device state (readers, media, tokens)
- `zaparoo://reference/zapscript` — ZapScript language reference

### Notifications (`src/notifications/`)
`NotificationHandler` listens for device events, updates `DeviceStateStore` (in-memory cache), and pushes MCP resource change notifications.

### Config (`src/config.ts`)
CLI args take precedence over env vars. Optional: `--devices`/`ZAPAROO_DEVICES`, `--keys`/`ZAPAROO_KEYS`. Default port is 7497. When no devices are configured, mDNS discovery is enabled automatically. Use `--no-discovery` or `ZAPAROO_NO_DISCOVERY=1` to disable. Tool filtering: `--allowed-tools`/`ZAPAROO_ALLOWED_TOOLS` (comma-separated whitelist) or `--blocked-tools`/`ZAPAROO_BLOCKED_TOOLS` (comma-separated blacklist). Cannot use both simultaneously.

## Adding a new tool

1. Create `src/tools/mytool.ts` with a `registerMyTool(server, manager)` function
2. Define input schema with Zod, use `toolRequest()` from `src/tools/helpers.ts` to call the device
3. Add an entry to the `registry` array in `src/tools/index.ts` inside `registerAllTools()`

## Testing

Tests use Vitest and live alongside source files as `*.test.ts`. Test files are excluded from `tsconfig.json` compilation so they don't end up in build output.

**What to test:** Focus on modules with real logic — parsing, state management, error handling, branching. Don't write tests that just assert tool registration boilerplate or static content.

**Mocking patterns:**
- Mock `ws` module with a `MockWebSocket` class extending `EventEmitter` for `DeviceConnection` tests. Use `vi.useFakeTimers()` for timeout/backoff tests.
- Mock `DeviceConnection` import via `vi.mock()` for `DeviceManager` tests, tracking created instances in an array.
- Mock `node:util` `parseArgs` for config tests to control CLI arg values.
- Mock `bonjour-service` with a mock class returning `EventEmitter`-based browsers for `MdnsDiscovery` tests.
- Use `as unknown as <Type>` double-cast for partial mocks of complex interfaces (DeviceManager, MCP Server).
- Reset module-level mock state (e.g., `lastMockWs`, `createdDevices`) in `beforeEach`.

**Test guidelines:**
- Test files MUST be colocated with source: `src/foo.ts` → `src/foo.test.ts`
- Prefer testing through public interfaces over reaching into private methods
- Every test that uses fake timers MUST call `vi.useRealTimers()` in `afterEach`
- Don't write tests that give false confidence — if an assertion can't actually fail when the code is broken, remove it

## Conventions

- Tool names MUST be prefixed with `zaparoo_`
- Resource URIs MUST use the `zaparoo://` scheme
- All tool inputs MUST be validated with Zod schemas
- Use `import type` for type-only imports — Biome enforces this (`useImportType`)
- Zod is imported from `zod/v3` (Zod v4 package, v3-compatible API)
- Error responses from tools MUST use the `{ isError: true }` pattern (see `src/tools/helpers.ts`)
- Device IDs use `host:port` format
- NEVER use CommonJS (`require`/`module.exports`) — this is an ESM-only project

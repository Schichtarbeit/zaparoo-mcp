# Zaparoo MCP

An MCP (Model Context Protocol) server for controlling [Zaparoo Core](https://zaparoo.org/) devices. Connects to Zaparoo hardware over WebSocket and exposes device capabilities as MCP tools and resources, allowing AI assistants to interact with NFC-based game launchers for retro gaming systems.

## Prerequisites

- Node.js 22+
- One or more Zaparoo Core devices accessible on the network

## Build

```bash
npm install
npm run build
```

## Configuration

By default, the server automatically discovers Zaparoo Core devices on the local network using mDNS. No configuration is needed if your devices are on the same network.

To manually specify devices, use CLI arguments or environment variables. CLI arguments take precedence.

| Setting      | CLI Argument                          | Environment Variable   |
|--------------|---------------------------------------|------------------------|
| Devices      | `--devices host:port[,host:port,...]` | `ZAPAROO_DEVICES`      |
| API keys     | `--keys key1[,key2,...]`              | `ZAPAROO_KEYS`         |
| No discovery | `--no-discovery`                      | `ZAPAROO_NO_DISCOVERY=1` |

The default port is 7497 if not specified. When devices are specified manually, mDNS discovery is disabled.

## Usage

```bash
# Auto-discover devices on the network
node build/index.js

# Or specify devices manually
node build/index.js --devices 192.168.1.100:7497
```

Or with environment variables:

```bash
ZAPAROO_DEVICES="192.168.1.100:7497" node build/index.js
```

## Development

```bash
npm run dev          # Build in watch mode
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code
npm test             # Run tests
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) or later.

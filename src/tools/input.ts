import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { DeviceManager } from '../connection/manager.js';
import { Methods } from '../types.js';
import { toolRequest } from './helpers.js';

export function registerInputTool(server: McpServer, manager: DeviceManager): void {
  server.registerTool(
    'zaparoo_input',
    {
      title: 'Zaparoo Input',
      annotations: { readOnlyHint: false, openWorldHint: true },
      description: `Send simulated input to a Zaparoo device. The keys and buttons parameters use the same macro syntax as ZapScript input commands — consult the zaparoo://reference/zapscript resource for the full syntax.

Actions:
- keyboard: Send keyboard key presses (keys string required). Regular characters are typed directly. Special keys use curly braces: {enter}, {esc}, {f1}-{f12}, {up}, {down}, {left}, {right}, etc. Key combos use + inside braces: {shift+esc}, {lctrl+c}.
- gamepad: Send gamepad button presses (buttons string required). D-pad: ^, V, <, >. Face: A, B, X, Y. Bumpers: L, R, {l2}, {r2}. Menu: {start}, {select}.`,
      inputSchema: z.object({
        action: z.enum(['keyboard', 'gamepad']).describe('Input type to send'),
        device: z
          .string()
          .optional()
          .describe('Device ID (host:port). Defaults to first available device.'),
        keys: z
          .string()
          .optional()
          .describe(
            'Keyboard input string. Regular chars typed directly; special keys in curly braces e.g. {enter}, {f12}, {lctrl+c}.',
          ),
        buttons: z
          .string()
          .optional()
          .describe(
            'Gamepad input string. D-pad: ^V<>, face: ABXY, bumpers: LR, triggers: {l2}{r2}, menu: {start}{select}.',
          ),
      }),
    },
    async ({ action, device, keys, buttons }) => {
      switch (action) {
        case 'keyboard':
          if (!keys) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "keys" parameter is required for keyboard action',
                },
              ],
              isError: true,
            };
          }
          return toolRequest(
            manager,
            device,
            Methods.InputKeyboard,
            { keys },
            'Keyboard input sent',
          );
        case 'gamepad':
          if (!buttons) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: "buttons" parameter is required for gamepad action',
                },
              ],
              isError: true,
            };
          }
          return toolRequest(
            manager,
            device,
            Methods.InputGamepad,
            { buttons },
            'Gamepad input sent',
          );
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown action: ${action}` }],
            isError: true,
          };
      }
    },
  );
}

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { DeviceManager } from '../connection/manager.js';

export async function toolRequest(
  manager: DeviceManager,
  deviceId: string | undefined,
  method: string,
  params?: unknown,
  successMessage?: string,
): Promise<CallToolResult> {
  try {
    const device = manager.getDevice(deviceId);
    const result = await device.request(method, params);
    if (successMessage && isEmpty(result)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: successMessage }),
          },
        ],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        { type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ],
      isError: true,
    };
  }
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length === 0 || value.every((item) => isEmpty(item));
    }
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

export function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
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

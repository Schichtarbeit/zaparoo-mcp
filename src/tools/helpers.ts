import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { DeviceManager } from '../connection/manager.js';

export async function toolRequest(
  manager: DeviceManager,
  deviceId: string | undefined,
  method: string,
  params?: unknown,
): Promise<CallToolResult> {
  try {
    const device = manager.getDevice(deviceId);
    const result = await device.request(method, params);
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

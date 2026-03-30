import type { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import type { DeviceManager } from '../connection/manager.js';
import { toolRequest } from './helpers.js';

function createMockManager(overrides: { getDevice?: () => unknown } = {}) {
  return {
    getDevice:
      overrides.getDevice ??
      vi.fn(() => ({
        request: vi.fn().mockResolvedValue({ status: 'ok' }),
      })),
  } as unknown as DeviceManager;
}

function textOf(content: unknown[]): string {
  return (content[0] as TextContent).text;
}

describe('toolRequest', () => {
  it('returns JSON-stringified result on success', async () => {
    const device = { request: vi.fn().mockResolvedValue({ version: '2.10.0' }) };
    const manager = createMockManager({ getDevice: () => device });

    const result = await toolRequest(manager, undefined, 'version');

    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toEqual({
      type: 'text',
      text: JSON.stringify({ version: '2.10.0' }, null, 2),
    });
  });

  it('passes method and params to device.request', async () => {
    const device = { request: vi.fn().mockResolvedValue({}) };
    const manager = createMockManager({ getDevice: () => device });

    await toolRequest(manager, 'device1', 'media.search', { query: 'sonic' });

    expect(device.request).toHaveBeenCalledWith('media.search', { query: 'sonic' });
  });

  it('passes device ID to manager.getDevice', async () => {
    const getDevice = vi.fn(() => ({ request: vi.fn().mockResolvedValue({}) }));
    const manager = createMockManager({ getDevice });

    await toolRequest(manager, 'host:7497', 'version');

    expect(getDevice).toHaveBeenCalledWith('host:7497');
  });

  it('returns isError when device is not found', async () => {
    const manager = createMockManager({
      getDevice: () => {
        throw new Error('No devices are ready');
      },
    });

    const result = await toolRequest(manager, undefined, 'version');

    expect(result.isError).toBe(true);
    expect(textOf(result.content)).toBe('Error: No devices are ready');
  });

  it('returns isError when request fails', async () => {
    const device = { request: vi.fn().mockRejectedValue(new Error('Connection closed')) };
    const manager = createMockManager({ getDevice: () => device });

    const result = await toolRequest(manager, undefined, 'version');

    expect(result.isError).toBe(true);
    expect(textOf(result.content)).toBe('Error: Connection closed');
  });

  it('handles non-Error throw values', async () => {
    const device = { request: vi.fn().mockRejectedValue('string error') };
    const manager = createMockManager({ getDevice: () => device });

    const result = await toolRequest(manager, undefined, 'version');

    expect(result.isError).toBe(true);
    expect(textOf(result.content)).toBe('Error: string error');
  });
});

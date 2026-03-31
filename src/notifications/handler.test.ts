import { EventEmitter } from 'node:events';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceManager, DeviceManagerEvents } from '../connection/manager.js';
import { ConnectionState } from '../connection/types.js';
import { Notifications } from '../types.js';
import { NotificationBuffer } from './buffer.js';
import { NotificationHandler } from './handler.js';

function createMockServer() {
  return {
    sendResourceUpdated: vi.fn().mockResolvedValue(undefined),
    sendLoggingMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as Server & {
    sendResourceUpdated: ReturnType<typeof vi.fn>;
    sendLoggingMessage: ReturnType<typeof vi.fn>;
  };
}

function createMockManager() {
  return new EventEmitter<DeviceManagerEvents>();
}

describe('NotificationHandler', () => {
  let server: ReturnType<typeof createMockServer>;
  let manager: ReturnType<typeof createMockManager>;
  let buffer: NotificationBuffer;
  let handler: NotificationHandler;

  beforeEach(() => {
    server = createMockServer();
    manager = createMockManager();
    buffer = new NotificationBuffer();
    handler = new NotificationHandler(
      server as unknown as Server,
      manager as unknown as DeviceManager,
      buffer,
    );
  });

  describe('notification logging', () => {
    it('logs token scanned with text when present', () => {
      manager.emit(
        'notification',
        Notifications.TokensAdded,
        {
          uid: 'abc123',
          text: 'Genesis/Sonic.md',
          data: '',
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Token scanned: Genesis/Sonic.md',
      });
    });

    it('logs token scanned with uid when text is empty', () => {
      manager.emit(
        'notification',
        Notifications.TokensAdded,
        {
          uid: 'abc123',
          text: '',
          data: '',
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Token scanned: abc123',
      });
    });

    it('logs token removed', () => {
      manager.emit('notification', Notifications.TokensRemoved, {}, 'device1');

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Token removed',
      });
    });

    it('logs media started with name and system', () => {
      manager.emit(
        'notification',
        Notifications.MediaStarted,
        {
          mediaName: 'Super Mario World',
          systemName: 'SNES',
          systemId: 'snes',
          mediaPath: 'SNES/game.sfc',
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Media started: Super Mario World (SNES)',
      });
    });

    it('logs media stopped with name and elapsed time', () => {
      manager.emit(
        'notification',
        Notifications.MediaStopped,
        {
          mediaName: 'Sonic',
          systemId: 'genesis',
          mediaPath: 'Genesis/Sonic.md',
          elapsed: 300,
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Media stopped: Sonic (300s)',
      });
    });

    it('logs reader connected', () => {
      manager.emit(
        'notification',
        Notifications.ReadersAdded,
        {
          driver: 'pn532',
          path: '/dev/ttyUSB0',
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Reader connected',
      });
    });

    it('logs reader disconnected', () => {
      manager.emit(
        'notification',
        Notifications.ReadersRemoved,
        {
          driver: 'pn532',
          path: '/dev/ttyUSB0',
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Reader disconnected',
      });
    });

    it('logs playtime limit reached', () => {
      manager.emit('notification', Notifications.PlaytimeLimitReached, {}, 'device1');

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Playtime limit reached',
      });
    });

    it('logs playtime limit warning', () => {
      manager.emit('notification', Notifications.PlaytimeLimitWarning, {}, 'device1');

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Playtime limit warning',
      });
    });

    it('logs inbox message', () => {
      manager.emit('notification', Notifications.InboxAdded, {}, 'device1');

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] New inbox message',
      });
    });

    it('does not log for unknown notification methods', () => {
      manager.emit('notification', 'some.unknown.event', {}, 'device1');

      expect(server.sendLoggingMessage).not.toHaveBeenCalled();
    });

    it('logs media indexing with step display', () => {
      manager.emit(
        'notification',
        Notifications.MediaIndexing,
        {
          indexing: true,
          currentStepDisplay: 'Scanning files',
          currentStep: 2,
          totalSteps: 5,
        },
        'device1',
      );

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Media indexing: Scanning files (step 2/5)',
      });
    });

    it('logs media indexing without step details', () => {
      manager.emit('notification', Notifications.MediaIndexing, { indexing: true }, 'device1');

      expect(server.sendLoggingMessage).toHaveBeenCalledWith({
        level: 'info',
        data: '[device1] Media indexing',
      });
    });
  });

  describe('state updates', () => {
    it('updates state store on notification', () => {
      manager.emit(
        'notification',
        Notifications.TokensAdded,
        {
          uid: 'abc',
          text: 'test',
          data: '',
        },
        'device1',
      );

      const state = handler.stateStore.getState('device1');
      expect(state.lastTokenScan).toEqual({ uid: 'abc', text: 'test', data: '' });
    });

    it('sends resource update on notification', () => {
      manager.emit(
        'notification',
        Notifications.TokensAdded,
        {
          uid: 'abc',
          text: 'test',
          data: '',
        },
        'device1',
      );

      expect(server.sendResourceUpdated).toHaveBeenCalledWith({
        uri: 'zaparoo://device1/state',
      });
    });

    it('pushes notifications to the buffer', () => {
      manager.emit(
        'notification',
        Notifications.TokensAdded,
        {
          uid: 'abc',
          text: 'test',
          data: '',
        },
        'device1',
      );

      const recent = buffer.getRecent();
      expect(recent).toHaveLength(1);
      expect(recent[0].method).toBe(Notifications.TokensAdded);
      expect(recent[0].deviceId).toBe('device1');
      expect(recent[0].message).toBe('[device1] Token scanned: test');
    });

    it('sends resource updates and updates state store on state change', () => {
      manager.emit('stateChange', ConnectionState.Ready, {
        id: 'host:7497',
        host: 'host',
        port: 7497,
        state: ConnectionState.Ready,
      });

      // Should update both the device-specific and devices-list resources
      expect(server.sendResourceUpdated).toHaveBeenCalledWith({
        uri: 'zaparoo://host:7497/state',
      });
      expect(server.sendResourceUpdated).toHaveBeenCalledWith({
        uri: 'zaparoo://devices',
      });

      // State store should reflect the connection state
      expect(handler.stateStore.getState('host:7497').connectionState).toBe(ConnectionState.Ready);
    });
  });
});

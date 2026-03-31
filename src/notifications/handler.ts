import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { DeviceManager } from '../connection/manager.js';
import type { ConnectionState, DeviceInfo } from '../connection/types.js';
import type {
  IndexingStatusResponse,
  MediaStartedParams,
  MediaStoppedParams,
  TokenAddedParams,
} from '../types.js';
import { Notifications } from '../types.js';
import type { NotificationBuffer } from './buffer.js';
import { DeviceStateStore } from './state.js';

// Notifications that always produce a log message to the LLM
const LOG_NOTIFICATIONS = new Set([
  Notifications.TokensAdded,
  Notifications.TokensRemoved,
  Notifications.MediaStarted,
  Notifications.MediaStopped,
  Notifications.MediaIndexing,
  Notifications.ReadersAdded,
  Notifications.ReadersRemoved,
  Notifications.PlaytimeLimitReached,
  Notifications.PlaytimeLimitWarning,
  Notifications.InboxAdded,
]);

export class NotificationHandler {
  readonly stateStore = new DeviceStateStore();
  private mcpServer: Server;
  private buffer: NotificationBuffer;

  constructor(mcpServer: Server, manager: DeviceManager, buffer: NotificationBuffer) {
    this.mcpServer = mcpServer;
    this.buffer = buffer;

    manager.on('stateChange', (state, device) => {
      this.onStateChange(state, device);
    });

    manager.on('notification', (method, params, deviceId) => {
      this.onNotification(deviceId, method, params);
    });
  }

  private onStateChange(state: ConnectionState, device: DeviceInfo): void {
    this.stateStore.updateConnection(device.id, state, device.version, device.platform);
    this.sendResourceUpdate(device.id);
    this.sendResourceUpdate('devices');
  }

  private onNotification(deviceId: string, method: string, params: unknown): void {
    this.stateStore.handleNotification(deviceId, method, params);
    this.sendResourceUpdate(deviceId);

    const message = this.formatLogMessage(deviceId, method, params);

    if (
      message &&
      LOG_NOTIFICATIONS.has(method as (typeof Notifications)[keyof typeof Notifications])
    ) {
      this.sendLogMessage(message);
    }

    this.buffer.push({
      timestamp: new Date().toISOString(),
      deviceId,
      method,
      params,
      message,
    });
  }

  private formatLogMessage(deviceId: string, method: string, params: unknown): string | null {
    const prefix = `[${deviceId}]`;

    switch (method) {
      case Notifications.TokensAdded: {
        const p = params as TokenAddedParams;
        return `${prefix} Token scanned: ${p.text || p.uid}`;
      }
      case Notifications.TokensRemoved:
        return `${prefix} Token removed`;
      case Notifications.MediaStarted: {
        const p = params as MediaStartedParams;
        return `${prefix} Media started: ${p.mediaName} (${p.systemName})`;
      }
      case Notifications.MediaStopped: {
        const p = params as MediaStoppedParams;
        return `${prefix} Media stopped: ${p.mediaName} (${p.elapsed}s)`;
      }
      case Notifications.MediaIndexing: {
        const p = params as IndexingStatusResponse;
        if (p.currentStepDisplay) {
          const step = p.totalSteps ? ` (step ${p.currentStep}/${p.totalSteps})` : '';
          return `${prefix} Media indexing: ${p.currentStepDisplay}${step}`;
        }
        return `${prefix} Media indexing`;
      }
      case Notifications.ReadersAdded:
        return `${prefix} Reader connected`;
      case Notifications.ReadersRemoved:
        return `${prefix} Reader disconnected`;
      case Notifications.PlaytimeLimitReached:
        return `${prefix} Playtime limit reached`;
      case Notifications.PlaytimeLimitWarning:
        return `${prefix} Playtime limit warning`;
      case Notifications.InboxAdded:
        return `${prefix} New inbox message`;
      default:
        return null;
    }
  }

  private sendResourceUpdate(resourceSuffix: string): void {
    const uri =
      resourceSuffix === 'devices' ? 'zaparoo://devices' : `zaparoo://${resourceSuffix}/state`;

    this.mcpServer.sendResourceUpdated({ uri }).catch(() => {
      // Client may not support resource subscriptions
    });
  }

  private sendLogMessage(message: string): void {
    this.mcpServer.sendLoggingMessage({ level: 'info', data: message }).catch(() => {
      // Client may not support logging
    });
  }
}

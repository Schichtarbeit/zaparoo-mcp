import type {
  ActiveMediaResponse,
  MediaStartedParams,
  MediaStoppedParams,
  ReaderNotificationParams,
  TokenAddedParams,
} from '../types.js';
import { Notifications } from '../types.js';

export interface ConnectionHistoryEntry {
  state: string;
  timestamp: string;
  error?: string;
}

const MAX_CONNECTION_HISTORY = 50;

export interface DeviceState {
  connectionState: string;
  version?: string;
  platform?: string;
  readers: ReaderNotificationParams[];
  activeMedia: ActiveMediaResponse[];
  lastTokenScan?: TokenAddedParams;
  lastNotification?: {
    method: string;
    timestamp: string;
  };
  connectionHistory: ConnectionHistoryEntry[];
}

export class DeviceStateStore {
  private states = new Map<string, DeviceState>();

  getState(deviceId: string): DeviceState {
    let state = this.states.get(deviceId);
    if (!state) {
      state = {
        connectionState: 'DISCONNECTED',
        readers: [],
        activeMedia: [],
        connectionHistory: [],
      };
      this.states.set(deviceId, state);
    }
    return state;
  }

  updateConnection(
    deviceId: string,
    connectionState: string,
    version?: string,
    platform?: string,
    lastError?: string,
  ): void {
    const state = this.getState(deviceId);
    state.connectionState = connectionState;
    if (version !== undefined) state.version = version;
    if (platform !== undefined) state.platform = platform;

    const entry: ConnectionHistoryEntry = {
      state: connectionState,
      timestamp: new Date().toISOString(),
    };
    if (lastError) entry.error = lastError;
    state.connectionHistory.push(entry);
    if (state.connectionHistory.length > MAX_CONNECTION_HISTORY) {
      state.connectionHistory.shift();
    }
  }

  handleNotification(deviceId: string, method: string, params: unknown): void {
    const state = this.getState(deviceId);
    state.lastNotification = { method, timestamp: new Date().toISOString() };

    switch (method) {
      case Notifications.ReadersAdded: {
        const reader = params as ReaderNotificationParams;
        const existing = state.readers.findIndex(
          (r) => r.driver === reader.driver && r.path === reader.path,
        );
        if (existing >= 0) {
          state.readers[existing] = reader;
        } else {
          state.readers.push(reader);
        }
        break;
      }

      case Notifications.ReadersRemoved: {
        const reader = params as ReaderNotificationParams;
        state.readers = state.readers.filter(
          (r) => !(r.driver === reader.driver && r.path === reader.path),
        );
        break;
      }

      case Notifications.TokensAdded:
        state.lastTokenScan = params as TokenAddedParams;
        break;

      case Notifications.MediaStarted: {
        const media = params as MediaStartedParams;
        state.activeMedia.push({
          ...media,
          started: new Date().toISOString(),
          launcherId: '',
          zapScript: '',
        });
        break;
      }

      case Notifications.MediaStopped: {
        const stopped = params as MediaStoppedParams;
        state.activeMedia = state.activeMedia.filter(
          (m) => !(m.systemId === stopped.systemId && m.mediaPath === stopped.mediaPath),
        );
        break;
      }
    }
  }
}

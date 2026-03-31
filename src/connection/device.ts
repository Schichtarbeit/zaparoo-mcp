import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import type { DeviceConfig } from '../config.js';
import type { JsonRpcResponse, VersionResponse } from '../types.js';
import { Methods } from '../types.js';
import type { DeviceInfo } from './types.js';
import { ConnectionState } from './types.js';

const HEARTBEAT_INTERVAL_MS = 25_000;
const REQUEST_TIMEOUT_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_JITTER = 0.3;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface DeviceConnectionEvents {
  stateChange: [state: ConnectionState, device: DeviceInfo];
  notification: [method: string, params: unknown, deviceId: string];
}

export class DeviceConnection extends EventEmitter<DeviceConnectionEvents> {
  readonly config: DeviceConfig;

  private ws: WebSocket | null = null;
  private state = ConnectionState.Disconnected;
  private pendingRequests = new Map<string, PendingRequest>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private requestIdCounter = 0;
  private version?: string;
  private platform?: string;
  private lastSeen?: Date;
  private lastError?: string;
  private destroyed = false;

  constructor(config: DeviceConfig) {
    super();
    this.config = config;
  }

  get info(): DeviceInfo {
    return {
      id: this.config.id,
      host: this.config.host,
      port: this.config.port,
      state: this.state,
      version: this.version,
      platform: this.platform,
      lastSeen: this.lastSeen,
      lastError: this.lastError,
    };
  }

  get isReady(): boolean {
    return this.state === ConnectionState.Ready;
  }

  connect(): void {
    if (this.destroyed) return;
    if (this.state !== ConnectionState.Disconnected) return;
    this.setState(ConnectionState.Connecting);

    const url = this.buildUrl();
    this.ws = new WebSocket(url);

    this.ws.on('open', () => this.onOpen());
    this.ws.on('message', (data) => this.onMessage(data));
    this.ws.on('close', (code, reason) => this.onClose(code, reason.toString()));
    this.ws.on('error', (err) => this.onError(err));
    this.ws.on('pong', () => {
      this.lastSeen = new Date();
    });
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    const ws = this.ws;
    if (!ws || this.state !== ConnectionState.Ready) {
      throw new Error(`Device ${this.config.id} is not ready (state: ${this.state})`);
    }

    const id = `${++this.requestIdCounter}`;
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? null,
    });

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request to ${this.config.id} timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      ws.send(message, (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  forceReconnect(): void {
    this.cleanup();
    this.setState(ConnectionState.Disconnected);
    this.reconnectAttempts = 0;
    this.connect();
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanup();
    this.setState(ConnectionState.Disconnected);
  }

  private buildUrl(): string {
    const base = `ws://${this.config.host}:${this.config.port}/api/v0.1`;
    return this.config.apiKey ? `${base}?key=${this.config.apiKey}` : base;
  }

  private async onOpen(): Promise<void> {
    this.setState(ConnectionState.Connected);
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    try {
      const result = await this.requestInternal<VersionResponse>(Methods.Version);
      this.version = result.version;
      this.platform = result.platform;
      this.lastSeen = new Date();
      this.lastError = undefined;
      this.setState(ConnectionState.Ready);
    } catch (err) {
      this.lastError = `Version check failed: ${err instanceof Error ? err.message : String(err)}`;
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  private onMessage(data: WebSocket.RawData): void {
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(data.toString()) as JsonRpcResponse;
    } catch {
      return;
    }

    // Response to a pending request
    if (msg.id !== undefined) {
      const id = String(msg.id);
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        clearTimeout(pending.timer);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // Notification (no id)
    const notif = msg as unknown as { method?: string; params?: unknown };
    if (notif.method) {
      this.lastSeen = new Date();
      this.emit('notification', notif.method, notif.params, this.config.id);
    }
  }

  private onClose(_code: number, reason: string): void {
    this.lastError = reason || 'Connection closed';
    this.cleanup();
    this.setState(ConnectionState.Disconnected);
    this.scheduleReconnect();
  }

  private onError(err: Error): void {
    this.lastError = err.message;
    // 'close' event follows 'error', so reconnect happens there
  }

  // Internal request that works before READY state (used for version handshake)
  private requestInternal<T = unknown>(method: string, params?: unknown): Promise<T> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket not open'));
    }

    const id = `${++this.requestIdCounter}`;
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? null,
    });

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Internal request timed out'));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      ws.send(message, (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.emit('stateChange', newState, this.info);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;

    const baseDelay = Math.min(BACKOFF_BASE_MS * 2 ** this.reconnectAttempts, BACKOFF_MAX_MS);
    const jitter = baseDelay * BACKOFF_JITTER * (Math.random() * 2 - 1);
    const delay = Math.max(BACKOFF_BASE_MS, baseDelay + jitter);

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

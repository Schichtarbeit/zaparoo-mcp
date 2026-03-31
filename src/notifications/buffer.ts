import { EventEmitter } from 'node:events';

const DEFAULT_MAX_SIZE = 200;

export interface BufferedNotification {
  timestamp: string;
  deviceId: string;
  method: string;
  params: unknown;
  message: string | null;
}

export interface NotificationBufferEvents {
  notification: [entry: BufferedNotification];
}

export class NotificationBuffer extends EventEmitter<NotificationBufferEvents> {
  private entries: BufferedNotification[] = [];
  private maxSize: number;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    super();
    this.maxSize = maxSize;
  }

  push(entry: BufferedNotification): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.splice(0, this.entries.length - this.maxSize);
    }
    this.emit('notification', entry);
  }

  getRecent(count?: number, since?: string, methods?: string[]): BufferedNotification[] {
    let result = this.entries;

    if (since) {
      result = result.filter((e) => e.timestamp > since);
    }

    if (methods && methods.length > 0) {
      const methodSet = new Set(methods);
      result = result.filter((e) => methodSet.has(e.method));
    }

    // Newest first
    result = [...result].reverse();

    if (count !== undefined) {
      result = result.slice(0, count);
    }

    return result;
  }

  clear(): void {
    this.entries = [];
  }
}

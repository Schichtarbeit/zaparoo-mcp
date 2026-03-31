export interface TraceEntry {
  timestamp: string;
  deviceId: string;
  direction: 'request' | 'response';
  method: string;
  id: string;
  data: unknown;
  durationMs?: number;
}

const DEFAULT_MAX_SIZE = 500;

export class TraceBuffer {
  private entries: TraceEntry[] = [];
  private maxSize: number;
  enabled = false;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  push(entry: TraceEntry): void {
    if (!this.enabled) return;
    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  getRecent(count = 50, deviceId?: string): TraceEntry[] {
    let filtered = this.entries;
    if (deviceId) {
      filtered = filtered.filter((e) => e.deviceId === deviceId);
    }
    return filtered.slice(-count).reverse();
  }

  clear(): void {
    this.entries = [];
  }
}

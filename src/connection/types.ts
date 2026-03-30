export enum ConnectionState {
  Disconnected = 'DISCONNECTED',
  Connecting = 'CONNECTING',
  Connected = 'CONNECTED',
  Ready = 'READY',
}

export interface DeviceInfo {
  id: string;
  host: string;
  port: number;
  state: ConnectionState;
  version?: string;
  platform?: string;
  lastSeen?: Date;
  lastError?: string;
}

// Zaparoo Core API types, ported from zaparoo-core/pkg/api/models/.
// These match the JSON wire format of the Zaparoo Core JSON-RPC 2.0 API.

// --- JSON-RPC Protocol ---

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
}

// --- API Method Names ---

export const Methods = {
  Run: 'run',
  Stop: 'stop',
  Tokens: 'tokens',
  TokensHistory: 'tokens.history',
  Media: 'media',
  MediaGenerate: 'media.generate',
  MediaGenerateCancel: 'media.generate.cancel',
  MediaSearch: 'media.search',
  MediaTags: 'media.tags',
  MediaActive: 'media.active',
  MediaHistory: 'media.history',
  MediaHistoryTop: 'media.history.top',
  MediaLookup: 'media.lookup',
  MediaBrowse: 'media.browse',
  MediaControl: 'media.control',
  Settings: 'settings',
  SettingsUpdate: 'settings.update',
  SettingsReload: 'settings.reload',
  SettingsLogsDownload: 'settings.logs.download',
  SettingsAuthClaim: 'settings.auth.claim',
  PlaytimeLimits: 'settings.playtime.limits',
  PlaytimeLimitsUpdate: 'settings.playtime.limits.update',
  Playtime: 'playtime',
  Systems: 'systems',
  LaunchersRefresh: 'launchers.refresh',
  Mappings: 'mappings',
  MappingsNew: 'mappings.new',
  MappingsDelete: 'mappings.delete',
  MappingsUpdate: 'mappings.update',
  MappingsReload: 'mappings.reload',
  Readers: 'readers',
  ReadersWrite: 'readers.write',
  ReadersWriteCancel: 'readers.write.cancel',
  Version: 'version',
  Health: 'health',
  Inbox: 'inbox',
  InboxDelete: 'inbox.delete',
  InboxClear: 'inbox.clear',
  UpdateCheck: 'update.check',
  UpdateApply: 'update.apply',
  InputKeyboard: 'input.keyboard',
  InputGamepad: 'input.gamepad',
  Screenshot: 'screenshot',
} as const;

// --- Notification Names ---

export const Notifications = {
  ReadersAdded: 'readers.added',
  ReadersRemoved: 'readers.removed',
  TokensAdded: 'tokens.added',
  TokensRemoved: 'tokens.removed',
  MediaStarted: 'media.started',
  MediaStopped: 'media.stopped',
  MediaIndexing: 'media.indexing',
  PlaytimeLimitReached: 'playtime.limit.reached',
  PlaytimeLimitWarning: 'playtime.limit.warning',
  InboxAdded: 'inbox.added',
} as const;

export type NotificationType = (typeof Notifications)[keyof typeof Notifications];

// --- Request Params ---

export interface RunParams {
  text?: string;
  type?: string;
  uid?: string;
  data?: string;
  unsafe?: boolean;
}

export interface SearchParams {
  query?: string;
  systems?: string[];
  fuzzySystem?: boolean;
  maxResults?: number;
  cursor?: string;
  tags?: string[];
  letter?: string;
}

export interface BrowseParams {
  path?: string;
  maxResults?: number;
  cursor?: string;
  letter?: string;
  sort?: 'name-asc' | 'name-desc' | 'filename-asc' | 'filename-desc';
}

export interface MediaIndexParams {
  systems?: string[];
  fuzzySystem?: boolean;
}

export interface MediaHistoryParams {
  systems?: string[];
  fuzzySystem?: boolean;
  limit?: number;
  cursor?: string;
}

export interface MediaHistoryTopParams {
  systems?: string[];
  fuzzySystem?: boolean;
  since?: string;
  limit?: number;
}

export interface MediaLookupParams {
  name: string;
  system: string;
  fuzzySystem?: boolean;
}

export interface MediaControlParams {
  action: string;
  args?: Record<string, string>;
}

export interface UpdateSettingsParams {
  runZapScript?: boolean;
  debugLogging?: boolean;
  audioScanFeedback?: boolean;
  readersAutoDetect?: boolean;
  errorReporting?: boolean;
  readersScanMode?: 'tap' | 'hold';
  readersScanExitDelay?: number;
  readersScanIgnoreSystems?: string[];
  readersConnect?: ReaderConnection[];
}

export interface ReaderConnection {
  driver: string;
  path: string;
  idSource?: string;
}

export interface UpdatePlaytimeLimitsParams {
  enabled?: boolean;
  daily?: string;
  session?: string;
  sessionReset?: string;
  warnings?: string[];
  retention?: number;
}

export interface ReaderWriteParams {
  text: string;
  readerId?: string;
}

export interface AddMappingParams {
  label?: string;
  type: 'id' | 'value' | 'data' | 'uid' | 'text';
  match: 'exact' | 'partial' | 'regex';
  pattern: string;
  override?: string;
  enabled?: boolean;
}

export interface UpdateMappingParams {
  id: number;
  label?: string;
  type?: 'id' | 'value' | 'data' | 'uid' | 'text';
  match?: 'exact' | 'partial' | 'regex';
  pattern?: string;
  override?: string;
  enabled?: boolean;
}

export interface DeleteMappingParams {
  id: number;
}

export interface DeleteInboxParams {
  id: number;
}

export interface SettingsAuthClaimParams {
  claimUrl: string;
  token: string;
}

export interface InputKeyboardParams {
  keys: string;
}

export interface InputGamepadParams {
  buttons: string;
}

// --- Response Types ---

export interface System {
  id: string;
  name: string;
  category?: string;
  releaseDate?: string;
  manufacturer?: string;
}

export interface TagInfo {
  key: string;
  value: string;
}

export interface PaginationInfo {
  nextCursor?: string;
  hasNextPage: boolean;
  pageSize: number;
}

export interface SearchResultMedia {
  system: System;
  name: string;
  path: string;
  zapScript: string;
  tags: TagInfo[];
}

export interface SearchResults {
  results: SearchResultMedia[];
  pagination?: PaginationInfo;
  total: number;
}

export interface BrowseEntry {
  name: string;
  path: string;
  type: string;
  systemId?: string;
  relativePath?: string;
  zapScript?: string;
  fileCount?: number;
  group?: string;
  tags?: TagInfo[];
}

export interface BrowseResults {
  path: string;
  entries: BrowseEntry[];
  pagination?: PaginationInfo;
  totalFiles: number;
}

export interface TagsResponse {
  tags: TagInfo[];
}

export interface IndexingStatusResponse {
  exists: boolean;
  indexing: boolean;
  optimizing: boolean;
  totalSteps?: number;
  currentStep?: number;
  currentStepDisplay?: string;
  totalFiles?: number;
  totalMedia?: number;
}

export interface ActiveMedia {
  started: string;
  launcherId: string;
  systemId: string;
  systemName: string;
  mediaPath: string;
  mediaName: string;
  launcherControls?: string[];
}

export interface ActiveMediaResponse extends ActiveMedia {
  zapScript: string;
}

export interface MediaResponse {
  database: IndexingStatusResponse;
  active: ActiveMediaResponse[];
}

export interface TokenResponse {
  scanTime: string;
  type: string;
  uid: string;
  text: string;
  data: string;
  readerId?: string;
}

export interface TokensResponse {
  active: TokenResponse[];
  last?: TokenResponse;
}

export interface HistoryResponseEntry {
  time: string;
  type: string;
  uid: string;
  text: string;
  data: string;
  success: boolean;
}

export interface HistoryResponse {
  entries: HistoryResponseEntry[];
}

export interface SettingsResponse {
  runZapScript: boolean;
  debugLogging: boolean;
  audioScanFeedback: boolean;
  readersAutoDetect: boolean;
  errorReporting: boolean;
  readersScanMode: string;
  readersScanExitDelay: number;
  readersScanIgnoreSystems: string[];
  readersConnect: ReaderConnection[];
}

export interface PlaytimeLimitsResponse {
  enabled: boolean;
  daily?: string;
  session?: string;
  sessionReset?: string;
  warnings?: string[];
  retention?: number;
}

export interface PlaytimeStatusResponse {
  state: string;
  sessionActive: boolean;
  limitsEnabled: boolean;
  sessionStarted?: string;
  sessionDuration?: string;
  sessionCumulativeTime?: string;
  sessionRemaining?: string;
  cooldownRemaining?: string;
  dailyUsageToday?: string;
  dailyRemaining?: string;
}

export interface ReaderInfo {
  id: string;
  readerId: string;
  driver: string;
  info: string;
  capabilities: string[];
  connected: boolean;
}

export interface ReadersResponse {
  readers: ReaderInfo[];
}

export interface MappingResponse {
  id: string;
  added: string;
  label: string;
  type: string;
  match: string;
  pattern: string;
  override: string;
  enabled: boolean;
}

export interface AllMappingsResponse {
  mappings: MappingResponse[];
}

export interface VersionResponse {
  version: string;
  platform: string;
}

export interface HealthCheckResponse {
  status: string;
}

export interface MediaHistoryResponseEntry {
  systemId: string;
  systemName: string;
  mediaName: string;
  mediaPath: string;
  launcherId: string;
  startedAt: string;
  endedAt?: string;
  playTime: number;
}

export interface MediaHistoryResponse {
  entries: MediaHistoryResponseEntry[];
  pagination?: PaginationInfo;
}

export interface MediaHistoryTopEntry {
  systemId: string;
  systemName: string;
  mediaName: string;
  mediaPath: string;
  lastPlayedAt: string;
  totalPlayTime: number;
  sessionCount: number;
}

export interface MediaHistoryTopResponse {
  entries: MediaHistoryTopEntry[];
}

export interface MediaLookupMatch {
  system: System;
  name: string;
  path: string;
  zapScript: string;
  tags: TagInfo[];
  confidence: number;
}

export interface MediaLookupResponse {
  match: MediaLookupMatch | null;
}

export interface InboxMessage {
  id: number;
  title: string;
  body?: string;
  severity: number;
  category?: string;
  profileId?: number;
  createdAt: string;
}

export interface InboxResponse {
  messages: InboxMessage[];
}

export interface LogDownloadResponse {
  filename: string;
  content: string;
  size: number;
}

export interface SettingsAuthClaimResponse {
  domains: string[];
}

export interface UpdateCheckResponse {
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  updateAvailable: boolean;
}

export interface UpdateApplyResponse {
  previousVersion: string;
  newVersion: string;
}

export interface ScreenshotResponse {
  path: string;
  data: string;
  size: number;
}

// --- Notification Params ---

export interface ReaderNotificationParams {
  driver: string;
  path: string;
  connected: boolean;
}

export interface TokenAddedParams {
  type: string;
  uid: string;
  text: string;
  data: string;
  scanTime: string;
  readerId?: string;
}

export interface MediaStartedParams {
  systemId: string;
  systemName: string;
  mediaPath: string;
  mediaName: string;
}

export interface MediaStoppedParams {
  systemId: string;
  systemName: string;
  mediaName: string;
  mediaPath: string;
  launcherId: string;
  elapsed: number;
}

export interface PlaytimeLimitReachedParams {
  reason: 'session' | 'daily';
}

export interface PlaytimeLimitWarningParams {
  interval: string;
  remaining: string;
}

/**
 * Shared types between renderer and main process.
 *
 * These are the contracts for IPC: every channel has a stable name,
 * typed request/response shape, and a documented direction.
 */

export type IPCResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Static IPC channel name registry. Kept in one place so both sides agree. */
export const IPC_CHANNELS = {
  projectSave: 'project.save',
  projectLoad: 'project.load',
  projectNew: 'project.new',
  projectDuplicate: 'project.duplicate',
  projectRecent: 'project.recent',
  projectMigrate: 'project.migrate',

  settingsGet: 'settings.get',
  settingsSet: 'settings.set',

  audioPlay: 'audio.play',
  audioPause: 'audio.pause',
  audioStop: 'audio.stop',
  audioSeek: 'audio.seek',
  audioRender: 'audio.render',
  audioSetSoundfont: 'audio.setSoundfont',

  mcpStatus: 'mcp.status',
  mcpInvoke: 'mcp.invoke',

  transportPlay: 'transport.play',
  transportPause: 'transport.pause',
  transportStop: 'transport.stop',
  transportLoop: 'transport.loop',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/* -------------------------------------------------------------------------- */
/* Request / response payloads                                                */
/* -------------------------------------------------------------------------- */

export interface SaveProjectRequest {
  projectId: string;
  /** Absolute path or a placeholder like `UNTITLED` (dialog flow). */
  path: string;
  /** Serialized project JSON — the main process writes this verbatim. */
  data: string;
}

export interface LoadProjectRequest {
  path: string;
}

export interface RecentProjectEntry {
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface SettingsPatch {
  /** Model provider: 'anthropic' | 'openai' | 'local' | 'custom'. */
  llmProvider?: string;
  llmModel?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  defaultSoundfont?: string;
  autosaveIntervalMs?: number;
  theme?: 'dark' | 'light' | 'system';
}

export type Settings = Partial<SettingsPatch> & {
  soundfontPath: string;
  autosaveIntervalMs: number;
  theme: 'dark' | 'light' | 'system';
};

export interface AudioPlayRequest {
  projectId: string;
  startTick?: number;
}

export interface AudioStopRequest {
  projectId: string;
}

export interface AudioRenderRequest {
  projectId: string;
  format: 'wav' | 'mp3';
  outputPath: string;
  sampleRate?: 44100 | 48000;
}

export interface AudioRenderResponse {
  path: string;
  durationMs: number;
}

export interface McpInvokeRequest {
  toolName: string;
  args: Record<string, unknown>;
}

export interface McpInvokeResponse {
  ok: boolean;
  /** Result payload — either a Command (for mutating tools) or arbitrary data. */
  data?: unknown;
  error?: string;
}

export interface McpStatusResponse {
  running: boolean;
  endpoint?: string;
  toolsCount: number;
}

/* -------------------------------------------------------------------------- */
/* Transport events                                                           */
/* -------------------------------------------------------------------------- */

export type TransportEvent =
  | { type: 'play'; positionTick: number }
  | { type: 'pause'; positionTick: number }
  | { type: 'stop'; positionTick: number }
  | { type: 'tick'; positionTick: number }
  | { type: 'loop'; enabled: boolean; startTick: number; endTick: number };

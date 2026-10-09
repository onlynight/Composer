/**
 * Shared types between renderer and main process.
 *
 * Kept intentionally minimal at M0 — real IPC channel types live here at M1+.
 */

export type IPCResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const IPC_CHANNELS = {
  projectSave: 'project.save',
  projectLoad: 'project.load',
  projectNew: 'project.new',
  projectRecent: 'project.recent',
  settingsGet: 'settings.get',
  settingsSet: 'settings.set',
  audioPlay: 'audio.play',
  audioStop: 'audio.stop',
  audioRender: 'audio.render',
  mcpStatus: 'mcp.status',
  mcpInvoke: 'mcp.invoke',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

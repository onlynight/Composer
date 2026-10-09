/**
 * Preload script — exposes a minimal, safe API to the renderer.
 *
 * With `contextIsolation: false` (scaffold mode), this is a no-op placeholder.
 * At M1 we will switch to a proper contextBridge surface with typed IPC channels.
 */

// Placeholder so that the file exists and Electron finds it.
// The M1+ version will look like:
//   import { contextBridge, ipcRenderer } from 'electron';
//   contextBridge.exposeInMainWorld('caa', {
//     saveProject: (p: string) => ipcRenderer.invoke('project.save', p),
//     loadProject: (path: string) => ipcRenderer.invoke('project.load', path),
//     ...
//   });

console.log('[preload] Composer 共鸣 — scaffold stage');

/**
 * @caa/store — Zustand store wrapping Command Pattern.
 *
 * Single source of truth for the entire editor. All edits flow through
 * `dispatch()`, which runs the Command, records it for undo/redo, and
 * notifies subscribers. Optional BroadcastChannel sync can mirror commands
 * across multiple windows.
 */

import { create } from 'zustand';
import {
  type Command,
  type CommandSource,
  type Project,
  type Transport,
  DEFAULT_TRANSPORT,
  createProject,
  makeBatchCommand,
  UNDO_STACK_MAX,
} from '@caa/core';

import type { SyncHandle } from './broadcast-sync.js';

export * from './broadcast-sync.js';

export interface ProjectStoreState {
  project: Project;
  transport: Transport;
  commandStack: { undo: Command[]; redo: Command[] };
  /** Agent-aware metadata: provenance of the most recent N edits. */
  recentCommandSources: CommandSource[];
  /** Optional BroadcastChannel handle for cross-window sync. */
  sync?: SyncHandle;
  dispatch: (command: Command, opts?: DispatchOptions) => void;
  dispatchBatch: (commands: Command[], opts?: DispatchOptions) => void;
  undo: () => void;
  redo: () => void;
  setProject: (project: Project) => void;
  setTransport: (patch: Partial<Transport>) => void;
  attachSync: (handle: SyncHandle | null) => void;
}

export interface DispatchOptions {
  /** Suppress undo/redo entry (used for system-driven changes). */
  skipHistory?: boolean;
  /** Don't broadcast to other windows (used for replaying incoming messages). */
  skipSync?: boolean;
}

const initialProject = createProject({ name: 'Untitled Project' });

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: initialProject,
  transport: { ...DEFAULT_TRANSPORT },
  commandStack: { undo: [], redo: [] },
  recentCommandSources: [],
  sync: undefined,

  dispatch: (command, opts) => {
    const state = get();
    const nextProject = command.execute(state.project);
    set({
      project: nextProject,
      commandStack: opts?.skipHistory
        ? state.commandStack
        : {
            undo: [...state.commandStack.undo.slice(-(UNDO_STACK_MAX - 1)), command],
            redo: [],
          },
      recentCommandSources: opts?.skipHistory
        ? state.recentCommandSources
        : [...state.recentCommandSources.slice(-19), command.source],
    });
    if (!opts?.skipSync && state.sync) {
      state.sync.sendCommand(command);
    }
  },

  dispatchBatch: (commands, opts) => {
    if (commands.length === 0) return;
    if (commands.length === 1) {
      get().dispatch(commands[0], opts);
      return;
    }
    get().dispatch(makeBatchCommand(commands), opts);
  },

  undo: () => {
    const state = get();
    const stack = state.commandStack.undo;
    if (stack.length === 0) return;
    const cmd = stack[stack.length - 1];
    const nextProject = cmd.rollback(state.project);
    set({
      project: nextProject,
      commandStack: {
        undo: stack.slice(0, -1),
        redo: [...state.commandStack.redo, cmd],
      },
    });
  },

  redo: () => {
    const state = get();
    const stack = state.commandStack.redo;
    if (stack.length === 0) return;
    const cmd = stack[stack.length - 1];
    const nextProject = cmd.execute(state.project);
    set({
      project: nextProject,
      commandStack: {
        undo: [...state.commandStack.undo, cmd],
        redo: stack.slice(0, -1),
      },
    });
  },

  setProject: (project) =>
    set({ project, commandStack: { undo: [], redo: [] } }),

  setTransport: (patch) => set((state) => ({ transport: { ...state.transport, ...patch } })),

  attachSync: (handle) => set({ sync: handle ?? undefined }),
}));

/** Exported for tests / non-React callers. */
export function getState() {
  return useProjectStore.getState();
}

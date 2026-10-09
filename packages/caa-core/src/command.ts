/**
 * Command Pattern implementation — the atomic unit of state mutation.
 *
 * All edits (human, agent, system) must go through Commands so that
 * undo/redo, permission gating, provenance tracking and Agent-aware UI
 * work uniformly across the whole system.
 */

import type { CommandSource } from './constants.js';
import { newId } from './project.js';
import type { Command, Id, Note, Project, Track } from './types.js';

export type { Command } from './types.js';

/* -------------------------------------------------------------------------- */
/* Command factory helpers                                                     */
/* -------------------------------------------------------------------------- */

interface CommandOptions {
  source?: CommandSource;
  description?: string;
  affectedNoteIds?: Id[];
}

/* -------------------------------------------------------------------------- */
/* Note commands                                                               */
/* -------------------------------------------------------------------------- */

export function makeAddNoteCommand(note: Note, opts: CommandOptions = {}): Command {
  return {
    id: newId(),
    type: 'note.add',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { note },
    affectedNoteIds: opts.affectedNoteIds ?? [note.id],
    description: opts.description,
    execute: (state) => addNoteToState(state, note),
    rollback: (state) => removeNoteById(state, note.id),
  };
}

export function makeRemoveNoteCommand(trackId: Id, noteId: Id, snapshot: Note, opts: CommandOptions = {}): Command {
  return {
    id: newId(),
    type: 'note.remove',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { trackId, noteId, note: snapshot },
    affectedNoteIds: opts.affectedNoteIds ?? [noteId],
    description: opts.description,
    execute: (state) => removeNoteById(state, noteId, trackId),
    rollback: (state) => addNoteToState(state, snapshot),
  };
}

export function makeUpdateNoteCommand(
  trackId: Id,
  noteId: Id,
  patch: Partial<Note>,
  prev: Partial<Note>,
  opts: CommandOptions = {},
): Command {
  return {
    id: newId(),
    type: 'note.update',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { trackId, noteId, patch, prev },
    affectedNoteIds: opts.affectedNoteIds ?? [noteId],
    description: opts.description,
    execute: (state) => updateNote(state, trackId, noteId, patch),
    rollback: (state) => updateNote(state, trackId, noteId, prev),
  };
}

export function makeAddNotesCommand(
  notes: Note[],
  opts: CommandOptions = {},
): Command {
  return {
    id: newId(),
    type: 'notes.addBatch',
    source: opts.source ?? 'agent',
    createdAt: Date.now(),
    args: { notes },
    affectedNoteIds: opts.affectedNoteIds ?? notes.map((n) => n.id),
    description: opts.description,
    execute: (state) => notes.reduce(addNoteToState, state),
    rollback: (state) => notes.reduce((s, n) => removeNoteById(s, n.id), state),
  };
}

/* -------------------------------------------------------------------------- */
/* Track commands                                                              */
/* -------------------------------------------------------------------------- */

export function makeAddTrackCommand(track: Track, opts: CommandOptions = {}): Command {
  return {
    id: newId(),
    type: 'track.add',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { track },
    description: opts.description,
    execute: (state) => addTrackToState(state, track),
    rollback: (state) => removeTrackById(state, track.id),
  };
}

export function makeRemoveTrackCommand(trackId: Id, snapshot: Track, opts: CommandOptions = {}): Command {
  return {
    id: newId(),
    type: 'track.remove',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { trackId, track: snapshot },
    description: opts.description,
    execute: (state) => removeTrackById(state, trackId),
    rollback: (state) => addTrackToState(state, snapshot),
  };
}

export function makeUpdateTrackCommand(
  trackId: Id,
  patch: Partial<Track>,
  prev: Partial<Track>,
  opts: CommandOptions = {},
): Command {
  return {
    id: newId(),
    type: 'track.update',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { trackId, patch, prev },
    description: opts.description,
    execute: (state) => updateTrack(state, trackId, patch),
    rollback: (state) => updateTrack(state, trackId, prev),
  };
}

/* -------------------------------------------------------------------------- */
/* Project-level commands                                                      */
/* -------------------------------------------------------------------------- */

export function makeUpdateProjectCommand(
  patch: Partial<Pick<Project, 'name' | 'bpm' | 'timeSignature' | 'totalTicks'>>,
  prev: Partial<Pick<Project, 'name' | 'bpm' | 'timeSignature' | 'totalTicks'>>,
  opts: CommandOptions = {},
): Command {
  return {
    id: newId(),
    type: 'project.update',
    source: opts.source ?? 'human',
    createdAt: Date.now(),
    args: { patch, prev },
    description: opts.description,
    execute: (state) => ({ ...state, ...patch, updatedAt: Date.now() }),
    rollback: (state) => ({ ...state, ...prev, updatedAt: Date.now() }),
  };
}

/* -------------------------------------------------------------------------- */
/* Batch command — one undo step for many sub-commands                         */
/* -------------------------------------------------------------------------- */

export function makeBatchCommand(commands: Command[], opts: CommandOptions = {}): Command {
  return {
    id: newId(),
    type: 'batch',
    source: opts.source ?? commands[0]?.source ?? 'agent',
    createdAt: Date.now(),
    args: { commands },
    affectedNoteIds: opts.affectedNoteIds,
    description: opts.description,
    execute: (state) => commands.reduce((s, c) => c.execute(s), state),
    rollback: (state) => [...commands].reverse().reduce((s, c) => c.rollback(s), state),
  };
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

function addNoteToState(state: Project, note: Note): Project {
  // Find the track that owns the note (match by id or default to active track).
  const ownerTrack = state.tracks.find((t) => t.notes.some((n) => n.id === note.id));
  const targetIdx = ownerTrack
    ? state.tracks.indexOf(ownerTrack)
    : state.activeTrackIndex;
  return updateTrack(state, state.tracks[targetIdx]?.id, {
    notes: [...state.tracks[targetIdx].notes, note],
  });
}

function removeNoteById(state: Project, noteId: Id, trackId?: Id): Project {
  const track = state.tracks.find((t) => t.notes.some((n) => n.id === noteId));
  if (!track) return state;
  return updateTrack(state, trackId ?? track.id, {
    notes: track.notes.filter((n) => n.id !== noteId),
  });
}

function updateNote(state: Project, trackId: Id, noteId: Id, patch: Partial<Note>): Project {
  return updateTrack(state, trackId, {
    notes: state.tracks.find((t) => t.id === trackId)?.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)) ?? [],
  });
}

function addTrackToState(state: Project, track: Track): Project {
  return {
    ...state,
    tracks: [...state.tracks, track],
    updatedAt: Date.now(),
  };
}

function removeTrackById(state: Project, trackId: Id): Project {
  return {
    ...state,
    tracks: state.tracks.filter((t) => t.id !== trackId),
    activeTrackIndex: Math.min(state.activeTrackIndex, Math.max(0, state.tracks.length - 1)),
    updatedAt: Date.now(),
  };
}

function updateTrack(state: Project, trackId: Id, patch: Partial<Track>): Project {
  return {
    ...state,
    tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
    updatedAt: Date.now(),
  };
}

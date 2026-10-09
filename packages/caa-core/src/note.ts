/**
 * Note CRUD and manipulation — the atomic musical entity.
 *
 * `Note` is a value object. All state mutations flow through Commands
 * (see `command.ts`), but these helpers provide the pure-functional building
 * blocks those Commands use.
 */

import { VELOCITY_DEFAULT, VELOCITY_MAX, VELOCITY_MIN } from './constants.js';
import type { Id, Note } from './types.js';
import { clampMidi } from './note-utils.js';
import { newId } from './project.js';

/* -------------------------------------------------------------------------- */
/* Construction                                                                */
/* -------------------------------------------------------------------------- */

export interface NewNoteOptions {
  id?: Id;
  midi: number;
  startTick: number;
  duration: number;
  velocity?: number;
  active?: boolean;
  tag?: string;
}

/**
 * Build a Note with defaults and validation.
 * Throws on out-of-range values instead of clamping silently, since a
 * corrupted note mid-pipeline is worse than an explicit failure.
 */
export function createNote(opts: NewNoteOptions): Note {
  if (!Number.isInteger(opts.midi) || opts.midi < 0 || opts.midi > 127) {
    throw new Error(`Invalid MIDI note: ${opts.midi}`);
  }
  if (opts.startTick < 0) throw new Error(`startTick must be non-negative: ${opts.startTick}`);
  if (opts.duration < 1) throw new Error(`duration must be >= 1 tick: ${opts.duration}`);
  const velocity = opts.velocity ?? VELOCITY_DEFAULT;
  if (velocity < VELOCITY_MIN || velocity > VELOCITY_MAX) {
    throw new Error(`velocity out of range [${VELOCITY_MIN}, ${VELOCITY_MAX}]: ${velocity}`);
  }
  return {
    id: opts.id ?? newId(),
    midi: opts.midi,
    startTick: opts.startTick,
    duration: opts.duration,
    velocity,
    active: opts.active ?? true,
    tag: opts.tag,
  };
}

/** Shallow-clone a note with a new id (used when duplicating). */
export function cloneNote(note: Note): Note {
  return { ...note, id: newId() };
}

/* -------------------------------------------------------------------------- */
/* Update helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Partially update a note, with clamping on numerical fields. */
export function updateNote(note: Note, patch: Partial<Note>): Note {
  return {
    ...note,
    ...patch,
    midi: patch.midi !== undefined ? clampMidi(patch.midi) : note.midi,
    startTick: patch.startTick !== undefined ? Math.max(0, patch.startTick) : note.startTick,
    duration: patch.duration !== undefined ? Math.max(1, patch.duration) : note.duration,
    velocity: patch.velocity !== undefined ? Math.min(VELOCITY_MAX, Math.max(VELOCITY_MIN, patch.velocity)) : note.velocity,
  };
}

/** Transpose a note by a semitone offset. */
export function transposeNote(note: Note, semitones: number): Note {
  return updateNote(note, { midi: note.midi + semitones });
}

/** Move a note in time by a tick offset. */
export function moveNote(note: Note, deltaTicks: number): Note {
  return updateNote(note, { startTick: note.startTick + deltaTicks });
}

/** Quantize a note's start to the nearest grid subdivision (in ticks). */
export function quantizeNote(note: Note, gridTicks: number): Note {
  if (gridTicks < 1) throw new Error('gridTicks must be >= 1');
  const snapped = Math.round(note.startTick / gridTicks) * gridTicks;
  return updateNote(note, { startTick: Math.max(0, snapped) });
}

/* -------------------------------------------------------------------------- */
/* Overlap / collision detection                                               */
/* -------------------------------------------------------------------------- */

/** Whether two notes overlap in time on the same MIDI channel. */
export function notesOverlap(a: Note, b: Note): boolean {
  if (a.midi !== b.midi) return false;
  if (!a.active || !b.active) return false;
  return a.startTick < b.startTick + b.duration && b.startTick < a.startTick + a.duration;
}

/** All notes (excluding candidate) that collide with it. */
export function findCollisions(candidate: Note, existing: Note[]): Note[] {
  return existing.filter((n) => n.id !== candidate.id && notesOverlap(candidate, n));
}

/** Total number of collisions for a candidate. */
export function collisionCount(candidate: Note, existing: Note[]): number {
  return findCollisions(candidate, existing).length;
}

/* -------------------------------------------------------------------------- */
/* Batch queries                                                               */
/* -------------------------------------------------------------------------- */

/** Filter notes by a tick range (inclusive start, exclusive end). */
export function notesInRange(notes: Note[], fromTick: number, toTick: number): Note[] {
  return notes.filter((n) => n.startTick >= fromTick && n.startTick < toTick);
}

/** Filter notes by pitch class (MIDI % 12). */
export function notesByPitchClass(notes: Note[], pitchClass: number): Note[] {
  const pc = ((pitchClass % 12) + 12) % 12;
  return notes.filter((n) => n.midi % 12 === pc);
}

/** Filter notes by MIDI range. */
export function notesByMidiRange(notes: Note[], fromMidi: number, toMidi: number): Note[] {
  return notes.filter((n) => n.midi >= fromMidi && n.midi <= toMidi);
}

/** Find a note by id. Returns undefined if not found. */
export function findNote(notes: Note[], id: Id): Note | undefined {
  return notes.find((n) => n.id === id);
}

/** Whether two notes are identical (excluding id). */
export function noteEquals(a: Note, b: Note): boolean {
  return (
    a.midi === b.midi &&
    a.startTick === b.startTick &&
    a.duration === b.duration &&
    a.velocity === b.velocity &&
    a.active === b.active &&
    (a.tag ?? '') === (b.tag ?? '')
  );
}

/** Sorted-by-startTick copy (stable). */
export function sortByStartTime(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
}

/** The longest note in the collection, or null if empty. */
export function longestNote(notes: Note[]): Note | null {
  if (notes.length === 0) return null;
  return notes.reduce((best, n) => (n.duration > best.duration ? n : best));
}

/** The last note's end tick, or 0 if empty. */
export function notesEndTick(notes: Note[]): number {
  return notes.reduce((end, n) => Math.max(end, n.startTick + n.duration), 0);
}

/** Average velocity across active notes. */
export function averageVelocity(notes: Note[]): number {
  const active = notes.filter((n) => n.active);
  if (active.length === 0) return 0;
  return active.reduce((s, n) => s + n.velocity, 0) / active.length;
}

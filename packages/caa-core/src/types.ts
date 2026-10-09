/**
 * Core data model types for Composer 共鸣.
 *
 * All edits (human, agent, system) are funneled through Commands that mutate
 * these state types, ensuring a single source of truth.
 */

import type { CommandSource } from './constants.js';

/** Stable unique identifier (v4 UUID). */
export type Id = string;

/* -------------------------------------------------------------------------- */
/* Music-theory primitives                                                     */
/* -------------------------------------------------------------------------- */

export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export interface Scale {
  name: string;
  root: NoteName;
  degrees: readonly number[]; // semitone offsets from root
}

export interface ChordSymbol {
  root: NoteName;
  quality: 'maj' | 'min' | 'dim' | 'aug' | 'dom7' | 'maj7' | 'min7' | 'dim7' | 'sus2' | 'sus4' | '6' | '69' | '7sus4' | '7b5';
  octave?: number;
}

/* -------------------------------------------------------------------------- */
/* Musical entities                                                            */
/* -------------------------------------------------------------------------- */

export interface Note {
  id: Id;
  /** MIDI note number (0-127). */
  midi: number;
  /** Start position in ticks (absolute). */
  startTick: number;
  /** Duration in ticks. */
  duration: number;
  /** Velocity 1-127. */
  velocity: number;
  /** Whether the note is active in the timeline. */
  active: boolean;
  /** Optional tag for chord membership, role, etc. */
  tag?: string;
}

export type TrackType =
  | 'piano'
  | 'bass'
  | 'guitar'
  | 'strings'
  | 'brass'
  | 'wind'
  | 'percussion'
  | 'synth'
  | 'sampler'
  | 'audio'
  | 'midi';

export interface Track {
  id: Id;
  name: string;
  type: TrackType;
  /** MIDI channel 0-15. */
  channel: number;
  /** SoundFont program number (GM bank MSB). */
  program: number;
  /** Overall volume in dB, 0 = unity. */
  volumeDb: number;
  /** Pan -1 (full L) to 1 (full R), 0 = center. */
  pan: number;
  muted: boolean;
  solo: boolean;
  visible: boolean;
  notes: Note[];
  /** Optional metadata used by Agent/human tags. */
  color?: string;
}

/* -------------------------------------------------------------------------- */
/* Project state                                                               */
/* -------------------------------------------------------------------------- */

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface Project {
  id: Id;
  name: string;
  /** Schema version for migrations. */
  schemaVersion: number;
  bpm: number;
  timeSignature: TimeSignature;
  /** Total length in ticks. */
  totalTicks: number;
  tracks: Track[];
  /** Selection state (note ids). */
  selectedNoteIds: Id[];
  /** Active track index. */
  activeTrackIndex: number;
  /** Creation timestamp. */
  createdAt: number;
  /** Last modification timestamp. */
  updatedAt: number;
}

/* -------------------------------------------------------------------------- */
/* Command pattern                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A Command is the atomic unit of state mutation. Every change to a Project —
 * human, agent, or system — must be expressed as a Command.
 *
 * Invariants:
 *   - `execute` and `rollback` are exact inverses.
 *   - A Command must be serializable (all primitive fields).
 *   - A batch of Commands can be grouped under one parent for one-step undo.
 */
export interface Command<TState = Project> {
  /** Unique command instance id. */
  id: Id;
  /** Stable command type discriminator (e.g. 'note.add'). */
  type: string;
  /** Origin of the command. */
  source: CommandSource;
  /** Timestamp (ms). */
  createdAt: number;
  /** Payload for execute(). */
  args: Record<string, unknown>;
  /** Notes affected (for conflict detection and Agent-aware UI). */
  affectedNoteIds?: Id[];
  /** Human-readable description (for undo/redo UI, Agent reasoning log). */
  description?: string;
  /** Execute the command and return a new state (immutability preferred). */
  execute: (state: TState) => TState;
  /** Reverse the command and return a new state. */
  rollback: (state: TState) => TState;
}

export interface CommandStack {
  undo: Command[];
  redo: Command[];
}

/* -------------------------------------------------------------------------- */
/* Transport (playback state)                                                  */
/* -------------------------------------------------------------------------- */

export type TransportState = 'stopped' | 'playing' | 'paused';

export interface Transport {
  state: TransportState;
  positionTick: number;
  loopStartTick: number;
  loopEndTick: number;
  loopEnabled: boolean;
}

export const DEFAULT_TRANSPORT: Transport = {
  state: 'stopped',
  positionTick: 0,
  loopStartTick: 0,
  loopEndTick: 0,
  loopEnabled: false,
};

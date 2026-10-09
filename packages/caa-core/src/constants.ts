/**
 * Core constants for the Composer 共鸣 project.
 *
 * These mirror music-theory and MIDI-standard values used across all layers.
 */

/** Standard MIDI resolution: 480 ticks per beat. */
export const TICKS_PER_BEAT = 480;

/** Standard MIDI: 960 ticks per quarter note (2 ticks per 1/24 note). */
export const PPQ = TICKS_PER_BEAT;

/** Default project tempo in BPM. */
export const DEFAULT_BPM = 120;

/** Default time signature (numerator, denominator). */
export const DEFAULT_TIME_SIGNATURE: readonly [number, number] = [4, 4];

/** Default project duration in bars. */
export const DEFAULT_BAR_COUNT = 16;

/** MIDI note range (0-127). */
export const MIDI_MIN = 0;
export const MIDI_MAX = 127;

/** Piano Roll vertical range (defaults to 2 octaves around middle C). */
export const PIANO_ROLL_MIN_NOTE = 36; // C2
export const PIANO_ROLL_MAX_NOTE = 96; // C7
export const PIANO_ROLL_RANGE = PIANO_ROLL_MAX_NOTE - PIANO_ROLL_MIN_NOTE;

/** Middle C MIDI number. */
export const MIDI_MIDDLE_C = 60;

/** Note velocity range. */
export const VELOCITY_MIN = 1;
export const VELOCITY_MAX = 127;
export const VELOCITY_DEFAULT = 100;

/** Project file extension. */
export const PROJECT_FILE_EXTENSION = '.caaproj';

/** Current schema version for Project files — bump when shape changes. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Minimum interval for autosave (ms). */
export const AUTOSAVE_INTERVAL_MS = 30_000;

/** Debounce for high-frequency edits (ms). */
export const EDIT_DEBOUNCE_MS = 500;

/** Undo / redo stack maximum size. */
export const UNDO_STACK_MAX = 100;

/**
 * Command source tag — indicates who initiated a Command.
 * Used for Agent/human provenance, permission gating and UI affordances.
 */
export type CommandSource = 'human' | 'agent' | 'system';

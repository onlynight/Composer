/**
 * Musical note utilities: MIDI <-> NoteName, pitch class, octave.
 */

import { MIDI_MAX, MIDI_MIN, MIDI_MIDDLE_C } from './constants.js';
import type { NoteName } from './types.js';

export const NOTE_NAMES: readonly NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiToNoteName(midi: number, useSharps = true): NoteName {
  const pc = midiToPitchClass(midi);
  if (useSharps) return NOTE_NAMES[pc];
  // Flat aliases for display. NoteName type is sharps-only; return the flat name as-is.
  const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
  return flatNames[pc] as NoteName;
}

/** Pitch-class lookup by letter+accidental. Supports both sharps and flats. */
const PITCH_CLASS_BY_NAME: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/**
 * Convert a note name (optionally with an octave suffix, e.g. "C#4") or a
 * bare letter+accidental pair with an explicit octave argument to a MIDI
 * note number.
 *
 * Priority for octave: string suffix > `octave` argument > middle-C octave.
 */
export function noteNameToMidi(name: string, octave?: number): number {
  const normalized = name.replace(/\s/g, '');
  const m = normalized.match(/^([A-Ga-g])(#|b)?(-?\d+)?$/);
  if (!m) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octStr] = m;
  const key = letter.toUpperCase() + (accidental ?? '');
  const pc = PITCH_CLASS_BY_NAME[key];
  if (pc === undefined) throw new Error(`Invalid note name: ${name}`);
  const oct = octStr !== undefined ? parseInt(octStr, 10) : octave ?? midiToOctave(MIDI_MIDDLE_C);
  return (oct + 1) * 12 + pc;
}

export function noteNameToMidiStrict(name: string, octave: number): number {
  return noteNameToMidi(name, octave);
}

/** Clamp MIDI note to valid range. */
export function clampMidi(midi: number): number {
  if (midi < MIDI_MIN) return MIDI_MIN;
  if (midi > MIDI_MAX) return MIDI_MAX;
  return midi;
}

/** Frequency in Hz for a MIDI note (A4 = 440). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

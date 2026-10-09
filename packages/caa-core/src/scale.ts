/**
 * Scales (音阶/调式) and chords (和弦) utilities.
 */

import type { ChordSymbol, NoteName, Scale } from './types.js';
import { midiToPitchClass, noteNameToMidi } from './note-utils.js';

/** Semitone offsets for common scales, anchored at root = 0. */
export const SCALES: Record<string, Scale> = {
  'major': { name: 'major', root: 'C', degrees: [0, 2, 4, 5, 7, 9, 11] },
  'natural-minor': { name: 'natural-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 8, 10] },
  'harmonic-minor': { name: 'harmonic-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 8, 11] },
  'melodic-minor': { name: 'melodic-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 9, 11] },
  'pentatonic-major': { name: 'pentatonic-major', root: 'C', degrees: [0, 2, 4, 7, 9] },
  'pentatonic-minor': { name: 'pentatonic-minor', root: 'A', degrees: [0, 3, 5, 7, 10] },
  'blues': { name: 'blues', root: 'A', degrees: [0, 3, 5, 6, 7, 10] },
  'chromatic': { name: 'chromatic', root: 'C', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  'whole-tone': { name: 'whole-tone', root: 'C', degrees: [0, 2, 4, 6, 8, 10] },
};

/** NoteName offsets from C (0-11) for building scales with a non-C root. */
const NOTE_OFFSET: Record<NoteName, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

/** All pitch classes (0-11) contained in a scale with a given root. */
export function scaleToPitchClasses(scale: Scale, root: NoteName): number[] {
  const rootOffset = NOTE_OFFSET[root];
  return scale.degrees.map((d) => (d + rootOffset) % 12);
}

/** All MIDI notes in a given scale across a range of octaves. */
export function scaleNotesInRange(
  scale: Scale,
  root: NoteName,
  fromMidi: number,
  toMidi: number,
): number[] {
  const pcs = new Set(scaleToPitchClasses(scale, root));
  const result: number[] = [];
  for (let m = fromMidi; m <= toMidi; m++) {
    if (pcs.has(midiToPitchClass(m))) result.push(m);
  }
  return result;
}

/** Parse a chord symbol like "Am7", "G7b5", "D6/9". Returns root MIDI + degree set. */
export function parseChord(symbol: string): { root: NoteName; quality: ChordSymbol['quality']; intervals: number[] } {
  const m = symbol.match(/^([A-Ga-g])(#|b)?([0-9]?\w*)$/);
  if (!m) throw new Error(`Invalid chord symbol: ${symbol}`);
  const [, letter, accidental, rest] = m;
  let root: NoteName;
  if (accidental === '#') {
    const combo = letter.toUpperCase() + '#' as NoteName;
    if (['C#', 'D#', 'F#', 'G#', 'A#'].includes(combo)) root = combo;
    else throw new Error(`Invalid sharp: ${symbol}`);
  } else if (accidental === 'b') {
    const flatMap: Record<string, NoteName> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const combo = letter.toUpperCase() + 'b' as string;
    root = flatMap[combo] ?? (combo as NoteName);
  } else {
    root = letter.toUpperCase() as NoteName;
  }

  const qualityMap: Record<string, { quality: ChordSymbol['quality']; intervals: number[] }> = {
    '': { quality: 'maj', intervals: [0, 4, 7] },
    'm': { quality: 'min', intervals: [0, 3, 7] },
    'dim': { quality: 'dim', intervals: [0, 3, 6] },
    'aug': { quality: 'aug', intervals: [0, 4, 8] },
    '7': { quality: 'dom7', intervals: [0, 4, 7, 10] },
    'maj7': { quality: 'maj7', intervals: [0, 4, 7, 11] },
    '7b5': { quality: '7b5', intervals: [0, 4, 6, 10] },
    'm7': { quality: 'min7', intervals: [0, 3, 7, 10] },
    'dim7': { quality: 'dim7', intervals: [0, 3, 6, 9] },
    'sus2': { quality: 'sus2', intervals: [0, 2, 7] },
    'sus4': { quality: 'sus4', intervals: [0, 5, 7] },
    '6': { quality: '6', intervals: [0, 4, 7, 9] },
    '69': { quality: '69', intervals: [0, 4, 7, 9, 14] },
    '7sus4': { quality: '7sus4', intervals: [0, 5, 7, 10] },
  };
  const entry = qualityMap[rest];
  if (!entry) throw new Error(`Unknown chord quality: ${rest}`);
  return { root, quality: entry.quality, intervals: entry.intervals };
}

/** MIDI note numbers for a chord at a given root octave. */
export function chordToMidiNotes(symbol: string, rootOctave = 4): number[] {
  const { root, intervals } = parseChord(symbol);
  const rootMidi = noteNameToMidi(root, rootOctave);
  return intervals.map((i) => rootMidi + i);
}

/** Check if a note is inside a given scale with root. */
export function isInScale(midi: number, scale: Scale, root: NoteName): boolean {
  const pcs = new Set(scaleToPitchClasses(scale, root));
  return pcs.has(midiToPitchClass(midi));
}

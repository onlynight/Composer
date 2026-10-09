/**
 * Chord utilities: parse chord symbols, resolve to MIDI intervals, match
 * progressions.
 *
 * A chord is defined by (root NoteName, quality, intervals). Intervals are
 * semitone offsets from the root, in ascending order.
 */

import type { ChordSymbol, NoteName } from './types.js';
import { noteNameToMidi } from './note-utils.js';

/* -------------------------------------------------------------------------- */
/* Chord quality registry                                                      */
/* -------------------------------------------------------------------------- */

export interface ChordQualityDef {
  quality: ChordSymbol['quality'];
  /** Semitone intervals from root, ascending. */
  intervals: number[];
  /** Common shorthand labels (e.g. 'Am' is a common way to write A minor). */
  aliases?: string[];
}

/** Master lookup table for supported chord qualities. */
export const CHORD_QUALITIES: Record<string, ChordQualityDef> = {
  '': { quality: 'maj', intervals: [0, 4, 7] },
  m: { quality: 'min', intervals: [0, 3, 7], aliases: ['min'] },
  dim: { quality: 'dim', intervals: [0, 3, 6], aliases: ['°'] },
  aug: { quality: 'aug', intervals: [0, 4, 8], aliases: ['+', 'maj#5'] },
  '7': { quality: 'dom7', intervals: [0, 4, 7, 10], aliases: ['dom7'] },
  maj7: { quality: 'maj7', intervals: [0, 4, 7, 11], aliases: ['Δ', 'M7'] },
  '7b5': { quality: '7b5', intervals: [0, 4, 6, 10], aliases: ['ø7', 'half-dim7'] },
  m7: { quality: 'min7', intervals: [0, 3, 7, 10], aliases: ['m7b5', 'min7'] },
  dim7: { quality: 'dim7', intervals: [0, 3, 6, 9], aliases: ['°7'] },
  sus2: { quality: 'sus2', intervals: [0, 2, 7] },
  sus4: { quality: 'sus4', intervals: [0, 5, 7] },
  6: { quality: '6', intervals: [0, 4, 7, 9] },
  '69': { quality: '69', intervals: [0, 4, 7, 9, 14] },
  '7sus4': { quality: '7sus4', intervals: [0, 5, 7, 10] },
  '7sus2': { quality: '7sus4', intervals: [0, 2, 7, 10] }, // alias → same as sus2+7
  m9: { quality: 'min7', intervals: [0, 3, 7, 10, 14] },
  maj9: { quality: 'maj7', intervals: [0, 4, 7, 11, 14] },
  '9': { quality: 'dom7', intervals: [0, 4, 7, 10, 14] },
};

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/** Flat → sharp enharmonic map (NoteName is sharps-only in our union type). */
const FLAT_TO_SHARP: Record<string, NoteName> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/**
 * Regex: root letter + optional accidental + optional rest.
 * The rest part accepts word chars and musical-notation symbols like °, Δ, +.
 */
const CHORD_SYMBOL_RE = /^([A-Ga-g])([#b])?([\w°Δ+∆]*)$/;

export interface ParsedChord {
  root: NoteName;
  quality: ChordSymbol['quality'];
  intervals: number[];
  /** Raw symbol for display/debug. */
  symbol: string;
}

/**
 * Parse a chord symbol like "Am7", "G7b5", "D6/9", "Cmaj7" into a
 * {@link ParsedChord}. Throws if the symbol or quality is not recognized.
 */
export function parseChord(symbol: string): ParsedChord {
  const m = CHORD_SYMBOL_RE.exec(symbol);
  if (!m) throw new Error(`Invalid chord symbol: ${symbol}`);
  const [, letter, accidental, rest] = m;
  const letterUpper = letter.toUpperCase();

  // Resolve root NoteName (sharps-only union) from letter + accidental.
  let root: NoteName;
  if (accidental === '#') {
    const combo = (letterUpper + '#') as NoteName;
    const validSharps: readonly NoteName[] = ['C#', 'D#', 'F#', 'G#', 'A#'];
    if (!validSharps.includes(combo)) {
      throw new Error(`Invalid sharp: ${symbol}`);
    }
    root = combo;
  } else if (accidental === 'b') {
    const combo = letterUpper + 'b';
    root = FLAT_TO_SHARP[combo] ?? (combo as NoteName);
  } else {
    root = letterUpper as NoteName;
  }

  // Resolve quality. Also accept aliases.
  let entry = CHORD_QUALITIES[rest];
  if (!entry) {
    for (const [, def] of Object.entries(CHORD_QUALITIES)) {
      if (def.aliases?.includes(rest)) {
        entry = def;
        break;
      }
    }
  }
  if (!entry) throw new Error(`Unknown chord quality: "${rest}"`);

  return { root, quality: entry.quality, intervals: entry.intervals, symbol };
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * MIDI note numbers for a chord at the given root octave. Notes are ordered
 * ascending by semitone (not by pitch class — so `G7` at octave 3 gives
 * `[55, 59, 62, 65]` = G3 B3 D4 F4).
 */
export function chordToMidiNotes(symbol: string, rootOctave = 4): number[] {
  const { root, intervals } = parseChord(symbol);
  const rootMidi = noteNameToMidi(root, rootOctave);
  return intervals.map((i) => rootMidi + i);
}

/** All MIDI notes for a chord within a specified MIDI range. */
export function chordInMidiRange(
  symbol: string,
  fromMidi: number,
  toMidi: number,
): number[] {
  const { intervals } = parseChord(symbol);
  const result: number[] = [];
  // Try octaves 0..8; collect in-range results.
  for (let oct = 0; oct <= 8; oct++) {
    for (const interval of intervals) {
      const midi = noteNameToMidi(parseChord(symbol).root, oct) + interval;
      if (midi >= fromMidi && midi <= toMidi) result.push(midi);
    }
  }
  return result.sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- */
/* Progression matching                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Match a chord progression as a Roman-numeral-ish string or a plain list
 * separated by spaces or commas.
 *
 * Examples:
 *   "I V vi IV"      → ['C', 'G', 'Am', 'F'] in C major
 *   "Am7 Dm7 G7 Cmaj7" → ['Am7', 'Dm7', 'G7', 'Cmaj7']
 */
export function parseProgression(input: string): string[] {
  return input
    .trim()
    .split(/[\s,]+/)
    .filter((s) => s.length > 0);
}

/** MIDI notes per chord in a progression, all at the same root octave. */
export function progressionToMidiProgression(
  input: string,
  rootOctave = 3,
): number[][] {
  return parseProgression(input).map((s) => chordToMidiNotes(s, rootOctave));
}

/**
 * Roman numeral resolution for a given key. Supports I, ii, iii, IV, V, vi, vii°.
 */
const ROMAN_TABLE: Record<string, { degree: number; quality: 'maj' | 'min' | 'dim' }> = {
  'I': { degree: 0, quality: 'maj' },
  'ii': { degree: 2, quality: 'min' },
  'iii': { degree: 4, quality: 'min' },
  'IV': { degree: 5, quality: 'maj' },
  'V': { degree: 7, quality: 'maj' },
  'vi': { degree: 9, quality: 'min' },
  'vii°': { degree: 11, quality: 'dim' },
};

/** Convert a Roman numeral to a chord symbol in the given key. */
export function romanToChord(roman: string, key: NoteName): string {
  const entry = ROMAN_TABLE[roman];
  if (!entry) throw new Error(`Unknown Roman numeral: ${roman}`);
  const keyOffset = NOTE_OFFSET_LOCAL[key];
  const rootPc = (keyOffset + entry.degree) % 12;
  const rootName = SHARP_NOTES[rootPc];
  const qualityMap: Record<'maj' | 'min' | 'dim', string> = {
    maj: '',
    min: 'm',
    dim: 'dim',
  };
  return rootName + qualityMap[entry.quality];
}

const NOTE_OFFSET_LOCAL: Record<NoteName, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};
const SHARP_NOTES: readonly NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a Roman progression ("I V vi IV") to chord symbols for a key.
 */
export function romanProgressionToChords(romanInput: string, key: NoteName): string[] {
  return parseProgression(romanInput).map((r) => romanToChord(r, key));
}

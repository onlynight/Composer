/**
 * Scale (音阶/调式) utilities.
 *
 * Chord utilities have been moved to `./chord.ts`. This module only concerns
 * with scales: definitions, pitch class extraction, in-scale checking.
 */

import type { NoteName, Scale } from './types.js';
import { midiToPitchClass } from './note-utils.js';

/** Semitone offsets for common scales, anchored at root = 0. */
export const SCALES: Record<string, Scale> = {
  major: { name: 'major', root: 'C', degrees: [0, 2, 4, 5, 7, 9, 11] },
  'natural-minor': { name: 'natural-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 8, 10] },
  'harmonic-minor': { name: 'harmonic-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 8, 11] },
  'melodic-minor': { name: 'melodic-minor', root: 'A', degrees: [0, 2, 3, 5, 7, 9, 11] },
  'pentatonic-major': { name: 'pentatonic-major', root: 'C', degrees: [0, 2, 4, 7, 9] },
  'pentatonic-minor': { name: 'pentatonic-minor', root: 'A', degrees: [0, 3, 5, 7, 10] },
  blues: { name: 'blues', root: 'A', degrees: [0, 3, 5, 6, 7, 10] },
  chromatic: { name: 'chromatic', root: 'C', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  'whole-tone': { name: 'whole-tone', root: 'C', degrees: [0, 2, 4, 6, 8, 10] },
  'dorian': { name: 'dorian', root: 'D', degrees: [0, 2, 3, 5, 7, 9, 10] },
  'mixolydian': { name: 'mixolydian', root: 'G', degrees: [0, 2, 4, 5, 7, 9, 10] },
  'phrygian': { name: 'phrygian', root: 'E', degrees: [0, 1, 3, 5, 7, 8, 10] },
  'lydian': { name: 'lydian', root: 'F', degrees: [0, 2, 4, 6, 7, 9, 11] },
};

/** NoteName offsets from C (0-11) for building scales with a non-C root. */
const NOTE_OFFSET: Record<NoteName, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
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

/** Check if a note is inside a given scale with root. */
export function isInScale(midi: number, scale: Scale, root: NoteName): boolean {
  const pcs = new Set(scaleToPitchClasses(scale, root));
  return pcs.has(midiToPitchClass(midi));
}

/** Distance (semitones) from a note to the nearest scale tone, in either direction. */
export function distanceFromScale(midi: number, scale: Scale, root: NoteName): number {
  if (isInScale(midi, scale, root)) return 0;
  const pcs = new Set(scaleToPitchClasses(scale, root));
  let min = 12;
  for (let d = 1; d <= 6; d++) {
    if (pcs.has((midi + d) % 12) || pcs.has((midi - d + 12) % 12)) {
      min = d;
      break;
    }
  }
  return min;
}

/**
 * Find the closest in-scale note within `maxDistance` semitones (default 3).
 * Returns undefined if no in-scale note is within range.
 */
export function closestScaleNote(
  midi: number,
  scale: Scale,
  root: NoteName,
  maxDistance = 3,
): number | undefined {
  if (isInScale(midi, scale, root)) return midi;
  for (let d = 1; d <= maxDistance; d++) {
    if (isInScale(midi - d, scale, root)) return midi - d;
    if (isInScale(midi + d, scale, root)) return midi + d;
  }
  return undefined;
}

/** Degree names for a 7-tone scale (useful for teaching). */
export function degreeName(degreeIndex: number): string {
  const common = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone'];
  if (degreeIndex >= 0 && degreeIndex < 7) return common[degreeIndex];
  return `degree ${degreeIndex}`;
}

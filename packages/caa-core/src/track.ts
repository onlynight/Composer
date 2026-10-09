/**
 * Track and Note helpers (pure functions).
 */

import type { Note, NoteName, Project, Track } from './types.js';
import { newId } from './project.js';
import { NOTE_NAMES } from './note-utils.js';
import type { Scale } from './types.js';
import { scaleToPitchClasses } from './scale.js';
import { midiToPitchClass } from './note-utils.js';

/** Build a Note object with sensible defaults. */
export function createNote(overrides: Partial<Note> & { midi: number; startTick: number; duration: number }): Note {
  return {
    id: overrides.id ?? newId(),
    midi: overrides.midi,
    startTick: overrides.startTick,
    duration: overrides.duration,
    velocity: overrides.velocity ?? 100,
    active: overrides.active ?? true,
    tag: overrides.tag,
  };
}

/** Detect collisions between two notes on the same track (same midi + overlap). */
export function notesOverlap(a: Note, b: Note): boolean {
  if (a.midi !== b.midi) return false;
  return a.startTick < b.startTick + b.duration && b.startTick < a.startTick + a.duration;
}

/** Find all colliding notes (with the same MIDI note) for a candidate note. */
export function findCollisions(candidate: Note, existing: Note[]): Note[] {
  return existing.filter((n) => n.id !== candidate.id && notesOverlap(candidate, n));
}

/**
 * Write a chord progression onto a track.
 *
 * @param notes MIDI note array for each chord
 * @param chordDuration Beats per chord
 * @param startTick Tick offset to start writing
 */
export function writeProgression(
  chords: number[][],
  chordDuration: number,
  startTick: number,
  velocity = 100,
  ppq = 480,
): Note[] {
  const result: Note[] = [];
  let cursor = startTick;
  for (const chord of chords) {
    for (const midi of chord) {
      result.push({
        id: newId(),
        midi,
        startTick: cursor,
        duration: Math.round(chordDuration * ppq),
        velocity,
        active: true,
      });
    }
    cursor += Math.round(chordDuration * ppq);
  }
  return result;
}

/** Generate a simple melodic pattern from a scale. */
export function generateMelody(
  scale: Scale,
  root: NoteName,
  bars: number,
  beatsPerBar = 4,
  ppq = 480,
  density = 0.5,
): Note[] {
  const pcs = scaleToPitchClasses(scale, root);
  const beatsTotal = bars * beatsPerBar;
  const result: Note[] = [];
  let prevIdx = 0;
  for (let beat = 0; beat < beatsTotal; beat++) {
    if (Math.random() > density) continue;
    prevIdx = Math.max(0, Math.min(pcs.length - 1, prevIdx + Math.floor(Math.random() * 5) - 2));
    result.push({
      id: newId(),
      midi: 60 + pcs[prevIdx], // around middle C
      startTick: beat * ppq,
      duration: ppq,
      velocity: 90 + Math.floor(Math.random() * 20),
      active: true,
    });
  }
  return result;
}

/** Return only notes in a given tick range. */
export function notesInRange(track: Track, fromTick: number, toTick: number): Note[] {
  return track.notes.filter((n) => n.startTick >= fromTick && n.startTick + n.duration <= toTick);
}

/** Compute the total number of notes in a project. */
export function countNotes(project: Project): number {
  return project.tracks.reduce((acc, t) => acc + t.notes.length, 0);
}

/** MIDI note name in the format "C4", "C#5", etc. */
export function midiToLabel(midi: number): string {
  return `${NOTE_NAMES[midiToPitchClass(midi)]}${Math.floor(midi / 12) - 1}`;
}

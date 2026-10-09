/**
 * Track-level operations: construction, editing, iteration.
 *
 * Note-level CRUD lives in `note.ts`; chord/scale logic lives in `chord.ts`
 * and `scale.ts`. This module ties them together for track-specific use
 * cases (progressions, melodic generation, aggregate queries).
 */

import { TICKS_PER_BEAT, VELOCITY_DEFAULT } from './constants.js';
import type { Id, Note, NoteName, Project, Track, TrackType } from './types.js';
import { newId } from './project.js';
import { NOTE_NAMES } from './note-utils.js';
import { midiToPitchClass } from './note-utils.js';
import { scaleToPitchClasses } from './scale.js';
import { createNote } from './note.js';

/* -------------------------------------------------------------------------- */
/* Track construction                                                          */
/* -------------------------------------------------------------------------- */

export interface NewTrackOptions {
  id?: Id;
  name: string;
  type?: TrackType;
  channel?: number;
  program?: number;
  volumeDb?: number;
  pan?: number;
  color?: string;
}

/**
 * Build a Track with sensible defaults. Defaults match GM layout and the
 * docs (`Piano` at program 0, `Bass` at 33, `Drums` at 120, etc.).
 */
export function createTrack(opts: NewTrackOptions): Track {
  const nameLower = opts.name.toLowerCase();
  const autoType: TrackType =
    nameLower.includes('drum') ? 'percussion' :
    nameLower.includes('bass') ? 'bass' :
    nameLower.includes('piano') || nameLower.includes('keys') ? 'piano' :
    nameLower.includes('string') ? 'strings' :
    nameLower.includes('synth') ? 'synth' :
    nameLower.includes('guitar') ? 'guitar' :
    'midi';

  return {
    id: opts.id ?? newId(),
    name: opts.name,
    type: opts.type ?? autoType,
    channel: opts.channel ?? 0,
    program: opts.program ?? 0,
    volumeDb: opts.volumeDb ?? 0,
    pan: opts.pan ?? 0,
    muted: false,
    solo: false,
    visible: true,
    notes: [],
    color: opts.color,
  };
}

/** Partially update a track. */
export function updateTrackValue(track: Track, patch: Partial<Track>): Track {
  return {
    ...track,
    ...patch,
    channel: patch.channel !== undefined ? Math.max(0, Math.min(15, patch.channel)) : track.channel,
    program: patch.program !== undefined ? Math.max(0, Math.min(127, patch.program)) : track.program,
    pan: patch.pan !== undefined ? Math.max(-1, Math.min(1, patch.pan)) : track.pan,
  };
}

/** Whether a track contains a given note id. */
export function trackContainsNote(track: Track, noteId: Id): boolean {
  return track.notes.some((n) => n.id === noteId);
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Write a chord progression onto notes.
 *
 * @param chords Each chord is an array of MIDI notes
 * @param chordDuration Beats per chord
 * @param startTick Tick offset to start writing
 */
export function writeProgression(
  chords: number[][],
  chordDuration: number,
  startTick: number,
  velocity: number = VELOCITY_DEFAULT,
  ppq: number = TICKS_PER_BEAT,
): Note[] {
  const result: Note[] = [];
  const chordTicks = Math.round(chordDuration * ppq);
  let cursor = startTick;
  for (const chord of chords) {
    for (const midi of chord) {
      result.push(createNote({ midi, startTick: cursor, duration: chordTicks, velocity }));
    }
    cursor += chordTicks;
  }
  return result;
}

/** Generate a simple melodic pattern from a scale. */
export function generateMelody(
  scale: { degrees: readonly number[] },
  root: NoteName,
  bars: number,
  beatsPerBar = 4,
  ppq = TICKS_PER_BEAT,
  density = 0.5,
): Note[] {
  const pcs = scaleToPitchClasses(
    { name: 'gen', root, degrees: scale.degrees },
    root,
  );
  const beatsTotal = bars * beatsPerBar;
  const result: Note[] = [];
  let prevIdx = 0;
  for (let beat = 0; beat < beatsTotal; beat++) {
    if (Math.random() > density) continue;
    prevIdx = Math.max(0, Math.min(pcs.length - 1, prevIdx + Math.floor(Math.random() * 5) - 2));
    result.push(
      createNote({
        midi: 60 + pcs[prevIdx],
        startTick: beat * ppq,
        duration: ppq,
        velocity: 90 + Math.floor(Math.random() * 20),
      }),
    );
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Aggregate queries                                                           */
/* -------------------------------------------------------------------------- */

/** Total number of notes in a project. */
export function countNotes(project: Project): number {
  return project.tracks.reduce((acc, t) => acc + t.notes.length, 0);
}

/** Notes on a track within a tick range (inclusive both ends). */
export function trackNotesInRange(track: Track, fromTick: number, toTick: number): Note[] {
  return track.notes.filter((n) => n.startTick >= fromTick && n.startTick + n.duration <= toTick);
}

/** The latest tick any note on a track ends at. */
export function trackEndTick(track: Track): number {
  return track.notes.reduce((end, n) => Math.max(end, n.startTick + n.duration), 0);
}

/** MIDI note name in the format "C4", "C#5", etc. */
export function midiToLabel(midi: number): string {
  return `${NOTE_NAMES[midiToPitchClass(midi)]}${Math.floor(midi / 12) - 1}`;
}

import { describe, expect, it } from 'vitest';
import {
  createNote,
  createProject,
  createTrack,
  makeAddNoteCommand,
  makeAddTrackCommand,
  countNotes,
  findCollisions,
  generateMelody,
  makeUpdateTrackCommand,
  midiToLabel,
  notesOverlap,
  SCALES,
  trackContainsNote,
  trackEndTick,
  trackNotesInRange,
  updateTrackValue,
  writeProgression,
} from '@caa/core';

describe('createTrack', () => {
  it('auto-detects type from name', () => {
    expect(createTrack({ name: 'Drums' }).type).toBe('percussion');
    expect(createTrack({ name: 'Bass' }).type).toBe('bass');
    expect(createTrack({ name: 'Piano' }).type).toBe('piano');
    expect(createTrack({ name: 'Strings' }).type).toBe('strings');
    expect(createTrack({ name: 'Guitar' }).type).toBe('guitar');
    expect(createTrack({ name: 'Synth Pad' }).type).toBe('synth');
    expect(createTrack({ name: 'Random' }).type).toBe('midi');
  });

  it('applies explicit type over auto-detection', () => {
    expect(createTrack({ name: 'Drums', type: 'sampler' }).type).toBe('sampler');
  });

  it('uses sensible defaults for volume/pan/muted/solo/visible', () => {
    const t = createTrack({ name: 'Test' });
    expect(t.volumeDb).toBe(0);
    expect(t.pan).toBe(0);
    expect(t.muted).toBe(false);
    expect(t.solo).toBe(false);
    expect(t.visible).toBe(true);
    expect(t.notes).toEqual([]);
  });
});

describe('updateTrackValue', () => {
  it('clamps channel, program, pan', () => {
    const t = createTrack({ name: 'Test' });
    const u = updateTrackValue(t, { channel: -1, program: 200, pan: 2 });
    expect(u.channel).toBe(0);
    expect(u.program).toBe(127);
    expect(u.pan).toBe(1);
  });
});

describe('trackNotesInRange / trackEndTick / trackContainsNote', () => {
  it('returns notes whose full body fits inside [from, to] (inclusive both ends)', () => {
    // Notes: (0-480), (480-960), (960-1440)
    const t = createTrack({ name: 'T' });
    t.notes = [
      createNote({ midi: 60, startTick: 0, duration: 480 }),
      createNote({ midi: 60, startTick: 480, duration: 480 }),
      createNote({ midi: 60, startTick: 960, duration: 480 }),
    ];
    expect(trackNotesInRange(t, 0, 480)).toHaveLength(1);  // only note 0 fully fits
    expect(trackNotesInRange(t, 480, 960)).toHaveLength(1); // only note 1 fully fits
    expect(trackNotesInRange(t, 0, 1440)).toHaveLength(3);  // all three
    expect(trackNotesInRange(t, 0, 1920)).toHaveLength(3);  // extra headroom still fits all
  });

  it('computes trackEndTick as the max end position', () => {
    const t = createTrack({ name: 'T' });
    t.notes = [
      createNote({ midi: 60, startTick: 0, duration: 480 }),
      createNote({ midi: 60, startTick: 960, duration: 480 }),
    ];
    expect(trackEndTick(t)).toBe(1440);
  });

  it('trackContainsNote returns true when the id is present', () => {
    const t = createTrack({ name: 'T' });
    const n = createNote({ midi: 60, startTick: 0, duration: 480 });
    t.notes.push(n);
    expect(trackContainsNote(t, n.id)).toBe(true);
    expect(trackContainsNote(t, 'unknown')).toBe(false);
  });
});

describe('writeProgression', () => {
  it('writes one note per chord tone per beat', () => {
    const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64]];
    const notes = writeProgression(chords, 1, 0, 100, 480);
    expect(notes).toHaveLength(9); // 3 chords × 3 tones
    // First chord starts at 0, second at 480, third at 960
    expect(notes[0].startTick).toBe(0);
    expect(notes[3].startTick).toBe(480);
    expect(notes[6].startTick).toBe(960);
    expect(notes[0].duration).toBe(480);
  });

  it('respects chord duration in beats', () => {
    const notes = writeProgression([[60]], 2, 0, 100, 480);
    expect(notes[0].duration).toBe(960); // 2 beats
  });
});

describe('generateMelody', () => {
  it('produces notes within the given scale, respecting density', () => {
    const scale = SCALES.major;
    const melody = generateMelody(scale, 'C', 2, 4, 480, 1.0);
    expect(melody.length).toBeGreaterThan(0);
    // All notes in C major
    const inScalePcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (const n of melody) {
      expect(inScalePcs.has(n.midi % 12)).toBe(true);
    }
  });

  it('density 0 produces no notes', () => {
    const melody = generateMelody(SCALES.major, 'C', 2, 4, 480, 0);
    expect(melody).toEqual([]);
  });
});

describe('aggregate + command interplay', () => {
  it('countNotes reflects changes after commands', () => {
    const p = createProject();
    const before = countNotes(p);
    const withNote = makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 })).execute(p);
    expect(countNotes(withNote)).toBe(before + 1);
  });

  it('track-level add then undo restores note count', () => {
    const p = createProject();
    const t = createTrack({ name: 'Extra', program: 48 });
    const cmd = makeAddTrackCommand(t);
    const after = cmd.execute(p);
    expect(after.tracks.length).toBe(p.tracks.length + 1);
    expect(cmd.rollback(after).tracks.length).toBe(p.tracks.length);
  });

  it('updateTrackVolume + rollback', () => {
    const p = createProject();
    const trackId = p.tracks[0].id;
    const cmd = makeUpdateTrackCommand(trackId, { volumeDb: -6 }, { volumeDb: 0 });
    expect(cmd.execute(p).tracks[0].volumeDb).toBe(-6);
    expect(cmd.rollback(cmd.execute(p)).tracks[0].volumeDb).toBe(0);
  });

  it('collision detection across tracks (only within a track) stays scoped', () => {
    // findCollisions uses midi + time, not track — so cross-track collisions
    // are reported by the caller.
    const n = createNote({ midi: 60, startTick: 0, duration: 480 });
    const other = createNote({ midi: 60, startTick: 240, duration: 480 });
    expect(findCollisions(n, [other])).toEqual([other]);
    expect(notesOverlap(n, other)).toBe(true);
  });

  it('midiToLabel formats as "C4", "C#5", etc.', () => {
    expect(midiToLabel(60)).toBe('C4');
    expect(midiToLabel(61)).toBe('C#4');
    expect(midiToLabel(69)).toBe('A4');
    expect(midiToLabel(72)).toBe('C5');
  });
});

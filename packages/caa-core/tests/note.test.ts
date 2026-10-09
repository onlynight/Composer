import { describe, expect, it } from 'vitest';
import {
  averageVelocity,
  cloneNote,
  collisionCount,
  createNote,
  findCollisions,
  findNote,
  longestNote,
  moveNote,
  noteEquals,
  notesByMidiRange,
  notesByPitchClass,
  notesEndTick,
  notesInRange,
  notesOverlap,
  quantizeNote,
  sortByStartTime,
  transposeNote,
  updateNote,
} from '@caa/core';

const midi = (o: { midi: number; startTick: number; duration: number; velocity?: number; active?: boolean }) =>
  createNote(o);

describe('createNote validation', () => {
  it('accepts a valid note', () => {
    const n = createNote({ midi: 60, startTick: 0, duration: 480, velocity: 100 });
    expect(n.midi).toBe(60);
    expect(n.velocity).toBe(100);
    expect(n.active).toBe(true);
  });

  it('applies default velocity (100) when omitted', () => {
    expect(createNote({ midi: 60, startTick: 0, duration: 480 }).velocity).toBe(100);
  });

  it('throws on invalid MIDI', () => {
    expect(() => createNote({ midi: 200, startTick: 0, duration: 480 })).toThrow();
    expect(() => createNote({ midi: -1, startTick: 0, duration: 480 })).toThrow();
    expect(() => createNote({ midi: 60.5, startTick: 0, duration: 480 })).toThrow();
  });

  it('throws on negative startTick or zero duration', () => {
    expect(() => createNote({ midi: 60, startTick: -1, duration: 480 })).toThrow();
    expect(() => createNote({ midi: 60, startTick: 0, duration: 0 })).toThrow();
  });

  it('throws on out-of-range velocity', () => {
    expect(() => createNote({ midi: 60, startTick: 0, duration: 480, velocity: 0 })).toThrow();
    expect(() => createNote({ midi: 60, startTick: 0, duration: 480, velocity: 128 })).toThrow();
  });
});

describe('clone / update / transpose / move / quantize', () => {
  it('cloneNote returns a new id but preserves values', () => {
    const n = createNote({ midi: 60, startTick: 0, duration: 480 });
    const c = cloneNote(n);
    expect(c.id).not.toBe(n.id);
    expect(noteEquals(n, c)).toBe(true);
  });

  it('updateNote clamps numeric fields', () => {
    const n = createNote({ midi: 60, startTick: 0, duration: 480, velocity: 100 });
    const u = updateNote(n, { midi: 200, startTick: -100, duration: 0, velocity: 999 });
    expect(u.midi).toBe(127);
    expect(u.startTick).toBe(0);
    expect(u.duration).toBe(1);
    expect(u.velocity).toBe(127);
  });

  it('transposeNote shifts MIDI and stays in range', () => {
    const n = createNote({ midi: 60, startTick: 0, duration: 480 });
    expect(transposeNote(n, 12).midi).toBe(72);
    expect(transposeNote(n, -12).midi).toBe(48);
    expect(transposeNote(n, 100).midi).toBe(127);
  });

  it('moveNote shifts startTick and clamps to 0', () => {
    const n = createNote({ midi: 60, startTick: 240, duration: 480 });
    expect(moveNote(n, 240).startTick).toBe(480);
    expect(moveNote(n, -1000).startTick).toBe(0);
  });

  it('quantizeNote snaps to grid', () => {
    const n = createNote({ midi: 60, startTick: 100, duration: 480 });
    expect(quantizeNote(n, 480).startTick).toBe(0);
    expect(quantizeNote(n, 240).startTick).toBe(0);
    expect(quantizeNote(createNote({ midi: 60, startTick: 300, duration: 480 }), 240).startTick).toBe(240);
  });
});

describe('collision detection', () => {
  it('detects overlaps on same midi within range', () => {
    const a = midi({ midi: 60, startTick: 0, duration: 480 });
    const b = midi({ midi: 60, startTick: 240, duration: 480 });
    expect(notesOverlap(a, b)).toBe(true);
    expect(collisionCount(a, [b])).toBe(1);
    expect(findCollisions(a, [b])).toEqual([b]);
  });

  it('ignores different midi, inactive notes, and adjacent (non-overlapping) notes', () => {
    const a = midi({ midi: 60, startTick: 0, duration: 480 });
    expect(notesOverlap(a, midi({ midi: 64, startTick: 240, duration: 480 }))).toBe(false);
    expect(notesOverlap(a, midi({ midi: 60, startTick: 480, duration: 480 }))).toBe(false);
    expect(notesOverlap(a, midi({ midi: 60, startTick: 240, duration: 480, active: false }))).toBe(false);
  });

  it('does not count self', () => {
    const a = midi({ midi: 60, startTick: 0, duration: 480 });
    expect(findCollisions(a, [a])).toEqual([]);
  });
});

describe('queries', () => {
  const notes = [
    midi({ midi: 60, startTick: 0, duration: 480, velocity: 100 }),
    midi({ midi: 60, startTick: 480, duration: 480, velocity: 80 }),
    midi({ midi: 64, startTick: 960, duration: 480, velocity: 60 }),
    midi({ midi: 72, startTick: 1440, duration: 480, velocity: 127 }),
  ];

  it('notesInRange filters by [from, to)', () => {
    expect(notesInRange(notes, 0, 960)).toHaveLength(2);
    expect(notesInRange(notes, 480, 1440)).toHaveLength(2);
  });

  it('notesByPitchClass filters by pitch class', () => {
    // Notes: [60 (C4), 60 (C4), 64 (E4), 72 (C5)] → pc 0 appears 3×, pc 4 appears 1×.
    expect(notesByPitchClass(notes, 0)).toHaveLength(3); // C (both octaves + dup)
    expect(notesByPitchClass(notes, 4)).toHaveLength(1); // E
    expect(notesByPitchClass(notes, 12)).toHaveLength(3); // 12 mod 12 = 0
    expect(notesByPitchClass(notes, -12)).toHaveLength(3); // negative wraps
    expect(notesByPitchClass(notes, 7)).toHaveLength(0); // G (not present)
  });

  it('notesByMidiRange filters by midi range', () => {
    expect(notesByMidiRange(notes, 60, 60)).toHaveLength(2);
    expect(notesByMidiRange(notes, 65, 72)).toHaveLength(1);
  });

  it('findNote returns by id or undefined', () => {
    expect(findNote(notes, notes[0].id)).toBe(notes[0]);
    expect(findNote(notes, 'nonexistent')).toBeUndefined();
  });

  it('sortByStartTime orders stably', () => {
    const shuffled = [notes[2], notes[0], notes[3], notes[1]];
    const sorted = sortByStartTime(shuffled);
    expect(sorted.map((n) => n.startTick)).toEqual([0, 480, 960, 1440]);
  });

  it('longestNote returns the longest duration', () => {
    expect(longestNote(notes)?.startTick).toBe(0);
    expect(longestNote([
      midi({ midi: 60, startTick: 0, duration: 960 }),
      midi({ midi: 60, startTick: 960, duration: 480 }),
    ])?.duration).toBe(960);
    expect(longestNote([])).toBeNull();
  });

  it('notesEndTick returns the end of the last note', () => {
    expect(notesEndTick(notes)).toBe(1920);
    expect(notesEndTick([])).toBe(0);
  });

  it('averageVelocity ignores inactive notes', () => {
    expect(averageVelocity(notes)).toBeCloseTo(91.75, 2);
    expect(averageVelocity([
      midi({ midi: 60, startTick: 0, duration: 480, velocity: 100, active: false }),
      midi({ midi: 60, startTick: 480, duration: 480, velocity: 100, active: true }),
    ])).toBe(100);
    expect(averageVelocity([])).toBe(0);
  });
});

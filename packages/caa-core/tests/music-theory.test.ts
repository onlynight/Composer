import { describe, expect, it } from 'vitest';
import { SCALES, chordToMidiNotes, isInScale, noteNameToMidi, midiToNoteName, midiToFrequency, scaleNotesInRange } from '@caa/core';

describe('note utils', () => {
  it('midiToNoteName recognizes middle C', () => {
    expect(midiToNoteName(60)).toBe('C');
  });

  it('noteNameToMidi handles sharps and flats via enharmonic', () => {
    expect(noteNameToMidi('C', 4)).toBe(60);
    expect(noteNameToMidi('A', 4)).toBe(69);
    expect(noteNameToMidi('C#', 4)).toBe(61);
    expect(noteNameToMidi('Db', 4)).toBe(61);
  });

  it('midiToFrequency: A4 = 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
  });
});

describe('scales', () => {
  it('C major contains C, D, E, F, G, A, B (no sharps/flats)', () => {
    const pcs = new Set(SCALES['major'].degrees);
    expect(pcs.has(0)).toBe(true);
    expect(pcs.has(2)).toBe(true);
    expect(pcs.has(4)).toBe(true);
    expect(pcs.has(7)).toBe(true);
    expect(pcs.has(11)).toBe(true);
    expect(pcs.has(1)).toBe(false);
  });

  it('isInScale identifies in/out-of-scale notes', () => {
    expect(isInScale(60, SCALES['major'], 'C')).toBe(true); // C4
    expect(isInScale(61, SCALES['major'], 'C')).toBe(false); // C#4
    expect(isInScale(62, SCALES['major'], 'C')).toBe(true); // D4
  });

  it('scaleNotesInRange returns all in-scale notes across a range', () => {
    const notes = scaleNotesInRange(SCALES['major'], 'C', 60, 84);
    expect(notes).toContain(60); // C4
    expect(notes).toContain(72); // C5
    expect(notes).not.toContain(61);
  });
});

describe('chords', () => {
  it('C major: C4 E4 G4', () => {
    expect(chordToMidiNotes('C', 4)).toEqual([60, 64, 67]);
  });

  it('Am7: A3 C4 E4 G4', () => {
    expect(chordToMidiNotes('Am7', 3)).toEqual([57, 60, 64, 67]);
  });

  it('G7: G3 B3 D4 F4', () => {
    expect(chordToMidiNotes('G7', 3)).toEqual([55, 59, 62, 65]);
  });

  it('rejects unknown chord quality', () => {
    expect(() => chordToMidiNotes('Cxyz', 4)).toThrow();
  });
});

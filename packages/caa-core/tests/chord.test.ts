import { describe, expect, it } from 'vitest';
import {
  CHORD_QUALITIES,
  chordInMidiRange,
  chordToMidiNotes,
  parseChord,
  parseProgression,
  progressionToMidiProgression,
  romanProgressionToChords,
  romanToChord,
} from '@caa/core';

describe('parseChord', () => {
  it('parses a bare major chord', () => {
    const c = parseChord('C');
    expect(c.root).toBe('C');
    expect(c.quality).toBe('maj');
    expect(c.intervals).toEqual([0, 4, 7]);
  });

  it('parses minor, dim, aug, and 7th variants', () => {
    expect(parseChord('Am').quality).toBe('min');
    expect(parseChord('Bdim').quality).toBe('dim');
    expect(parseChord('Caug').quality).toBe('aug');
    expect(parseChord('G7').quality).toBe('dom7');
    expect(parseChord('Cmaj7').quality).toBe('maj7');
    expect(parseChord('Am7').quality).toBe('min7');
    expect(parseChord('B7b5').quality).toBe('7b5');
  });

  it('parses sharp and flat roots', () => {
    expect(parseChord('C#').root).toBe('C#');
    expect(parseChord('Db').root).toBe('C#');
    expect(parseChord('F#7').root).toBe('F#');
    expect(parseChord('Abm7').root).toBe('G#');
    expect(parseChord('Bbm7').root).toBe('A#');
  });

  it('accepts quality aliases (m → min, ° → dim, etc.)', () => {
    expect(parseChord('Am').quality).toBe(parseChord('Amin').quality);
    expect(parseChord('Bdim').quality).toBe(parseChord('B°').quality);
    expect(parseChord('Cmaj7').quality).toBe(parseChord('CΔ').quality);
  });

  it('rejects invalid symbols', () => {
    expect(() => parseChord('')).toThrow();
    expect(() => parseChord('E#')).toThrow(); // invalid sharp
    expect(() => parseChord('Cxyz')).toThrow(); // unknown quality
  });
});

describe('chordToMidiNotes', () => {
  it('C major at octave 4: [60, 64, 67]', () => {
    expect(chordToMidiNotes('C', 4)).toEqual([60, 64, 67]);
  });

  it('Am7 at octave 3: [57, 60, 64, 67]', () => {
    expect(chordToMidiNotes('Am7', 3)).toEqual([57, 60, 64, 67]);
  });

  it('G7 at octave 3: [55, 59, 62, 65]', () => {
    expect(chordToMidiNotes('G7', 3)).toEqual([55, 59, 62, 65]);
  });

  it('B7b5 (half-diminished) at octave 4: [71, 75, 77, 81] (B4 D#5 F5 A5)', () => {
    expect(chordToMidiNotes('B7b5', 4)).toEqual([71, 75, 77, 81]);
  });

  it('B7b5 at octave 3: [59, 63, 65, 69] (B3 D#4 F4 A4)', () => {
    expect(chordToMidiNotes('B7b5', 3)).toEqual([59, 63, 65, 69]);
  });
});

describe('chordInMidiRange', () => {
  it('returns all chord notes across octaves within a range', () => {
    // C major spanning C2 to C5
    const notes = chordInMidiRange('C', 36, 84);
    expect(notes).toContain(48); // C3
    expect(notes).toContain(60); // C4
    expect(notes).toContain(72); // C5
    expect(notes).toContain(64); // E4
    expect(notes).toContain(67); // G4
    // Sorted ascending
    expect(notes).toEqual([...notes].sort((a, b) => a - b));
  });
});

describe('progressions', () => {
  it('parseProgression splits on whitespace and commas', () => {
    expect(parseProgression('C G Am F')).toEqual(['C', 'G', 'Am', 'F']);
    expect(parseProgression('C, G, Am, F')).toEqual(['C', 'G', 'Am', 'F']);
    expect(parseProgression('')).toEqual([]);
    expect(parseProgression('  C   G  ')).toEqual(['C', 'G']);
  });

  it('progressionToMidiProgression maps each chord to its MIDI notes', () => {
    const out = progressionToMidiProgression('C Am F G', 3);
    expect(out).toHaveLength(4);
    expect(out[0]).toEqual(chordToMidiNotes('C', 3));
    expect(out[1]).toEqual(chordToMidiNotes('Am', 3));
  });

  it('romanToChord resolves Roman numerals in a key', () => {
    expect(romanToChord('I', 'C')).toBe('C');
    expect(romanToChord('ii', 'C')).toBe('Dm');
    expect(romanToChord('iii', 'C')).toBe('Em');
    expect(romanToChord('IV', 'C')).toBe('F');
    expect(romanToChord('V', 'C')).toBe('G');
    expect(romanToChord('vi', 'C')).toBe('Am');
    expect(romanToChord('vii°', 'C')).toBe('Bdim');
  });

  it('romanProgressionToChords handles a full I-V-vi-IV', () => {
    expect(romanProgressionToChords('I V vi IV', 'C')).toEqual(['C', 'G', 'Am', 'F']);
    expect(romanProgressionToChords('I V vi IV', 'G')).toEqual(['G', 'D', 'Em', 'C']);
  });
});

describe('quality registry', () => {
  it('has all expected qualities registered', () => {
    expect(CHORD_QUALITIES['']).toBeDefined();
    expect(CHORD_QUALITIES.m).toBeDefined();
    expect(CHORD_QUALITIES.dim).toBeDefined();
    expect(CHORD_QUALITIES.aug).toBeDefined();
    expect(CHORD_QUALITIES['7']).toBeDefined();
    expect(CHORD_QUALITIES.maj7).toBeDefined();
    expect(CHORD_QUALITIES['7b5']).toBeDefined();
    expect(CHORD_QUALITIES.m7).toBeDefined();
    expect(CHORD_QUALITIES.dim7).toBeDefined();
    expect(CHORD_QUALITIES.sus2).toBeDefined();
    expect(CHORD_QUALITIES.sus4).toBeDefined();
  });
});

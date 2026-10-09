import { describe, expect, it } from 'vitest';
import { projectToMidiIR, validateMidiIR } from '@caa/midi-ir';

describe('midi-ir validator', () => {
  it('accepts a well-formed MIDI IR', () => {
    const ir = {
      version: '1.0.0',
      tempo: 120,
      ticksPerBeat: 480,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        {
          id: 't-1',
          name: 'Piano',
          channel: 0,
          program: 0,
          notes: [{ midi: 60, startTick: 0, duration: 480, velocity: 100 }],
        },
      ],
    };
    const r = validateMidiIR(ir);
    expect(r.ok).toBe(true);
  });

  it('rejects malformed notes (out-of-range midi)', () => {
    const r = validateMidiIR({
      version: '1.0.0',
      tracks: [
        {
          id: 't',
          name: 'Piano',
          channel: 0,
          program: 0,
          notes: [{ midi: 200, startTick: 0, duration: 480, velocity: 100 }],
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path.endsWith('/midi'))).toBe(true);
  });

  it('rejects non-integer channel', () => {
    const r = validateMidiIR({
      version: '1.0.0',
      tracks: [
        { id: 't', name: 'Piano', channel: 'x', program: 0, notes: [] },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe('project -> midi-ir conversion', () => {
  it('emits correct shape', () => {
    const out = projectToMidiIR({
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        {
          id: 't',
          name: 'Piano',
          channel: 0,
          program: 0,
          notes: [{ midi: 60, startTick: 0, duration: 480, velocity: 100 }],
        },
      ],
    });
    expect(out.version).toBe('1.0.0');
    expect(out.tempo).toBe(120);
    expect(out.tracks[0].notes[0].midi).toBe(60);
  });
});

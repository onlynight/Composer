/**
 * Lightweight MIDI IR validator — a structural subset of the JSON Schema in
 * `./schema.json`. A full Ajv-based validator can drop in at M1 without
 * changing the public API.
 */

import type { Id } from '@caa/core';

export interface MidiIRTrack {
  id: Id;
  name: string;
  channel: number;
  program: number;
  notes: MidiIRNote[];
}

export interface MidiIRNote {
  midi: number;
  startTick: number;
  duration: number;
  velocity: number;
}

export interface MidiIR {
  version: string;
  tempo?: number;
  ticksPerBeat?: number;
  timeSignature?: { numerator: number; denominator: number };
  tracks: MidiIRTrack[];
}

export interface ValidationResult {
  ok: boolean;
  errors: Array<{ path: string; message: string }>;
}

export function validateMidiIR(input: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: [{ path: '/', message: 'root must be an object' }] };
  }
  const ir = input as Record<string, unknown>;

  if (typeof ir.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(ir.version)) {
    errors.push({ path: '/version', message: 'must be a semver-like string' });
  }
  if (!Array.isArray(ir.tracks)) {
    errors.push({ path: '/tracks', message: 'must be an array' });
    return { ok: false, errors };
  }

  for (let i = 0; i < ir.tracks.length; i++) {
    const t = ir.tracks[i] as Record<string, unknown>;
    const base = `/tracks/${i}`;
    if (typeof t.id !== 'string') errors.push({ path: `${base}/id`, message: 'must be a string' });
    if (typeof t.name !== 'string') errors.push({ path: `${base}/name`, message: 'must be a string' });
    if (!Number.isInteger(t.channel) || (t.channel as number) < 0 || (t.channel as number) > 15) {
      errors.push({ path: `${base}/channel`, message: 'must be an integer 0-15' });
    }
    if (!Number.isInteger(t.program) || (t.program as number) < 0 || (t.program as number) > 127) {
      errors.push({ path: `${base}/program`, message: 'must be an integer 0-127' });
    }
    if (!Array.isArray(t.notes)) {
      errors.push({ path: `${base}/notes`, message: 'must be an array' });
      continue;
    }
    for (let j = 0; j < t.notes.length; j++) {
      const n = t.notes[j] as Record<string, unknown>;
      const nb = `${base}/notes/${j}`;
      if (!Number.isInteger(n.midi) || (n.midi as number) < 0 || (n.midi as number) > 127) {
        errors.push({ path: `${nb}/midi`, message: 'must be an integer 0-127' });
      }
      if (!Number.isInteger(n.startTick) || (n.startTick as number) < 0) {
        errors.push({ path: `${nb}/startTick`, message: 'must be a non-negative integer' });
      }
      if (!Number.isInteger(n.duration) || (n.duration as number) < 1) {
        errors.push({ path: `${nb}/duration`, message: 'must be a positive integer' });
      }
      if (!Number.isInteger(n.velocity) || (n.velocity as number) < 1 || (n.velocity as number) > 127) {
        errors.push({ path: `${nb}/velocity`, message: 'must be an integer 1-127' });
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Convert from internal Project shape to a portable MIDI IR. */
export function projectToMidiIR(project: {
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  tracks: Array<{
    id: Id;
    name: string;
    channel: number;
    program: number;
    notes: Array<{ midi: number; startTick: number; duration: number; velocity: number }>;
  }>;
}): MidiIR {
  return {
    version: '1.0.0',
    tempo: project.bpm,
    ticksPerBeat: 480,
    timeSignature: project.timeSignature,
    tracks: project.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      channel: t.channel,
      program: t.program,
      notes: t.notes.map((n) => ({
        midi: n.midi,
        startTick: n.startTick,
        duration: n.duration,
        velocity: n.velocity,
      })),
    })),
  };
}

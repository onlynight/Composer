import { describe, expect, it } from 'vitest';
import {
  createNote,
  createProject,
  duplicateProject,
  findCollisions,
  makeAddNoteCommand,
  makeAddTrackCommand,
  makeBatchCommand,
  makeRemoveNoteCommand,
  makeUpdateNoteCommand,
  makeUpdateTrackCommand,
  serializeProject,
  deserializeProject,
  notesOverlap,
  countNotes,
} from '@caa/core';

describe('project lifecycle', () => {
  it('createProject produces sensible defaults', () => {
    const p = createProject({ name: 'My Song' });
    expect(p.name).toBe('My Song');
    expect(p.bpm).toBe(120);
    expect(p.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    expect(p.totalTicks).toBe(16 * 1920);
    expect(p.tracks.length).toBeGreaterThanOrEqual(1);
  });

  it('serializeProject / deserializeProject round-trip', () => {
    const p = createProject({ name: 'RT' });
    const json = serializeProject(p);
    const p2 = deserializeProject(json);
    expect(p2.id).toBe(p.id);
    expect(p2.tracks).toEqual(p.tracks);
  });

  it('duplicateProject produces new ids but preserves shape', () => {
    const p = createProject();
    const p2 = duplicateProject(p);
    expect(p2.id).not.toBe(p.id);
    expect(p2.tracks.map((t) => t.name)).toEqual(p.tracks.map((t) => t.name));
    expect(p2.tracks[0].id).not.toBe(p.tracks[0].id);
  });
});

describe('command pattern — add/remove note round-trip', () => {
  it('add + rollback returns to original state', () => {
    const p = createProject();
    const note = createNote({ midi: 60, startTick: 0, duration: 480 });
    const cmd = makeAddNoteCommand(note);
    const after = cmd.execute(p);
    expect(countNotes(after)).toBe(countNotes(p) + 1);
    const rolled = cmd.rollback(after);
    expect(countNotes(rolled)).toBe(countNotes(p));
    expect(rolled.tracks.find((t) => t.id === after.tracks[0].id)?.notes).not.toContainEqual(
      expect.objectContaining({ id: note.id }),
    );
  });

  it('remove + rollback restores the note', () => {
    const p = createProject();
    const note = createNote({ midi: 60, startTick: 0, duration: 480 });
    const withNote = makeAddNoteCommand(note).execute(p);
    const track = withNote.tracks.find((t) => t.id === p.tracks[p.activeTrackIndex].id)!;
    const removeCmd = makeRemoveNoteCommand(track.id, note.id, note);
    const withoutNote = removeCmd.execute(withNote);
    expect(countNotes(withoutNote)).toBe(countNotes(p));
    const restored = removeCmd.rollback(withoutNote);
    expect(countNotes(restored)).toBe(countNotes(withNote));
  });

  it('update note + rollback restores previous values', () => {
    const p = createProject();
    const note = createNote({ midi: 60, startTick: 0, duration: 480, velocity: 100 });
    const withNote = makeAddNoteCommand(note).execute(p);
    const track = withNote.tracks.find((t) => t.id === p.tracks[p.activeTrackIndex].id)!;
    const cmd = makeUpdateNoteCommand(track.id, note.id, { velocity: 60 }, { velocity: 100 });
    const updated = cmd.execute(withNote);
    expect(updated.tracks.find((t) => t.id === track.id)?.notes.find((n) => n.id === note.id)?.velocity).toBe(60);
    const rolled = cmd.rollback(updated);
    expect(rolled.tracks.find((t) => t.id === track.id)?.notes.find((n) => n.id === note.id)?.velocity).toBe(100);
  });
});

describe('command pattern — tracks', () => {
  it('add track + rollback', () => {
    const p = createProject();
    const track = {
      id: 't-1',
      name: 'Strings',
      type: 'strings' as const,
      channel: 5,
      program: 48,
      volumeDb: 0,
      pan: 0,
      muted: false,
      solo: false,
      visible: true,
      notes: [],
    };
    const cmd = makeAddTrackCommand(track);
    const after = cmd.execute(p);
    expect(after.tracks.length).toBe(p.tracks.length + 1);
    expect(cmd.rollback(after).tracks.length).toBe(p.tracks.length);
  });

  it('update track volume + rollback', () => {
    const p = createProject();
    const trackId = p.tracks[0].id;
    const cmd = makeUpdateTrackCommand(trackId, { volumeDb: -6 }, { volumeDb: 0 });
    const after = cmd.execute(p);
    expect(after.tracks[0].volumeDb).toBe(-6);
    expect(cmd.rollback(after).tracks[0].volumeDb).toBe(0);
  });
});

describe('batch command', () => {
  it('multi-step batch has one undo step', () => {
    const p = createProject();
    const note1 = createNote({ midi: 60, startTick: 0, duration: 480 });
    const note2 = createNote({ midi: 64, startTick: 480, duration: 480 });
    const cmd = makeBatchCommand([
      makeAddNoteCommand(note1, { source: 'agent' }),
      makeAddNoteCommand(note2, { source: 'agent' }),
    ]);
    const after = cmd.execute(p);
    expect(countNotes(after)).toBe(countNotes(p) + 2);
    expect(cmd.rollback(after).tracks.find((t) => t.id === p.tracks[p.activeTrackIndex].id)?.notes.length).toBe(
      p.tracks[p.activeTrackIndex].notes.length,
    );
  });
});

describe('collision detection', () => {
  it('two notes on the same midi overlapping are detected', () => {
    const a = createNote({ midi: 60, startTick: 0, duration: 480 });
    const b = createNote({ midi: 60, startTick: 240, duration: 480 });
    expect(notesOverlap(a, b)).toBe(true);
    expect(findCollisions(a, [b])).toHaveLength(1);
  });

  it('different midi or non-overlapping are not collisions', () => {
    const a = createNote({ midi: 60, startTick: 0, duration: 480 });
    expect(notesOverlap(a, createNote({ midi: 64, startTick: 240, duration: 480 }))).toBe(false);
    expect(notesOverlap(a, createNote({ midi: 60, startTick: 480, duration: 480 }))).toBe(false);
  });
});

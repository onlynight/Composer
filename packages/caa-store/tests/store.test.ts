import { beforeEach, describe, expect, it } from 'vitest';
import {
  createNote,
  makeAddNoteCommand,
  makeAddTrackCommand,
  createTrack,
} from '@caa/core';
import { getState, useProjectStore } from '@caa/store';

describe('ProjectStore — dispatch', () => {
  beforeEach(() => {
    // Reset to a clean state before each test.
    useProjectStore.setState({
      commandStack: { undo: [], redo: [] },
      recentCommandSources: [],
    });
  });

  it('dispatch adds a note to the active track', () => {
    const note = createNote({ midi: 60, startTick: 0, duration: 480 });
    const cmd = makeAddNoteCommand(note, { source: 'human' });
    useProjectStore.getState().dispatch(cmd);
    const s = getState();
    const notes = s.project.tracks[s.project.activeTrackIndex].notes;
    expect(notes.map((n) => n.id)).toContain(note.id);
  });

  it('dispatch records the command in the undo stack', () => {
    const cmd = makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 }));
    useProjectStore.getState().dispatch(cmd);
    expect(getState().commandStack.undo).toHaveLength(1);
    expect(getState().commandStack.redo).toHaveLength(0);
  });

  it('skipHistory bypasses the undo stack', () => {
    const cmd = makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 }));
    useProjectStore.getState().dispatch(cmd, { skipHistory: true });
    expect(getState().commandStack.undo).toHaveLength(0);
  });

  it('dispatchBatch with multiple commands collapses into one undo step', () => {
    const note1 = createNote({ midi: 60, startTick: 0, duration: 480 });
    const note2 = createNote({ midi: 64, startTick: 480, duration: 480 });
    const cmds = [
      makeAddNoteCommand(note1, { source: 'agent' }),
      makeAddNoteCommand(note2, { source: 'agent' }),
    ];
    useProjectStore.getState().dispatchBatch(cmds);
    expect(getState().commandStack.undo).toHaveLength(1);
    expect(getState().commandStack.undo[0].type).toBe('batch');
    expect(getState().recentCommandSources[0]).toBe('agent');
  });
});

describe('ProjectStore — undo/redo', () => {
  beforeEach(() => {
    useProjectStore.setState({ commandStack: { undo: [], redo: [] }, recentCommandSources: [] });
  });

  it('undo reverses the most recent command', () => {
    const note = createNote({ midi: 60, startTick: 0, duration: 480 });
    useProjectStore.getState().dispatch(makeAddNoteCommand(note, { source: 'human' }));
    const beforeUndo = getState().project.tracks[getState().project.activeTrackIndex].notes.length;
    useProjectStore.getState().undo();
    const afterUndo = getState().project.tracks[getState().project.activeTrackIndex].notes.length;
    expect(afterUndo).toBe(beforeUndo - 1);
    expect(getState().commandStack.undo).toHaveLength(0);
    expect(getState().commandStack.redo).toHaveLength(1);
  });

  it('redo re-applies the undone command', () => {
    useProjectStore.getState().dispatch(
      makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 })),
    );
    useProjectStore.getState().undo();
    const before = getState().project.tracks[getState().project.activeTrackIndex].notes.length;
    useProjectStore.getState().redo();
    const after = getState().project.tracks[getState().project.activeTrackIndex].notes.length;
    expect(after).toBe(before + 1);
  });

  it('undo/redo are no-ops on empty stacks', () => {
    const before = getState();
    useProjectStore.getState().undo();
    useProjectStore.getState().redo();
    expect(getState().project).toBe(before.project);
  });

  it('a new dispatch clears the redo stack', () => {
    useProjectStore.getState().dispatch(
      makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 })),
    );
    useProjectStore.getState().undo();
    expect(getState().commandStack.redo).toHaveLength(1);
    useProjectStore.getState().dispatch(
      makeAddTrackCommand(createTrack({ name: 'New' })),
    );
    expect(getState().commandStack.redo).toHaveLength(0);
  });
});

describe('ProjectStore — transport / project', () => {
  beforeEach(() => {
    useProjectStore.setState({ commandStack: { undo: [], redo: [] }, recentCommandSources: [] });
  });

  it('setTransport patches transport state', () => {
    useProjectStore.getState().setTransport({ state: 'playing', positionTick: 480 });
    expect(getState().transport.state).toBe('playing');
    expect(getState().transport.positionTick).toBe(480);
  });

  it('setProject resets the undo/redo stack', () => {
    useProjectStore.getState().dispatch(
      makeAddNoteCommand(createNote({ midi: 60, startTick: 0, duration: 480 })),
    );
    useProjectStore.getState().undo();
    // Load a fresh project
    useProjectStore.getState().setProject(getState().project);
    expect(getState().commandStack.undo).toHaveLength(0);
    expect(getState().commandStack.redo).toHaveLength(0);
  });

  it('attachSync stores the sync handle', () => {
    const fake = { post: () => {}, sendCommand: () => {}, close: () => {}, channel: null as never, senderId: 'x' };
    useProjectStore.getState().attachSync(fake);
    expect(getState().sync).toBe(fake);
    useProjectStore.getState().attachSync(null);
    expect(getState().sync).toBeUndefined();
  });
});

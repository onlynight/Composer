import type { Track } from '@caa/core';
import { PIANO_ROLL_MIN_NOTE } from '@caa/core';
import { midiToLabel } from '@caa/core';

const ROW_HEIGHT = 16;
const TICK_PX = 0.5; // 1 px per 2 ticks → 480 ticks = 240 px

export function PianoRoll({
  tracks,
  activeIndex,
}: {
  tracks: Track[];
  activeIndex: number;
}): JSX.Element {
  const track = tracks[activeIndex];
  const rowCount = 96 - PIANO_ROLL_MIN_NOTE + 1; // 61
  const gridHeight = rowCount * ROW_HEIGHT;
  const gridWidth = Math.max(track ? 960 : 0, 480);

  // Draw keys bottom-to-top
  const keys = Array.from({ length: rowCount }, (_, i) => {
    const midi = PIANO_ROLL_MIN_NOTE + i;
    const pc = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    return (
      <div key={midi} className={`piano-key ${isBlack ? 'black' : 'white'}`}>
        {!isBlack ? midiToLabel(midi) : ''}
      </div>
    );
  });

  // Draw grid vertical lines: 1 per beat + 1 per bar
  const beatCount = Math.ceil((track?.notes.reduce((m, n) => Math.max(m, n.startTick + n.duration), 0) ?? 1920) / 480);
  const beatLines = Array.from({ length: beatCount }, (_, i) => {
    const isBar = i % 4 === 0;
    return (
      <div
        key={`beat-${i}`}
        className={`grid-line${isBar ? ' bar' : i > 0 ? ' beat' : ''}`}
        style={{ left: `${i * 480 * TICK_PX}px` }}
      />
    );
  });

  // Draw notes on active track
  const notes = (track?.notes ?? []).map((note) => {
    const top = gridHeight - ((note.midi - PIANO_ROLL_MIN_NOTE + 1) * ROW_HEIGHT);
    const left = note.startTick * TICK_PX;
    const width = Math.max(6, note.duration * TICK_PX);
    return (
      <div
        key={note.id}
        className="piano-note"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          ['--row-height' as string]: `${ROW_HEIGHT}px`,
        }}
        title={`${midiToLabel(note.midi)} · velocity ${note.velocity} · ${note.duration} ticks`}
      >
        {width > 40 ? midiToLabel(note.midi) : ''}
      </div>
    );
  });

  return (
    <div className="piano-roll" style={{ ['--row-height' as string]: `${ROW_HEIGHT}px` }}>
      <div className="piano-keys">{keys}</div>
      <div className="piano-grid" style={{ width: `${gridWidth}px`, height: `${gridHeight}px`, overflowX: 'auto' }}>
        {beatLines}
        {notes}
        {!track && (
          <div style={{ padding: 20, color: 'var(--text-2)', fontSize: 12 }}>
            No active track. Select one on the left to see its notes.
          </div>
        )}
      </div>
    </div>
  );
}

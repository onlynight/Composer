import { useMemo } from 'react';
import { useProjectStore } from '@caa/store';
import { createNote, makeAddNoteCommand } from '@caa/core';
import { TopBar } from '../components/layout/TopBar.js';
import { TrackList } from '../components/track-list/TrackList.js';
import { Timeline } from '../components/timeline/Timeline.js';
import { PianoRoll } from '../components/piano-roll/PianoRoll.js';
import { Transport } from '../components/transport/Transport.js';
import { Mixer } from '../components/mixer/Mixer.js';
import { AgentPanel } from '../components/ai-chat/AgentPanel.js';

export default function App(): JSX.Element {
  const { project, transport } = useProjectStore();

  // Seed a tiny demo phrase so the Piano Roll isn't empty on first open.
  const activeTrackHasNotes = project.tracks[0]?.notes.length ?? 0;
  const demoNotes = useMemo(() => {
    if (activeTrackHasNotes) return [];
    const scale = [0, 4, 7, 11]; // C major arpeggio
    return scale.map((iv, i) =>
      createNote({ midi: 60 + iv, startTick: i * 480, duration: 480, velocity: 95 }),
    );
  }, [activeTrackHasNotes]);

  return (
    <div className="app-shell">
      <TopBar project={project} transport={transport} />
      <div className="app-body">
        <aside className="pane pane-tracks">
          <h2>Tracks</h2>
          <TrackList tracks={project.tracks} activeIndex={project.activeTrackIndex} />
        </aside>
        <main className="pane pane-center">
          <Timeline positionTick={transport.positionTick} totalTicks={project.totalTicks} />
          <PianoRoll tracks={project.tracks} activeIndex={project.activeTrackIndex} />
          <Transport transport={transport} />
        </main>
        <aside className="pane pane-right">
          <Mixer tracks={project.tracks} />
          <AgentPanel
            onTryDemo={demoNotes.length ? () => useProjectStore.getState().dispatchBatch(demoNotes.map((n) => makeAddNoteCommand(n, { source: 'agent' }))) : undefined}
          />
        </aside>
      </div>
    </div>
  );
}

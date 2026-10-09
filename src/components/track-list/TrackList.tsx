import type { Track } from '@caa/core';

const COLORS = ['#4aa0ff', '#7dd87d', '#ff9a5c', '#ff6b9c', '#c084fc', '#67e8f9'];

export function TrackList({ tracks, activeIndex }: { tracks: Track[]; activeIndex: number }): JSX.Element {
  return (
    <div className="track-list">
      {tracks.map((track, i) => (
        <div
          key={track.id}
          className={`track-row${i === activeIndex ? ' active' : ''}`}
          onClick={() => {
            // Hook point: setActiveTrackIndex (in M1 via command)
          }}
        >
          <span className="track-color" style={{ background: COLORS[i % COLORS.length] }} />
          <span className="track-name">
            {track.name}
            <span className="program">ch {track.channel} · GM {track.program}</span>
          </span>
          <span className="mutesolo">
            <button className={track.muted ? 'on' : ''} title="Mute">M</button>
            <button className={`solo ${track.solo ? 'on' : ''}`} title="Solo">S</button>
          </span>
        </div>
      ))}
      {tracks.length === 0 && <div style={{ padding: 12, color: 'var(--text-2)' }}>No tracks yet.</div>}
    </div>
  );
}

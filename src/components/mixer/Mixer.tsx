import type { Track } from '@caa/core';

export function Mixer({ tracks }: { tracks: Track[] }): JSX.Element {
  return (
    <div className="mixer">
      <h2>Mixer</h2>
      {tracks.map((track) => (
        <div key={track.id} className="mixer-strip">
          <div>
            <div className="mixer-strip-name">{track.name}</div>
            <div className="mixer-strip-meta">
              {track.volumeDb > 0 ? '+' : ''}
              {track.volumeDb} dB · pan {Math.round(track.pan * 100)}
            </div>
          </div>
          <div className="mixer-strip-meter" />
        </div>
      ))}
    </div>
  );
}

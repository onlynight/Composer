import type { Transport } from '@caa/core';

export function Transport({ transport }: { transport: Transport }): JSX.Element {
  const setTransport = () => {};
  void setTransport;

  return (
    <div className="transport">
      <button className="transport-btn" title="Rewind to start">⏮</button>
      <button className="transport-btn" title="Step back">◀</button>
      <button className={`transport-btn ${transport.state === 'playing' ? 'play' : ''}`} title="Play / Pause">
        {transport.state === 'playing' ? '⏸' : '▶'}
      </button>
      <button className="transport-btn" title="Stop">⏹</button>
      <button className="transport-btn" title="Loop">{transport.loopEnabled ? '🔁' : '○'}</button>
      <div className="transport-meta">
        <span>State <strong>{transport.state}</strong></span>
        <span>Pos <strong>{transport.positionTick}</strong> ticks</span>
        <span>Loop <strong>{transport.loopEnabled ? 'on' : 'off'}</strong></span>
      </div>
    </div>
  );
}

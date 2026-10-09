export function Timeline({ positionTick, totalTicks }: { positionTick: number; totalTicks: number }): JSX.Element {
  const bars = Math.max(1, Math.ceil(totalTicks / 1920));
  const barWidthPct = 100 / bars;
  const playheadPct = totalTicks > 0 ? (positionTick / totalTicks) * 100 : 0;

  return (
    <div className="timeline" style={{ '--row-height': '30px' } as React.CSSProperties}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={`timeline-bar${i === 0 ? ' first' : ''}`}
          style={{ left: `${i * barWidthPct}%`, width: `${barWidthPct}%` }}
        >
          {i + 1}
        </div>
      ))}
      <div className="timeline-playhead" style={{ left: `${playheadPct}%` }} />
    </div>
  );
}

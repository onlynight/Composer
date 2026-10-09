import type { Project, Transport } from '@caa/core';

export function TopBar({ project, transport }: { project: Project; transport: Transport }): JSX.Element {
  const bars = Math.floor(project.totalTicks / 1920);
  const bar = Math.floor(transport.positionTick / 1920) + 1;
  const beat = Math.floor((transport.positionTick % 1920) / 480) + 1;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="logo" aria-hidden />
        <span>Composer</span>
        <span className="topbar-title">共鸣 · {project.name}</span>
      </div>
      <div />
      <div className="topbar-meta">
        <span>♩ <strong>{project.bpm}</strong> BPM</span>
        <span>{project.timeSignature.numerator}/{project.timeSignature.denominator}</span>
        <span>Bars <strong>{bar}</strong>/{bars}</span>
        <span>Bar {bar} Beat {beat}</span>
        <span>{project.tracks.length} tracks</span>
      </div>
    </header>
  );
}

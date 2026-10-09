/**
 * Timeline conversion utilities: tick <-> beat <-> bar <-> second.
 */

import { DEFAULT_BPM, TICKS_PER_BEAT } from './constants.js';
import type { TimeSignature } from './types.js';

export interface TimelineContext {
  bpm: number;
  timeSignature: TimeSignature;
}

/** Ticks per whole bar given a TimeSignature and PPQ. */
export function ticksPerBar(timeSignature: TimeSignature = { numerator: 4, denominator: 4 }, ppq: number = TICKS_PER_BEAT): number {
  // beats per bar = numerator / (denominator / 4)
  const beatsPerBar = timeSignature.numerator * (4 / timeSignature.denominator);
  return Math.round(beatsPerBar * ppq);
}

/** Ticks per beat (alias for PPQ but with explicit time signature awareness). */
export function ticksPerBeat(ppq: number = TICKS_PER_BEAT): number {
  return ppq;
}

/** Seconds per beat given a tempo. */
export function secondsPerBeat(bpm: number = DEFAULT_BPM): number {
  return 60 / bpm;
}

/** Tick <-> beat conversion. */
export function tickToBeat(tick: number, ppq: number = TICKS_PER_BEAT): number {
  return tick / ppq;
}
export function beatToTick(beat: number, ppq: number = TICKS_PER_BEAT): number {
  return Math.round(beat * ppq);
}

/** Tick <-> bar conversion. */
export function tickToBar(
  tick: number,
  ctx: TimelineContext = { bpm: DEFAULT_BPM, timeSignature: { numerator: 4, denominator: 4 } },
): { bar: number; beatInBar: number; tickInBar: number } {
  const tpb = ticksPerBar(ctx.timeSignature);
  const bar = Math.floor(tick / tpb);
  const tickInBar = tick - bar * tpb;
  return { bar, beatInBar: tickInBar / TICKS_PER_BEAT, tickInBar };
}

export function barToTick(bar: number, ctx: TimelineContext = { bpm: DEFAULT_BPM, timeSignature: { numerator: 4, denominator: 4 } }): number {
  return Math.round(bar * ticksPerBar(ctx.timeSignature));
}

/** Tick <-> second conversion. */
export function tickToSecond(tick: number, ctx: TimelineContext = { bpm: DEFAULT_BPM, timeSignature: { numerator: 4, denominator: 4 } }): number {
  return (tick / TICKS_PER_BEAT) * secondsPerBeat(ctx.bpm);
}

export function secondToTick(seconds: number, ctx: TimelineContext = { bpm: DEFAULT_BPM, timeSignature: { numerator: 4, denominator: 4 } }): number {
  return Math.round((seconds / secondsPerBeat(ctx.bpm)) * TICKS_PER_BEAT);
}

/** Total ticks in a project given its bar count and time signature. */
export function totalTicksForBars(
  bars: number,
  ctx: TimelineContext = { bpm: DEFAULT_BPM, timeSignature: { numerator: 4, denominator: 4 } },
): number {
  return Math.round(bars * ticksPerBar(ctx.timeSignature));
}

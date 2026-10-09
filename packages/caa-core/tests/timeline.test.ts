import { describe, expect, it } from 'vitest';
import {
  beatToTick,
  barToTick,
  secondToTick,
  tickToBeat,
  tickToBar,
  tickToSecond,
  ticksPerBar,
} from '@caa/core';

describe('timeline conversions', () => {
  const ctx = { bpm: 120, timeSignature: { numerator: 4, denominator: 4 } };

  it('ticksPerBar = 4 * 480 = 1920 for 4/4 @ PPQ 480', () => {
    expect(ticksPerBar({ numerator: 4, denominator: 4 })).toBe(1920);
  });

  it('3/4 has 3 * 480 = 1440 ticks per bar', () => {
    expect(ticksPerBar({ numerator: 3, denominator: 4 })).toBe(1440);
  });

  it('tick <-> beat round-trips', () => {
    expect(tickToBeat(960)).toBe(2);
    expect(beatToTick(2)).toBe(960);
  });

  it('barToTick for 5 bars of 4/4 = 5 * 1920 = 9600', () => {
    expect(barToTick(5, ctx)).toBe(9600);
  });

  it('tickToBar decomposes correctly', () => {
    const { bar, tickInBar } = tickToBar(1920 + 240, ctx);
    expect(bar).toBe(1);
    expect(tickInBar).toBe(240);
  });

  it('second <-> tick round-trips at 120 BPM', () => {
    // 120 BPM, PPQ=480: 1 beat = 480 ticks = 0.5 s; 1 s = 960 ticks.
    expect(tickToSecond(480, ctx)).toBeCloseTo(0.5, 6);
    expect(tickToSecond(960, ctx)).toBeCloseTo(1, 6);
    expect(secondToTick(1, ctx)).toBe(960);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { createMonotonicClock, CLOCK_SKEW_LIMIT_MS } from './clock';

/** A controllable wall clock. */
function wall(start: number) {
  let t = start;
  return {
    fn: () => t,
    set: (v: number) => {
      t = v;
    },
  };
}

describe('createMonotonicClock (ADR-041)', () => {
  it('issues the wall clock when it is ahead of the floor', () => {
    const w = wall(1_000);
    const clock = createMonotonicClock(w.fn);
    expect(clock.now()).toBe(1_000);
    w.set(5_000);
    expect(clock.now()).toBe(5_000);
    expect(clock.last()).toBe(5_000);
  });

  it('stays strictly increasing across a BACKWARD wall-clock jump', () => {
    const w = wall(10_000);
    const clock = createMonotonicClock(w.fn);
    const a = clock.now();
    w.set(4_000); // NTP correction / manual clock change pulls the wall clock back
    const b = clock.now();
    const c = clock.now();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect([a, b, c]).toEqual([10_000, 10_001, 10_002]);
  });

  it('repeated now() inside one millisecond (a commitMany batch) is strictly increasing', () => {
    const clock = createMonotonicClock(() => 42_000);
    const stamps = Array.from({ length: 6 }, () => clock.now());
    for (let i = 1; i < stamps.length; i++) expect(stamps[i]!).toBe(stamps[i - 1]! + 1);
    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it('observe() raises the floor — the next stamp lands after an own event already on disk', () => {
    const w = wall(1_000);
    const clock = createMonotonicClock(w.fn);
    clock.observe(9_000); // boot: the latest own-device event on disk
    expect(clock.last()).toBe(9_000);
    expect(clock.now()).toBe(9_001);
  });

  it('observe() never lowers the floor', () => {
    const clock = createMonotonicClock(() => 1_000);
    clock.observe(8_000);
    clock.observe(3_000);
    expect(clock.last()).toBe(8_000);
  });

  it('observe() ignores a non-finite time', () => {
    const clock = createMonotonicClock(() => 1_000);
    clock.observe(Number.NaN);
    clock.observe(Number.POSITIVE_INFINITY);
    expect(clock.now()).toBe(1_000);
  });

  it('a floor more than 24 h ahead of the wall clock resets and reports the skew', () => {
    const now = 1_700_000_000_000;
    const onSkew = vi.fn();
    const clock = createMonotonicClock(() => now, onSkew);
    const future = now + CLOCK_SKEW_LIMIT_MS + 60_000; // a day and a minute fast
    clock.observe(future);
    expect(onSkew).toHaveBeenCalledTimes(1);
    expect(onSkew).toHaveBeenCalledWith({ last: future, now, aheadMs: CLOCK_SKEW_LIMIT_MS + 60_000 });
    expect(clock.last()).toBe(now);
    // The next stamp is back on the wall clock, not a day in the future.
    const t = clock.now();
    expect(t).toBeLessThan(now + 10);
    expect(t).toBeGreaterThan(now - 1);
  });

  it('a floor within 24 h ahead is held (no reset, no report)', () => {
    const now = 1_700_000_000_000;
    const onSkew = vi.fn();
    const clock = createMonotonicClock(() => now, onSkew);
    clock.observe(now + CLOCK_SKEW_LIMIT_MS); // exactly at the limit — not past it
    expect(clock.now()).toBe(now + CLOCK_SKEW_LIMIT_MS + 1);
    expect(onSkew).not.toHaveBeenCalled();
  });

  it('a wall clock that jumps more than 24 h backwards resets on the next now()', () => {
    const w = wall(1_700_000_000_000);
    const onSkew = vi.fn();
    const clock = createMonotonicClock(w.fn, onSkew);
    clock.now();
    w.set(1_700_000_000_000 - 2 * CLOCK_SKEW_LIMIT_MS);
    expect(clock.now()).toBe(1_700_000_000_000 - 2 * CLOCK_SKEW_LIMIT_MS + 1);
    expect(onSkew).toHaveBeenCalledTimes(1);
  });
});

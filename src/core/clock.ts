// ADR-041 — the per-device monotonic event clock.
//
// `at` on every event is AUDIT time (who did what, when, as this device saw it). It is
// not the fold order — that is `(receivedAt ?? +∞, at, id)` — but it is the tiebreak
// among a device's own provisional events and the stamp every timeline reads, so it
// must never run backwards on one device (an NTP correction, a manual clock change, or
// two commits inside the same millisecond would otherwise reorder a device's own work).
//
// Pure and policy-free: the clock does not know what an event is or who wrote it. The
// CALLER decides what to observe. The store feeds `observe()` ONLY this device's own
// event times — on boot, the rows whose `by === deviceUid`; at runtime, its own local
// commits. It must never observe a PEER's `at`: one peer with a clock running a day
// fast would otherwise drag every device's timestamps forward with it, fleet-wide.

/** One forward-skew reset, reported to the caller (the store wires it to diagnostics). */
export interface ClockSkewDetail {
  /** The floor the clock was holding before the reset (epoch ms). */
  last: number;
  /** The wall clock at the moment of the reset (epoch ms). */
  now: number;
  /** How far ahead the floor had run, `last - now` (ms). */
  aheadMs: number;
}

export interface MonotonicClock {
  /** A strictly increasing epoch-ms stamp: max(wall clock, last + 1). Advances the floor. */
  now(): number;
  /** Raise the floor to `at` if it is later. Feed it own-device event times only. */
  observe(at: number): void;
  /** The current floor (the last stamp issued or observed; 0 before any). */
  last(): number;
}

/** The forward-skew limit: a floor more than this far ahead of the wall clock resets. */
export const CLOCK_SKEW_LIMIT_MS = 24 * 60 * 60 * 1000;

export function createMonotonicClock(
  nowFn: () => number = Date.now,
  onSkew?: (detail: ClockSkewDetail) => void,
): MonotonicClock {
  let last = 0;

  // Forward-skew clamp. A floor that has run more than a day ahead of the wall clock
  // came from a bad observation (a device that once had its date set wrong). Holding
  // it would stamp every new event with a future time for as long as the gap lasts,
  // so the clock lets go of it and reports the reset. Checked on every read so a
  // bad floor never issues even one stamp.
  function clamp(wall: number): void {
    if (last - wall > CLOCK_SKEW_LIMIT_MS) {
      const detail: ClockSkewDetail = { last, now: wall, aheadMs: last - wall };
      last = wall;
      onSkew?.(detail);
    }
  }

  return {
    now() {
      const wall = nowFn();
      clamp(wall);
      last = Math.max(wall, last + 1);
      return last;
    },
    observe(at) {
      if (!Number.isFinite(at)) return;
      if (at > last) last = at;
      clamp(nowFn());
    },
    last() {
      return last;
    },
  };
}

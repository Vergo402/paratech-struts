import type { ShorePoint } from '../schema';

// core/operation/saw — the multi-saw auto-claim logic for the Cutting Station
// (#354). Pure: given the FIFO cut queue + the saw roster, it derives which cut
// each saw is on (the hero) and which cuts are still unclaimed (the up-next list),
// and computes the claim events a free saw must emit. Single-device for v4.0;
// cross-tablet live mirroring of claims is the sync build (#369), out of scope.
//
// THE INVARIANT (the reason a claim is PERSISTED, not derived from queue position):
// a saw keeps the cut it claimed until that cut is sent to Runner (leaves the
// queue). Finishing frees the saw to claim the next top-UNCLAIMED cut. So if Saw A
// finishes before Saw B, A claims the next unclaimed cut and NEVER steals the cut B
// is mid-way through — claims do not reshuffle on out-of-order completion. The
// persisted `sp.sawId` is what carries this across re-derivations.

/** The default roster for an op with no saws recorded (legacy safety, #354). */
export const DEFAULT_SAWS: readonly string[] = ['A'];

/** Saw ids are auto-named A, B, C, … by roster position. The next id after N saws. */
export function nextSawId(saws: readonly string[]): string {
  // 0→'A', 1→'B', … 25→'Z', then 'AA' onward — far past any real cut station, but
  // never collides and never runs out.
  let n = saws.length;
  let id = '';
  do {
    id = String.fromCharCode(65 + (n % 26)) + id;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return saws.includes(id) ? `${id}'` : id; // defensive: never hand back a dupe
}

/** A non-empty roster — falls back to the single default saw for legacy ops. */
export function rosterOf(saws: readonly string[] | undefined): string[] {
  return saws && saws.length > 0 ? [...saws] : [...DEFAULT_SAWS];
}

export interface SawAssignment {
  /** sawId → the cut that saw is currently on, or null when the saw is free and no
   *  unclaimed cut remains. Order matches the roster. */
  heroBySaw: Record<string, ShorePoint | null>;
  /** The cuts no saw has claimed, in queue order — the shared "up next" list. */
  unclaimed: ShorePoint[];
  /** sawId → the cut a free saw should CLAIM now (a CuttingClaimed must be emitted).
   *  Empty when every saw is already busy or the queue has no unclaimed cuts. */
  pendingClaims: Record<string, ShorePoint>;
}

/**
 * Resolve the saw roster against the FIFO cut queue. Honors PERSISTED claims first
 * (each saw keeps its `sp.sawId` cut, so an out-of-order finish never reshuffles),
 * then hands each still-free saw the next top-unclaimed cut in queue order. The
 * result drives both the per-saw heroes and the shared up-next list, and tells the
 * caller which claims to persist (pendingClaims).
 *
 * `queue` must be the cutting points already FIFO-sorted (by cuttingStartedAt); a
 * cut whose `sawId` names a saw NOT on the roster is treated as unclaimed (the saw
 * was never really there — defensive against stale data).
 */
export function assignSaws(queue: readonly ShorePoint[], saws: readonly string[]): SawAssignment {
  const roster = rosterOf(saws);
  const onRoster = new Set(roster);

  // 1) Honor existing claims: the first queued cut each saw already owns is its hero.
  const heroBySaw: Record<string, ShorePoint | null> = {};
  const claimedSpIds = new Set<string>();
  for (const sawId of roster) {
    const owned = queue.find((sp) => sp.sawId === sawId);
    heroBySaw[sawId] = owned ?? null;
    if (owned) claimedSpIds.add(owned.id);
  }

  // 2) The shared up-next list: every cut not owned by a roster saw, in queue order.
  const unclaimed = queue.filter((sp) => !claimedSpIds.has(sp.id) && !(sp.sawId != null && onRoster.has(sp.sawId)));

  // 3) Hand each still-free saw the next top-unclaimed cut. Walk the roster in order
  //    so Saw A claims ahead of Saw B (deterministic); consume from `unclaimed` as we go.
  const pendingClaims: Record<string, ShorePoint> = {};
  let cursor = 0;
  for (const sawId of roster) {
    if (heroBySaw[sawId]) continue; // already busy — keep its claimed cut
    const next = unclaimed[cursor];
    if (!next) break; // queue exhausted — saw stays idle
    heroBySaw[sawId] = next;
    pendingClaims[sawId] = next;
    cursor += 1;
  }

  return { heroBySaw, unclaimed: unclaimed.slice(cursor), pendingClaims };
}

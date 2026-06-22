import { describe, expect, it } from 'vitest';
import type { ShorePoint } from '../schema';
import { assignSaws, nextSawId, rosterOf, DEFAULT_SAWS } from './saw';

// A `cutting` shore point; cuttingStartedAt sets the FIFO order the queue is
// pre-sorted by (the caller sorts; assignSaws honors the given order).
function cut(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 388,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'cutting',
    cuttingStartedAt: 1,
    ...over,
  };
}

// Apply the pendingClaims back onto the queue (what the store does: emit a
// CuttingClaimed, the reducer stamps sawId) so we can re-derive and assert stability.
function applyClaims(queue: ShorePoint[], pending: Record<string, ShorePoint>): ShorePoint[] {
  const sawForSp = new Map<string, string>();
  for (const [sawId, sp] of Object.entries(pending)) sawForSp.set(sp.id, sawId);
  return queue.map((sp) => (sawForSp.has(sp.id) ? { ...sp, sawId: sawForSp.get(sp.id) } : sp));
}

describe('assignSaws', () => {
  it('1 saw: the top of the queue is the hero, the rest is up-next', () => {
    const queue = [cut('a'), cut('b'), cut('c')];
    const r = assignSaws(queue, ['A']);
    expect(r.heroBySaw['A']?.id).toBe('a');
    expect(r.pendingClaims['A']?.id).toBe('a');
    expect(r.unclaimed.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('empty queue: the saw is idle, no claim, nothing up-next', () => {
    const r = assignSaws([], ['A']);
    expect(r.heroBySaw['A']).toBeNull();
    expect(r.pendingClaims).toEqual({});
    expect(r.unclaimed).toEqual([]);
  });

  it('legacy op (no roster) defaults to one saw claiming the top of the queue', () => {
    const queue = [cut('a'), cut('b')];
    const r = assignSaws(queue, []); // operation.saws absent/empty → default ['A']
    expect(Object.keys(r.heroBySaw)).toEqual(['A']);
    expect(r.heroBySaw['A']?.id).toBe('a');
    expect(r.unclaimed.map((s) => s.id)).toEqual(['b']);
  });

  it('adding a 2nd saw claims the NEXT unclaimed cut (A keeps its claim)', () => {
    // Saw A has already claimed the head; add Saw B.
    const queue = [cut('a', { sawId: 'A' }), cut('b'), cut('c')];
    const r = assignSaws(queue, ['A', 'B']);
    expect(r.heroBySaw['A']?.id).toBe('a'); // A's persisted claim is honored
    expect(r.heroBySaw['B']?.id).toBe('b'); // B takes the next unclaimed
    expect(r.pendingClaims['A']).toBeUndefined(); // A already busy — no re-claim
    expect(r.pendingClaims['B']?.id).toBe('b');
    expect(r.unclaimed.map((s) => s.id)).toEqual(['c']);
  });

  it('two free saws claim the top two cuts in roster order (A before B)', () => {
    const queue = [cut('a'), cut('b'), cut('c')];
    const r = assignSaws(queue, ['A', 'B']);
    expect(r.heroBySaw['A']?.id).toBe('a');
    expect(r.heroBySaw['B']?.id).toBe('b');
    expect(r.unclaimed.map((s) => s.id)).toEqual(['c']);
  });

  it('THE INVARIANT — out-of-order completion does NOT reshuffle claims', () => {
    // A on the head, B on the next; both claimed.
    let queue = [cut('a', { sawId: 'A' }), cut('b', { sawId: 'B' }), cut('c'), cut('d')];
    // A finishes first: 'a' leaves the queue (sent to runner). B is STILL on 'b'.
    queue = queue.filter((s) => s.id !== 'a');
    const r = assignSaws(queue, ['A', 'B']);
    // B must keep 'b' — A must NOT steal it; A claims the next unclaimed ('c').
    expect(r.heroBySaw['B']?.id).toBe('b');
    expect(r.heroBySaw['A']?.id).toBe('c');
    expect(r.pendingClaims['A']?.id).toBe('c'); // only A needs a fresh claim
    expect(r.pendingClaims['B']).toBeUndefined();
    expect(r.unclaimed.map((s) => s.id)).toEqual(['d']);
  });

  it('finishing frees a saw to claim the next unclaimed (re-derivation is stable)', () => {
    let queue = [cut('a'), cut('b'), cut('c')];
    // First derivation: A claims 'a'. Persist it.
    let r = assignSaws(queue, ['A']);
    queue = applyClaims(queue, r.pendingClaims);
    expect(queue.find((s) => s.id === 'a')?.sawId).toBe('A');

    // A finishes 'a' (sent to runner — leaves the queue). Re-derive.
    queue = queue.filter((s) => s.id !== 'a');
    r = assignSaws(queue, ['A']);
    expect(r.heroBySaw['A']?.id).toBe('b'); // freed → next unclaimed
    expect(r.pendingClaims['A']?.id).toBe('b');
    expect(r.unclaimed.map((s) => s.id)).toEqual(['c']);
  });

  it('re-deriving with no completion is idempotent — no new claims, no shuffle', () => {
    const queue = [cut('a', { sawId: 'A' }), cut('b', { sawId: 'B' }), cut('c')];
    const r = assignSaws(queue, ['A', 'B']);
    expect(r.heroBySaw['A']?.id).toBe('a');
    expect(r.heroBySaw['B']?.id).toBe('b');
    expect(r.pendingClaims).toEqual({}); // nothing to claim — every saw already busy
    expect(r.unclaimed.map((s) => s.id)).toEqual(['c']);
  });

  it('more saws than cuts: extra saws sit idle, no over-claim', () => {
    const queue = [cut('a')];
    const r = assignSaws(queue, ['A', 'B', 'C']);
    expect(r.heroBySaw['A']?.id).toBe('a');
    expect(r.heroBySaw['B']).toBeNull();
    expect(r.heroBySaw['C']).toBeNull();
    expect(r.pendingClaims['A']?.id).toBe('a');
    expect(r.pendingClaims['B']).toBeUndefined();
    expect(r.unclaimed).toEqual([]);
  });

  it('a claim by a saw NOT on the roster is treated as unclaimed (stale-data defense)', () => {
    const queue = [cut('a', { sawId: 'Z' }), cut('b')];
    const r = assignSaws(queue, ['A']); // 'Z' is gone from the roster
    expect(r.heroBySaw['A']?.id).toBe('a'); // A re-claims the orphaned cut
    expect(r.unclaimed.map((s) => s.id)).toEqual(['b']);
  });
});

describe('nextSawId', () => {
  it('auto-names A, B, C … by roster length', () => {
    expect(nextSawId([])).toBe('A');
    expect(nextSawId(['A'])).toBe('B');
    expect(nextSawId(['A', 'B'])).toBe('C');
  });

  it('rolls past Z to AA without colliding or running out', () => {
    const full = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A..Z
    expect(nextSawId(full)).toBe('AA');
  });
});

describe('rosterOf', () => {
  it('falls back to the single default saw for a legacy op', () => {
    expect(rosterOf(undefined)).toEqual([...DEFAULT_SAWS]);
    expect(rosterOf([])).toEqual([...DEFAULT_SAWS]);
    expect(rosterOf(['A', 'B'])).toEqual(['A', 'B']);
  });
});

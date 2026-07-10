import type { OrgPosition, OrgPositions, OrgResourceRef } from '../schema/org';
import type { ShorePoint } from '../schema/shorepoint';

// The leader of a position = the first assigned resource (drives the node headline
// and, for the IC, the gold accent). null when unfilled.
export function leaderOf(p: OrgPosition): OrgResourceRef | null {
  return p.assignedResources[0] ?? null;
}

export function sameResource(a: OrgResourceRef, b: OrgResourceRef): boolean {
  return a.ref === b.ref && a.value === b.value;
}

// ── The Operations ↔ Command link (Alex's key ask) ──────────────────────────────
// One roster, two axes: a resource sits in ONE org position (its command home) and
// works MANY shore points. These pure joins surface the link on both pages.

// Positions holding a given resource.
export function positionsForResource(positions: OrgPositions, ref: OrgResourceRef): OrgPosition[] {
  return Object.values(positions).filter((p) => p.assignedResources.some((r) => sameResource(r, ref)));
}

// A resource's single command home (unity of command — first match).
export function positionForResource(positions: OrgPositions, ref: OrgResourceRef): OrgPosition | null {
  return positionsForResource(positions, ref)[0] ?? null;
}

// The org position a shore point's assigned unit belongs to — drives the Operations
// card's "Rescue 2 · Rescue Group" tag. `assignedResource` is the unit's display
// string (v3-style); match it against a resource's label OR value.
export function positionForShorePoint(positions: OrgPositions, sp: ShorePoint): OrgPosition | null {
  const key = sp.assignedResource;
  if (!key) return null;
  return (
    Object.values(positions).find((p) =>
      p.assignedResources.some((r) => r.label === key || r.value === key),
    ) ?? null
  );
}

// The shore points a resource is working (live, non-deleted) — drives the org
// chart's live command-picture roll-up.
export function shorePointsForResource(shorePoints: ShorePoint[], ref: OrgResourceRef): ShorePoint[] {
  return shorePoints.filter(
    (sp) =>
      sp.deletedAt == null &&
      sp.assignedResource != null &&
      (sp.assignedResource === ref.label || sp.assignedResource === ref.value),
  );
}

/** Per-position live shore-point tallies — the org chart's assignment numerals
 *  ("N total shore points", craft.md §10, #434). Each apparatus's command HOME is
 *  the first position that holds it (unity of command — the same first-match
 *  `positionForShorePoint` uses); a shore point is credited to its rig's home ONLY,
 *  never to every position holding the rig, so the per-node numerals cross-foot with
 *  the rail strip's shore-point total and the rollup grand total even when a rig is
 *  (anomalously) assigned to two positions. Matches `sp.assignedResource` against
 *  BOTH a ref's label and value (the v3-style dual-key rule). ALL non-deleted
 *  statuses count, returned included. Zero-count positions are omitted. */
export function shorePointCountsByPosition(
  positions: OrgPositions,
  shorePoints: ShorePoint[],
): Record<string, number> {
  const home = new Map<string, string>(); // apparatus key (label AND value) → position id
  for (const p of Object.values(positions)) {
    for (const r of p.assignedResources) {
      if (r.ref !== 'apparatus') continue;
      if (!home.has(r.label)) home.set(r.label, p.id);
      if (!home.has(r.value)) home.set(r.value, p.id);
    }
  }
  const out: Record<string, number> = {};
  for (const sp of shorePoints) {
    if (sp.deletedAt != null || !sp.assignedResource) continue;
    const posId = home.get(sp.assignedResource);
    if (posId == null) continue;
    out[posId] = (out[posId] ?? 0) + 1;
  }
  return out;
}

// The device's own apparatus, via its declared My Role position — the "Mine" lens
// (#370) narrows the board to shore points these rigs are working. A position may
// hold zero, one, or several apparatus (e.g. Staging); each match key is both the
// label AND value form so callers can test `sp.assignedResource` membership the
// same way positionForShorePoint/shorePointsForResource do.
export function myApparatusKeys(positions: OrgPositions, myRoleId: string | null | undefined): string[] {
  if (!myRoleId) return [];
  const position = positions[myRoleId];
  if (!position) return [];
  const keys: string[] = [];
  for (const r of position.assignedResources) {
    if (r.ref !== 'apparatus') continue;
    keys.push(r.label, r.value);
  }
  return keys;
}

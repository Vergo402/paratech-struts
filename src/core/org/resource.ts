import type { OrgPosition, OrgPositions, OrgResourceRef } from '../schema/org';
import type { ShorePoint } from '../schema/shorepoint';

// The leader of a position = the first assigned resource (drives the node headline
// and, for the IC, the gold accent). null when unfilled.
export function leaderOf(p: OrgPosition): OrgResourceRef | null {
  return p.assignedResources[0] ?? null;
}

export function resourceLabel(p: OrgPosition): string | null {
  return leaderOf(p)?.label ?? null;
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

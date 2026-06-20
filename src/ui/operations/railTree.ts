// Drilldown-rail tree (20-operations.md §Drilldown) — the building → division →
// area hierarchy the desktop rail renders to FILTER the board. Pure + testable:
// it builds the full hierarchy with per-node counts from the live shore points,
// ordered by the same comparators the board sorts by (division descending — top
// floor first; area ascending). Deleted points are excluded (they're off the
// lanes and counts, #319). The rail SELECTS into the board's existing
// building/division/area filter state — this builder owns no filter state, so
// there is one source of truth (OperationsBoard).
import { compareAreaValues, compareBuildingValues, compareDivisionValues } from '@core/operation';
import type { ShorePoint } from '@core/schema';

export interface RailAreaNode {
  area: string;
  count: number;
}
export interface RailDivisionNode {
  division: string;
  count: number;
  areas: RailAreaNode[];
}
export interface RailBuildingNode {
  building: string;
  count: number;
  divisions: RailDivisionNode[];
}
export interface RailTree {
  /** True when any point carries a building → top level is buildings, not divisions. */
  multiBuilding: boolean;
  /** All non-deleted points — the "All" root count. */
  total: number;
  /** Populated when multiBuilding. */
  buildings: RailBuildingNode[];
  /** Populated when single-building (the common case). */
  divisions: RailDivisionNode[];
}

function buildDivisions(points: ShorePoint[]): RailDivisionNode[] {
  const byDiv = new Map<string, ShorePoint[]>();
  for (const sp of points) {
    if (!sp.division) continue;
    const arr = byDiv.get(sp.division);
    if (arr) arr.push(sp);
    else byDiv.set(sp.division, [sp]);
  }
  return [...byDiv.entries()]
    .sort((a, b) => compareDivisionValues(a[0], b[0]))
    .map(([division, pts]) => {
      const byArea = new Map<string, number>();
      for (const sp of pts) if (sp.area) byArea.set(sp.area, (byArea.get(sp.area) ?? 0) + 1);
      const areas = [...byArea.entries()]
        .sort((a, b) => compareAreaValues(a[0], b[0]))
        .map(([area, count]) => ({ area, count }));
      return { division, count: pts.length, areas };
    });
}

/** The scope path the rail/breadcrumb select into (mirrors OperationsBoard's filter state). */
export interface ScopePath {
  building: string | null;
  division: string | null;
  area: string | null;
}

/**
 * Does this exact scope path point at a LEAF node — nothing deeper to drill?
 * The phone scope sheet uses this to "pick and go": selecting a leaf (an area,
 * an area-less division, a division-less building) closes the sheet; selecting
 * an expandable node keeps it open so the user can keep drilling (the rail
 * expands it inline). "All" (the root) is never a leaf.
 */
export function isLeafScope(path: ScopePath, tree: RailTree): boolean {
  if (path.area) return true; // areas have no children
  if (path.division) {
    const divisions = tree.multiBuilding
      ? (tree.buildings.find((b) => b.building === path.building)?.divisions ?? [])
      : tree.divisions;
    return (divisions.find((d) => d.division === path.division)?.areas.length ?? 0) === 0;
  }
  if (path.building) {
    return (tree.buildings.find((b) => b.building === path.building)?.divisions.length ?? 0) === 0;
  }
  return false; // "All" — the root, keep the sheet open
}

export function buildRailTree(shorePoints: readonly ShorePoint[]): RailTree {
  const live = shorePoints.filter((sp) => sp.deletedAt == null);
  const multiBuilding = live.some((sp) => !!sp.building);
  if (!multiBuilding) {
    return { multiBuilding: false, total: live.length, buildings: [], divisions: buildDivisions(live) };
  }
  const byBldg = new Map<string, ShorePoint[]>();
  for (const sp of live) {
    if (!sp.building) continue;
    const arr = byBldg.get(sp.building);
    if (arr) arr.push(sp);
    else byBldg.set(sp.building, [sp]);
  }
  const buildings = [...byBldg.entries()]
    .sort((a, b) => compareBuildingValues(a[0], b[0]))
    .map(([building, pts]) => ({ building, count: pts.length, divisions: buildDivisions(pts) }));
  return { multiBuilding: true, total: live.length, buildings, divisions: [] };
}

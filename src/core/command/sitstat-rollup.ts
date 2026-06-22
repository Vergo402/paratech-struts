// core/command — SitStat per-Division roll-up (#353). Pure projection logic:
// no React, no Firebase. The CommandRail's existing whole-incident tally answers
// "how is the WHOLE incident doing"; at Surfside scale the IC also needs "WHICH
// Division is behind". This rolls the active shore points up into one row per
// Division (7-status counts + total), each expandable to its grouped shores, and
// flags the laggard. The component stays thin — it renders what this returns.

import type { ShorePoint, ShorePointStatus } from '../schema';
import { STATUS_ORDER } from '../shorepoint';
import { compareDivisionValues, divisionLabel } from '../operation';

/** Per-status tally — every status key present, zero-filled. */
export type StatusCounts = Record<ShorePointStatus, number>;

/** A grouped physical shore within a Division (members share a groupId); solo
 *  points have no groupId and each become their own single-member cluster. */
export interface RollupGroup {
  /** groupId, or the lone point's id when ungrouped — a stable React key. */
  key: string;
  /** Display line, e.g. "3-Post 1/3·2/3·3/3" or a solo point's own label. */
  label: string;
  counts: StatusCounts;
  total: number;
}

/** One Division row in the roll-up. */
export interface RollupRow {
  /** The raw ShorePoint.division string (the stable key + the value to sort by). */
  division: string;
  /** Display label via divisionLabel() — "Div 2" / "Sub Div 1" / legacy free text. */
  label: string;
  counts: StatusCounts;
  total: number;
  /** Shore points still awaiting equipment — the lagging-Division signal. */
  pendingCount: number;
  /** The grouped shores under this Division, for the lazy expand. */
  groups: RollupGroup[];
}

export interface SitStatRollup {
  /** One row per Division, top-floor-first (compareDivisionValues). */
  rows: RollupRow[];
  /** The whole-incident totals (= the existing single-pass board). */
  totals: StatusCounts;
  grandTotal: number;
  /** The division string of the lagging Division, or null when nothing is pending. */
  laggingDivision: string | null;
}

function zeroCounts(): StatusCounts {
  return Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as StatusCounts;
}

/** A short, stable display line for one grouped shore. Multi-strut groups show
 *  the shore type + each member's "i/n" badge; a solo point shows its own label
 *  (#N · label · type), falling back to the type when it carries no label. */
function groupLabel(members: [ShorePoint, ...ShorePoint[]], typeLabel: (sp: ShorePoint) => string): string {
  const first = members[0];
  if (members.length > 1 && first.groupTotal != null) {
    const badges = members
      .slice()
      .sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0))
      .map((m) => `${m.groupIndex ?? '?'}/${first.groupTotal}`)
      .join('·');
    return `${typeLabel(first)} ${badges}`;
  }
  const prefix = first.seq != null ? `#${first.seq} · ` : '';
  const named = first.label ? `${first.label} · ` : '';
  return `${prefix}${named}${typeLabel(first)}`;
}

/**
 * Roll the active shore points up into per-Division rows. `typeLabel` maps a
 * point to its shore-type display word (the UI owns the label catalog, so it is
 * injected — core stays free of UI strings). Skips soft-deleted points
 * (deletedAt != null) in every tally, matching the CommandRail board.
 */
export function rollupByDivision(
  shorePoints: readonly ShorePoint[],
  typeLabel: (sp: ShorePoint) => string,
): SitStatRollup {
  type NonEmpty = [ShorePoint, ...ShorePoint[]];
  const byDivision = new Map<string, NonEmpty>();
  const totals = zeroCounts();
  let grandTotal = 0;

  for (const sp of shorePoints) {
    if (sp.deletedAt != null) continue;
    totals[sp.status]++;
    grandTotal++;
    const list = byDivision.get(sp.division);
    if (list) list.push(sp);
    else byDivision.set(sp.division, [sp]);
  }

  const rows: RollupRow[] = [];
  for (const [division, points] of byDivision) {
    const counts = zeroCounts();
    let pendingCount = 0;
    const groupMembers = new Map<string, NonEmpty>();

    for (const sp of points) {
      counts[sp.status]++;
      if (sp.status === 'pending') pendingCount++;
      // Solo points have no groupId — key on the point id so each is its own cluster.
      const key = sp.groupId ?? sp.id;
      const members = groupMembers.get(key);
      if (members) members.push(sp);
      else groupMembers.set(key, [sp]);
    }

    const groups: RollupGroup[] = [];
    for (const [key, members] of groupMembers) {
      const gc = zeroCounts();
      for (const m of members) gc[m.status]++;
      groups.push({ key, label: groupLabel(members, typeLabel), counts: gc, total: members.length });
    }

    rows.push({ division, label: divisionLabel(division), counts, total: points.length, pendingCount, groups });
  }

  rows.sort((a, b) => compareDivisionValues(a.division, b.division));

  // ponytail: lagging Division = the one with the most points still at `pending`
  // (awaiting equipment). Most-behind-getting-started, ties broken by board order
  // (first wins — the rows are already top-floor-first). No scoring system.
  let laggingDivision: string | null = null;
  let worstPending = 0;
  for (const row of rows) {
    if (row.pendingCount > worstPending) {
      worstPending = row.pendingCount;
      laggingDivision = row.division;
    }
  }

  return { rows, totals, grandTotal, laggingDivision };
}

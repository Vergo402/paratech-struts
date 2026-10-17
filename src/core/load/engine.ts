import type { InventoryItem, StockRow, System } from '../schema';
import { ACME_LOAD_TABLE, LONGSHORE_LOAD_TABLE, type LoadRow } from './tables';
import { STRUTS, EXTENSIONS, LOCKSTROKE_EXTENSIONS, type Strut } from './struts';

// L-1 / L-2 — the selection algorithm, ported VERBATIM from v3 app.js (lines
// 147-379). The math and the warning branches (unrated zone, fully-extended
// boundary) are unchanged; the only edits are TypeScript types and the index guards
// that `noUncheckedIndexedAccess` requires, plus #531: v3's 4-strut ceiling (and its
// NEW-3 "exceeds capacity" sentinel) is gone — a heavy load just needs more struts.
// tables.test.ts + engine.test.ts pin the output against v3. DO NOT "clean up" this code.

/** Numeric deduction heights handed to the engine (header/footer wood + plates). */
export interface EngineDeductions {
  header?: number;
  sole?: number; // footer wood (v3 field name preserved)
  topPlate?: number;
  bottomPlate?: number;
}

// Exported because every combination's `strut` is one of these at runtime —
// the deploy path (S6, #221) reads `inventoryId` off the result to commit
// StrutDeployed against the exact stock record (L-8 ID round-trip).
// `inventoryId` is null only in catalog mode (no inventory passed).
export interface StrutCandidate extends Strut {
  inventoryId: string | null;
  availableQty: number;
}

export interface StrutCombination {
  strut: StrutCandidate;
  extensions: number[];
  extTotal: number;
  adjCollapsed: number;
  adjExtended: number;
  capacity: number;
  capacityAll: number[];
  margin: number;
  componentCount: number;
  recommendedQty: number;
  totalCapacity: number;
  deductions: EngineDeductions | null;
  effectiveLength: number;
  openingLength: number;
  unrated?: boolean;
  unratedReason?: string;
  boundaryWarning?: 'fully-extended' | null;
  // ADR-033 Phase 0 — the stock record the deploy path would source for each
  // extension instance (one entry per element of `extensions`). Lets the deploy
  // path commit the BOM without re-deriving the pooling done below. Present only
  // when inventory was passed AND the combo uses extensions; absent in catalog mode.
  extensionSources?: { length: number; inventoryId: string }[];
}

function getLoadTable(system: System): readonly LoadRow[] {
  return system === 'LongShore' ? LONGSHORE_LOAD_TABLE : ACME_LOAD_TABLE;
}

export function getLoadCapacity(system: System, totalLengthIn: number, sfIndex: number): number {
  const table = getLoadTable(system);
  // Tables are non-empty frozen constants (asserted by tables.test.ts), so these
  // index reads are in-bounds; the assertions only satisfy noUncheckedIndexedAccess.
  const first = table[0]!;
  const last = table[table.length - 1]!;
  if (totalLengthIn <= first[0]) return first[sfIndex + 1]!;
  if (totalLengthIn >= last[0]) {
    if (totalLengthIn === last[0]) return last[sfIndex + 1]!;
    return 0;
  }
  let lower: LoadRow = first;
  let upper: LoadRow = table[1]!;
  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    if (totalLengthIn <= row[0]) {
      lower = table[i - 1]!;
      upper = row;
      break;
    }
  }
  if (lower[0] === upper[0]) return lower[sfIndex + 1]!;
  // Conservative floor: return the capacity of the longer (upper) row.
  // Euler buckling varies as 1/L² — linear interpolation overestimates capacity
  // between data points. The upper row is always the conservative choice.
  if (totalLengthIn === lower[0]) return lower[sfIndex + 1]!;
  return upper[sfIndex + 1]!;
}

/**
 * True if an inventory row is an extension that fits a strut of `system` at exactly
 * `length` inches: same system, or the LockStroke↔AcmeThread interchange. Shared by
 * the engine's availability gate + source pick below and the deploy BOM's per-member
 * re-resolution (core/shorepoint/bom.ts, #486) so the two can never disagree on
 * what counts as a matching extension. Availability is NOT checked here — each
 * caller applies its own ledger (pooled sum, greedy `taken`, or the BOM's `claimed`).
 */
export function extensionRowCompatible(row: InventoryItem, length: number, system: System): boolean {
  return (
    row.type === 'extension' &&
    row.length === length &&
    (row.system === system ||
      (system === 'LockStroke' && row.system === 'AcmeThread') ||
      (system === 'AcmeThread' && row.system === 'LockStroke'))
  );
}

export function findStrutCombinations(
  requiredLength: number,
  estimatedLoad: number,
  sfIndex: number,
  inventory?: StockRow[] | null,
  systemFilter?: System[] | null,
  deductions?: EngineDeductions | null,
): StrutCombination[] {
  // IP-011 (v3.11.2): defensive numeric coercion. estimatedLoad may arrive as
  // a string from a peer-write or stale-shape Firebase data; downstream code
  // does arithmetic and `.toLocaleString()` on it which fails silently or
  // throws on strings. Coerce once at the boundary so the rest of the function
  // can trust the type.
  estimatedLoad = Number(estimatedLoad) || 0;
  requiredLength = Number(requiredLength) || 0;
  // Apply deductions to get effective strut length needed. TWO lengths come out:
  //  - exactLength: the true post-deduction length, UNFLOORED — the capacity domain.
  //  - searchLength: exactLength floored to ⅛″ — the SELECTION + DISPLAY domain.
  // #300 (ADR-012): flooring is the safe side for picking/displaying the strut
  // (a short strut is taken up by the loading wedge; long is the hazard). But it
  // is ANTI-conservative for the capacity LOOKUP: table rows are whole inches, so a
  // true length just above a row (e.g. 60.1″ from a 3.4″ plate) floors onto the
  // lower row and reads its HIGHER capacity — defeating getLoadCapacity's own
  // conservative next-longer-row rule and over-reporting the safe load (the
  // 2026-07-02 audit finding; the v3 S2 cliff class). So capacity is always looked
  // up at exactLength; the floor never touches the capacity number.
  let exactLength = requiredLength;
  if (deductions) {
    const totalDed =
      (deductions.header || 0) + (deductions.sole || 0) + (deductions.topPlate || 0) + (deductions.bottomPlate || 0);
    exactLength = requiredLength - totalDed;
    if (Math.floor(exactLength * 8) / 8 <= 0) return [];
  }
  const searchLength = Math.floor(exactLength * 8) / 8;

  const results: StrutCombination[] = [];
  // v3 used a `useInventory` boolean; here `inv` (narrowed truthy) drives the same
  // branches and also satisfies strict-null narrowing in the extension check below.
  const inv = inventory ?? null;
  let strutCandidates: StrutCandidate[] = inv
    ? inv
        .filter((i) => i.type === 'strut' && i.available > 0)
        .map((i): StrutCandidate | null => {
          const ref = STRUTS.find((s) => s.model === i.model);
          return ref ? { ...ref, inventoryId: i.id, availableQty: i.available } : null;
        })
        .filter((x): x is StrutCandidate => x !== null)
    : STRUTS.map((s) => ({ ...s, inventoryId: null, availableQty: Infinity }));

  if (systemFilter && systemFilter.length > 0) {
    strutCandidates = strutCandidates.filter((s) => systemFilter.includes(s.system));
  }

  for (const strut of strutCandidates) {
    const exts =
      strut.system === 'LockStroke' && LOCKSTROKE_EXTENSIONS[strut.id]
        ? LOCKSTROKE_EXTENSIONS[strut.id]!
        : EXTENSIONS[strut.system] || [];
    const combos: Array<[number, number]> = [[0, 0]];
    for (let i = 0; i < exts.length; i++) {
      const ei = exts[i]!;
      combos.push([ei, 0]);
      for (let j = i; j < exts.length; j++) {
        combos.push([ei, exts[j]!]);
      }
    }

    for (const [e1, e2] of combos) {
      const extTotal = e1 + e2;
      const extCount = (e1 > 0 ? 1 : 0) + (e2 > 0 ? 1 : 0);
      if (extTotal > strut.extended) continue;

      // System-specific extension rules:
      // Gold/LongShore: max 1 extension of any length
      if (strut.system === 'LongShore' && extCount > 1) continue;
      // Grey/AcmeThread & LockStroke: max 2 extensions, total not exceeding 36"
      if ((strut.system === 'AcmeThread' || strut.system === 'LockStroke') && extTotal > 36) continue;

      const adjCollapsed = strut.collapsed + extTotal;
      const adjExtended = strut.extended + extTotal;
      if (searchLength < adjCollapsed || searchLength > adjExtended) continue;

      if (inv && extCount > 0) {
        const needed: Record<number, number> = {};
        if (e1 > 0) needed[e1] = (needed[e1] || 0) + 1;
        if (e2 > 0) needed[e2] = (needed[e2] || 0) + 1;
        let extAvailable = true;
        for (const [size, qty] of Object.entries(needed)) {
          // Sum availability across matching rows: two same-size extensions split
          // over two inventory records (each available:1) satisfy a qty-2 need.
          // Diverges from the verbatim v3 port (which required one row ≥ qty) — it
          // only ever WIDENS availability, never over-rates capacity (audit W8).
          const avail = inv
            .filter((i) => extensionRowCompatible(i, parseInt(size), strut.system))
            // #499 — a row's derived available is signed (negative = over-allocated); clamp at
            // 0 so an over-allocated row never subtracts from a sibling row's pool.
            .reduce((sum, i) => sum + Math.max(0, i.available), 0);
          if (avail < qty) {
            extAvailable = false;
            break;
          }
        }
        if (!extAvailable) continue;
      }

      // Capacity is looked up at the EXACT (unfloored) length — see the exactLength
      // comment above. getLoadCapacity already returns the conservative next-longer
      // row for a between-rows length, so the exact value is the safe one.
      const capacity = getLoadCapacity(strut.system, exactLength, sfIndex);

      // Detect "unrated zone": physically valid LongShore configuration but the requested
      // length is beyond Paratech's published working load chart (>192" / 16 ft).
      // Paratech doesn't publish capacity at these lengths, but the strut can physically
      // reach. We surface these combos as deployable WARNINGS so a team that has consulted
      // rescue engineering can still proceed if they accept responsibility. Uses exactLength
      // (the capacity domain), so a length fractionally past 192″ is caught, not floored in.
      const isUnratedZone = capacity <= 0 && strut.system === 'LongShore' && exactLength > 192;

      // Skip if capacity is zero for any other reason (truly out of range)
      if (capacity <= 0 && !isUnratedZone) continue;

      // #531: struts share the load equally and the 4:1 factor is already inside the rated
      // capacity, so the count is simply ceil(load / capacity) — no ceiling. A 5+ load is
      // an ordinary result (the card shows it as a "×N struts needed" tell); the per-strut
      // share check (one strut's share vs its rating) lives downstream in the reducer.
      let recommendedQty = 1;
      if (!isUnratedZone && estimatedLoad > 0 && capacity < estimatedLoad) {
        recommendedQty = Math.ceil(estimatedLoad / capacity);
      }

      const capacityAll = isUnratedZone
        ? [0, 0, 0]
        : [
            getLoadCapacity(strut.system, exactLength, 0),
            getLoadCapacity(strut.system, exactLength, 1),
            getLoadCapacity(strut.system, exactLength, 2),
          ];

      const totalCapacity = isUnratedZone ? 0 : capacity * recommendedQty;

      // F-4B-1 (v3.10.0): zero-margin warning at exact extension boundary.
      // When the effective length equals adjExtended (strut fully extended + max
      // extension), there's no room for the opening to grow at all — any
      // settling or shift puts the strut at risk. Fires regardless of load.
      const atExtendedBoundary = !isUnratedZone && Math.abs(searchLength - adjExtended) < 0.05;

      // ADR-033 Phase 0: surface the stock id the deploy path would source for
      // each extension instance. Greedy allocate a distinct row per instance so a
      // qty-2 need split over two `available:1` rows yields two ids, not one twice
      // (mirrors the W8 pooling that gated this combo above). Availability is
      // already guaranteed by that gate, so every instance resolves a row.
      let extensionSources: { length: number; inventoryId: string }[] | undefined;
      if (inv && extCount > 0) {
        const taken: Record<string, number> = {};
        extensionSources = [e1, e2]
          .filter((e) => e > 0)
          .map((size) => {
            const row = inv.find(
              (i) => extensionRowCompatible(i, size, strut.system) && i.available - (taken[i.id] || 0) > 0,
            );
            if (!row) return null;
            taken[row.id] = (taken[row.id] || 0) + 1;
            return { length: size, inventoryId: row.id };
          })
          .filter((s): s is { length: number; inventoryId: string } => s !== null);
      }

      results.push({
        strut,
        extensions: [e1, e2].filter((e) => e > 0),
        extensionSources,
        extTotal,
        adjCollapsed,
        adjExtended,
        capacity,
        capacityAll,
        margin: isUnratedZone ? 0 : estimatedLoad > 0 ? totalCapacity - estimatedLoad : capacity,
        componentCount: 1 + extCount,
        recommendedQty,
        totalCapacity,
        deductions: deductions || null,
        effectiveLength: searchLength,
        openingLength: requiredLength,
        unrated: isUnratedZone,
        unratedReason: isUnratedZone
          ? `LongShore is not rated by Paratech beyond 16 ft (192"). This configuration can physically reach the opening, but working load is unverified. Consult rescue engineering before proceeding.`
          : undefined,
        boundaryWarning: atExtendedBoundary ? 'fully-extended' : null,
      });
    }
  }

  results.sort((a, b) => {
    // Warnings (unrated) always sort to the top — they're not deployable options
    const aWarn = a.unrated ? 1 : 0;
    const bWarn = b.unrated ? 1 : 0;
    if (aWarn !== bWarn) return bWarn - aWarn;
    if (a.recommendedQty !== b.recommendedQty) return a.recommendedQty - b.recommendedQty;
    if (a.componentCount !== b.componentCount) return a.componentCount - b.componentCount;
    if (b.margin !== a.margin) return b.margin - a.margin;
    const aGold = a.strut.system === 'LongShore' ? 1 : 0;
    const bGold = b.strut.system === 'LongShore' ? 1 : 0;
    if (aGold !== bGold) return bGold - aGold;
    return a.strut.extended - b.strut.extended;
  });

  // Only show extension combos for a strut model if that strut can't reach on its own.
  // Warnings (unrated) are always kept — they're not redundant combos.
  const strutOnlyModels = new Set(
    results.filter((r) => !r.unrated && r.extensions.length === 0).map((r) => r.strut.model),
  );
  const filtered = results.filter(
    (r) => r.unrated || r.extensions.length === 0 || !strutOnlyModels.has(r.strut.model),
  );

  return filtered;
}

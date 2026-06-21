import type {
  Deductions,
  DeployedComponent,
  ShorePoint,
  ShorePointPatch,
  ShorePointStatus,
  ShoreTypeId,
  WoodSizeId,
  FieldShoreEvent,
  InventoryItem,
} from '../schema';
import {
  findStrutCombinations,
  woodHeight,
  plateHeight,
  WEDGE_DEDUCTION,
  type EngineDeductions,
  type StrutCombination,
} from '../load';
import { canTransition } from './status';

// Resolve the shore point's deduction SELECTIONS to exact catalog heights for the
// engine. L-2: the exact value is deducted; only the final effective length floors.
export function resolveDeductions(sp: ShorePoint): EngineDeductions {
  return {
    header: woodHeight(sp.deductions.headerWood),
    sole: woodHeight(sp.deductions.footerWood),
    topPlate: plateHeight(sp.deductions.topPlate),
    bottomPlate: plateHeight(sp.deductions.bottomPlate),
  };
}

// Matches Quick Find's default safety factor (4:1). Capacity is demoted on the
// card (ADR-012), but the engine still needs the index to compute it.
const SP_SAFETY_FACTOR_INDEX = 2;

/**
 * Run the selection engine for a shore point. Passes the RAW required length
 * (measurementEighths / 8 — exact, not pre-deducted, L-2); the engine deducts
 * once and floors the effective length to ⅛″. estimatedLoad is the point's
 * operator estimate (feeds the engine's capacity gating); absent = 0 (capacity
 * demoted, ADR-012).
 */
export function findForShorePoint(sp: ShorePoint, inventory?: InventoryItem[] | null): StrutCombination[] {
  const requiredLength = sp.measurementEighths / 8;
  return findStrutCombinations(
    requiredLength,
    sp.estimatedLoad ?? 0,
    SP_SAFETY_FACTOR_INDEX,
    inventory ?? null,
    null,
    resolveDeductions(sp),
  );
}

/**
 * Re-derive the engine's safety verdict for a shore point's deployed configuration
 * from the point's OWN persisted inputs (measurement, deductions, load) + the BOM's
 * strut model. The deploy UI gate (RecommendationCard) lives ABOVE the data/sync
 * seam, so the store re-checks here before committing a deploy that originated
 * off-UI — a peer device, a replay, or a future second entry point. The engine
 * stays the sole owner of the math (L-1/L-2); this only reads the flags it computes.
 *
 * `exceedsCapacity` is a per-point property (no ≤4-strut combo handles the load at
 * this length), so its presence means NO deploy here is safe. `unrated` is binary
 * per point+system — when the effective length is beyond LongShore's 16-ft chart,
 * EVERY LongShore combo is unrated — so matching the deployed strut's MODEL is
 * enough; the exact extension chosen never changes the verdict. Catalog mode (no
 * inventory) is the most permissive on load, so a verdict here is the conservative
 * one stock can only worsen.
 */
export function deployVerdict(sp: ShorePoint, bom: DeployedComponent[]): { exceedsCapacity: boolean; unrated: boolean } {
  const combos = findForShorePoint(sp, null);
  if (combos.some((c) => c.exceedsCapacity)) return { exceedsCapacity: true, unrated: false };
  const model = bom.find((c) => c.role === 'strut')?.model;
  return { exceedsCapacity: false, unrated: combos.some((c) => c.unrated && c.strut.model === model) };
}

/**
 * Total deduction (inches) — the EXACT sum of the four component heights (not
 * rounded; L-2). The card detail line (#248) displays it (rounded to ⅛″ at the
 * UI), and effectiveLengthFrom subtracts it before the single final floor.
 */
export function deductionTotalInches(deductions: Deductions): number {
  return (
    woodHeight(deductions.headerWood) +
    woodHeight(deductions.footerWood) +
    plateHeight(deductions.topPlate) +
    plateHeight(deductions.bottomPlate)
  );
}

/**
 * Effective strut length (inches) after deductions, floored to ⅛″ — for
 * display. Takes the raw selections so pre-SP UI (the deduction ledger in
 * Quick Find / Add Shore Point) computes with the SAME math as a saved point —
 * no UI-side constants ever (L-2).
 */
export function effectiveLengthFrom(measurementEighths: number, deductions: Deductions): number {
  return Math.floor((measurementEighths / 8 - deductionTotalInches(deductions)) * 8) / 8;
}

/** Effective strut length (inches) after deductions, floored to ⅛″ — for display. */
export function effectiveLengthInches(sp: ShorePoint): number {
  return effectiveLengthFrom(sp.measurementEighths, sp.deductions);
}

// Cut lumber is fixed by SHORE TYPE, not the operator's strut deduction (confirmed
// Alex 2026-06-21, #361): a T-Shore or Double-T always sits on 4×4 header+footer, a
// 3-Post on 6×6. Header and footer are the same size.
const CUT_LUMBER: Record<ShoreTypeId, WoodSizeId> = {
  't-shore': '4x4',
  'double-t': '4x4',
  '3-post': '6x6',
};

/**
 * Wood CUT length (inches), floored to ⅛″ — the length to cut the shore wood to.
 * A DISTINCT number from the strut effective length: it deducts the shore-type
 * standard header + footer (NOT the operator's strut selection) plus a flat
 * loading-wedge allowance, and NO plates (the cut wood replaces the strut+plates).
 * Cut short — the wedge takes up the slack; long is the hazard (#361).
 */
export function cutLengthInches(sp: ShorePoint): number {
  const lumber = woodHeight(CUT_LUMBER[sp.shoreType]);
  return Math.floor((sp.measurementEighths / 8 - 2 * lumber - WEDGE_DEDUCTION) * 8) / 8;
}

function applyPatch(sp: ShorePoint, patch: ShorePointPatch): ShorePoint {
  const next: ShorePoint = { ...sp };
  // building/area/label: `null` clears the field (the OperationEdited.location
  // convention), `undefined` = no change.
  // #220 field-lock: only label is editable once a point advances past Pending.
  if (patch.label !== undefined) {
    if (patch.label === null) delete next.label;
    else next.label = patch.label;
  }
  // Crew assignment is reassignable throughout the op (accountability, not a
  // lock) — applied before the Pending field-lock, alongside label.
  if (patch.assignedResource !== undefined) {
    if (patch.assignedResource === null) delete next.assignedResource;
    else next.assignedResource = patch.assignedResource;
  }
  // Mark Cut Done (#222) — a cutting-state toggle, not a Pending-locked field, so
  // it too applies before the early return. false clears the flag entirely.
  if (patch.cuttingDone !== undefined) {
    if (patch.cuttingDone) next.cuttingDone = true;
    else delete next.cuttingDone;
  }
  if (sp.status !== 'pending') return next;
  if (patch.division !== undefined) next.division = patch.division;
  if (patch.building !== undefined) {
    if (patch.building === null) delete next.building;
    else next.building = patch.building;
  }
  if (patch.area !== undefined) {
    if (patch.area === null) delete next.area;
    else next.area = patch.area;
  }
  if (patch.shoreType !== undefined) next.shoreType = patch.shoreType;
  if (patch.measurementEighths !== undefined) next.measurementEighths = patch.measurementEighths;
  if (patch.deductions !== undefined) next.deductions = patch.deductions;
  if (patch.estimatedLoad !== undefined) {
    if (patch.estimatedLoad === null) delete next.estimatedLoad;
    else next.estimatedLoad = patch.estimatedLoad;
  }
  return next;
}

/**
 * Cutting-queue bookkeeping that rides a status change (#222). Entering `cutting`
 * from `strutset` stamps the FIFO order; stepping back OUT of cutting (→ strutset)
 * clears the stamp AND the cut-done flag (the card leaves the queue). The
 * cutting↔runner edges preserve both — the saw already ran, a Send-to-Runner
 * step-back is "runner not ready," not "re-cut" (#223). Applied by BOTH the live
 * path (operation/reducer groupAdvance) and the single-member guard below, so the
 * two stay in lockstep (audit W9).
 */
export function applyCuttingFields(
  sp: ShorePoint,
  from: ShorePointStatus,
  to: ShorePointStatus,
  at: number,
): ShorePoint {
  if (to === 'cutting' && from === 'strutset') return { ...sp, cuttingStartedAt: at };
  if (to === 'strutset' && from === 'cutting') {
    const next = { ...sp };
    delete next.cuttingStartedAt;
    delete next.cuttingDone;
    return next;
  }
  return sp;
}

/**
 * Apply one SP-mutating event to a single shore point. Returns the next state,
 * or the SAME point unchanged if the event doesn't target it or is an illegal /
 * stale transition (the log is the source of truth; a bad event must never crash
 * projection). Operation-level events (Added/Deleted/Operation*) are no-ops here
 * — core/operation owns those.
 */
export function shorePointReducer(sp: ShorePoint, event: FieldShoreEvent): ShorePoint {
  switch (event.type) {
    case 'ShorePointEdited':
      if (event.spId !== sp.id) return sp;
      return applyPatch(sp, event.patch);

    case 'ShorePointStatusChanged': {
      // Off the live path: operationReducer routes status changes through
      // groupAdvance (operation/reducer.ts), never through here — so this branch
      // runs only in this reducer's own unit tests as a single-member guard spec.
      // Kept for that coverage; keep its guards in lockstep with groupAdvance's
      // if either changes (audit W9).
      if (event.spId !== sp.id) return sp;
      // The pending↔process boundary is owned by deploy/return, not this event.
      if (event.from === 'pending' || event.to === 'pending') return sp;
      if (sp.status !== event.from) return sp; // stale / out-of-order — skip (L-7)
      if (!canTransition(event.from, event.to)) return sp;
      return applyCuttingFields({ ...sp, status: event.to }, event.from, event.to, event.at);
    }

    case 'StrutDeployed':
      // LEGACY (ADR-033): project an old single-strut deploy into a one-element BOM
      // so every downstream reader works off deployedBom uniformly.
      if (event.spId !== sp.id) return sp;
      if (sp.status !== 'pending') return sp;
      return {
        ...sp,
        status: 'process',
        deployedBom: [
          {
            role: 'strut',
            model: event.deployedStrut.model,
            source: event.deployedStrut.source,
            inventoryId: event.deployedStrut.inventoryId,
          },
        ],
      };

    case 'EquipmentDeployed':
      if (event.spId !== sp.id) return sp;
      if (sp.status !== 'pending') return sp;
      return { ...sp, status: 'process', deployedBom: event.deployedBom };

    case 'StrutReturned':
    case 'EquipmentReturned': {
      if (event.spId !== sp.id) return sp;
      if (sp.status !== 'process') return sp;
      const next: ShorePoint = { ...sp, status: 'pending' };
      delete next.deployedBom;
      return next;
    }

    case 'EquipmentReclaimed': {
      // Terminal return (#224): secured → returned. KEEP deployedBom — the
      // returned card shows the equipment as history (unlike EquipmentReturned,
      // which clears it). The inventory restore is the store's transaction, not here.
      if (event.spId !== sp.id) return sp;
      if (sp.status !== 'secured') return sp;
      return { ...sp, status: 'returned' };
    }

    case 'ComponentResourced': {
      // ADR-033 — re-point one already-deployed component (decision 7). Status is
      // unchanged; only that BOM slot's source/inventoryId swap. The inventory
      // delta (restore old, consume new) is the store's transaction, not here.
      if (event.spId !== sp.id) return sp;
      if (!sp.deployedBom) return sp;
      if (sp.status === 'returned') return sp; // lockstep with the store's re-source guard
      const old = sp.deployedBom[event.componentIndex];
      if (!old) return sp;
      const updated: DeployedComponent = { ...old, source: event.source };
      if (event.inventoryId === undefined) delete updated.inventoryId;
      else updated.inventoryId = event.inventoryId;
      return {
        ...sp,
        deployedBom: sp.deployedBom.map((c, i) => (i === event.componentIndex ? updated : c)),
      };
    }

    default:
      return sp;
  }
}

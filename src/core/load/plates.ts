import type { WoodSizeId, ShoreTypeId } from '../schema';

// Connector plates, wood sizes, shore types. Ported VERBATIM from v3 app.js
// (lines 93-131). Base-plate base64 thumbnails are dropped (the picker renders
// from public/plates/*.jpg, placeholder swatches in the slice — L-9 carries the
// picker's iOS-hardened *behavior*, not the inline images).

export interface BasePlate {
  id: string;
  name: string;
  height: number; // inches, from O&M Manual Table 2-1
}

// Base plate heights from manufacturer O&M Manual Table 2-1 ("Base, End Plate &
// Fittings Increase in Overall Length"). Full table reconciled 2026-06-14; heights
// pinned in plates.test.ts (by stable id, against the manual's verbatim product
// names — the two metric channel bases were added and "Multi-Tip" corrected to the
// manual's "Multi-Base").
//
// DISPLAY NAME = dimension first, then type (Alex, 2026-06-15): `6" Swivel Base`,
// `4"x4" Channel Base`; an item with no dimension keeps its name alone (`V-Base`).
// The array is ordered None-first, then ALPHABETICALLY by that name (numeric-aware,
// so 6" sorts before 12") — VisualGridPicker renders in array order, so THIS list is
// the picker's listing order. plates.test.ts guards both the heights and the order.
export const BASE_PLATES: readonly BasePlate[] = [
  { id: 'none', name: 'None', height: 0 },
  { id: 'angle3x4', name: '3"x4" Angle Base', height: 3.4 },
  { id: 'chainwedge', name: '3/8" Chain Wedge', height: 4.0 },
  { id: 'channelmetric4x6', name: '4.3"x6" Channel Base Metric', height: 3.4 },
  { id: 'rubber4', name: '4" Rubber Base', height: 2.8 },
  { id: 'channel4x4', name: '4"x4" Channel Base', height: 3.4 },
  { id: 'channelmetric6x7', name: '6.3"x7" Channel Base Metric', height: 4.2 },
  { id: 'hinged6', name: '6" Hinged Base', height: 3.2 },
  { id: 'hinged6ring', name: '6" Hinged Base w/Anchor Ring', height: 3.2 },
  { id: 'rigid6', name: '6" Rigid Base', height: 1.0 },
  { id: 'swivel6', name: '6" Swivel Base', height: 1.8 },
  { id: 'channel6x6', name: '6"x6" Channel Base', height: 3.4 },
  { id: 'hinged12', name: '12" Hinged Base', height: 3.4 },
  { id: 'hinged12ring', name: '12" Hinged Base w/Anchor Ring', height: 3.4 },
  { id: 'rigid12', name: '12" Rigid Base', height: 1.2 },
  { id: 'swivel12', name: '12" Swivel Base', height: 2.3 },
  { id: 'base45', name: '45° Base', height: 5.4 },
  { id: 'threadedconn', name: 'Adjustable Threaded Connector', height: 3.5 },
  { id: 'rubberangle', name: 'Angled Rubber Base (ESU)', height: 2.7 },
  { id: 'contour', name: 'Contour Base', height: 1.7 },
  { id: 'elevatorsupport', name: 'Elevator Support L&R Arm', height: 6.0 },
  { id: 'multi', name: 'Multi-Base', height: 4.2 },
  { id: 'offsetcone', name: 'Offset Cone Base', height: 2.6 },
  { id: 'springloaded', name: 'Spring Loaded Connector', height: 3.9 },
  { id: 'vbase', name: 'V-Base', height: 1.9 },
];

export interface WoodSize {
  id: WoodSizeId;
  name: string;
  height: number;
}

export const WOOD_SIZES: readonly WoodSize[] = [
  { id: 'none', name: 'None', height: 0 },
  { id: '4x4', name: '4×4 (3.5")', height: 3.5 },
  { id: '6x6', name: '6×6 (5.5")', height: 5.5 },
];

export interface ShoreTypeDef {
  id: ShoreTypeId;
  name: string;
  /** Struts in ONE physical shore (KB-7, v4-new — not in the v3 catalog): the
   *  Add form's quantity means shores; cards created = shores × strutsPerShore. */
  strutsPerShore: 1 | 2 | 3;
}

// 3-Post wood auto-fill lives in AddShorePointModal (THREE_POST_WOOD), the one
// type that auto-fills — catalog defaultHeader/defaultFooter/desc fields removed
// as dead (audit W10): nothing read them, and per-type defaults here would re-fill
// T-Shore/Double-T, the v3.9.1 regression.
export const SHORE_TYPES: readonly ShoreTypeDef[] = [
  { id: 't-shore', name: 'Vertical T-Shore', strutsPerShore: 1 },
  { id: 'double-t', name: 'Double-T Vertical Shore', strutsPerShore: 2 },
  { id: '3-post', name: '3-Post Vertical Shore', strutsPerShore: 3 },
];

export const WEDGE_DEDUCTION = 1.5; // inches for loading wedges

// ---- Pure lookup helpers (exact catalog heights — L-2 deducts the exact value) ----
/**
 * The catalog height for a plate id, or 0 for an id this build doesn't know (#457).
 *
 * The 0 fallback is DELIBERATE and stays: a plate id arrives from a peer device that
 * may run a newer catalog, and the deduction math must not crash or refuse to project
 * a legally-schema'd event. What it must NOT do is pass silently — an unknown id
 * contributes 0″ and quietly under-deducts. Callers that state a SAFETY VERDICT check
 * `isKnownPlateId` first and degrade to "unknown" rather than assert a pass.
 */
export function plateHeight(id: string): number {
  return BASE_PLATES.find((p) => p.id === id)?.height ?? 0;
}

/** Whether this build's catalog knows the plate id — the honesty check for
 *  plateHeight's 0 fallback (#457). 'none' is a real catalog entry (height 0). */
export function isKnownPlateId(id: string): boolean {
  return BASE_PLATES.some((p) => p.id === id);
}

export function woodHeight(id: WoodSizeId): number {
  return WOOD_SIZES.find((w) => w.id === id)?.height ?? 0;
}

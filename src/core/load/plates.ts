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

// Base plate heights from manufacturer O&M Manual Table 2-1
export const BASE_PLATES: readonly BasePlate[] = [
  { id: 'none', name: 'None', height: 0 },
  { id: 'rigid6', name: 'Rigid Base 6"', height: 1.0 },
  { id: 'swivel6', name: 'Swivel Base 6"', height: 1.8 },
  { id: 'hinged6', name: 'Hinged Base 6"', height: 3.2 },
  { id: 'hinged6ring', name: 'Hinged Base 6" w/Anchor Ring', height: 3.2 },
  { id: 'multi', name: 'Multi-Tip', height: 4.2 },
  { id: 'chainwedge', name: 'Chain Wedge 3/8"', height: 4.0 },
  { id: 'vbase', name: 'V-Base', height: 1.9 },
  { id: 'contour', name: 'Contour Base', height: 1.7 },
  { id: 'offsetcone', name: 'Offset Cone Base', height: 2.6 },
  { id: 'rubber4', name: 'Rubber Base 4"', height: 2.8 },
  { id: 'rigid12', name: 'Rigid Base 12"', height: 1.2 },
  { id: 'swivel12', name: 'Swivel Base 12"', height: 2.3 },
  { id: 'hinged12', name: 'Hinged Base 12"', height: 3.4 },
  { id: 'hinged12ring', name: 'Hinged Base 12" w/Anchor Ring', height: 3.4 },
  { id: 'angle3x4', name: 'Angle Base 3"x4"', height: 3.4 },
  { id: 'base45', name: '45° Base', height: 5.4 },
  { id: 'channel4x4', name: 'Channel Base 4"x4"', height: 3.4 },
  { id: 'channel6x6', name: 'Channel Base 6"x6"', height: 3.4 },
  { id: 'rubberangle', name: 'Angled Rubber Base (ESU)', height: 2.7 },
  { id: 'elevatorsupport', name: 'Elevator Support L&R Arm', height: 6.0 },
  { id: 'springloaded', name: 'Spring Loaded Connector', height: 3.9 },
  { id: 'threadedconn', name: 'Adjustable Threaded Connector', height: 3.5 },
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
  desc: string;
  defaultHeader: WoodSizeId;
  defaultFooter: WoodSizeId;
  /** Struts in ONE physical shore (KB-7, v4-new — not in the v3 catalog): the
   *  Add form's quantity means shores; cards created = shores × strutsPerShore. */
  strutsPerShore: 1 | 2 | 3;
}

export const SHORE_TYPES: readonly ShoreTypeDef[] = [
  { id: 't-shore', name: 'Vertical T-Shore', desc: 'Single strut with header and footer', defaultHeader: '4x4', defaultFooter: '4x4', strutsPerShore: 1 },
  { id: 'double-t', name: 'Double-T Vertical Shore', desc: 'Two struts with shared header', defaultHeader: '4x4', defaultFooter: '4x4', strutsPerShore: 2 },
  { id: '3-post', name: '3-Post Vertical Shore', desc: 'Three struts with 6×6 header and footer', defaultHeader: '6x6', defaultFooter: '6x6', strutsPerShore: 3 },
];

export const WEDGE_DEDUCTION = 1.5; // inches for loading wedges

// ---- Pure lookup helpers (exact catalog heights — L-2 deducts the exact value) ----
export function plateHeight(id: string): number {
  return BASE_PLATES.find((p) => p.id === id)?.height ?? 0;
}

export function woodHeight(id: WoodSizeId): number {
  return WOOD_SIZES.find((w) => w.id === id)?.height ?? 0;
}

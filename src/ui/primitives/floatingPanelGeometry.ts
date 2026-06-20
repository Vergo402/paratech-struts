// FloatingPanel geometry — pure helpers for the draggable companion panel
// (floating-panel.md / ADR-037). Kept out of the component so the clamp math is
// unit-testable without a DOM (jsdom has no layout geometry).

export interface Size {
  w: number;
  h: number;
}
export interface Pos {
  x: number;
  y: number;
}

/**
 * Keep a panel fully inside its stage. x stays in [0, stageW − panelW], y in
 * [0, stageH − panelH]; a panel larger than the stage pins to the top-left
 * (Math.max(0, …) floor) rather than drifting off the negative edge. Negative
 * inputs floor to 0. Pure — the drag handler and the resize re-clamp both call it.
 */
export function clampPanelPosition(pos: Pos, panel: Size, stage: Size): Pos {
  const maxX = Math.max(0, stage.w - panel.w);
  const maxY = Math.max(0, stage.h - panel.h);
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}

// Click-to-front z-order: a monotonic counter so last-touched wins without
// pairwise comparison. Base 200 sits above the board, clear of scrim (290),
// modal/sheet/phone-drawer (300), and the picker overlay (400) tiers.
let zSeq = 200;

/** Next z for a panel raised to the front (pointerdown / focus-in). */
export function nextZ(): number {
  return ++zSeq;
}

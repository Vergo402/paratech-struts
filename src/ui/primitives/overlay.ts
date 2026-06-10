/**
 * One-PEER-overlay-at-a-time (modal.md / sheet.md: "one at a time, never
 * stacked") with parent→child nesting. Opening an overlay closes every
 * unrelated overlay — the v3 plate-picker's "close others first" behavior,
 * made structural. But an overlay opened from INSIDE the current overlay
 * (its opener sits in that overlay's container) is a CHILD and stacks on
 * top of its parent: the #220 Add Shore Point form modal hosts the division
 * sheet and the plate-grid pickers, exactly like v3's plate-picker-inside-
 * the-SP-modal. Closing the child returns the claim to the parent.
 * Overlays claim on open and release on close; StrictMode's double-mount is
 * safe because effect cleanup releases.
 */
type CloseFn = () => void;

export interface OverlayClaimOptions {
  /** The overlay's content element (lazy — read when a later claim tests nesting). */
  container?: () => Element | null;
  /** The element that opened this overlay (its trigger) — how nesting is detected. */
  opener?: Element | null;
}

interface OverlayEntry {
  close: CloseFn;
  container: (() => Element | null) | undefined;
}

const stack: OverlayEntry[] = [];

export function claimOverlay(close: CloseFn, opts?: OverlayClaimOptions): void {
  // Re-claim by the same overlay: drop the old entry, re-evaluate position.
  const existing = stack.findIndex((e) => e.close === close);
  if (existing >= 0) stack.splice(existing, 1);

  const opener = opts?.opener ?? null;
  // Close peers/unrelated overlays top-down; stop at an ancestor — an overlay
  // whose container holds the new overlay's opener. Ancestors stay mounted.
  while (stack.length > 0) {
    const top = stack[stack.length - 1]!;
    const el = top.container?.() ?? null;
    if (el && opener && el.contains(opener)) break;
    stack.pop();
    top.close();
  }
  stack.push({ close, container: opts?.container });
}

export function releaseOverlay(close: CloseFn): void {
  const i = stack.findIndex((e) => e.close === close);
  if (i >= 0) stack.splice(i, 1);
}

/** Test seam — true when some overlay holds a claim. */
export function hasOverlayClaim(): boolean {
  return stack.length > 0;
}

/**
 * True when this close holds the TOPMOST claim. A parent overlay uses this to
 * ignore Esc meant for the child stacked above it (the child closes itself).
 */
export function isTopOverlay(close: CloseFn): boolean {
  return stack.length > 0 && stack[stack.length - 1]!.close === close;
}

/**
 * True when the target sits inside any claimed overlay's container. A parent
 * overlay uses this so a tap inside a portaled child (e.g. the plate grid)
 * never reads as an outside-dismiss.
 */
export function overlayContains(target: Node | null): boolean {
  if (!target) return false;
  return stack.some((e) => {
    const el = e.container?.();
    return !!el && el.contains(target);
  });
}

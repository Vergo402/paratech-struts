/**
 * One-overlay-at-a-time (modal.md / sheet.md: "one at a time, never stacked").
 * A module-level claim: opening any overlay closes whatever currently holds
 * the claim — which is also the v3 plate-picker's "close others first"
 * behavior, made structural. Overlays claim on open and release on close;
 * StrictMode's double-mount is safe because effect cleanup releases.
 */
type CloseFn = () => void;

let current: CloseFn | null = null;

export function claimOverlay(close: CloseFn): void {
  if (current && current !== close) current();
  current = close;
}

export function releaseOverlay(close: CloseFn): void {
  if (current === close) current = null;
}

/** Test seam — true when some overlay holds the claim. */
export function hasOverlayClaim(): boolean {
  return current !== null;
}

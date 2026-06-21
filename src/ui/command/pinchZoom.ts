// Pinch-zoom transform math for the full-screen org chart (#…). transform-origin is
// the top-left (0,0): a content point p maps to screen as (x,y) + scale·p, so a focal
// point stays visually fixed across a zoom when x,y shift by the scale delta. Kept
// pure + tested here; the Pointer-Event plumbing lives in OrgFullScreen.

export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 4;
export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/**
 * Multiply the current scale by `factor`, keeping the focal point (fx,fy in
 * viewport pixels) visually fixed. Clamp-aware: the effective factor uses the
 * post-clamp scale, so the focal point never drifts once a zoom limit is hit.
 */
export function zoomAt(t: Transform, factor: number, fx: number, fy: number): Transform {
  const scale = clampScale(t.scale * factor);
  const k = scale / t.scale; // effective factor after clamping
  return { scale, x: fx - k * (fx - t.x), y: fy - k * (fy - t.y) };
}

/** Translate by a screen-space delta (one- or two-finger panning). */
export function panBy(t: Transform, dx: number, dy: number): Transform {
  return { scale: t.scale, x: t.x + dx, y: t.y + dy };
}

/**
 * Opening fit: scale a content box (cw×ch) to sit within the viewport (vw×vh),
 * centered. Never upscales past 1 — a small chart shouldn't be blown up on open.
 */
export function fitTransform(cw: number, ch: number, vw: number, vh: number): Transform {
  if (cw <= 0 || ch <= 0) return IDENTITY;
  const scale = Math.min(1, vw / cw, vh / ch);
  return { scale, x: (vw - cw * scale) / 2, y: (vh - ch * scale) / 2 };
}

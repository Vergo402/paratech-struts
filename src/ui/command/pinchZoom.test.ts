import { describe, it, expect } from 'vitest';
import { zoomAt, panBy, clampScale, fitTransform, IDENTITY, MIN_SCALE, MAX_SCALE } from './pinchZoom';

describe('pinchZoom', () => {
  it('keeps the focal point fixed across a zoom', () => {
    const t = zoomAt(IDENTITY, 2, 100, 50);
    expect(t.scale).toBe(2);
    // the content point under the fingers must still map to the same screen pixel
    expect(t.x + t.scale * 100).toBeCloseTo(100);
    expect(t.y + t.scale * 50).toBeCloseTo(50);
  });

  it('clamps scale and holds the focal point at the limit (no drift)', () => {
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    const t = zoomAt({ scale: MAX_SCALE, x: 30, y: 0 }, 2, 100, 50);
    expect(t.scale).toBe(MAX_SCALE); // already maxed → no further zoom
    expect(t.x).toBe(30); // k=1 → no translation drift
  });

  it('fits content within the viewport, centered, never upscaling', () => {
    const wide = fitTransform(400, 200, 200, 200); // width-bound
    expect(wide.scale).toBe(0.5);
    expect(wide.x).toBeCloseTo(0);
    expect(wide.y).toBeCloseTo(50);
    expect(fitTransform(100, 100, 400, 400).scale).toBe(1); // small chart not blown up
    expect(fitTransform(0, 0, 400, 400)).toEqual(IDENTITY); // empty/unmeasured
  });

  it('pans by a screen delta', () => {
    expect(panBy({ scale: 2, x: 10, y: 5 }, 3, -4)).toEqual({ scale: 2, x: 13, y: 1 });
  });
});

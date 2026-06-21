import { describe, it, expect } from 'vitest';
import { edgeStep } from './useOrgDragDrop';

// Scroller edge range [100, 900], band = 56px, max speed = 18px/frame.
describe('edgeStep — drag edge auto-pan ramp', () => {
  it('is zero when the pointer is clear of either band', () => {
    expect(edgeStep(500, 100, 900)).toBe(0);
    expect(edgeStep(100 + 56, 100, 900)).toBe(0); // inner lip is exclusive
    expect(edgeStep(900 - 56, 100, 900)).toBe(0);
  });
  it('pans left (negative) near/past the left edge, clamped at the edge', () => {
    expect(edgeStep(100, 100, 900)).toBe(-18); // at the edge → full speed
    expect(edgeStep(50, 100, 900)).toBe(-18); //  past the edge → still clamped
    expect(edgeStep(128, 100, 900)).toBe(-9); //  halfway into the band → half speed
  });
  it('pans right (positive) near/past the right edge, clamped at the edge', () => {
    expect(edgeStep(900, 100, 900)).toBe(18);
    expect(edgeStep(950, 100, 900)).toBe(18);
    expect(edgeStep(872, 100, 900)).toBe(9);
  });
});

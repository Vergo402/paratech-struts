import { describe, it, expect } from 'vitest';
import { clampPanelPosition, nextZ } from './floatingPanelGeometry';

const PANEL = { w: 400, h: 300 };
const STAGE = { w: 1000, h: 700 };

describe('clampPanelPosition', () => {
  it('leaves an in-bounds position untouched', () => {
    expect(clampPanelPosition({ x: 120, y: 80 }, PANEL, STAGE)).toEqual({ x: 120, y: 80 });
  });

  it('clamps past the right edge to stageW − panelW', () => {
    expect(clampPanelPosition({ x: 5000, y: 50 }, PANEL, STAGE)).toEqual({ x: 600, y: 50 });
  });

  it('clamps past the bottom edge to stageH − panelH', () => {
    expect(clampPanelPosition({ x: 50, y: 5000 }, PANEL, STAGE)).toEqual({ x: 50, y: 400 });
  });

  it('floors negative inputs to 0', () => {
    expect(clampPanelPosition({ x: -200, y: -50 }, PANEL, STAGE)).toEqual({ x: 0, y: 0 });
  });

  it('pins a panel larger than the stage to the top-left', () => {
    expect(clampPanelPosition({ x: 300, y: 300 }, { w: 1200, h: 900 }, STAGE)).toEqual({ x: 0, y: 0 });
  });
});

describe('nextZ', () => {
  it('increases monotonically so the last-raised panel wins', () => {
    const a = nextZ();
    const b = nextZ();
    expect(b).toBeGreaterThan(a);
  });
});

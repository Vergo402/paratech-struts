import { describe, expect, it } from 'vitest';
import { BASE_PLATES, plateHeight } from './plates';

// Paratech O&M Manual Table 2-1 — "Base, End Plate & Fittings Increase in Overall
// Length." Transcribed verbatim from the manual (pages 2-2/2-3) and reconciled
// 2026-06-14. This is the authoritative source; the catalog must match it exactly.
// Heights feed L-2 deduction math, so a drift here mis-sizes a strut in the field.
const TABLE_2_1: Record<string, number> = {
  'Rigid Base 6"': 1.0,
  'Swivel Base 6"': 1.8,
  'Hinged Base 6"': 3.2,
  'Hinged Base 6" w/Anchor Ring': 3.2,
  'Multi-Base': 4.2,
  'Chain Wedge 3/8"': 4.0,
  'V-Base': 1.9,
  'Contour Base': 1.7,
  'Offset Cone Base': 2.6,
  'Rubber Base 4"': 2.8,
  'Rigid Base 12"': 1.2,
  'Swivel Base 12"': 2.3,
  'Hinged Base 12"': 3.4,
  'Hinged Base 12" w/Anchor Ring': 3.4,
  'Angle Base 3"x4"': 3.4,
  '45° Base': 5.4,
  'Channel Base 4"x4"': 3.4,
  'Channel Base 6"x6"': 3.4,
  'Channel Base Metric 4.3"x6"': 3.4,
  'Channel Base Metric 6.3"x7"': 4.2,
  'Angled Rubber Base (ESU)': 2.7,
  'Elevator Support L&R Arm': 6.0,
  'Spring Loaded Connector': 3.9,
  'Adjustable Threaded Connector': 3.5,
};

describe('BASE_PLATES matches Paratech O&M Table 2-1', () => {
  it('every catalog plate (except None) has the manual height to the exact figure', () => {
    for (const p of BASE_PLATES) {
      if (p.id === 'none') continue;
      expect(TABLE_2_1, `${p.name} is in Table 2-1`).toHaveProperty(p.name);
      expect(p.height, `${p.name} height`).toBe(TABLE_2_1[p.name]);
    }
  });

  it('carries every Table 2-1 entry — no manual product is missing', () => {
    const names = new Set(BASE_PLATES.map((p) => p.name));
    for (const name of Object.keys(TABLE_2_1)) {
      expect(names.has(name), `catalog includes "${name}"`).toBe(true);
    }
  });

  it('keeps None as the zero-deduction default', () => {
    expect(plateHeight('none')).toBe(0);
  });

  it('has no duplicate ids', () => {
    const ids = BASE_PLATES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

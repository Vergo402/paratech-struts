import { describe, expect, it } from 'vitest';
import { BASE_PLATES, plateHeight } from './plates';

// Paratech O&M Manual Table 2-1 — "Base, End Plate & Fittings Increase in Overall
// Length." Heights transcribed verbatim from the manual (pages 2-2/2-3), reconciled
// 2026-06-14. This is the authoritative source; catalog heights must match it exactly
// — heights feed L-2 deduction math, so a drift here mis-sizes a strut in the field.
//
// Keyed by the STABLE catalog id, with the manual's verbatim product name kept as the
// `manual` provenance anchor. The catalog's DISPLAY `name` is dimension-first and
// alphabetical for the picker (Alex, 2026-06-15 — e.g. `6" Swivel Base`), a listing
// choice that may be reworded; pinning the height by id means a display rename can
// never silently move a height.
const TABLE_2_1: Record<string, { manual: string; height: number }> = {
  rigid6: { manual: 'Rigid Base 6"', height: 1.0 },
  swivel6: { manual: 'Swivel Base 6"', height: 1.8 },
  hinged6: { manual: 'Hinged Base 6"', height: 3.2 },
  hinged6ring: { manual: 'Hinged Base 6" w/Anchor Ring', height: 3.2 },
  multi: { manual: 'Multi-Base', height: 4.2 },
  chainwedge: { manual: 'Chain Wedge 3/8"', height: 4.0 },
  vbase: { manual: 'V-Base', height: 1.9 },
  contour: { manual: 'Contour Base', height: 1.7 },
  offsetcone: { manual: 'Offset Cone Base', height: 2.6 },
  rubber4: { manual: 'Rubber Base 4"', height: 2.8 },
  rigid12: { manual: 'Rigid Base 12"', height: 1.2 },
  swivel12: { manual: 'Swivel Base 12"', height: 2.3 },
  hinged12: { manual: 'Hinged Base 12"', height: 3.4 },
  hinged12ring: { manual: 'Hinged Base 12" w/Anchor Ring', height: 3.4 },
  angle3x4: { manual: 'Angle Base 3"x4"', height: 3.4 },
  base45: { manual: '45° Base', height: 5.4 },
  channel4x4: { manual: 'Channel Base 4"x4"', height: 3.4 },
  channel6x6: { manual: 'Channel Base 6"x6"', height: 3.4 },
  channelmetric4x6: { manual: 'Channel Base Metric 4.3"x6"', height: 3.4 },
  channelmetric6x7: { manual: 'Channel Base Metric 6.3"x7"', height: 4.2 },
  rubberangle: { manual: 'Angled Rubber Base (ESU)', height: 2.7 },
  elevatorsupport: { manual: 'Elevator Support L&R Arm', height: 6.0 },
  springloaded: { manual: 'Spring Loaded Connector', height: 3.9 },
  threadedconn: { manual: 'Adjustable Threaded Connector', height: 3.5 },
};

describe('BASE_PLATES matches Paratech O&M Table 2-1', () => {
  it('every catalog plate (except None) has the manual height to the exact figure', () => {
    for (const p of BASE_PLATES) {
      if (p.id === 'none') continue;
      expect(TABLE_2_1, `${p.id} is in Table 2-1`).toHaveProperty(p.id);
      expect(p.height, `${p.id} (${TABLE_2_1[p.id]?.manual}) height`).toBe(TABLE_2_1[p.id]!.height);
    }
  });

  it('carries every Table 2-1 entry — no manual product is missing', () => {
    const ids = new Set(BASE_PLATES.map((p) => p.id));
    for (const id of Object.keys(TABLE_2_1)) {
      expect(ids.has(id), `catalog includes ${id} (${TABLE_2_1[id]!.manual})`).toBe(true);
    }
  });

  it('keeps None as the zero-deduction default, listed first', () => {
    expect(plateHeight('none')).toBe(0);
    expect(BASE_PLATES[0]!.id).toBe('none');
  });

  it('lists plates alphabetically after None (dimension-first names, numeric-aware)', () => {
    const rest = BASE_PLATES.slice(1).map((p) => p.name);
    const sorted = [...rest].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    expect(rest).toEqual(sorted);
  });

  it('has no duplicate ids', () => {
    const ids = BASE_PLATES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

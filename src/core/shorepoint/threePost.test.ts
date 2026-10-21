import { describe, expect, it } from 'vitest';
import { THREE_POST_WOOD, findStrutCombinations, type StrutCombination } from '../load';
import type { Deductions, StockRow } from '../schema';
import { conversionDeductions, recheckThreePost } from './threePost';

// The one-tap "Add N more struts — deploy as 3-Post" re-check (Alex 2026-10-20).
// Real-engine fixtures: every combo is what the engine returns at the shore's CURRENT
// wood, so the re-check is pinned against the same math the card and store run.

const FOUR: Deductions = { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' };
const SIX: Deductions = { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' };
const ENGINE_FOUR = { header: 3.5, sole: 3.5 };

const strutRow = (model: string, system: StockRow['system']): StockRow => ({
  id: `inv-${model}`,
  type: 'strut',
  model,
  system,
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 4,
  held: 0,
  available: 4,
});
const extRow = (length: number): StockRow => ({
  id: `inv-ext-${length}`,
  type: 'extension',
  system: 'LongShore',
  length,
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 4,
  held: 0,
  available: 4,
});
const INV: StockRow[] = [strutRow('LS 304', 'LongShore'), strutRow('LS 203', 'LongShore'), extRow(12), extRow(24)];

/** The engine's combo for `model` (+ exact extension set) at `opening` on 4×4 wood. */
function comboAt(opening: number, load: number, model: string, extensions: number[] = []): StrutCombination {
  const c = findStrutCombinations(opening, load, 2, INV, null, ENGINE_FOUR).find(
    (x) => x.strut.model === model && x.extensions.join('+') === extensions.join('+'),
  );
  if (!c) throw new Error(`fixture: no ${model} + [${extensions}] at ${opening}″`);
  return c;
}

describe('conversionDeductions — the wood a one-tap conversion builds on', () => {
  it('a 3-Post takes THREE_POST_WOOD for header + footer and keeps the plates', () => {
    const d: Deductions = { ...FOUR, topPlate: 'swivel6', bottomPlate: 'rigid12' };
    expect(conversionDeductions('3-post', d)).toEqual({ ...d, ...THREE_POST_WOOD });
    expect(THREE_POST_WOOD).toEqual({ headerWood: '6x6', footerWood: '6x6' });
  });

  it('a Double-T / T-Shore keeps the shore’s own wood (explicit-choice doctrine, v3.9.1)', () => {
    expect(conversionDeductions('double-t', FOUR)).toBe(FOUR);
    expect(conversionDeductions('t-shore', FOUR)).toBe(FOUR);
  });
});

describe('recheckThreePost', () => {
  it('48″ T-Shore on 4×4 @ 50,000 lb → LS 304 fits a 6×6 3-Post: strut 37″, cut 35½″', () => {
    const combo = comboAt(48, 50000, 'LS 304');
    expect(combo.effectiveLength).toBe(41);
    expect(combo.capacity).toBe(22000); // ceil(50,000 / 22,000) = 3 → 3-Post
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r.fits).toBe(true);
    if (!r.fits) return;
    expect(r.strutLength).toBe(37);
    expect(r.cutLength).toBe(35.5);
    expect(r.woodChanged).toBe(true);
    expect(r.deductions).toEqual(SIX);
    // The checked combo is the 6×6 geometry, still bound to the card's stock row.
    expect(r.combo.effectiveLength).toBe(37);
    expect(r.combo.strut).toBe(combo.strut);
    expect(r.combo.strut.inventoryId).toBe('inv-LS 304');
    expect(r.combo.extensions).toEqual([]);
  });

  it('46″ → 35″ on 6×6 is under LS 304’s 36″ minimum: locked, too short', () => {
    const combo = comboAt(46, 50000, 'LS 304');
    expect(combo.effectiveLength).toBe(39);
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r).toEqual({ fits: false, reason: 'too-short', strutLength: 35, limit: 36, ofAssembly: false });
  });

  it('already 6×6/6×6 → the card’s own combo, nothing about the build changes', () => {
    const combo = findStrutCombinations(48, 50000, 2, INV, null, { header: 5.5, sole: 5.5 }).find(
      (x) => x.strut.model === 'LS 304',
    )!;
    const r = recheckThreePost(combo, SIX, 50000, 3);
    expect(r).toMatchObject({ fits: true, woodChanged: false, strutLength: 37, cutLength: 35.5 });
    if (r.fits) expect(r.combo).toBe(combo);
  });

  it('an extension the 6×6 length no longer needs is dropped (engine’s combo for the same strut)', () => {
    // 59″ − 7 = 52″: LS 304 alone tops out at 50″ → + 12″ (48–62). On 6×6: 48″ → bare LS 304.
    const combo = comboAt(59, 50000, 'LS 304', [12]);
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r.fits).toBe(true);
    if (!r.fits) return;
    expect(r.combo.extensions).toEqual([]);
    expect(r.combo.strut.inventoryId).toBe('inv-LS 304');
    expect(r.strutLength).toBe(48);
  });

  it('a changed extension set re-derives at 6×6 and drops the old extension sources', () => {
    // 69″ − 7 = 62″: LS 304 + 24″ (60–74). On 6×6: 58″ — below +24″, inside +12″ (48–62).
    const combo = comboAt(69, 50000, 'LS 304', [24]);
    expect(combo.extensionSources).toEqual([{ length: 24, inventoryId: 'inv-ext-24' }]);
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r.fits).toBe(true);
    if (!r.fits) return;
    expect(r.combo.extensions).toEqual([12]);
    // Re-resolved against live stock by assembleBom — never the stale 24″ row.
    expect(r.combo.extensionSources).toBeUndefined();
    expect(r.combo.strut.inventoryId).toBe('inv-LS 304');
  });

  it('the same extension set still spanning 6×6 keeps its stock sources', () => {
    // 75″ − 7 = 68″: LS 304 + 24″ (60–74). On 6×6: 64″ — still inside + 24″.
    const combo = comboAt(75, 50000, 'LS 304', [24]);
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r.fits).toBe(true);
    if (!r.fits) return;
    expect(r.combo.extensions).toEqual([24]);
    expect(r.combo.extensionSources).toEqual(combo.extensionSources);
  });

  it('a length in the gap between a strut’s reaches names the card’s assembly minimum', () => {
    // 48″ − 7 = 41″: LS 203 + 12″ (38–48). On 6×6: 37″ — past bare LS 203 (26–36), short of + 12″.
    const combo = comboAt(48, 50000, 'LS 203', [12]);
    const r = recheckThreePost(combo, FOUR, 50000, 3);
    expect(r).toEqual({ fits: false, reason: 'too-short', strutLength: 37, limit: 38, ofAssembly: true });
  });

  it('a load the 3-Post cannot carry at the 6×6 rating locks with the capacity verdict', () => {
    // 90,000 lb over 3 struts = 30,000 each > LS 304’s 22,000 lb rating.
    const combo = comboAt(48, 90000, 'LS 304');
    const r = recheckThreePost(combo, FOUR, 90000, 3);
    expect(r).toEqual({ fits: false, reason: 'capacity', strutLength: 37, perStrut: 30000, capacity: 22000 });
  });
});

describe('recheckThreePost — the 6×6 extension set must be on scene (review fix 2026-10-21)', () => {
  // 69″ − 7 = 62″: LS 304 + 24″. On 6×6: 58″ → needs the 12″ extension instead.
  const combo = () => comboAt(69, 50000, 'LS 304', [24]);

  it('no 12″ extension on scene → locked, extension-missing with the set it needs', () => {
    const noTwelve = [strutRow('LS 304', 'LongShore'), extRow(24)];
    expect(recheckThreePost(combo(), FOUR, 50000, 3, noTwelve)).toEqual({
      fits: false,
      reason: 'extension-missing',
      strutLength: 58,
      extensions: [12],
    });
  });

  it('the 12″ extension stocked → fits, extension sources resolved from stock', () => {
    const r = recheckThreePost(combo(), FOUR, 50000, 3, INV);
    expect(r.fits).toBe(true);
    if (!r.fits) return;
    expect(r.combo.extensions).toEqual([12]);
    expect(r.combo.extensionSources).toEqual([{ length: 12, inventoryId: 'inv-ext-12' }]);
    expect(r.combo.strut.inventoryId).toBe('inv-LS 304');
  });

  it('no inventory argument → today’s catalog-only behaviour', () => {
    const r = recheckThreePost(combo(), FOUR, 50000, 3);
    expect(r.fits).toBe(true);
    if (r.fits) expect(r.combo.extensionSources).toBeUndefined();
  });
});

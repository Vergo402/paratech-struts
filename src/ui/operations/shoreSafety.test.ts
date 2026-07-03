import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { shoreSafety } from './shoreSafety';

// Pin the shared safety verdict directly (the board verify surface AND the Quick
// View hero both read it). ShorePointDetail.test.tsx covers the rendered strings;
// this locks the helper's logic in isolation — and the CATALOG-MODE contract:
// findForShorePoint must be called with `null`, never live inventory (#408/#410,
// the 2026-07-02 false-SAFE audit — deploying the last unit must not drop a real
// warning to "not re-verifiable").
const mockFind = vi.fn((): StrutCombination[] => []);
vi.mock('@core/shorepoint', async (importActual) => {
  const actual = await importActual<typeof import('@core/shorepoint')>();
  return { ...actual, findForShorePoint: (...args: unknown[]) => mockFind(...(args as [])) };
});

function makeSp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    seq: 1,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 240,
    deductions: NO_DEDUCTIONS,
    status: 'strutset',
    deployedBom: [{ role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'inv-1' }],
    ...over,
  };
}

const combo = (over: Partial<StrutCombination>): StrutCombination =>
  ({ strut: { model: 'LS 406' }, extensions: [], capacity: 12000, ...over }) as unknown as StrutCombination;

beforeEach(() => mockFind.mockReturnValue([]));

describe('shoreSafety — catalog-mode contract', () => {
  it('re-fits against the CATALOG (null), never live inventory', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    shoreSafety(makeSp({ estimatedLoad: 5000 }));
    expect(mockFind).toHaveBeenCalled();
    // Second arg (inventory) must be null — the physics-not-stock invariant.
    expect(mockFind.mock.calls[0]?.[1]).toBeNull();
  });
});

describe('shoreSafety — verdicts (never a false pass)', () => {
  it('ok when the matched strut carries its load-share within rating', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    expect(shoreSafety(makeSp({ estimatedLoad: 5000 })).kind).toBe('ok');
  });

  it('unknown when no strut is on record', () => {
    expect(shoreSafety(makeSp({ deployedBom: undefined })).kind).toBe('unknown');
  });

  it('unknown (not ok) when no load is recorded — the absent-load false-SAFE guard', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    const v = shoreSafety(makeSp()); // makeSp has no estimatedLoad
    expect(v.kind).toBe('unknown');
    expect(v.msg).toMatch(/capacity not verified/);
  });

  it('warn when a single strut is over its rated capacity (#408 per-strut share)', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    const v = shoreSafety(makeSp({ estimatedLoad: 34000 }));
    expect(v.kind).toBe('warn');
    expect(v.msg).toMatch(/Over capacity/);
  });

  it('warn on the unrated zone', () => {
    mockFind.mockReturnValue([combo({ unrated: true, unratedReason: 'Beyond published length.' })]);
    expect(shoreSafety(makeSp()).kind).toBe('warn');
  });

  it('unknown when no combo matches the deployed assembly', () => {
    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    expect(shoreSafety(makeSp()).kind).toBe('unknown');
  });
});

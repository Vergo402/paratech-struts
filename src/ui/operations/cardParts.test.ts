import { describe, expect, it } from 'vitest';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { cutLengthInches, STATUS_ORDER } from '@core/shorepoint';
import { cardValueEighths, cardValueLabel, groupDisplayStatus, isCutPhase } from './cardParts';

/**
 * #485 — the compact value on Division tiles, List rows and Board cards is the RAW
 * opening until the point (or, for a group, its least-advanced leg) reaches cutting,
 * then the wood cut length. REAL MATH: cutLengthInches runs for real.
 *
 * T-Shore, 4×4 header + 4×4 footer: cut = floor((48.5 − 7 − 1.5) × 8)/8 = 40″ (320
 * eighths); raw opening = 48½″ (388 eighths); the old "effective" (strut) length
 * was 41½″ (332) — the number this rule retires from the compact shelf.
 */

const RAW = 388;
const CUT = 320;

function sp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: RAW,
    deductions: { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

describe('fixture math is what it claims (real engine)', () => {
  it('cut length is 40″, distinct from the 48½″ raw opening', () => {
    expect(cutLengthInches(sp())).toBe(40);
  });
});

describe('cardValueEighths — raw until cutting, then cut', () => {
  const PRE_CUT: ShorePointStatus[] = ['pending', 'process', 'strutset'];
  const CUT_ON: ShorePointStatus[] = ['cutting', 'runner', 'secured', 'returned'];

  it.each(PRE_CUT)('%s → raw opening, deductions ignored', (status) => {
    expect(cardValueEighths(sp({ status }), status)).toBe(RAW);
  });

  it.each(CUT_ON)('%s → wood cut length', (status) => {
    expect(cardValueEighths(sp({ status }), status)).toBe(CUT);
  });

  it('phaseStatus decides, not sp.status (a group front leg that is further along)', () => {
    // Front leg is cutting, but the group reads at its least-advanced leg (strut set).
    expect(cardValueEighths(sp({ status: 'cutting' }), 'strutset')).toBe(RAW);
    // …and the reverse: a pre-cut front leg under a cutting-or-later group phase.
    expect(cardValueEighths(sp({ status: 'strutset' }), 'cutting')).toBe(CUT);
  });

  it('a fractional raw opening passes through untouched', () => {
    expect(cardValueEighths(sp({ measurementEighths: 389 }), 'pending')).toBe(389);
  });

  it('a too-small opening prints 0 at cutting (8″ < 8.5″ T-Shore deduction; the chip explains it)', () => {
    expect(cardValueEighths(sp({ measurementEighths: 64 }), 'cutting')).toBe(0);
  });
});

describe('cardValueLabel — two states only', () => {
  it.each(['pending', 'process', 'strutset'] as const)('%s → opening', (s) => {
    expect(cardValueLabel(s)).toBe('opening');
  });
  it.each(['cutting', 'runner', 'secured', 'returned'] as const)('%s → cut', (s) => {
    expect(cardValueLabel(s)).toBe('cut');
  });
  it('agrees with isCutPhase for every status', () => {
    for (const s of STATUS_ORDER) {
      expect(cardValueLabel(s) === 'cut').toBe(isCutPhase({ status: s }));
    }
  });
});

describe('groupDisplayStatus — least-advanced live leg', () => {
  it('one member → its own status', () => {
    expect(groupDisplayStatus([sp({ status: 'runner' })])).toBe('runner');
  });

  it('mixed → the least advanced, regardless of order', () => {
    const a = sp({ id: 'a', status: 'secured' });
    const b = sp({ id: 'b', status: 'cutting' });
    const c = sp({ id: 'c', status: 'strutset' });
    expect(groupDisplayStatus([a, b, c])).toBe('strutset');
    expect(groupDisplayStatus([c, b, a])).toBe('strutset');
  });

  it('a deleted slow leg is ignored', () => {
    const live = sp({ id: 'a', status: 'secured' });
    const dead = sp({ id: 'b', status: 'pending', deletedAt: 1 });
    expect(groupDisplayStatus([live, dead])).toBe('secured');
  });

  it('all legs deleted → falls back to all members', () => {
    const a = sp({ id: 'a', status: 'runner', deletedAt: 1 });
    const b = sp({ id: 'b', status: 'cutting', deletedAt: 2 });
    expect(groupDisplayStatus([a, b])).toBe('cutting');
  });
});

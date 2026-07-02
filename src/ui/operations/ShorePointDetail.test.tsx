// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import type { StrutCombination } from '@core/load';
import type { ShorePointHistory } from '@ui/hooks';
import { ShorePointDetail } from './ShorePointDetail';

// Control the inventory + timeline (the @data seam) and the engine re-fit. Keep
// every other @core/shorepoint helper real so the BOM/ledger render for real.
const mockHistory = vi.fn((): ShorePointHistory => ({ events: [], deviceUid: 'me' }));
vi.mock('@ui/hooks', () => ({
  useInventory: () => [],
  useShorePointHistory: () => mockHistory(),
}));

const mockFind = vi.fn((): StrutCombination[] => []);
vi.mock('@core/shorepoint', async (importActual) => {
  const actual = await importActual<typeof import('@core/shorepoint')>();
  return { ...actual, findForShorePoint: () => mockFind() };
});

function makeSp(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    seq: 7,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 240,
    deductions: NO_DEDUCTIONS,
    status: 'process',
    deployedBom: [
      { role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'inv-1' },
      { role: 'top-plate', plateId: 'swivel6', source: 'untracked' }, // untracked — no inventoryId
    ],
    ...over,
  };
}

const combo = (over: Partial<StrutCombination>): StrutCombination =>
  ({ strut: { model: 'LS 406' }, extensions: [], capacity: 12000, ...over }) as unknown as StrutCombination;

beforeEach(() => {
  mockHistory.mockReturnValue({ events: [], deviceUid: 'me' });
  mockFind.mockReturnValue([]);
});

describe('ShorePointDetail — BOM', () => {
  it('lists each piece and flags an off-book piece', () => {
    render(<ShorePointDetail sp={makeSp()} />);
    // The strut model lives in exactly ONE place now — the BOM piece (the redesign
    // dropped the duplicate identity/hero echo).
    expect(screen.getAllByText('LS 406')).toHaveLength(1);
    expect(screen.getByText('Off-book — not drawn from stock')).toBeInTheDocument();
    expect(screen.getByText(/All tracked pieces on Rescue 2/)).toBeInTheDocument();
    expect(screen.getByText(/includes off-book pieces/)).toBeInTheDocument();
  });

  it('degrades gracefully with no deployed BOM', () => {
    render(<ShorePointDetail sp={makeSp({ deployedBom: undefined })} />);
    expect(screen.getByText('No equipment on record.')).toBeInTheDocument();
    // No strut on record → safety is "unknown", never a false pass.
    expect(screen.getByText('No strut on record for this shore.')).toBeInTheDocument();
  });
});

describe('ShorePointDetail — measurement ledger', () => {
  const withDeductions = { headerWood: '4x4', footerWood: 'none', topPlate: 'none', bottomPlate: 'rigid6' } as const;

  it('with deductions: shows the raw opening, the deducted effective length, and the load', () => {
    render(<ShorePointDetail sp={makeSp({ deductions: withDeductions, estimatedLoad: 5000 })} />);
    expect(screen.getByText('Raw opening')).toBeInTheDocument();
    // "Effective length" labels the hero figure AND the ledger row → 2 occurrences.
    expect(screen.getAllByText('Effective length').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5,000 lbs')).toBeInTheDocument();
  });

  it('no deductions: collapses to a single "Opening length" (no phantom Raw row)', () => {
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.queryByText('Raw opening')).toBeNull();
    expect(screen.getAllByText('Opening length').length).toBeGreaterThanOrEqual(1);
  });

  it('names its deducted figure "Effective length" — never the card\'s wood "Set length" (audit #8)', () => {
    // The drawer hero + ledger show raw − deductions = the STRUT effective length.
    // "Set length" is the board card\'s WOOD cut length (a different number); the
    // drawer must not reuse that word (2026-07-02 audit #8 — the collision).
    render(<ShorePointDetail sp={makeSp({ status: 'secured', deductions: { ...NO_DEDUCTIONS, topPlate: 'swivel6' } })} />);
    expect(screen.getAllByText('Effective length').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Set length')).toBeNull();
  });
});

describe('ShorePointDetail — timeline', () => {
  it('maps events to plain copy and degrades the "who" per device', () => {
    mockHistory.mockReturnValue({
      events: [
        { type: 'ShorePointAdded', id: 'e1', at: 1, by: 'me' },
        { type: 'EquipmentDeployed', id: 'e2', at: 2, by: 'them' },
        { type: 'ShorePointStatusChanged', id: 'e3', at: 3, by: 'me', to: 'strutset' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      deviceUid: 'me',
    });
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Equipment deployed')).toBeInTheDocument();
    expect(screen.getByText('Strut Set')).toBeInTheDocument();
    expect(screen.getAllByText(/this device/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/another device/)).toBeInTheDocument();
  });

  it('shows an empty timeline when there is no history', () => {
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('No history yet.')).toBeInTheDocument();
  });
});

describe('ShorePointDetail — safety (re-verified, never a false pass)', () => {
  it('within rated capacity when the deployed assembly matches a clean combo (load recorded)', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    render(<ShorePointDetail sp={makeSp({ estimatedLoad: 5000 })} />);
    expect(screen.getByText(/Within rated capacity — 12,000 lbs per strut\./)).toBeInTheDocument();
  });

  it('leads the strip with a one-word verdict (color is never the only signal)', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    const { unmount } = render(<ShorePointDetail sp={makeSp({ estimatedLoad: 5000 })} />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
    unmount();

    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    render(<ShorePointDetail sp={makeSp({ estimatedLoad: 5000 })} />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  // The 2026-07-02 audit finding: a deployed shore with NO recorded load can't be
  // verified within capacity — the verdict must NOT assert a pass. (The load field
  // is optional, so this is the common case.)
  it('no load recorded → "Unverified", never an affirmative Safe (blank-load false SAFE)', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    render(<ShorePointDetail sp={makeSp()} />); // makeSp has no estimatedLoad
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText(/No load estimate recorded — capacity not verified/)).toBeInTheDocument();
    expect(screen.queryByText(/Within rated capacity/)).toBeNull();
    expect(screen.queryByText('Safe')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull(); // unverified is quiet, not an alarm
  });

  // The 2026-07-02 audit finding: the deployed-shore verdict dropped the card's
  // fully-extended zero-margin caution. It is load-independent, so it must surface
  // even with no recorded load.
  it('surfaces the fully-extended zero-margin boundary (load-independent)', () => {
    mockFind.mockReturnValue([
      combo({ capacity: 22000, boundaryWarning: 'fully-extended', adjExtended: 73 }),
    ]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText(/Fully extended — zero margin/)).toBeInTheDocument();
    expect(screen.getByText(/maximum reach \(73″\)/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('flags the unrated zone', () => {
    mockFind.mockReturnValue([combo({ unrated: true, unratedReason: 'Beyond published length.' })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Beyond published length.')).toBeInTheDocument();
  });

  it('flags over capacity', () => {
    mockFind.mockReturnValue([combo({ exceedsCapacity: true, exceedsCapacityReason: 'Load exceeds 4 struts.' })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Load exceeds 4 struts.')).toBeInTheDocument();
  });

  // The 2026-07-01 false-SAFE bug: the engine returns 2–4-strut combos unflagged
  // (recommendedQty is advisory), but a shore point deploys exactly ONE strut.
  it('flags a single strut whose load exceeds its rated capacity (never a false pass)', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    render(<ShorePointDetail sp={makeSp({ estimatedLoad: 34000 })} />);
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(
      screen.getByText(/Over capacity — estimated load 34,000 lbs exceeds this strut's 22,000 lbs rating/),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('splits the load across a linked group before judging (Double-T shares evenly)', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    render(<ShorePointDetail sp={makeSp({ estimatedLoad: 34000, groupId: 'g1', groupIndex: 1, groupTotal: 2 })} />);
    // 34,000 / 2 = 17,000 per strut — within the 22,000 rating.
    expect(screen.getByText(/Within rated capacity — 22,000 lbs per strut\./)).toBeInTheDocument();
  });

  it('flags a grouped strut when even its SHARE of the load exceeds the rating', () => {
    mockFind.mockReturnValue([combo({ capacity: 22000 })]);
    render(<ShorePointDetail sp={makeSp({ estimatedLoad: 50000, groupId: 'g1', groupIndex: 2, groupTotal: 2 })} />);
    expect(
      screen.getByText(/Over capacity — this strut's share of the load \(25,000 lbs\) exceeds its 22,000 lbs rating/),
    ).toBeInTheDocument();
  });

  it('says "not re-verifiable" when no combo matches the deployed assembly', () => {
    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Capacity not re-verifiable for the deployed assembly.')).toBeInTheDocument();
  });

  it('only a FLAG announces assertively (warn = alert in hero; pass + unverifiable stay quiet at the bottom)', () => {
    // "not re-verifiable" (unknown) is NOT a flag → quiet, no alert, but still shown.
    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    const { unmount } = render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Capacity not re-verifiable for the deployed assembly.')).toBeInTheDocument();
    unmount();

    // A real flag (unrated / over-capacity) → role=alert, surfaced in the hero.
    mockFind.mockReturnValue([combo({ unrated: true, unratedReason: 'Beyond published length.' })]);
    const warn = render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Beyond published length.');
    warn.unmount();

    // A clean "within rated" pass must NOT raise an alert.
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

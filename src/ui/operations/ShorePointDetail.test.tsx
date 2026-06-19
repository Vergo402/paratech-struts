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

  it('labels the length "Set length" once secured (hero + ledger)', () => {
    render(<ShorePointDetail sp={makeSp({ status: 'secured' })} />);
    expect(screen.getAllByText('Set length').length).toBeGreaterThanOrEqual(1);
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
  it('within rated capacity when the deployed assembly matches a clean combo', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText(/Within rated capacity — 12,000 lbs per strut\./)).toBeInTheDocument();
  });

  it('leads the strip with a one-word verdict (color is never the only signal)', () => {
    mockFind.mockReturnValue([combo({ capacity: 12000 })]);
    const { unmount } = render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
    unmount();

    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
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

  it('says "not re-verifiable" when no combo matches the deployed assembly', () => {
    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    render(<ShorePointDetail sp={makeSp()} />);
    expect(screen.getByText('Capacity not re-verifiable for the deployed assembly.')).toBeInTheDocument();
  });

  it('announces non-passing states assertively (warn + unknown = alert; clean pass stays quiet)', () => {
    mockFind.mockReturnValue([combo({ strut: { model: 'OTHER' } as StrutCombination['strut'] })]);
    const { unmount } = render(<ShorePointDetail sp={makeSp()} />);
    // "not re-verifiable" (unknown) is safety-relevant → role=alert.
    expect(screen.getByRole('alert')).toHaveTextContent('Capacity not re-verifiable');
    unmount();

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

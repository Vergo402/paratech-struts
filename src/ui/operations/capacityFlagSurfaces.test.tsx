// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deployedCapacityFlag, deployedStrutCount } from '@core/shorepoint';
import type { OperationState } from '@core/operation';
import type { Operation, ShorePoint } from '@core/schema';
import { CuttingStation } from './CuttingStation';
import { PastOperationView } from './PastOperationView';
import { shoreSafety } from './shoreSafety';

/**
 * SME-1 (Phase J gate #260) — the H1/#415 deployed-count load share reaches the
 * Cutting Station and the archived-operation viewer, not just the live board.
 *
 * REAL ENGINE ONLY. `findForShorePoint` is deliberately NOT mocked here: the audit
 * refused `shoreSafety.test.ts` / `DeployResolution.test.tsx` as evidence precisely
 * because their stubs can't catch a wrong denominator. Every verdict below comes from
 * the actual fit engine + load tables.
 *
 * The fixture: a 3-Post at 58.5″ on an LS 406, rated 22,000 lb @4:1 (the same
 * independently re-derived figure reducer.test.ts pins). Estimated load 60,000 lb —
 * chosen so the verdict FLIPS on the denominator alone:
 *   1 strut standing  → 60,000 > 22,000  → over-capacity
 *   3 struts standing → 20,000 ≤ 22,000  → clean
 * Both directions are asserted; a one-sided test would pass against code that flags
 * unconditionally.
 */

const OVER_CAPACITY_LOAD = 60_000;

const bom = (): ShorePoint['deployedBom'] => [
  { role: 'strut', model: 'LS 406', system: 'LongShore', source: 'Eng 1', inventoryId: 'i1' },
];

function leg(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: 'op1',
    division: '1',
    shoreType: '3-post',
    groupId: 'g1',
    groupTotal: 3,
    measurementEighths: 468, // 58.5″
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    estimatedLoad: OVER_CAPACITY_LOAD,
    status: 'secured',
    ...over,
  };
}

/** The board's own verdict function (OperationsBoard's capacityFlagOf), rebuilt over
 *  an arbitrary point set — this is what every surface must be handed. */
function boardFlagOf(all: ShorePoint[]) {
  return (sp: ShorePoint) =>
    sp.deployedBom == null ? null : deployedCapacityFlag(sp, deployedStrutCount(sp, all));
}

// A 3-Post standing only 1 of its 3 legs — the reachable partial-deploy state.
const ONE_OF_THREE: ShorePoint[] = [
  leg('a', { deployedBom: bom() }),
  leg('b', { status: 'pending' }), // no BOM — never went up
  leg('c', { status: 'pending' }),
];

// The same shore fully built out.
const THREE_OF_THREE: ShorePoint[] = [
  leg('a', { deployedBom: bom() }),
  leg('b', { deployedBom: bom() }),
  leg('c', { deployedBom: bom() }),
];

describe('SME-1 — the fixture itself flips on the denominator (real engine)', () => {
  it('flags over-capacity at 1 standing strut and clears at 3', () => {
    expect(boardFlagOf(ONE_OF_THREE)(ONE_OF_THREE[0]!)).toBe('over-capacity');
    expect(boardFlagOf(THREE_OF_THREE)(THREE_OF_THREE[0]!)).toBeNull();
  });
});

describe('SME-1 — Cutting Station carries the deployed-count verdict', () => {
  const noop = vi.fn();
  const station = (points: ShorePoint[], withFlag = true) => (
    <CuttingStation
      queue={[]}
      sent={[points[0]!]}
      onMarkCutDone={noop}
      onClearCutDone={noop}
      onSendToRunner={noop}
      onStepBack={noop}
      capacityFlagOf={withFlag ? boardFlagOf(points) : undefined}
    />
  );

  it('a 3-Post standing 1 of 3 at an over-capacity load FLAGS on the sent-to-runner card', () => {
    render(station(ONE_OF_THREE));
    expect(screen.getByText(/Over capacity/)).toBeInTheDocument();
  });

  it('the same shore fully built out (3 of 3) does NOT flag — the load really is shared', () => {
    render(station(THREE_OF_THREE));
    expect(screen.queryByText(/Over capacity/)).toBeNull();
  });

  it('SME-1 regression guard: with no verdict threaded the card shows NOTHING, never a planned-denominator guess', () => {
    // The removed fallback divided by groupTotal (3) and rendered this exact card
    // clean — a false SAFE. Absent is the only honest alternative to threaded.
    render(station(ONE_OF_THREE, false));
    expect(screen.queryByText(/Over capacity/)).toBeNull();
  });
});

/**
 * SME-1 addition (mockup-approved 2026-07-28) — the QUEUE HERO. The finding's own
 * scenario is a partially-deployed group with a leg AT THE SAW, so the big "cut this
 * now" panel must carry the same honest verdict the cards do, with the deployed
 * context spelled out. Same real-engine fixture, moved to `cutting` so the legs land
 * in the queue (a cutting leg has a BOM, so it still counts as standing).
 */
// Only a leg that WENT UP can be at the saw — moving a BOM-less pending leg to
// `cutting` would be an unreachable state, and the fixture must stay honest about
// which legs are standing (that is this file's whole premise).
const cutting = (points: ShorePoint[]) =>
  points.map((p) => (p.deployedBom != null ? { ...p, status: 'cutting' as const } : p));
const ONE_OF_THREE_CUTTING = cutting(ONE_OF_THREE);
const THREE_OF_THREE_CUTTING = cutting(THREE_OF_THREE);

describe('SME-1 — the Cutting Station HERO carries the capacity flag', () => {
  const noop = vi.fn();
  const heroStation = (
    points: ShorePoint[],
    opts: { flag?: boolean; count?: boolean } = {},
  ) => {
    const { flag = true, count = true } = opts;
    return (
      <CuttingStation
        queue={[points[0]!]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
        capacityFlagOf={flag ? boardFlagOf(points) : undefined}
        deployedCountOf={count ? (sp) => deployedStrutCount(sp, points) : undefined}
      />
    );
  };
  const hero = () => screen.getByText('Cut length').closest('.fs-cutstation-hero') as HTMLElement;

  it('a 3-Post standing 1 of 3 at an over-capacity load flags ON THE HERO, with the deployed context', () => {
    render(heroStation(ONE_OF_THREE_CUTTING));
    const chip = within(hero()).getByText(/Over capacity/);
    expect(chip).toHaveTextContent('Over capacity — 1 of 3 struts standing');
    expect(chip).toHaveAttribute('role', 'status');
  });

  it('the same shore fully built out (3 of 3) leaves the hero clean — no chip at all', () => {
    render(heroStation(THREE_OF_THREE_CUTTING));
    expect(within(hero()).queryByText(/Over capacity|Unrated/)).toBeNull();
    expect(hero().querySelector('.fs-spc-flag')).toBeNull();
  });

  it('pluralization: the denominator governs, and it counts the PLANNED legs, not the standing ones', () => {
    // 2 of 3 standing — still over capacity at this load, and still "struts".
    const twoOfThree = cutting([
      leg('a', { deployedBom: bom() }),
      leg('b', { deployedBom: bom() }),
      leg('c', { status: 'pending' }), // never went up — stays pending, stays BOM-less
    ]);
    render(heroStation(twoOfThree));
    expect(within(hero()).getByText(/Over capacity/)).toHaveTextContent(
      'Over capacity — 2 of 3 struts standing',
    );
  });

  it('an UNGROUPED shore gets the bare verdict — "1 of 1 strut standing" is noise, not information', () => {
    const solo = [
      { ...leg('solo', { deployedBom: bom(), status: 'cutting' }), groupId: undefined, groupTotal: undefined },
    ] as ShorePoint[];
    render(heroStation(solo));
    expect(within(hero()).getByText(/Over capacity/)).toHaveTextContent('⚠ Over capacity');
    expect(within(hero()).queryByText(/standing/)).toBeNull();
  });

  it('SME-1 degrade rule: flag threaded but NO count → the bare verdict word, never a guessed denominator', () => {
    render(heroStation(ONE_OF_THREE_CUTTING, { count: false }));
    expect(within(hero()).getByText(/Over capacity/)).toHaveTextContent('⚠ Over capacity');
    expect(within(hero()).queryByText(/standing/)).toBeNull();
  });

  it('SME-1 regression guard: no verdict threaded → the hero shows NOTHING, never a planned-denominator guess', () => {
    render(heroStation(ONE_OF_THREE_CUTTING, { flag: false }));
    expect(within(hero()).queryByText(/Over capacity/)).toBeNull();
  });
});

const mockArchived = vi.fn<() => { data: OperationState | undefined }>();
vi.mock('@ui/hooks', () => ({
  useArchivedOperation: () => mockArchived(),
  useCommit: () => vi.fn().mockResolvedValue({ ok: true }),
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useInventory: () => [],
  useShorePointHistory: () => ({ events: [], deviceUid: 'device-test' }),
  usePeerCuts: () => 0, // CuttingStation's #404 badge — inert here
}));

const archivedOp: Operation = {
  id: 'op1', name: 'Cascade Fire', multiBuilding: false, inlineDeploy: false,
  divisions: [1], saws: ['A'], status: 'ended', createdAt: 1,
  currentPeriod: 1, periods: [{ number: 1, startedAt: 1 }],
};

function archiveWith(points: ShorePoint[]) {
  mockArchived.mockReturnValue({
    data: {
      operation: archivedOp,
      positions: {}, myRoles: {}, commandTransfer: null,
      hazards: {}, checklists: {}, briefings: {},
      shorePoints: points,
    },
  });
}

describe('SME-1 — the archived-incident viewer computes from its OWN snapshot', () => {
  beforeEach(() => mockArchived.mockReset());

  it('an incident archived mid-deploy (1 of 3 standing) is recorded OVER CAPACITY, not clean', () => {
    // The permanent record: if this read clean, the over-capacity leg would be lost
    // to the incident history forever.
    archiveWith(ONE_OF_THREE);
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    expect(screen.getAllByText(/Over capacity/).length).toBeGreaterThan(0);
  });

  it('an incident archived fully built out (3 of 3) records no flag', () => {
    archiveWith(THREE_OF_THREE);
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    expect(screen.queryByText(/Over capacity/)).toBeNull();
  });
});

describe('LS 812 removal (#256) — the Quick View verdict degrades to not-re-verifiable', () => {
  it('the drawer says "not re-verifiable"; the card chip stays silent (it has no third state)', () => {
    // A rig that deployed an LS 812 before the 2026-07-28 catalog removal. The engine
    // can no longer match the assembly, so the DRAWER verdict degrades to an explicit
    // unverified state — neither a false SAFE nor a blank.
    const stale = leg('x', {
      deployedBom: [{ role: 'strut', model: 'LS 812', system: 'LongShore', source: 'Eng 1', inventoryId: 'i9' }],
    });
    const verdict = shoreSafety(stale, 1);
    expect(verdict.kind).toBe('unknown');
    expect(verdict.msg).toMatch(/not re-verifiable/i);

    // The CARD is a weaker surface and this pins its real limit, not a clean bill:
    // CapacityFlagValue is 'unrated' | 'over-capacity' | null, so "can't tell" and
    // "nothing wrong" both render as no chip. A stale-catalog shore is therefore
    // visually indistinguishable from a clean one ON THE CARD; the honest verdict
    // lives one tap away in Quick View. Acceptable here only because v4 never shipped
    // LS 812 outside beta — if a catalog size is ever retired from a LIVE fleet, the
    // chip needs a third 'unverified' state before that removal lands.
    expect(deployedCapacityFlag(stale, 1)).toBeNull();
  });
});

/**
 * SME-3 — the too-small cut chip rides the CARD, so it reaches every surface that
 * renders one. The archive is the surface most likely to be missed (its own view file,
 * its own props), and it is the permanent record, so it is pinned explicitly here.
 */
describe('SME-3 — the too-small chip reaches the archived-incident viewer', () => {
  beforeEach(() => mockArchived.mockReset());
  const TOO_SMALL = /Opening too small — verify measurement/;

  it('an archived 3-Post cut at a 12″ opening records the too-small warning', () => {
    // 12 − 2×6×6 (5.5 each) − 1½″ wedge = −0.5 raw → clamped to 0.
    archiveWith([leg('t', { deployedBom: bom(), status: 'secured', measurementEighths: 96 })]);
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    expect(screen.getAllByText(TOO_SMALL).length).toBeGreaterThan(0);
  });

  it('an archived shore with a real cut length records no such warning', () => {
    archiveWith(THREE_OF_THREE); // 58.5″ 3-Post — 45.5″ of cut
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    expect(screen.queryByText(TOO_SMALL)).toBeNull();
  });
});

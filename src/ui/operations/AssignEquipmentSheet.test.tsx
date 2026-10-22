// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import type { StockRow, ShorePoint } from '@core/schema';
import { findStrutCombinations, type StrutCombination } from '@core/load';

const mockInventory = vi.fn((): StockRow[] => []);
const mockRecommendations = vi.fn((): StrutCombination[] => []);
const mockCommit = vi.fn();
const mockCommitMany = vi.fn();
const mockShorePoints = vi.fn((): ShorePoint[] => []);
// Default = the real engine; one test overrides it to exercise handleAddStruts' pre-flight.
const mockBomStatus = vi.hoisted(() => vi.fn());

vi.mock('@core/shorepoint', async (orig) => {
  const real = await orig<typeof import('@core/shorepoint')>();
  mockBomStatus.mockImplementation(real.bomSourceStatus);
  return { ...real, bomSourceStatus: (...a: Parameters<typeof real.bomSourceStatus>) => mockBomStatus(...a) };
});

vi.mock('@ui/hooks', () => ({
  useInventory: () => mockInventory(),
  // Used by the nested DeployResolution panel (Review sources).
  useInventoryActions: () => ({ addOne: vi.fn(async () => 'inv-new') }),
  useApparatus: () => ({ roster: [], add: vi.fn(), remove: vi.fn() }),
  useRecommendations: () => mockRecommendations(),
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useShorePoints: () => mockShorePoints(),
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

function makeSP(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    area: 'NW corner',
    shoreType: 't-shore',
    measurementEighths: 60 * 8,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

const INV_ITEM: StockRow = {
  id: 'inv-1',
  type: 'strut',
  model: 'LS 406',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 2,
  held: 0,
  available: 2,
};

const COMBO: StrutCombination = {
  strut: {
    id: 'ls-406',
    model: 'LS 406',
    system: 'LongShore',
    color: 'gold',
    collapsed: 48,
    extended: 73,
    inventoryId: 'inv-1',
    availableQty: 2,
  },
  extensions: [],
  extTotal: 0,
  adjCollapsed: 48,
  adjExtended: 73,
  capacity: 22000,
  capacityAll: [44000, 29333, 22000],
  margin: 22000,
  componentCount: 1,
  recommendedQty: 1,
  totalCapacity: 22000,
  deductions: null,
  effectiveLength: 60,
  openingLength: 60,
};

describe('AssignEquipmentSheet (#221 step 2)', () => {
  beforeEach(() => {
    mockInventory.mockReturnValue([]);
    mockRecommendations.mockReturnValue([]);
    mockShorePoints.mockReturnValue([]);
    mockCommit.mockReset();
    mockCommit.mockResolvedValue({ ok: true });
    mockCommitMany.mockReset();
    mockCommitMany.mockResolvedValue({ ok: true });
  });

  it('renders nothing when shorePoint is null', () => {
    render(<AssignEquipmentSheet shorePoint={null} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a sheet with the SP context header', () => {
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Assign Equipment' });
    expect(sheet).toBeInTheDocument();
    // The location also rides each off-book card now, so scope to the context line.
    const context = document.querySelector('.fs-assign-context')!;
    expect(context.textContent).toMatch(/Div 1 · NW corner/);
    expect(context.textContent).toMatch(/T-Shore/);
  });

  it('renders a RecommendationCard per result; source + location resolved from the combo/SP', () => {
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
    // S12 anatomy: model lives in the centered identity line; apparatus + the
    // SP location (division · area, wired via §7) ride the header, not a footer.
    // The sheet portals to document.body — query the document, not the container.
    expect(document.querySelector('.fs-rec-identity')!.textContent).toContain('LS 406');
    expect(document.querySelector('.fs-rec-apparatus')!.textContent).toBe('Equipment located on: Rescue 2');
    expect(document.querySelector('.fs-rec-loc')!.textContent).toBe('Div 1 · NW corner');
    expect(screen.queryByText('Equipment from: Rescue 2')).not.toBeInTheDocument();
  });

  // Bug 9 — one location string across every surface: the canonical cardLocation order
  // (building · division · side · area). This sheet used to build division · building · area
  // and drop the side, so the same point read differently here than on its card/row/tile.
  it('location line uses the canonical cardLocation order (building · division · side · area) on the header AND the card', () => {
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    const sp = makeSP({ building: 'North tower', division: '2', side: 'B', area: 'NW corner' });
    render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
    const expected = 'North tower · Div 2 · B side · NW corner';
    expect(document.querySelector('.fs-assign-context')!.textContent).toMatch(new RegExp(`^${expected} · T-Shore`));
    expect(document.querySelector('.fs-rec-loc')!.textContent).toBe(expected);
  });

  it('Deploy commits EquipmentDeployed with the composed identity and reports back', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    const sp = makeSP();
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={onDeployed} onPartialDeployed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EquipmentDeployed',
        opId: 'op-1',
        spId: 'sp-1',
        by: 'device-test',
        deployedBom: expect.arrayContaining([
          expect.objectContaining({ role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'inv-1' }),
        ]),
      }),
    );
    expect(onDeployed).toHaveBeenCalledWith(sp, 'LS 406');
  });

  it('an extension combo decomposes into a strut + extension BOM (cradle-to-grave identity)', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    // The extension is in stock on the SAME rig as the strut (engine resolved its
    // source) → a clean one-rig assembly that deploys in one tap.
    const EXT_ITEM: StockRow = {
      id: 'inv-ext',
      type: 'extension',
      system: 'LongShore',
      length: 12,
      apparatus: 'Rescue 2',
      apparatusId: 'app-r2',
      quantity: 1,
      held: 0,
      available: 1,
    };
    mockRecommendations.mockReturnValue([
      { ...COMBO, extensions: [12], extTotal: 12, adjCollapsed: 60, adjExtended: 85, extensionSources: [{ length: 12, inventoryId: 'inv-ext' }] },
    ]);
    mockInventory.mockReturnValue([INV_ITEM, EXT_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={onDeployed} onPartialDeployed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    // ADR-033: the strut member carries the BARE model; the extension is its own
    // BOM component. The combined "LS 406 + 12″" identity is reconstructed for
    // display (bomModelLabel) and reported to the board via onDeployed.
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        deployedBom: expect.arrayContaining([
          expect.objectContaining({ role: 'strut', model: 'LS 406' }),
          expect.objectContaining({ role: 'extension', length: 12 }),
        ]),
      }),
    );
    expect(onDeployed).toHaveBeenCalledWith(expect.anything(), 'LS 406 + 12″');
  });

  it('a failed commit keeps the sheet open and surfaces the reason as an alert', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    mockCommit.mockResolvedValue({ ok: false, reason: 'no stock for that strut' });
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={onDeployed} onPartialDeployed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('no stock for that strut');
    expect(onDeployed).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    // The lock releases on failure — Deploy is tappable again.
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeEnabled();
  });

  it('single-flight: a second tap while a deploy is in flight commits nothing', async () => {
    const user = userEvent.setup();
    let resolve!: (v: { ok: true }) => void;
    mockCommit.mockReturnValue(new Promise((r) => (resolve = r)));
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

    const deploy = screen.getByRole('button', { name: /^Deploy/ });
    await user.click(deploy);
    await user.click(deploy);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true }));
  });

  it('a combo whose stock record vanished errors inline instead of committing', async () => {
    const user = userEvent.setup();
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([]); // the id the combo carries no longer exists
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(mockCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/no longer in inventory/);
  });

  it('empty + geometry blocker → the no-match empty state (sheet still opens)', () => {
    // 16″ sits in the catalog gap — nothing fits even unrestricted.
    render(
      <AssignEquipmentSheet shorePoint={makeSP({ measurementEighths: 16 * 8 })} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.getByText('No matching struts')).toBeInTheDocument();
  });

  it('no stock on scene → offers fitting struts to deploy off-book / add to a truck', () => {
    // 60″ is catalog-reachable; empty inventory means deploy NOT from stock.
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.getByText(/Deploy one off-book, or add it to a truck/)).toBeInTheDocument();
    // The fitting catalog struts are surfaced as deployable cards (no dead end).
    expect(screen.getAllByRole('button', { name: /Deploy/ }).length).toBeGreaterThan(0);
  });

  // #450 — the amended deductions from a dropped plate must never outlive a deploy
  // that didn't land. The store won't batch an inventory-consequential event with
  // the edit, and the patch can't follow the deploy (the store's own verdict would
  // then judge stale geometry), so a failed deploy is COMPENSATED: a second
  // ShorePointEdited puts the original deductions back.
  describe('amended deductions vs a failed deploy (#450)', () => {
    // The plate the shore calls for is on no rig → the deploy routes to Review
    // sources, where "Drop this plate" amends the deductions.
    const platedSp = () =>
      makeSP({ deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'swivel6', bottomPlate: 'none' } });

    async function dropThePlateAndConfirm() {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /^Deploy/ }));
      await user.click(screen.getByRole('button', { name: /Drop this plate/ }));
      await user.click(screen.getByRole('button', { name: /Confirm & deploy/ }));
    }

    it('rolls the deductions back when the deploy fails', async () => {
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]); // strut on scene, plate is not
      mockCommit.mockImplementation(async (e: { type: string }) =>
        e.type === 'EquipmentDeployed' ? { ok: false, reason: 'none available' } : { ok: true },
      );
      render(<AssignEquipmentSheet shorePoint={platedSp()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await dropThePlateAndConfirm();

      const edits = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'ShorePointEdited');
      expect(edits).toHaveLength(2);
      expect(edits[0].patch.deductions).toMatchObject({ topPlate: 'none' });
      expect(edits[1].patch.deductions).toMatchObject({ topPlate: 'swivel6' }); // restored
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent('none available');
    });

    it('a re-projection that re-creates equal deductions appends no spurious ShorePointEdited (#499)', async () => {
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      const sp = platedSp();
      const props = { onClose: vi.fn(), onDeployed: vi.fn(), onPartialDeployed: vi.fn() };
      const { rerender } = render(<AssignEquipmentSheet shorePoint={sp} {...props} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /^Deploy/ }));
      await user.click(screen.getByRole('button', { name: /Deploy off-book/ })); // resolve the missing plate without amending
      // The store re-projected while the panel was open: every object is new, values equal.
      rerender(<AssignEquipmentSheet shorePoint={{ ...sp, deductions: { ...sp.deductions } }} {...props} />);
      await user.click(screen.getByRole('button', { name: /Confirm & deploy/ }));
      const types = mockCommit.mock.calls.map((c) => c[0].type);
      expect(types).toContain('EquipmentDeployed');
      expect(types).not.toContain('ShorePointEdited');
    });

    it('keeps the amendment when the deploy succeeds', async () => {
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      render(<AssignEquipmentSheet shorePoint={platedSp()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await dropThePlateAndConfirm();

      const edits = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'ShorePointEdited');
      expect(edits).toHaveLength(1);
      expect(edits[0].patch.deductions).toMatchObject({ topPlate: 'none' });
    });

    it('says so plainly when the rollback itself fails', async () => {
      let editCalls = 0;
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      mockCommit.mockImplementation(async (e: { type: string }) => {
        if (e.type === 'EquipmentDeployed') return { ok: false, reason: 'none available' };
        editCalls++;
        return editCalls === 1 ? { ok: true } : { ok: false, reason: 'write failed' };
      });
      render(<AssignEquipmentSheet shorePoint={platedSp()} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await dropThePlateAndConfirm();

      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/could not be rolled back/);
    });
  });

  // Per-strut over-capacity (accepted mockup 2026-07-01): 60″ @ 34,000 lbs on one
  // 22,000 lb strut — the shore needs 2 struts. The one-tap fix rebuilds the shore
  // as a Double-T and deploys BOTH; deploying short carries the recorded ack.
  describe('Add-N-struts fix + acknowledged short deploy', () => {
    const shortSp = (over: Partial<ShorePoint> = {}) => makeSP({ estimatedLoad: 34000, seq: 7, ...over });

    it('Add 1 more strut: rebuilds as a linked Double-T (same seq) and deploys both', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      // Restructure: hard-remove the old point + add 2 linked members keeping seq 7.
      const batch = mockCommitMany.mock.calls[0]![0] as Array<Record<string, unknown>>;
      expect(batch[0]).toMatchObject({ type: 'ShorePointDeleted', spId: 'sp-1', hard: true });
      const added = batch.filter((e) => e.type === 'ShorePointAdded').map((e) => e.shorePoint as ShorePoint);
      expect(added).toHaveLength(2);
      expect(added.map((p) => p.groupIndex)).toEqual([1, 2]);
      for (const p of added) {
        expect(p).toMatchObject({ shoreType: 'double-t', groupTotal: 2, seq: 7, estimatedLoad: 34000 });
        expect(p.groupId).toBe(added[0]!.groupId);
      }
      // Both members deployed — one EquipmentDeployed per new point, NO ack needed
      // (each strut now carries 17,000 lbs ≤ its 22,000 lb rating).
      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(2);
      expect(deploys.map((e) => e.spId).sort()).toEqual(added.map((p) => p.id).sort());
      for (const e of deploys) expect(e.overCapacityAcknowledged).toBeUndefined();
      // #451 — the add-N path always reports through the partial-honesty handler.
      // Nothing stayed Pending here, so it reads as the full success it is.
      expect(onPartial).toHaveBeenCalledWith(
        [expect.objectContaining({ shoreType: 'double-t' }), expect.objectContaining({ shoreType: 'double-t' })],
        [],
        '2× LS 406',
      );
    });

    // Bug 3 — the rebuild hard-deletes the originals, so any identity field the rebuilt
    // literal forgets is GONE. coords + w3w were forgotten: the GPS fix and the
    // what3words callout vanished, and the board can't backfill w3w without coords.
    it('Add-N-struts carries the captured location (coords + w3w) onto every rebuilt member', async () => {
      const user = userEvent.setup();
      const sp = shortSp({ coords: { lat: 41.0123, lng: -73.8321 }, w3w: 'filled.count.soap' });
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const batch = mockCommitMany.mock.calls[0]![0] as Array<Record<string, unknown>>;
      const added = batch.filter((e) => e.type === 'ShorePointAdded').map((e) => e.shorePoint as ShorePoint);
      expect(added).toHaveLength(2);
      for (const p of added) {
        expect(p.coords).toEqual({ lat: 41.0123, lng: -73.8321 });
        expect(p.w3w).toBe('filled.count.soap');
      }
    });

    it('Add-N-struts on a point with NO captured location writes no coords/w3w keys (RTDB rejects undefined)', async () => {
      const user = userEvent.setup();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const batch = mockCommitMany.mock.calls[0]![0] as Array<Record<string, unknown>>;
      for (const e of batch.filter((e) => e.type === 'ShorePointAdded')) {
        const p = e.shorePoint as ShorePoint;
        expect(p).not.toHaveProperty('coords');
        expect(p).not.toHaveProperty('w3w');
      }
    });

    // #451 — stock runs out mid-rebuild. The old code announced the whole set as
    // deployed; the honest report names what deployed and what stayed Pending.
    it('a partial add-N deploy reports deployed-vs-pending, never a full success', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([{ ...INV_ITEM, quantity: 1, held: 0, available: 1 }]); // one strut on scene, two needed
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(1);
      const [deployed, pending, model] = onPartial.mock.calls[0]!;
      expect(deployed).toHaveLength(1);
      expect(pending).toHaveLength(1);
      expect(model).toBe('LS 406'); // one strut deployed — no "2×" claim
    });

    // #451 — nothing deployed at all used to close the sheet with no word at all.
    it('an all-fail add-N deploy still reports (nothing deployed, both Pending)', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const onClose = vi.fn();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      mockCommit.mockImplementation(async (e: { type: string }) =>
        e.type === 'EquipmentDeployed' ? { ok: false, reason: 'none available' } : { ok: true },
      );
      render(<AssignEquipmentSheet shorePoint={sp} onClose={onClose} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const [deployed, pending] = onPartial.mock.calls[0]!;
      expect(deployed).toHaveLength(0);
      expect(pending).toHaveLength(2);
      expect(onClose).toHaveBeenCalled();
    });

    // #452 — the loop used to pin the first member's inventory row. With one strut
    // per rig, member 2 must draw from the OTHER rig instead of aborting.
    it('each member re-resolves its own source row across rigs', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([
        { ...INV_ITEM, quantity: 1, held: 0, available: 1 },
        { ...INV_ITEM, id: 'inv-2', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 1, held: 0, available: 1 },
      ]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(2);
      // Each member sourced its whole strut from ONE rig (ADR-033) — different rigs.
      const rows = deploys.map((e) => e.deployedBom.find((c: { role: string }) => c.role === 'strut').inventoryId);
      expect(new Set(rows)).toEqual(new Set(['inv-1', 'inv-2']));
      expect(onPartial.mock.calls[0]![1]).toHaveLength(0); // nothing left Pending
    });

    // #486 — extensions used to stay pinned to the engine's combo-time row, so member
    // 2 (strut from Engine 1) paired with Rescue 2's already-claimed extension →
    // cross-truck → Pending. Now it falls back to its own rig's extension.
    it('each member re-resolves its own EXTENSION row too (one 12″ per rig → both deploy)', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = shortSp();
      const extRow = (id: string, apparatus: string, apparatusId: string): StockRow => ({
        id, type: 'extension', length: 12, system: 'LongShore', apparatus, apparatusId, quantity: 1, held: 0, available: 1,
      });
      const EXT_COMBO: StrutCombination = {
        ...COMBO,
        extensions: [12],
        extTotal: 12,
        adjCollapsed: 60,
        adjExtended: 85,
        componentCount: 2,
        extensionSources: [{ length: 12, inventoryId: 'ext-r2' }],
      };
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([EXT_COMBO]);
      // Order matters: the engine-resolved Rescue 2 extension is listed first, so
      // member 1 (strut inv-1 on Rescue 2) sources cleanly from its own rig.
      mockInventory.mockReturnValue([
        { ...INV_ITEM, quantity: 1, held: 0, available: 1 },
        { ...INV_ITEM, id: 'inv-2', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 1, held: 0, available: 1 },
        extRow('ext-r2', 'Rescue 2', 'app-r2'),
        extRow('ext-e1', 'Engine 1', 'app-e1'),
      ]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      await user.click(screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ }));

      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(2);
      const pairs = deploys.map((e) => {
        const bom = e.deployedBom as Array<{ role: string; inventoryId?: string }>;
        return [bom.find((c) => c.role === 'strut')!.inventoryId, bom.find((c) => c.role === 'extension')!.inventoryId];
      });
      expect(pairs).toEqual(expect.arrayContaining([['inv-1', 'ext-r2'], ['inv-2', 'ext-e1']]));
      expect(onPartial.mock.calls[0]![1]).toHaveLength(0); // nothing left Pending
    });

    it('Deploy 1 of 2 anyway: locked until acknowledged; the event carries the recorded ack', async () => {
      const user = userEvent.setup();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      const anyway = screen.getByRole('button', { name: /Deploy 1 of 2 anyway/ });
      expect(anyway).toBeDisabled();
      await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ }));
      await user.click(anyway);
      expect(mockCommit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EquipmentDeployed', spId: 'sp-1', overCapacityAcknowledged: true }),
      );
    });

    it('never offers the one-tap fix when a group mate is already deployed', () => {
      const sp = shortSp({ groupId: 'g1', groupIndex: 1, groupTotal: 2, estimatedLoad: 60000 });
      const mate = shortSp({ groupId: 'g1', groupIndex: 2, groupTotal: 2, estimatedLoad: 60000 });
      mockShorePoints.mockReturnValue([sp, { ...mate, id: 'sp-2', status: 'process' }]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([INV_ITEM]);
      // 60,000 lbs over 2 struts = 30,000 each > 22,000 → short, needs 3 (3-Post).
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /more strut/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deploy 2 of 3 anyway/ })).toBeInTheDocument();
    });
  });

  // One-tap 3-Post on 6×6 (accepted mockup 2026-10-20): the sheet rebuilds a 3-Post on
  // THREE_POST_WOOD — the wood the card re-checked the strut at — not the point's own.
  describe('Add-N-struts to a 3-Post rebuilds on 6×6', () => {
    const R2_THREE: StockRow = { ...INV_ITEM, quantity: 3, available: 3 };
    // 50,000 lb on one 22,000 lb LS 406 → ×3 → 3-Post. The point has 'none' wood.
    const threePostSp = (over: Partial<ShorePoint> = {}) => makeSP({ estimatedLoad: 50000, seq: 9, ...over });

    it('60″ → 49″ on 6×6 (LS 406 fits): rebuilds three 6×6 members and deploys all three', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = threePostSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([R2_THREE]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);

      const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
      expect(add.parentElement!.querySelector('.fs-rec-add-note')).toHaveTextContent(
        'Switches header and footer to 6×6: strut 49″, cut 47 1/2″. Deploys all 3 LS 406 from Rescue 2',
      );
      await user.click(add);

      const batch = mockCommitMany.mock.calls[0]![0] as Array<Record<string, unknown>>;
      const added = batch.filter((e) => e.type === 'ShorePointAdded').map((e) => e.shorePoint as ShorePoint);
      expect(added).toHaveLength(3);
      for (const p of added) {
        expect(p).toMatchObject({ shoreType: '3-post', groupTotal: 3, seq: 9 });
        expect(p.deductions).toEqual({ headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' });
      }
      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(3);
      expect(deploys.map((e) => e.spId).sort()).toEqual(added.map((p) => p.id).sort());
      expect(onPartial).toHaveBeenCalledWith(expect.any(Array), [], '3× LS 406');
    });

    it('plates ride the 6×6 rebuild, and each member sources them against those deductions', async () => {
      const user = userEvent.setup();
      const plate: StockRow = {
        id: 'inv-p', type: 'plate', plateId: 'rigid6', apparatus: 'Rescue 2', apparatusId: 'app-r2',
        quantity: 6, held: 0, available: 6,
      };
      // 62″ − (1.0 + 1.0) plates = 60″ on 'none' wood → 49″ on 6×6.
      const sp = threePostSp({
        measurementEighths: 62 * 8,
        deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'rigid6', bottomPlate: 'rigid6' },
      });
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([{ ...COMBO, openingLength: 62 }]);
      mockInventory.mockReturnValue([R2_THREE, plate]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' }));
      const batch = mockCommitMany.mock.calls[0]![0] as Array<Record<string, unknown>>;
      const added = batch.filter((e) => e.type === 'ShorePointAdded').map((e) => e.shorePoint as ShorePoint);
      for (const p of added) {
        expect(p.deductions).toEqual({ headerWood: '6x6', footerWood: '6x6', topPlate: 'rigid6', bottomPlate: 'rigid6' });
      }
      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(3);
      for (const e of deploys) {
        expect(e.deployedBom.filter((c: { role: string }) => c.role.endsWith('plate'))).toEqual([
          expect.objectContaining({ role: 'top-plate', plateId: 'rigid6', inventoryId: 'inv-p' }),
          expect.objectContaining({ role: 'bottom-plate', plateId: 'rigid6', inventoryId: 'inv-p' }),
        ]);
      }
    });

    it('58″ → 47″ on 6×6 is under LS 406’s 48″ minimum: the tap is locked with the reason', async () => {
      const user = userEvent.setup();
      const sp = threePostSp({ measurementEighths: 58 * 8 });
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([{ ...COMBO, openingLength: 58, effectiveLength: 58 }]);
      mockInventory.mockReturnValue([R2_THREE]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);

      const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
      expect(add).toBeDisabled();
      expect(add.nextElementSibling).toHaveTextContent(
        "LS 406 won't fit a 3-Post on 6×6 (47″, minimum 48″).",
      );
      await user.click(add);
      expect(mockCommitMany).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Deploy 1 of 3 anyway/ })).toBeInTheDocument();
    });

    // Same-rig lock (#537 extras, 2026-10-21): handleAddStruts deploys a member only when
    // every piece is on the strut's own rig (bomSourceStatus 'complete'), so the sheet's
    // 6×6 re-check must judge that rig alone. A refit whose extension sits only on ANOTHER
    // rig would otherwise hard-delete the Pending T-Shore and land three Pending legs.
    const LS304_R2: StockRow = { ...INV_ITEM, id: 'inv-304', model: 'LS 304', quantity: 3, available: 3 };
    const X24_R2: StockRow = {
      id: 'inv-x24', type: 'extension', system: 'LongShore', length: 24,
      apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 3, held: 0, available: 3,
    };
    // 'none' wood, 62″: LS 304 + 24″ (the only extension on Rescue 2). On 6×6: 51″ needs + 12″.
    const renderRefit = (inv: StockRow[]) => {
      const combo = findStrutCombinations(62, 0, 2, inv, null, { header: 0, sole: 0 }).find(
        (c) => c.strut.model === 'LS 304' && c.extensions.join() === '24',
      )!;
      // A load that needs exactly three of this strut → the 3-Post one-tap.
      const sp = threePostSp({ measurementEighths: 62 * 8, estimatedLoad: Math.floor(combo.capacity * 2.5) });
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([combo]);
      mockInventory.mockReturnValue(inv);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
      return screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
    };

    it('a 6×6 refit needing a 12″ no rig has locks, naming the strut’s rig — nothing is restructured', async () => {
      const user = userEvent.setup();
      const add = renderRefit([LS304_R2, X24_R2]);
      expect(add).toBeDisabled();
      expect(add.nextElementSibling!.textContent).toBe('LS 304 on 6×6 needs a 12″ extension not on Rescue 2.');
      await user.click(add);
      expect(mockCommitMany).not.toHaveBeenCalled();
      expect(mockCommit).not.toHaveBeenCalled();
    });

    it('a 12″ on ANOTHER rig still locks the sheet tap: it deploys only from the strut’s own rig', async () => {
      const user = userEvent.setup();
      const x12E4: StockRow = { ...X24_R2, id: 'inv-x12', length: 12, apparatus: 'Engine 4', apparatusId: 'app-e4' };
      const add = renderRefit([LS304_R2, X24_R2, x12E4]);
      expect(add).toBeDisabled();
      expect(add.nextElementSibling!.textContent).toBe('LS 304 on 6×6 needs a 12″ extension not on Rescue 2.');
      await user.click(add);
      // The Pending T-Shore is NOT hard-deleted and rebuilt into three Pending legs.
      expect(mockCommitMany).not.toHaveBeenCalled();
      expect(mockCommit).not.toHaveBeenCalled();
    });

    // #540 — F1: the extension set is UNCHANGED at 6×6 (LS 610 + 12″ at 130″, both woods),
    // but the 12″ is on Rescue 2 while the strut sits on Truck 3. The sheet's rig-filtered
    // inventory has no 12″, so the tap must lock — it used to stay live and restructure
    // the shore into three Pending members with nothing deployed.
    describe('unchanged extension set on another rig (#540)', () => {
      const FOUR: ShorePoint['deductions'] = { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' };
      const LS610_T3: StockRow = { ...INV_ITEM, id: 'inv-610', model: 'LS 610', apparatus: 'Truck 3', apparatusId: 'app-t3', quantity: 3, available: 3 };
      const X12_R2: StockRow = { ...X24_R2, id: 'inv-x12', length: 12 };
      const renderF1 = () => {
        const inv = [LS610_T3, X12_R2];
        const combo = findStrutCombinations(130, 30000, 2, inv, null, { header: 3.5, sole: 3.5 }).find(
          (c) => c.strut.model === 'LS 610' && c.extensions.join() === '12',
        )!;
        const sp = threePostSp({ measurementEighths: 130 * 8, estimatedLoad: 30000, deductions: FOUR });
        mockShorePoints.mockReturnValue([sp]);
        mockRecommendations.mockReturnValue([combo]);
        mockInventory.mockReturnValue(inv);
        render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
        return screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
      };

      it('the 12″ on BOTH rigs → the tap is live and all three deploy from Truck 3 (#540 drive F-A)', async () => {
        const user = userEvent.setup();
        const onPartial = vi.fn();
        const X12_T3: StockRow = { ...X12_R2, id: 'inv-x12-t3', apparatus: 'Truck 3', apparatusId: 'app-t3' };
        const inv = [LS610_T3, X12_R2, X12_T3]; // the scene-wide engine pins the Rescue 2 row first
        const combo = findStrutCombinations(130, 30000, 2, inv, null, { header: 3.5, sole: 3.5 }).find(
          (c) => c.strut.model === 'LS 610' && c.extensions.join() === '12',
        )!;
        expect(combo.extensionSources).toEqual([{ length: 12, inventoryId: 'inv-x12' }]);
        const sp = threePostSp({ measurementEighths: 130 * 8, estimatedLoad: 30000, deductions: FOUR });
        mockShorePoints.mockReturnValue([sp]);
        mockRecommendations.mockReturnValue([combo]);
        mockInventory.mockReturnValue(inv);
        render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);
        const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
        expect(add).toBeEnabled();
        await user.click(add);
        const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
        expect(deploys).toHaveLength(3);
        for (const d of deploys) expect(d.deployedBom.every((c: { source: string }) => c.source === 'Truck 3')).toBe(true);
        expect(onPartial).toHaveBeenCalledWith(expect.any(Array), [], '3× LS 610 + 12″');
      });

      it('LS 610 + 12″ with the 12″ only on Rescue 2 → locked, nothing restructured', async () => {
        const user = userEvent.setup();
        const add = renderF1();
        expect(add).toBeDisabled();
        expect(add.nextElementSibling!.textContent).toBe('LS 610 on 6×6 needs a 12″ extension not on Truck 3.');
        await user.click(add);
        expect(mockCommitMany).not.toHaveBeenCalled();
        expect(mockCommit).not.toHaveBeenCalled();
      });
    });

    // Belt and braces: if the card ever lets a refit through that the strut's rig cannot
    // fully source, handleAddStruts stops BEFORE hard-deleting the shore.
    it('pre-flights the first member’s sourcing: an incomplete BOM stops before any restructure', async () => {
      const user = userEvent.setup();
      const sp = threePostSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([R2_THREE]);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={vi.fn()} />);
      // The card's own checks see the real answer; only the handler's pre-flight (the
      // 6×6 deductions) lies.
      const real = mockBomStatus.getMockImplementation()!;
      mockBomStatus.mockImplementation((...args) =>
        args[1].headerWood === '6x6' ? { status: 'cross-truck', detail: '12″ extension from Rescue 2', bom: [] } : real(...args),
      );
      await user.click(screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' }));
      expect(screen.getByText(/Nothing would deploy from Rescue 2 \(12″ extension from Rescue 2\) — the shore was left as is\./)).toBeInTheDocument();
      expect(mockCommitMany).not.toHaveBeenCalled();
      mockBomStatus.mockImplementation(real);
    });

    it('the 12″ on the strut’s own rig → the tap stays live and all three deploy', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const x12R2: StockRow = { ...X24_R2, id: 'inv-x12', length: 12 };
      const inv = [LS304_R2, X24_R2, x12R2];
      const combo = findStrutCombinations(62, 0, 2, inv, null, { header: 0, sole: 0 }).find(
        (c) => c.strut.model === 'LS 304' && c.extensions.join() === '24',
      )!;
      const sp = threePostSp({ measurementEighths: 62 * 8, estimatedLoad: Math.floor(combo.capacity * 2.5) });
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([combo]);
      mockInventory.mockReturnValue(inv);
      render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={vi.fn()} onPartialDeployed={onPartial} />);
      const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
      expect(add).toBeEnabled();
      await user.click(add);
      const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
      expect(deploys).toHaveLength(3);
      expect(onPartial).toHaveBeenCalledWith(expect.any(Array), [], '3× LS 304 + 12″');
    });
  });
});

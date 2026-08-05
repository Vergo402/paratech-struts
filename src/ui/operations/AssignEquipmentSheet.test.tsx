// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import type { InventoryItem, ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';

const mockInventory = vi.fn((): InventoryItem[] => []);
const mockRecommendations = vi.fn((): StrutCombination[] => []);
const mockCommit = vi.fn();
const mockCommitMany = vi.fn();
const mockShorePoints = vi.fn((): ShorePoint[] => []);

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

const INV_ITEM: InventoryItem = {
  id: 'inv-1',
  type: 'strut',
  model: 'LS 406',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 2,
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
    const EXT_ITEM: InventoryItem = {
      id: 'inv-ext',
      type: 'extension',
      system: 'LongShore',
      length: 12,
      apparatus: 'Rescue 2',
      apparatusId: 'app-r2',
      quantity: 1,
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

    // #451 — stock runs out mid-rebuild. The old code announced the whole set as
    // deployed; the honest report names what deployed and what stayed Pending.
    it('a partial add-N deploy reports deployed-vs-pending, never a full success', async () => {
      const user = userEvent.setup();
      const onPartial = vi.fn();
      const sp = shortSp();
      mockShorePoints.mockReturnValue([sp]);
      mockRecommendations.mockReturnValue([COMBO]);
      mockInventory.mockReturnValue([{ ...INV_ITEM, quantity: 1, available: 1 }]); // one strut on scene, two needed
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
        { ...INV_ITEM, quantity: 1, available: 1 },
        { ...INV_ITEM, id: 'inv-2', apparatus: 'Engine 1', apparatusId: 'app-e1', quantity: 1, available: 1 },
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
});

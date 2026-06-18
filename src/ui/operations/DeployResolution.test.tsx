// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeployResolution } from './DeployResolution';
import type { Apparatus, Deductions, DeployedComponent, InventoryItem, ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';

const mockInventory = vi.fn((): InventoryItem[] => []);
const mockAddOne = vi.fn(async (): Promise<string> => 'inv-new');
const mockRoster = vi.fn((): Apparatus[] => []);

vi.mock('@ui/hooks', () => ({
  useInventory: () => mockInventory(),
  useInventoryActions: () => ({ addOne: mockAddOne }),
  useApparatus: () => ({ roster: mockRoster(), add: vi.fn(), remove: vi.fn() }),
}));

// A simple button-list picker so option selection is a deterministic click.
vi.mock('@ui/picker', () => ({
  BottomSheetPicker: ({
    label,
    options,
    value,
    onSelect,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
  }) => (
    <div data-picker={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onSelect(o.value)}>
          {`pick:${o.label}`}
        </button>
      ))}
    </div>
  ),
}));

// Control the drop-a-plate re-fit deterministically; keep assembleBom et al. real.
const mockFindForShorePoint = vi.fn((): StrutCombination[] => []);
vi.mock('@core/shorepoint', async (importActual) => {
  const actual = await importActual<typeof import('@core/shorepoint')>();
  return { ...actual, findForShorePoint: () => mockFindForShorePoint() };
});

function makeSP(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 60 * 8,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'swivel6', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

const STRUT_R2: InventoryItem = {
  id: 'inv-strut',
  type: 'strut',
  model: 'LS 406',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 2,
  available: 2,
};

function plate(id: string, apparatus: string, apparatusId: string, available = 1): InventoryItem {
  return { id, type: 'plate', plateId: 'swivel6', apparatus, apparatusId, quantity: available, available };
}

const COMBO: StrutCombination = {
  strut: { id: 'ls-406', model: 'LS 406', system: 'LongShore', color: 'gold', collapsed: 48, extended: 73, inventoryId: 'inv-strut', availableQty: 2 },
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
  effectiveLength: 58.2,
  openingLength: 60,
};

const ROSTER: Apparatus[] = [
  { id: 'app-r2', name: 'Rescue 2', type: 'Rescue' },
  { id: 'app-e1', name: 'Engine 1', type: 'Engine' },
];

describe('DeployResolution (#330 Phase 3b)', () => {
  beforeEach(() => {
    mockInventory.mockReturnValue([]);
    mockAddOne.mockClear();
    mockAddOne.mockResolvedValue('inv-new');
    mockRoster.mockReturnValue(ROSTER);
    mockFindForShorePoint.mockReturnValue([]);
  });

  it('cross-truck (no ambiguity): banner shows, Confirm commits the multi-rig BOM', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    mockInventory.mockReturnValue([STRUT_R2, plate('inv-plate-e1', 'Engine 1', 'app-e1')]);
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    expect(screen.getByText(/come from 2 trucks/i)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /Confirm/ });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'strut', source: 'Rescue 2', inventoryId: 'inv-strut' }),
        expect.objectContaining({ role: 'top-plate', source: 'Engine 1', inventoryId: 'inv-plate-e1' }),
      ]),
      expect.anything(),
    );
  });

  it('ambiguous source: a truck picker re-points the piece', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    mockInventory.mockReturnValue([STRUT_R2, plate('inv-plate-e1', 'Engine 1', 'app-e1'), plate('inv-plate-l3', 'Ladder 3', 'app-l3')]);
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    // Auto-pick took Engine 1 (first row); re-point to Ladder 3.
    await user.click(screen.getByRole('button', { name: 'pick:Ladder 3' }));
    await user.click(screen.getByRole('button', { name: /Confirm/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'top-plate', source: 'Ladder 3', inventoryId: 'inv-plate-l3' })]),
      expect.anything(),
    );
  });

  it('missing piece: the three-option chooser renders and Confirm is blocked', () => {
    mockInventory.mockReturnValue([STRUT_R2]); // no swivel6 plate anywhere on scene
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={vi.fn()} submitting={false} />);

    expect(screen.getByText(/not on scene/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy off-book/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Drop this plate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  });

  // A quick-add mock that mutates a shared inventory array, mirroring the live
  // useInventory reactivity the real store provides after addOne.
  function quickAddInventory(): InventoryItem[] {
    const inv: InventoryItem[] = [STRUT_R2];
    mockInventory.mockImplementation(() => inv);
    mockAddOne.mockImplementation(async () => {
      const existing = inv.find((i) => i.id === 'inv-new');
      if (existing) {
        existing.quantity++;
        existing.available++;
      } else {
        inv.push({ id: 'inv-new', type: 'plate', plateId: 'swivel6', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, available: 1 });
      }
      return 'inv-new';
    });
    return inv;
  }

  it('quick-add: adds stock to the strut rig, re-points the piece, unblocks Confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    quickAddInventory();
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    await user.click(screen.getByRole('button', { name: /Add 1 to Rescue 2/ }));
    expect(mockAddOne).toHaveBeenCalledWith({ type: 'plate', plateId: 'swivel6', apparatus: 'Rescue 2', apparatusId: 'app-r2' });

    const confirm = screen.getByRole('button', { name: /Confirm/ });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'top-plate', source: 'Rescue 2', inventoryId: 'inv-new' })]),
      expect.anything(),
    );
  });

  it('deploy off-book: the piece commits untracked (no inventoryId), moving zero stock', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    mockInventory.mockReturnValue([STRUT_R2]);
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    await user.click(screen.getByRole('button', { name: /Deploy off-book/i }));
    expect(screen.getByText(/Off-book/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Confirm/ }));
    const [bom] = onConfirm.mock.calls[0] as unknown as [DeployedComponent[]];
    const topPlate = bom.find((c) => c.role === 'top-plate')!;
    expect(topPlate.inventoryId).toBeUndefined();
  });

  it('set-to-none: drops the plate, persists deductions, warns + gates Confirm until acknowledged', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    mockInventory.mockReturnValue([STRUT_R2]);
    mockFindForShorePoint.mockReturnValue([]); // without the plate, the strut no longer reaches
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    await user.click(screen.getByRole('button', { name: /Drop this plate/i }));
    expect(screen.getByText(/no longer reaches/i)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /Confirm/ });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    const [bom, deductions] = onConfirm.mock.calls[0] as unknown as [DeployedComponent[], Deductions];
    expect(bom.some((c) => c.role === 'top-plate')).toBe(false);
    // the record stays honest — the dropped plate is flipped to none
    expect(deductions.topPlate).toBe('none');
  });

  it('quick-add count > 1: addOne is called per unit, then the piece is re-pointed once', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    quickAddInventory();
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

    await user.click(screen.getByRole('button', { name: 'One more' }));
    await user.click(screen.getByRole('button', { name: 'One more' }));
    await user.click(screen.getByRole('button', { name: /Add 3 to Rescue 2/ }));
    expect(mockAddOne).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
  });

  it('undo off-book: the chooser returns and Confirm is blocked again', async () => {
    const user = userEvent.setup();
    mockInventory.mockReturnValue([STRUT_R2]);
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={vi.fn()} submitting={false} />);

    await user.click(screen.getByRole('button', { name: /Deploy off-book/i }));
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: /Deploy off-book/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  });

  it('over-claim guard: re-pointing two pieces at one single-unit row blocks Confirm with a plain message', async () => {
    const user = userEvent.setup();
    mockInventory.mockReturnValue([
      STRUT_R2,
      plate('inv-e1', 'Engine 1', 'app-e1'),
      plate('inv-l3', 'Ladder 3', 'app-l3'),
    ]);
    // both top + bottom need the same plate; auto-source splits them across the two rigs
    render(
      <DeployResolution
        sp={makeSP({ deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'swivel6', bottomPlate: 'swivel6' } })}
        combo={COMBO}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
        submitting={false}
      />,
    );

    // re-point the bottom plate onto Engine 1 too — now two pieces claim one unit
    const engineButtons = screen.getAllByRole('button', { name: 'pick:Engine 1' });
    await user.click(engineButtons[engineButtons.length - 1]!);
    expect(screen.getByText(/Not enough .* on Engine 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  });

  it('submitting: Confirm is disabled while a deploy is in flight', () => {
    mockInventory.mockReturnValue([STRUT_R2, plate('inv-plate-e1', 'Engine 1', 'app-e1')]);
    render(<DeployResolution sp={makeSP()} combo={COMBO} onBack={vi.fn()} onConfirm={vi.fn()} submitting={true} />);
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  });

  it('grouped shore: an up-front advisory warns when the scene is short (never blocks)', () => {
    mockInventory.mockReturnValue([STRUT_R2, plate('inv-plate-r2', 'Rescue 2', 'app-r2')]);
    render(
      <DeployResolution
        sp={makeSP({ groupTotal: 3, groupIndex: 1 })}
        combo={COMBO}
        onBack={vi.fn()}
        onConfirm={vi.fn(async () => ({ ok: true }))}
        submitting={false}
      />,
    );
    expect(screen.getByText(/needs 3 LS 406 struts/i)).toBeInTheDocument();
    // advisory only — every piece is on the strut's own rig, so Confirm is live
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
  });
});

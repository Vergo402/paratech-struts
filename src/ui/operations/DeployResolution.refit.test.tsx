// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeployResolution } from './DeployResolution';
import type { Apparatus, InventoryItem, ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';

/**
 * The drop-a-plate re-fit, against the REAL engine (#447 / #448 / #449).
 *
 * The sibling DeployResolution.test.tsx stubs findForShorePoint to drive the
 * panel's flow deterministically — but that stub is argument-blind, so it can
 * neither tell catalog mode from live-inventory mode nor produce a genuine
 * LongShore unrated verdict. These three fixes are exactly about which verdict
 * the engine returns, so this file mocks NOTHING of @core/shorepoint: real
 * catalog, real ⅛-floor deduction math, real unrated-zone rule.
 */

const mockInventory = vi.fn((): InventoryItem[] => []);
const mockRoster = vi.fn((): Apparatus[] => []);

vi.mock('@ui/hooks', () => ({
  useInventory: () => mockInventory(),
  useInventoryActions: () => ({ addOne: vi.fn(async () => 'inv-new') }),
  useApparatus: () => ({ roster: mockRoster(), add: vi.fn(), remove: vi.fn() }),
}));

vi.mock('@ui/picker', () => ({
  BottomSheetPicker: () => null,
}));

const ROSTER: Apparatus[] = [{ id: 'app-r2', name: 'Rescue 2', type: 'Rescue' }];

function sp(over: Partial<ShorePoint> = {}): ShorePoint {
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

function combo(over: Partial<StrutCombination['strut']> = {}, rest: Partial<StrutCombination> = {}): StrutCombination {
  return {
    strut: {
      id: 'ls-406',
      model: 'LS 406',
      system: 'LongShore',
      color: 'gold',
      collapsed: 48,
      extended: 73,
      inventoryId: null,
      availableQty: 0,
      ...over,
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
    effectiveLength: 58.2,
    openingLength: 60,
    ...rest,
  };
}

const ack = () => screen.queryByRole('checkbox', { name: /accounted for this/i });

beforeEach(() => {
  mockInventory.mockReturnValue([]);
  mockRoster.mockReturnValue(ROSTER);
});

describe('drop-a-plate re-fit against the real engine', () => {
  // #447 — the reach re-run used to query LIVE inventory. An off-book strut isn't
  // in stock by definition, so the re-run came back empty and the panel warned
  // "no longer reaches" about a strut that reaches fine. Reach is geometry, not
  // stock (#410-4 catalog-mode contract).
  it('#447: an off-book strut is not falsely reported as out of reach after a drop', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => ({ ok: true }));
    // Nothing on scene: the strut AND the plate both surface as missing pieces.
    render(
      <DeployResolution sp={sp()} combo={combo({ inventoryId: null })} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />,
    );

    // Resolve the strut off-book (first chooser), then drop the plate.
    await user.click(screen.getAllByRole('button', { name: /Deploy off-book/i })[0]!);
    await user.click(screen.getByRole('button', { name: /Drop this plate/i }));

    // LS 406 (48–73″) still spans a 60″ opening without the 1.8″ plate.
    expect(screen.queryByText(/no longer reaches/i)).not.toBeInTheDocument();
    expect(ack()).not.toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /Confirm/ });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ topPlate: 'none' }), false, false);
  });

  // #448 — LS 1016 at a 195″ opening: the 6.4″ of base plates keep the assembly at
  // 188.6″, inside the published 16 ft (192″) chart. Drop a plate and it spans past
  // the chart into the unrated zone — which the store REFUSES without a recorded
  // acknowledgment. The panel used to offer no ack control and pass the pre-drop
  // verdict up, so the deploy dead-ended.
  describe('#448/#449: a drop into the LongShore unrated zone', () => {
    const longSp = () =>
      sp({
        measurementEighths: 195 * 8,
        deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'base45', bottomPlate: 'rigid6' },
      });
    const LS1016: InventoryItem = {
      id: 'inv-1016',
      type: 'strut',
      model: 'LS 1016',
      system: 'LongShore',
      apparatus: 'Rescue 2',
      apparatusId: 'app-r2',
      quantity: 1,
      available: 1,
    };
    const longCombo = () =>
      combo(
        { id: 'ls-1016', model: 'LS 1016', collapsed: 114, extended: 198, inventoryId: 'inv-1016', availableQty: 1 },
        { adjCollapsed: 114, adjExtended: 198, effectiveLength: 188.6, openingLength: 195 },
      );

    it('surfaces the ack affordance and records the honest unratedAcknowledged', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn(async () => ({ ok: true }));
      // Strut + the 1″ bottom plate on scene; only the 5.4″ top plate is missing.
      mockInventory.mockReturnValue([
        LS1016,
        { id: 'inv-rigid6', type: 'plate', plateId: 'rigid6', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, available: 1 },
      ]);
      render(<DeployResolution sp={longSp()} combo={longCombo()} onBack={vi.fn()} onConfirm={onConfirm} submitting={false} />);

      // Nothing acknowledged while the assembly is still inside the rated chart.
      expect(ack()).not.toBeInTheDocument();

      // Drop the top plate → 194″ effective, past the 192″ chart.
      await user.click(screen.getByRole('button', { name: /Drop this plate/i }));
      expect(screen.getByText(/spans past the rated range/i)).toBeInTheDocument();
      const confirm = screen.getByRole('button', { name: /Confirm/ });
      expect(confirm).toBeDisabled();

      await user.click(ack()!);
      expect(confirm).toBeEnabled();
      await user.click(confirm);
      // The 4th argument is the unrated acknowledgment the store demands (#448).
      expect(onConfirm).toHaveBeenCalledWith(expect.anything(), expect.anything(), false, true);
    });

    // #449 — the acknowledgment used to be a bare boolean that no deduction change
    // ever reset, so a SECOND drop rode the first drop's ack.
    it('a second drop re-arms the gate — the first ack does not carry over', async () => {
      const user = userEvent.setup();
      mockInventory.mockReturnValue([LS1016]);
      render(<DeployResolution sp={longSp()} combo={longCombo()} onBack={vi.fn()} onConfirm={vi.fn(async () => ({ ok: true }))} submitting={false} />);

      // Both plates are missing here, so the first drop leaves the second plate
      // unresolved — the ack state itself is what this test watches.
      await user.click(screen.getAllByRole('button', { name: /Drop this plate/i })[0]!);
      await user.click(ack()!);
      expect(ack()).toHaveAttribute('aria-checked', 'true');

      // Drop the remaining plate — a NEW risk state (the same shape, a different
      // assembly), so the operator must acknowledge it on its own.
      await user.click(screen.getByRole('button', { name: /Drop this plate/i }));
      expect(ack()).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled();

      await user.click(ack()!);
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeEnabled();
    });
  });
});

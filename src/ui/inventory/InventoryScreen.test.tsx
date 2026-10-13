// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InventoryScreen } from './InventoryScreen';
import { ImportExport } from './ImportExport';
import type { Apparatus, StockRow, Operation, Permissions } from '@core/schema';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from '@core/schema';

const mockInventory = vi.fn((): StockRow[] => []);
const mockApparatus = vi.fn(() => ({ roster: [] as Apparatus[], add: vi.fn(), remove: vi.fn() }));
const mockOperation = vi.fn((): Operation | null => null);
const mockPermissions = vi.fn((): Permissions => ADMIN_PERMISSIONS);
const actions = {
  addOne: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
  setQuantity: vi.fn(),
  remove: vi.fn(),
  exportCsv: () => '',
  templateCsv: () => '',
  importCsv: vi.fn(),
  importRows: vi.fn(),
};

vi.mock('@ui/hooks', async () => ({
  // real pure CSV helpers the barrel re-exports (ImportFlow needs them); hooks stay mocked
  ...(await vi.importActual<typeof import('@data/inventory/excel')>('@data/inventory/excel')),
  useInventory: () => mockInventory(),
  useApparatus: () => mockApparatus(),
  useInventoryActions: () => actions,
  useOperation: () => mockOperation(),
  usePermissions: () => mockPermissions(),
  useApparatusTypes: () => ({ types: [], allNames: ['Engine', 'Ladder'], add: vi.fn(), remove: vi.fn() }),
  useDepartment: () => ({ department: null, role: null }),
}));

const rig = (id: string, name: string): Apparatus => ({ id, name, type: 'Engine' });
const item = (id: string, apparatusId: string, apparatus: string, model: string): StockRow => ({
  id,
  type: 'strut',
  model,
  system: model.startsWith('LS') ? 'LongShore' : 'AcmeThread',
  apparatus,
  apparatusId,
  quantity: 1,
  held: 0,
  available: 1,
});

describe('InventoryScreen', () => {
  beforeEach(() => {
    mockInventory.mockReturnValue([]);
    mockApparatus.mockReturnValue({ roster: [], add: vi.fn(), remove: vi.fn() });
    mockOperation.mockReturnValue(null);
    mockPermissions.mockReturnValue(ADMIN_PERMISSIONS);
  });

  it('shows the first-run empty state when there are no apparatus', () => {
    render(<InventoryScreen />);
    expect(screen.getByText('No apparatus yet')).toBeInTheDocument();
  });

  it('scopes the equipment list to the selected apparatus tab', async () => {
    const user = userEvent.setup();
    mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1'), rig('r2', 'Rescue 2')], add: vi.fn(), remove: vi.fn() });
    mockInventory.mockReturnValue([item('a', 'e1', 'Engine 1', 'AT 25-36'), item('b', 'r2', 'Rescue 2', 'LS 203')]);
    render(<InventoryScreen />);
    // default selection is the first rig alphabetically (Engine 1)
    expect(screen.getByText('AT 25-36')).toBeInTheDocument();
    expect(screen.queryByText('LS 203')).toBeNull();
    await user.click(screen.getByRole('tab', { name: /Rescue 2/ }));
    expect(screen.getByText('LS 203')).toBeInTheDocument();
    expect(screen.queryByText('AT 25-36')).toBeNull();
  });

  it('totals: "on hand" clamps an over-allocated row at 0; "deployed" sums what is held (#499)', () => {
    mockApparatus.mockReturnValue({ roster: [rig('r1', 'Rescue 1')], add: vi.fn(), remove: vi.fn() });
    mockInventory.mockReturnValue([
      { ...item('i1', 'r1', 'Rescue 1', 'AT 56-88'), quantity: 2, held: 3, available: -1 }, // over-allocated
      { ...item('i2', 'r1', 'Rescue 1', 'LS 203'), quantity: 4, held: 1, available: 3 },
    ]);
    render(<InventoryScreen />);
    const stats = document.querySelector('.fs-inv-stats')!;
    expect(stats).toHaveTextContent(/3\s*on hand/);
    expect(stats).toHaveTextContent(/4\s*deployed/);
  });

  it('hides management controls for a member without manageInventory but keeps stock visible (#380)', () => {
    mockPermissions.mockReturnValue(DEFAULT_PERMISSIONS);
    mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1')], add: vi.fn(), remove: vi.fn() });
    mockInventory.mockReturnValue([item('a', 'e1', 'Engine 1', 'AT 25-36')]);
    render(<InventoryScreen />);
    // read access: the stock + its count are still visible
    expect(screen.getByText('AT 25-36')).toBeInTheDocument();
    // but every back-office control is hidden (hide treatment)
    expect(screen.queryByRole('button', { name: 'Add equipment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add apparatus' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Import and export inventory' })).toBeNull();
    // no ± steppers — the row is read-only
    expect(screen.queryByRole('button', { name: /Increase/ })).toBeNull();
  });

  it('allows CSV import while an operation is active (the store guards deployed gear; warned in-flow)', async () => {
    const user = userEvent.setup();
    mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1')], add: vi.fn(), remove: vi.fn() });
    mockOperation.mockReturnValue({ id: 'op-1', name: 'Surfside', multiBuilding: false, inlineDeploy: false, divisions: [1], saws: ['A'], status: 'active', createdAt: 1, currentPeriod: 1, periods: [{ number: 1, startedAt: 1 }] });
    render(<InventoryScreen />);
    await user.click(screen.getByRole('button', { name: 'Import and export inventory' }));
    expect(await screen.findByRole('button', { name: /Import inventory/ })).toBeEnabled();
  });

  describe('Remove a stocked rig (#513)', () => {
    const stocked = (): StockRow[] => [
      { ...item('i1', 'e1', 'Engine 1', 'LS 203'), quantity: 4, available: 4 },
      { ...item('i2', 'e1', 'Engine 1', 'AT 25-36'), quantity: 2, available: 2 },
      { ...item('i3', 'e1', 'Engine 1', 'AT 56-88'), quantity: 6, available: 6 },
    ];
    const setup = (remove = vi.fn().mockResolvedValue(undefined), inv: StockRow[] = stocked()) => {
      mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1')], add: vi.fn(), remove });
      mockInventory.mockReturnValue(inv);
      render(<InventoryScreen />);
      return remove;
    };

    it('renders Remove on a stocked rig for a manageInventory member', () => {
      setup();
      expect(screen.getByRole('button', { name: 'Remove Engine 1' })).toBeEnabled();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('does not render Remove on a stocked rig for a read-only member', () => {
      mockPermissions.mockReturnValue(DEFAULT_PERMISSIONS);
      setup();
      expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
    });

    it('opens a destructive confirm with the item/unit counts, focusing Cancel; nothing is removed yet', async () => {
      const user = userEvent.setup();
      const remove = setup();
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Remove Engine 1?')).toBeInTheDocument();
      expect(dialog).toHaveTextContent(
        '3 items (12 units) stocked on Engine 1 will be removed from inventory. This cannot be undone.',
      );
      expect(within(dialog).getByText('Cancel').closest('button')).toHaveFocus();
      expect(remove).not.toHaveBeenCalled();
    });

    it('uses singular forms for one item of one unit', async () => {
      const user = userEvent.setup();
      setup(undefined, [item('i1', 'e1', 'Engine 1', 'AT 25-36')]);
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      expect(await screen.findByRole('dialog')).toHaveTextContent(
        '1 item (1 unit) stocked on Engine 1 will be removed from inventory. This cannot be undone.',
      );
    });

    it('Cancel closes the confirm without removing', async () => {
      const user = userEvent.setup();
      const remove = setup();
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      await user.click(within(await screen.findByRole('dialog')).getByText('Cancel'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(remove).not.toHaveBeenCalled();
    });

    it('confirming removes the rig by id and closes the confirm', async () => {
      const user = userEvent.setup();
      const remove = setup();
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Remove Engine 1' }));
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('e1');
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('is disabled, with the reason beside it, while any unit of the rig is deployed', () => {
      const inv = stocked().map((r) => (r.id === 'i2' ? { ...r, held: 1, available: 1 } : r));
      setup(undefined, inv);
      expect(screen.getByRole('button', { name: 'Remove Engine 1' })).toBeDisabled();
      expect(screen.getByText('Return deployed equipment first.')).toBeInTheDocument();
    });

    it('a store rejection (units deployed in a race) is shown inside the confirm, which stays open', async () => {
      const user = userEvent.setup();
      // Exact message thrown by apparatusStore.removeApparatus' L-8 guard (src/data/store/apparatusStore.ts).
      const remove = setup(vi.fn().mockRejectedValue(new Error('apparatus e1 has deployed equipment (L-8 abort)')));
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Remove Engine 1' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        "Couldn't remove — equipment from this rig is still deployed.",
      );
      expect(remove).toHaveBeenCalledOnce();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('any other store failure shows the generic retry text, not the deployed-equipment claim', async () => {
      const user = userEvent.setup();
      setup(vi.fn().mockRejectedValue(new Error('QuotaExceededError')));
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Remove Engine 1' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent("Couldn't remove Engine 1. Try again.");
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('the open confirm is frozen on the rig it was opened for, even if a peer removes that rig underneath it', async () => {
      const user = userEvent.setup();
      const remove = vi.fn().mockResolvedValue(undefined);
      mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1'), rig('r2', 'Rescue 2')], add: vi.fn(), remove });
      mockInventory.mockReturnValue([...stocked(), item('b', 'r2', 'Rescue 2', 'LS 203')]);
      const { rerender } = render(<InventoryScreen />);
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent('3 items (12 units) stocked on Engine 1');
      // a peer removes Engine 1: the screen's active scope falls to Rescue 2
      mockApparatus.mockReturnValue({ roster: [rig('r2', 'Rescue 2')], add: vi.fn(), remove });
      mockInventory.mockReturnValue([item('b', 'r2', 'Rescue 2', 'LS 203')]);
      rerender(<InventoryScreen />);
      const open = screen.getByRole('dialog');
      expect(within(open).getByText('Remove Engine 1?')).toBeInTheDocument();
      expect(open).toHaveTextContent('3 items (12 units) stocked on Engine 1');
      await user.click(within(open).getByRole('button', { name: 'Remove Engine 1' }));
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('e1');
    });

    it('Cancel never flashes a blanked-out confirm while the dialog is closing', async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      await screen.findByRole('dialog');
      // Record every piece of text React writes into the DOM from here on (the closing frame included).
      const written: string[] = [];
      const observer = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === 'characterData') written.push(r.target.textContent ?? '');
          r.addedNodes.forEach((n) => written.push(n.textContent ?? ''));
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      await user.click(within(screen.getByRole('dialog')).getByText('Cancel'));
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      observer.disconnect();
      expect(written.join(' | ')).not.toMatch(/0 items|0 units|stocked on\s+will/);
    });

    it('after a removal the scope moves to the first remaining rig', async () => {
      const user = userEvent.setup();
      const roster = [rig('e1', 'Engine 1'), rig('r2', 'Rescue 2')];
      const inv = [item('a', 'e1', 'Engine 1', 'AT 25-36'), item('b', 'r2', 'Rescue 2', 'LS 203')];
      const remove = vi.fn(async () => {
        mockApparatus.mockReturnValue({ roster: [roster[0]!], add: vi.fn(), remove });
        mockInventory.mockReturnValue([inv[0]!]);
      });
      mockApparatus.mockReturnValue({ roster, add: vi.fn(), remove });
      mockInventory.mockReturnValue(inv);
      render(<InventoryScreen />);
      await user.click(screen.getByRole('tab', { name: /Rescue 2/ }));
      await user.click(screen.getByRole('button', { name: 'Remove Rescue 2' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove Rescue 2' }));
      expect(await screen.findByText('AT 25-36')).toBeInTheDocument();
      expect(screen.queryByText('LS 203')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('removing the last rig lands on the no-apparatus empty state', async () => {
      const user = userEvent.setup();
      const remove = vi.fn(async () => {
        mockApparatus.mockReturnValue({ roster: [], add: vi.fn(), remove });
        mockInventory.mockReturnValue([]);
      });
      mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1')], add: vi.fn(), remove });
      mockInventory.mockReturnValue(stocked());
      const { rerender } = render(<InventoryScreen />);
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove Engine 1' }));
      await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
      rerender(<InventoryScreen />); // the store's live query re-renders the screen with the emptied roster
      expect(await screen.findByText('No apparatus yet')).toBeInTheDocument();
    });

    it('an EMPTY rig still removes immediately, with no confirm', async () => {
      const user = userEvent.setup();
      const remove = setup(undefined, []);
      await user.click(screen.getByRole('button', { name: 'Remove Engine 1' }));
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('e1');
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

describe('ImportExport', () => {
  it('opens the 4-step import flow from the Import button', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue({ imported: 1, skipped: { strand: 1, retype: 0 }, cloud: { status: 'synced', failed: 0, reverted: 0 } });
    render(
      <ImportExport opActive={false} canManage canExport exportCsv={() => ''} templateCsv={() => ''} importRows={importRows} />,
    );
    // rows variant (the Data management page shape) — Import opens the 4-step flow
    await user.click(screen.getByRole('button', { name: /Import inventory/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(/Pick your file/);
  });
});

// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OperationsBoard } from './OperationsBoard';
import type { InventoryItem, Operation, ShorePoint, ShorePointStatus } from '@core/schema';
import type { StrutCombination } from '@core/load';

const mockOperation = vi.fn((): Operation | null => null);
const mockShorePoints = vi.fn((): ShorePoint[] => []);
const mockInventory = vi.fn((): InventoryItem[] => []);
const mockRecommendations = vi.fn((): StrutCombination[] => []);
const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useShorePoints: () => mockShorePoints(),
  useInventory: () => mockInventory(),
  useRecommendations: () => mockRecommendations(),
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const ACTIVE_OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  divisions: [1],
  status: 'active',
  createdAt: 1000,
};

function makeSP(id: string, status: ShorePointStatus, division = '1'): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division,
    shoreType: 't-shore',
    measurementEighths: 480,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status,
  };
}

// A handcrafted engine result for the deploy-path tests — the shape the real
// engine returns (strut is a StrutCandidate carrying its inventoryId).
const COMBO: StrutCombination = {
  strut: {
    id: 'ls-304',
    model: 'LS 304',
    system: 'LongShore',
    color: 'gold',
    collapsed: 36,
    extended: 50,
    inventoryId: 'inv-1',
    availableQty: 4,
  },
  extensions: [],
  extTotal: 0,
  adjCollapsed: 36,
  adjExtended: 50,
  capacity: 22000,
  capacityAll: [44000, 29333, 22000],
  margin: 22000,
  componentCount: 1,
  recommendedQty: 1,
  totalCapacity: 22000,
  deductions: null,
  effectiveLength: 48.5,
  openingLength: 48.5,
};

const INV_ITEM: InventoryItem = {
  id: 'inv-1',
  type: 'strut',
  model: 'LS 304',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 4,
  available: 4,
};

describe('OperationsBoard', () => {
  beforeEach(() => {
    mockOperation.mockReturnValue(null);
    mockShorePoints.mockReturnValue([]);
    mockInventory.mockReturnValue([]);
    mockRecommendations.mockReturnValue([]);
    mockCommit.mockClear();
    mockCommit.mockResolvedValue({ ok: true });
    mockCommitMany.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows empty state when no operation', () => {
    render(<OperationsBoard />);
    expect(screen.getByText('No active operation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Operation' })).toBeInTheDocument();
  });

  it('clicking Start Operation opens the modal', async () => {
    const user = userEvent.setup();
    render(<OperationsBoard />);
    await user.click(screen.getByRole('button', { name: 'Start Operation' }));
    expect(screen.getByRole('dialog', { name: 'Start Operation' })).toBeInTheDocument();
  });

  it('active operation shows header with name', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    expect(screen.getByText('Surfside')).toBeInTheDocument();
  });

  it('renders all 7 status lanes with correct labels', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    const expected = ['Pending', 'In Process', 'Strut Set', 'Cutting', 'Runner', 'Shore Secured', 'Strut Equipment Returned'];
    for (const label of expected) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }
  });

  it('lane counts reflect shore point distribution', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending'),
      makeSP('sp-2', 'pending'),
      makeSP('sp-3', 'cutting'),
    ]);
    render(<OperationsBoard />);
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('2')).toBeInTheDocument();
    const cuttingSection = screen.getByRole('region', { name: 'Cutting' });
    expect(within(cuttingSection).getByText('1')).toBeInTheDocument();
  });

  it('lane collapse toggles card visibility', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '2')]);
    render(<OperationsBoard />);
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('Div 2')).toBeInTheDocument();
    // The lane header is the first /Pending/ button — the ShorePointCard's
    // expand head also carries the status badge text now.
    const header = within(pendingSection).getAllByRole('button', { name: /Pending/ })[0]!;
    await user.click(header);
    expect(within(pendingSection).queryByText('Div 2')).not.toBeInTheDocument();
    await user.click(header);
    expect(within(pendingSection).getByText('Div 2')).toBeInTheDocument();
  });

  it('Add Shore Point button is present', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    expect(screen.getByRole('button', { name: '+ Add Shore Point' })).toBeInTheDocument();
  });

  it('edit button opens modal in edit mode', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('button', { name: 'Edit operation' }));
    expect(screen.getByRole('dialog', { name: 'Edit Operation' })).toBeInTheDocument();
  });

  it('+ Add Shore Point opens the Add Shore Point modal', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('button', { name: '+ Add Shore Point' }));
    expect(screen.getByRole('dialog', { name: 'Add Shore Point' })).toBeInTheDocument();
  });

  it('a pending card expands to Edit, which opens the pre-populated Edit modal', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '2')]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { expanded: false, name: /Div 2/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog', { name: 'Edit Shore Point' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('Div 2 (+1 floor up)');
  });

  it('a pending card expands to Delete, which opens the destructive confirm', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { expanded: false, name: /Div 1/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog', { name: 'Delete Shore Point?' })).toBeInTheDocument();
  });

  it('a successful add expands a collapsed Pending lane and announces assertively', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);

    // Collapse the (empty) Pending lane first.
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    const header = within(pendingSection).getAllByRole('button', { name: /Pending/ })[0]!;
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');

    // Drive the real Add flow: 4 ft via the foot stepper, qty 3, submit.
    await user.click(screen.getByRole('button', { name: '+ Add Shore Point' }));
    const upFoot = screen.getByRole('button', { name: 'Up one foot' });
    for (let i = 0; i < 4; i++) await user.click(upFoot);
    const qty = screen.getByRole('textbox', { name: 'Quantity' });
    await user.clear(qty);
    await user.type(qty, '3');
    await user.click(screen.getByRole('button', { name: 'Add Shore Point' }));

    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    // Two live regions now (assertive add + polite status) — the add announce is the first.
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('3 shore points added — Div 1, Pending.');
  });

  // ---- S6 (#221) — deploy / advance / step-back ------------------------------

  it('a pending card surfaces the LIVE computed reason (no stock on scene → no-inventory)', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]); // 60″ — the catalog reaches it
    mockInventory.mockReturnValue([]);
    render(<OperationsBoard />);
    expect(screen.getByText('Waiting for inventory — no apparatus stock to pull from')).toBeInTheDocument();
  });

  it('a pending card surfaces no-match when nothing fits geometrically', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    const sp = makeSP('sp-1', 'pending');
    sp.measurementEighths = 16 * 8; // the 12-15 / 19-25 catalog gap
    mockShorePoints.mockReturnValue([sp]);
    render(<OperationsBoard />);
    expect(screen.getByText('No matching strut — nothing fits this opening at this load')).toBeInTheDocument();
  });

  it('Assign Equipment opens the sheet with the SP context and an empty state', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Assign Equipment' }));
    const sheet = screen.getByRole('dialog', { name: 'Assign Equipment' });
    expect(sheet).toBeInTheDocument();
    // 60″, empty inventory, catalog reaches → the no-inventory empty state.
    expect(within(sheet).getByText('No apparatus stock available')).toBeInTheDocument();
  });

  it('Deploy commits StrutDeployed and the board announces the In Process move politely', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    mockInventory.mockReturnValue([INV_ITEM]);
    mockRecommendations.mockReturnValue([COMBO]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Assign Equipment' }));
    await user.click(screen.getByRole('button', { name: /^Deploy/ }));

    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'StrutDeployed',
        spId: 'sp-1',
        opId: 'op-1',
        deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' },
      }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 deployed — Div 1, In Process.');
  });

  it('advance #37 button commits the status change and announces politely', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Advance to Strut Set' }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'process', to: 'strutset' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point — now Strut Set.');
  });

  it('the group gate disables advance while mates are still Pending (#221 OQ2)', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    const grouped = (id: string, status: ShorePointStatus, groupIndex: number): ShorePoint => ({
      ...makeSP(id, status),
      groupId: 'g1',
      groupIndex,
      groupTotal: 3,
      ...(status !== 'pending'
        ? { deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } }
        : {}),
    });
    mockShorePoints.mockReturnValue([
      grouped('sp-1', 'process', 1),
      grouped('sp-2', 'pending', 2),
      grouped('sp-3', 'pending', 3),
    ]);
    render(<OperationsBoard />);

    expect(screen.getByRole('button', { name: 'Advance to Strut Set' })).toBeDisabled();
    expect(screen.getByText('Waiting on group — 2 of 3 still Pending')).toBeInTheDocument();
  });

  it('once every mate has left Pending, advance fans out and announces the group size', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    const grouped = (id: string, groupIndex: number): ShorePoint => ({
      ...makeSP(id, 'process'),
      groupId: 'g1',
      groupIndex,
      groupTotal: 3,
      deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' },
    });
    mockShorePoints.mockReturnValue([grouped('sp-1', 1), grouped('sp-2', 2), grouped('sp-3', 3)]);
    render(<OperationsBoard />);

    const advances = screen.getAllByRole('button', { name: 'Advance to Strut Set' });
    expect(advances[0]).toBeEnabled();
    await user.click(advances[0]!);
    expect(mockCommit).toHaveBeenCalledTimes(1); // ONE event — the reducer fans out
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('3 shore points — now Strut Set.');
  });

  it('step-back from In Process opens the inventory-consequential confirm, committing nothing yet', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Step back to Pending' }));
    expect(screen.getByRole('dialog', { name: 'Return LS 304 to inventory?' })).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(mockCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'StrutReturned', spId: 'sp-1' }));
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 returned — back to Pending.');
  });

  it('step-back from Strut Set commits directly — no confirm (no inventory change)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'strutset'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Step back to In Process' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'strutset', to: 'process' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point — back to In Process.');
  });
});

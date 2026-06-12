// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getSlide, slideToCommit } from '@ui/primitives/Slider.testkit';
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

  it('the G-15 status-summary bar carries a count per lane and stays out of the a11y tree', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending'),
      makeSP('sp-2', 'pending'),
      makeSP('sp-3', 'cutting'),
    ]);
    const { container } = render(<OperationsBoard />);
    const bar = container.querySelector('.fs-ops-summary');
    expect(bar).not.toBeNull();
    // Visual glance aid only — the lane headers carry the counts for AT.
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    const items = bar!.querySelectorAll('.fs-ops-summary-item');
    expect(items).toHaveLength(7);
    expect(items[0]!.textContent).toBe('Pending2');
    expect(items[1]!.textContent).toBe('In Process0');
    expect(items[3]!.textContent).toBe('Cutting1');
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

    // Drive the real Add flow: 4 ft via the foot stepper, 3 shores (T-Shore ×3
    // = 3 independent cards under KB-7), submit.
    await user.click(screen.getByRole('button', { name: '+ Add Shore Point' }));
    const upFoot = screen.getByRole('button', { name: 'Up one foot' });
    for (let i = 0; i < 4; i++) await user.click(upFoot);
    const qty = screen.getByRole('textbox', { name: 'Number of shores' });
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

  it('the advance slide commits the status change and announces politely (gesture only — ADR-026)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await slideToCommit('Slide to set Strut Set');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'process', to: 'strutset' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point — now Strut Set.');
  });

  it('the group gate disables advance while mates are still Pending (#221 OQ2)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    const grouped = (id: string, status: ShorePointStatus, groupIndex: number): ShorePoint => ({
      ...makeSP(id, status),
      shoreType: '3-post', // a group of 3 = one physical 3-Post shore (KB-7)
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

    const advance = getSlide('Slide to set Strut Set');
    expect(advance).toHaveClass('fs-slide--disabled');
    expect(screen.getByText('Waiting on group — 2 of 3 still Pending')).toBeInTheDocument();
    // The gate holds against the gesture itself — a full drag commits nothing.
    await slideToCommit(advance);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  // A 3-Post in one lane now collapses into ONE GroupedShorePoint rolodex (S12
  // §2): only the front member shows its slide. The single slide commit still
  // fans out to the whole group (the reducer's lockstep) and announces the
  // group size — the stack is presentational, the lockstep math is unchanged.
  const grouped3Post = (id: string, groupIndex: number): ShorePoint => ({
    ...makeSP(id, 'process'),
    shoreType: '3-post', // one physical 3-Post shore (KB-7)
    groupId: 'g1',
    groupIndex,
    groupTotal: 3,
    deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' },
  });

  it('collapsed stack: the front slide commits ONE event and announces the group size', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([grouped3Post('sp-1', 1), grouped3Post('sp-2', 2), grouped3Post('sp-3', 3)]);
    render(<OperationsBoard />);

    // Only the front card (active member sp-1) shows the advance slide now.
    const advances = screen.getAllByText('Slide to set Strut Set');
    expect(advances).toHaveLength(1);
    expect(advances[0]!.closest('.fs-slide')).not.toHaveClass('fs-slide--disabled');
    await slideToCommit(advances[0]!);
    expect(mockCommit).toHaveBeenCalledTimes(1); // ONE event — the reducer fans out
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'process', to: 'strutset' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('3 shore points — now Strut Set.');
  });

  it('expanded stack: every member shows its slide; any one commits the same fan-out', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([grouped3Post('sp-1', 1), grouped3Post('sp-2', 2), grouped3Post('sp-3', 3)]);
    render(<OperationsBoard />);

    // Expand the rolodex into the full member list.
    await user.click(screen.getByRole('button', { name: 'Show all 3 cards' }));
    const advances = screen.getAllByText('Slide to set Strut Set');
    expect(advances).toHaveLength(3);

    // Commit the third member's slide — still one event, still the group announce.
    await slideToCommit(advances[2]!);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-3', from: 'process', to: 'strutset' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('3 shore points — now Strut Set.');
  });

  it('step-back from In Process opens the inventory-consequential confirm, committing nothing yet', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await slideToCommit('Slide back to Pending');
    expect(screen.getByRole('dialog', { name: 'Return LS 304 to inventory?' })).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(mockCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'StrutReturned', spId: 'sp-1' }));
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 returned — back to Pending.');
  });

  it('step-back from Strut Set commits directly — no confirm (no inventory change)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'strutset'), deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } },
    ]);
    render(<OperationsBoard />);

    await slideToCommit('Slide back to In Process');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'strutset', to: 'process' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point — back to In Process.');
  });
});

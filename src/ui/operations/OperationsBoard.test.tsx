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
  inlineDeploy: false,
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
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('2'); // compact trigger
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

    // Drive the real Add flow: type 4 ft, 3 shores (T-Shore ×3 = 3 independent
    // cards under KB-7), submit.
    await user.click(screen.getByRole('button', { name: '+ Add Shore Point' }));
    const feet = screen.getByRole('textbox', { name: 'Feet' });
    await user.clear(feet);
    await user.type(feet, '4');
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
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

  it('a soft-deleted Pending mate no longer gates the survivors’ advance (audit W2)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    const grouped = (id: string, status: ShorePointStatus, groupIndex: number, deletedAt?: number): ShorePoint => ({
      ...makeSP(id, status),
      shoreType: '3-post',
      groupId: 'g1',
      groupIndex,
      groupTotal: 3,
      ...(deletedAt != null ? { deletedAt } : {}),
      ...(status !== 'pending'
        ? { deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } }
        : {}),
    });
    // sp-3 was deleted while still Pending (#319) — it keeps status:'pending' but
    // is out of the lanes, so it must NOT hold the group gate. The two deployed
    // survivors can advance. (Before the fix this gated them forever.)
    mockShorePoints.mockReturnValue([
      grouped('sp-1', 'process', 1),
      grouped('sp-2', 'process', 2),
      grouped('sp-3', 'pending', 3, 5000),
    ]);
    render(<OperationsBoard />);

    expect(screen.queryByText(/Waiting on group/)).toBeNull();
    const advance = getSlide('Slide to set Strut Set');
    expect(advance).not.toHaveClass('fs-slide--disabled');
    await slideToCommit(advance);
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', from: 'process', to: 'strutset' }),
    );
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

  // ---- #222 — Cutting + the Cutting Station sub-nav ---------------------------

  const deployed = (model = 'LS 304') => ({ model, source: 'Rescue 2', inventoryId: 'inv-1' });

  it('strut set: the advance slide commits strutset → cutting (#222 entry)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'strutset'), deployedStrut: deployed() }]);
    render(<OperationsBoard />);
    await slideToCommit('Slide to set Cutting');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'strutset', to: 'cutting' }),
    );
  });

  it('Cutting Station sub-nav: switches to the queue and Mark Cut Done commits the flag', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 10, deployedStrut: deployed() },
    ]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: /Cutting Station/ }));
    expect(screen.getByText('1 cut in queue')).toBeInTheDocument();
    await slideToCommit('Slide to mark Cut Done');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointEdited', spId: 'sp-1', patch: { cuttingDone: true } }),
    );
  });

  it('Cutting Station: Send to Runner advances a cut-done card to Runner', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 10, cuttingDone: true, deployedStrut: deployed() },
    ]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: /Cutting Station/ }));
    await slideToCommit('Slide to send to Runner');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'cutting', to: 'runner' }),
    );
  });

  it('the cutting queue counts only cutting points, in FIFO order', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-2', 'cutting'), cuttingStartedAt: 200, deployedStrut: deployed() },
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 100, deployedStrut: deployed() },
      { ...makeSP('sp-3', 'strutset'), deployedStrut: deployed() }, // not in the queue
    ]);
    render(<OperationsBoard />);
    // The sub-nav shows the live queue count.
    expect(screen.getByRole('radio', { name: 'Cutting Station (2)' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Cutting Station/ }));
    const ids = Array.from(document.querySelectorAll('.fs-cutstation-queue [data-sp-id]')).map((el) =>
      el.getAttribute('data-sp-id'),
    );
    expect(ids).toEqual(['sp-1', 'sp-2']); // sorted by cuttingStartedAt
  });

  // ---- #248 — division/area sort + filter ------------------------------------

  function laneCardIds(regionName: string): string[] {
    const region = screen.getByRole('region', { name: regionName });
    return Array.from(region.querySelectorAll('[data-sp-id]')).map((el) => el.getAttribute('data-sp-id')!);
  }

  it('default sort: cards order by division (desc) then area (asc) within a lane', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    // Added scrambled; expect Div 2 first, then Div 1 with area "A" before "B".
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-d1b', 'pending', '1'), area: 'B' },
      { ...makeSP('sp-d2', 'pending', '2'), area: 'A' },
      { ...makeSP('sp-d1a', 'pending', '1'), area: 'A' },
    ]);
    render(<OperationsBoard />);
    expect(laneCardIds('Pending')).toEqual(['sp-d2', 'sp-d1a', 'sp-d1b']);
  });

  it('the Sort control switches between division/area and added (insertion) order', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending', '2'), // added first, higher floor
      makeSP('sp-2', 'pending', '1'), // added second, lower floor
    ]);
    render(<OperationsBoard />);
    // Default = division/area: Div 2 (sp-1) before Div 1 (sp-2).
    expect(laneCardIds('Pending')).toEqual(['sp-1', 'sp-2']);
    await user.selectOptions(screen.getByLabelText('Sort'), 'added');
    // Added = newest-first insertion order: sp-2 then sp-1.
    expect(laneCardIds('Pending')).toEqual(['sp-2', 'sp-1']);
  });

  it('filtering by division narrows every lane and updates the lane count; Clear restores', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending', '1'),
      makeSP('sp-2', 'pending', '2'),
      makeSP('sp-3', 'cutting', '2'),
    ]);
    render(<OperationsBoard />);
    expect(laneCardIds('Pending')).toEqual(['sp-2', 'sp-1']); // div 2 before div 1

    await user.selectOptions(screen.getByLabelText('Division'), '1');
    expect(laneCardIds('Pending')).toEqual(['sp-1']);
    expect(laneCardIds('Cutting')).toEqual([]); // sp-3 is Div 2 — filtered out
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('1')).toBeInTheDocument(); // count now 1

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(laneCardIds('Pending')).toEqual(['sp-2', 'sp-1']);
    expect(laneCardIds('Cutting')).toEqual(['sp-3']);
  });

  // ---- #319 — soft-delete + restore ------------------------------------------

  it('a soft-deleted point leaves its lane (count excludes it) and surfaces in the Deleted section', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending'),
      { ...makeSP('sp-2', 'pending'), seq: 2, label: 'B-2', deletedAt: 5000 },
    ]);
    render(<OperationsBoard />);

    // Excluded from the Pending lane and its count.
    expect(laneCardIds('Pending')).toEqual(['sp-1']);
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('1')).toBeInTheDocument();

    // Present in the Deleted section, retaining its #N, once expanded.
    const deleted = screen.getByRole('region', { name: 'Deleted shore points' });
    expect(within(deleted).getByText('1')).toBeInTheDocument(); // count badge
    await user.click(within(deleted).getByRole('button', { name: /Deleted/ }));
    expect(within(deleted).getByText('#2')).toBeInTheDocument();
    expect(within(deleted).getByText(/B-2/)).toBeInTheDocument();
  });

  it('Restore commits ShorePointRestored and announces the reclaimed number', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-2', 'pending'), seq: 2, label: 'B-2', deletedAt: 5000 },
    ]);
    render(<OperationsBoard />);

    const deleted = screen.getByRole('region', { name: 'Deleted shore points' });
    await user.click(within(deleted).getByRole('button', { name: /Deleted/ }));
    await user.click(within(deleted).getByRole('button', { name: 'Restore' }));

    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointRestored', spId: 'sp-2', opId: 'op-1', by: 'device-test' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point #2 restored — Pending.');
  });

  it('restoring one member of a deleted group brings the whole shore back (audit W5)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    const m = (id: string, i: number): ShorePoint => ({
      ...makeSP(id, 'pending'),
      seq: i,
      groupId: 'g1',
      groupIndex: i,
      groupTotal: 3,
      shoreType: '3-post',
      deletedAt: 5000,
    });
    mockShorePoints.mockReturnValue([m('sp-1', 1), m('sp-2', 2), m('sp-3', 3)]);
    render(<OperationsBoard />);

    const deleted = screen.getByRole('region', { name: 'Deleted shore points' });
    await user.click(within(deleted).getByRole('button', { name: /Deleted/ }));
    // Restore on ANY row reclaims all three at once — no partial shore.
    await user.click(within(deleted).getAllByRole('button', { name: 'Restore' })[0]!);

    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const events = mockCommitMany.mock.calls[0]![0] as { type: string; spId: string }[];
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.type === 'ShorePointRestored')).toBe(true);
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('3 shore points restored — Pending.');
  });

  // ---- End Operation (#220 lifecycle) ----------------------------------------

  it('End Operation commits OperationEnded and closes the modal', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'End Operation' })); // board trigger
    const dialog = screen.getByRole('dialog', { name: 'End Operation?' });
    await user.click(within(dialog).getByRole('button', { name: 'End Operation' })); // modal confirm

    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OperationEnded', opId: 'op-1', by: 'device-test' }),
    );
  });

  // ---- multi-building — group + filter by building ---------------------------

  it('groups by building (building-first sort) and filters by building; Clear restores', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue({ ...ACTIVE_OP, multiBuilding: true });
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-south', 'pending', '1'), building: 'South tower' },
      { ...makeSP('sp-north-2', 'pending', '2'), building: 'North tower' },
      { ...makeSP('sp-north-1', 'pending', '1'), building: 'North tower' },
    ]);
    render(<OperationsBoard />);

    // Building groups first (North before South); within North, Div 2 before Div 1.
    expect(laneCardIds('Pending')).toEqual(['sp-north-2', 'sp-north-1', 'sp-south']);

    // Filter to North tower drops the South point.
    await user.selectOptions(screen.getByLabelText('Building'), 'North tower');
    expect(laneCardIds('Pending')).toEqual(['sp-north-2', 'sp-north-1']);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(laneCardIds('Pending')).toEqual(['sp-north-2', 'sp-north-1', 'sp-south']);
  });
});

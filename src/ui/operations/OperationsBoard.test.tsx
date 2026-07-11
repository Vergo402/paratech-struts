// @vitest-environment jsdom
import { render, screen, within, waitFor } from '@testing-library/react';
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
// #380 — flips the back-office manageOperations capability per test (gates Start/Edit/End).
let mockManageOps = true;

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useShorePoints: () => mockShorePoints(),
  useInventory: () => mockInventory(),
  useApparatus: () => ({ roster: [], add: vi.fn(), remove: vi.fn() }),
  useRecommendations: () => mockRecommendations(),
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useDeviceUidValue: () => 'device-test',
  // StartOperationModal's AddressField reaches Places through the hooks seam —
  // keep autocomplete off so it renders as a plain text box (the no-key path).
  placesEnabled: () => false,
  beginAddressSession: async () => ({ suggest: async () => [] }),
  // "Mine" lens (#370) — no role/apparatus by default; Mine renders inert. Tests
  // that need it available override via vi.mocked(useOrg/useMyRole).
  useOrg: () => ({}),
  useMyRole: () => null,
  useChecklists: () => ({ attestations: {}, check: vi.fn(), uncheck: vi.fn() }),
  useChecklistTemplate: () => ({ id: 'orm-tcrm', title: 'T', source: 'fieldshore-baseline', autoCollapseCompleted: false, nodes: [] }),
  useBriefing: () => ({ active: null, begin: vi.fn(), end: vi.fn() }),
  usePastOperations: () => ({ data: [] }),
  useArchivedOperation: () => ({ data: undefined }),
  useShorePointHistory: () => ({ events: [], deviceUid: 'device-test' }),
  usePeerCuts: () => 0,
  // #380 — these tests drive a full-control operator; manageOperations gates Start/Edit/End.
  usePermissions: () => ({
    read: true, runFieldWork: true, manageOperations: mockManageOps, manageInventory: true,
    manageRoster: true, manageSettings: true, manageUsers: true, manageData: true,
  }),
}));

const ACTIVE_OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  inlineDeploy: false,
  divisions: [1],
  saws: ['A'],
  status: 'active',
  createdAt: 1000,
  currentPeriod: 1,
  periods: [{ number: 1, startedAt: 1000 }],
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
    localStorage.clear(); // isolation: sort/filter prefs are persisted (#347)
    mockManageOps = true; // default: a full-control operator (per-test override below)
  });

  it('gates Start/Edit/End on manageOperations but never the fireground (#380)', () => {
    // no manageOperations → the empty state offers no Start Operation
    mockManageOps = false;
    render(<OperationsBoard />);
    expect(screen.getByText('No active operation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Operation' })).toBeNull();
    // with an active op, Edit + End are hidden but Add Shore Point (fireground) stays
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    expect(screen.queryByRole('button', { name: /edit operation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /end operation/i })).toBeNull();
    expect(screen.getAllByRole('button', { name: /add shore point/i }).length).toBeGreaterThan(0);
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
    const expected = ['Pending Equipment', 'Equipment Assigned', 'Strut Set', 'Cutting Station', 'Runner', 'Wood Shore Secured', 'Strut Equipment Returned'];
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
    const pendingSection = screen.getByRole('region', { name: 'Pending Equipment' });
    expect(within(pendingSection).getByText('2')).toBeInTheDocument();
    const cuttingSection = screen.getByRole('region', { name: 'Cutting Station' });
    expect(within(cuttingSection).getByText('1')).toBeInTheDocument();
  });

  // ---- Pending lane "(toggled off)" in one-step deploy mode -------------------

  it('one-step mode (Utilize Pending Card OFF) reads an empty Pending lane as "(toggled off)"', () => {
    mockOperation.mockReturnValue({ ...ACTIVE_OP, inlineDeploy: true });
    mockShorePoints.mockReturnValue([]); // nothing forced into Pending
    render(<OperationsBoard />);
    const pending = screen.getByRole('region', { name: 'Pending Equipment' });
    expect(pending).toHaveClass('is-toggled-off');
    expect(within(pending).getByText('skipped — one-step deploy')).toBeInTheDocument();
  });

  it('a card forced into Pending (out of stock) keeps the lane live — no "(toggled off)"', () => {
    mockOperation.mockReturnValue({ ...ACTIVE_OP, inlineDeploy: true });
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]); // couldn't deploy → forced here
    render(<OperationsBoard />);
    const pending = screen.getByRole('region', { name: 'Pending Equipment' });
    expect(pending).not.toHaveClass('is-toggled-off');
    expect(within(pending).queryByText('skipped — one-step deploy')).toBeNull();
  });

  it('two-step mode (default) never marks the Pending lane toggled off', () => {
    mockOperation.mockReturnValue(ACTIVE_OP); // inlineDeploy: false
    mockShorePoints.mockReturnValue([]);
    render(<OperationsBoard />);
    expect(screen.getByRole('region', { name: 'Pending Equipment' })).not.toHaveClass('is-toggled-off');
    // The heading name stays clean (the note rides the visible title only).
    expect(screen.getByRole('heading', { name: 'Pending Equipment' })).toBeInTheDocument();
  });

  // The G-15 status-summary bar was removed in the 2026-07-02 control-zone
  // redesign (Alex: the count strip was a big part of the clutter; the Board
  // lanes already carry per-status counts). No summary-bar test remains.

  it('lane collapse toggles card visibility', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '2')]);
    render(<OperationsBoard />);
    const pendingSection = screen.getByRole('region', { name: 'Pending Equipment' });
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
    const pendingSection = screen.getByRole('region', { name: 'Pending Equipment' });
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
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('3 shore points added — Div 1, Pending Equipment.');
  });

  // ---- S6 (#221) — deploy / advance / step-back ------------------------------

  it('a pending card surfaces the LIVE computed reason (no stock on scene → no-inventory)', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]); // 60″ — the catalog reaches it
    mockInventory.mockReturnValue([]);
    render(<OperationsBoard />);
    // Waiting title + the named strut(s) that fit but aren't on scene (issue 1).
    expect(screen.getByText('Waiting for inventory')).toBeInTheDocument();
    expect(screen.getByText(/Needs .+ — none on scene/)).toBeInTheDocument();
  });

  it('a pending card surfaces no-match when nothing fits geometrically', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    const sp = makeSP('sp-1', 'pending');
    sp.measurementEighths = 16 * 8; // the 12-15 / 19-25 catalog gap
    mockShorePoints.mockReturnValue([sp]);
    render(<OperationsBoard />);
    expect(screen.getByText('Nothing fits this opening at this load')).toBeInTheDocument();
  });

  it('Assign Equipment opens the sheet with the SP context and the off-book offer', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Assign Equipment' }));
    const sheet = screen.getByRole('dialog', { name: 'Assign Equipment' });
    expect(sheet).toBeInTheDocument();
    // 60″, empty inventory, catalog reaches → offer fitting struts off-book / add-to-truck.
    expect(within(sheet).getByText(/Deploy one off-book, or add it to a truck/)).toBeInTheDocument();
  });

  it('Deploy commits EquipmentDeployed and the board announces the Equipment Assigned move politely', async () => {
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
        type: 'EquipmentDeployed',
        spId: 'sp-1',
        opId: 'op-1',
        deployedBom: [{ role: 'strut', model: 'LS 304', system: 'LongShore', source: 'Rescue 2', inventoryId: 'inv-1' }],
      }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 deployed — Div 1, Equipment Assigned.');
  });

  it('after Deploy, focus moves to the deployed card — not lost to <body> (#350)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    mockInventory.mockReturnValue([INV_ITEM]);
    mockRecommendations.mockReturnValue([COMBO]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'Assign Equipment' }));
    await user.click(screen.getByRole('button', { name: /^Deploy/ }));

    // The deployed card's wrapper takes focus (deferred past the modal close-focus).
    const wrapper = document.querySelector('[data-sp-id="sp-1"]');
    await waitFor(() => expect(document.activeElement).toBe(wrapper));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('the advance slide commits the status change and announces politely (gesture only — ADR-026)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] },
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
        ? { deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] }
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
        ? { deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] }
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
    deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }],
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

  it('step-back from Equipment Assigned opens the inventory-consequential confirm, committing nothing yet', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] },
    ]);
    render(<OperationsBoard />);

    await slideToCommit('Slide back to Pending Equipment');
    expect(screen.getByRole('dialog', { name: 'Return LS 304 to inventory?' })).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(mockCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'EquipmentReturned', spId: 'sp-1' }));
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 returned — back to Pending Equipment.');
  });

  it('step-back from Strut Set commits directly — no confirm (no inventory change)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'strutset'), deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] },
    ]);
    render(<OperationsBoard />);

    await slideToCommit('Slide back to Equipment Assigned');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'strutset', to: 'process' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point — back to Equipment Assigned.');
  });

  // ---- #222 — Cutting + the Cutting Station sub-nav ---------------------------

  const deployed = (model = 'LS 304') => ({ model, source: 'Rescue 2', inventoryId: 'inv-1' });

  it('strut set: the advance slide commits strutset → cutting (#222 entry)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'strutset'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);
    await slideToCommit('Slide to send to Cutting Station');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'strutset', to: 'cutting' }),
    );
  });

  it('Cutting Station sub-nav: switches to the queue and Mark Cut Done commits the flag', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 10, deployedBom: [{ role: 'strut', ...deployed() }] },
    ]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: /Cutting Station/ }));
    expect(document.querySelector('.fs-cutstation-count')).toHaveTextContent('1 cut in queue'); // #435: count numeral is its own span
    await slideToCommit('Slide to mark Cut Done');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointEdited', spId: 'sp-1', patch: { cuttingDone: true } }),
    );
  });

  it('Cutting Station: Send to Runner advances a cut-done card to Runner', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 10, cuttingDone: true, deployedBom: [{ role: 'strut', ...deployed() }] },
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
      { ...makeSP('sp-2', 'cutting'), cuttingStartedAt: 200, deployedBom: [{ role: 'strut', ...deployed() }] },
      { ...makeSP('sp-1', 'cutting'), cuttingStartedAt: 100, deployedBom: [{ role: 'strut', ...deployed() }] },
      { ...makeSP('sp-3', 'strutset'), deployedBom: [{ role: 'strut', ...deployed() }] }, // not in the queue
    ]);
    render(<OperationsBoard />);
    // The sub-nav shows the live queue count.
    expect(screen.getByRole('radio', { name: /cutting station.*2 in queue/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Cutting Station/ }));
    const ids = Array.from(document.querySelectorAll('.fs-cutstation-split [data-sp-id]')).map((el) =>
      el.getAttribute('data-sp-id'),
    );
    expect(ids).toEqual(['sp-1', 'sp-2']); // hero (queue head) then up-next, FIFO by cuttingStartedAt
  });

  // ---- #223 / #224 — Runner → Wood Shore Secured → Strut Equipment Returned --------

  it('Runner: the advance slide commits runner → secured (#223)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'runner'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);
    await slideToCommit('Slide to set Wood Shore Secured');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'runner', to: 'secured' }),
    );
  });

  it('Runner: the step-back slide commits runner → cutting (re-enters the cut queue)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'runner'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);
    await slideToCommit('Slide back to Cutting Station');
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'runner', to: 'cutting' }),
    );
  });

  it('Wood Shore Secured: Remove & Return opens the confirm modal, committing nothing yet; Confirm commits EquipmentReclaimed (#224)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'secured'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: /Remove & Return Equipment/ }));
    expect(screen.getByRole('dialog', { name: 'Return equipment to inventory?' })).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm Return' }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EquipmentReclaimed', spId: 'sp-1' }),
    );
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('LS 304 returned to Rescue 2.');
  });

  it('Wood Shore Secured: the step-back slide commits secured → runner — no confirm (no inventory change)', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'secured'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);
    await slideToCommit('Slide back to Runner');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShorePointStatusChanged', spId: 'sp-1', from: 'secured', to: 'runner' }),
    );
  });

  it('Strut Equipment Returned: terminal — the marker, no slides or action buttons on the card', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([{ ...makeSP('sp-1', 'returned'), deployedBom: [{ role: 'strut', ...deployed() }] }]);
    render(<OperationsBoard />);
    expect(screen.getByText('✓ Equipment returned')).toBeInTheDocument();
    // Scope to the CARD (the lane's own header is a toggle button).
    const card = document.querySelector('[data-sp-id="sp-1"]') as HTMLElement;
    expect(within(card).queryByText(/Slide/)).not.toBeInTheDocument();
    // The only affordance is the read-only Quick View entry (ADR-019) — no slides,
    // no advance/step-back/remove. A returned card keeps its BOM as history.
    const buttons = within(card).queryAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveClass('fs-spc-head--detail');
  });

  it('Quick View: a deployed card opens the detail drawer; a pending card has no Details', async () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'process'), deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }] },
      makeSP('sp-2', 'pending'),
    ]);
    const user = userEvent.setup();
    render(<OperationsBoard />);

    const deployed = document.querySelector('[data-sp-id="sp-1"]') as HTMLElement;
    const pending = document.querySelector('[data-sp-id="sp-2"]') as HTMLElement;
    // #432 anatomy v2: the deployed card's HEAD is the Quick View entry (the
    // gold Details link is gone); a pending head expands actions instead.
    const detailHead = deployed.querySelector('.fs-spc-head--detail') as HTMLElement;
    expect(detailHead).not.toBeNull();
    expect(pending.querySelector('.fs-spc-head--detail')).toBeNull();

    await user.click(detailHead);
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Bill of materials')).toBeInTheDocument();
    expect(within(drawer).getByText('Measurement & load')).toBeInTheDocument();
  });

  // ---- #248 — division/area sort + filter ------------------------------------

  function laneCardIds(regionName: string): string[] {
    const region = screen.getByRole('region', { name: regionName });
    return Array.from(region.querySelectorAll('[data-sp-id]')).map((el) => el.getAttribute('data-sp-id')!);
  }

  // The 2026-07-02 redesign moved Sort + Location + Apparatus into one Filters
  // surface (PickerSurface). Open it, pick a radio row, then close it (Escape) so
  // the board — an aria-hidden sibling of the open modal sheet — is queryable.
  async function openFilters(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Filters/ }));
  }
  async function pickInFilters(user: ReturnType<typeof userEvent.setup>, name: string | RegExp) {
    const dialog = screen.getByRole('dialog', { name: 'Filters & sort' });
    await user.click(within(dialog).getByRole('radio', { name }));
  }
  async function closeFilters(user: ReturnType<typeof userEvent.setup>) {
    await user.keyboard('{Escape}');
  }
  // Open Filters, pick a row, close — the common single-filter flow.
  async function applyFilter(user: ReturnType<typeof userEvent.setup>, name: string | RegExp) {
    await openFilters(user);
    await pickInFilters(user, name);
    await closeFilters(user);
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
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-d2', 'sp-d1a', 'sp-d1b']);
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
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-1', 'sp-2']);
    await applyFilter(user, 'Added — newest first');
    // Added = newest-first insertion order: sp-2 then sp-1.
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-2', 'sp-1']);
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
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-2', 'sp-1']); // div 2 before div 1

    // Location filtering now lives in the Filters surface (a Division radio row).
    await applyFilter(user, 'Div 1');
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-1']);
    expect(laneCardIds('Cutting Station')).toEqual([]); // sp-3 is Div 2 — filtered out
    const pendingSection = screen.getByRole('region', { name: 'Pending Equipment' });
    expect(within(pendingSection).getByText('1')).toBeInTheDocument(); // count now 1

    // Clear via the active-filter chip row.
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-2', 'sp-1']);
    expect(laneCardIds('Cutting Station')).toEqual(['sp-3']);
  });

  it('filtering by assigned apparatus narrows the board; Clear restores', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'pending', '1'), assignedResource: 'Rescue 2' },
      { ...makeSP('sp-2', 'pending', '1'), assignedResource: 'Engine 1' },
    ]);
    render(<OperationsBoard />);
    expect(laneCardIds('Pending Equipment').slice().sort()).toEqual(['sp-1', 'sp-2']);

    await applyFilter(user, 'Rescue 2');
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-1']); // only the Rescue 2 point

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(laneCardIds('Pending Equipment').slice().sort()).toEqual(['sp-1', 'sp-2']);
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
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-1']);
    const pendingSection = screen.getByRole('region', { name: 'Pending Equipment' });
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
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Shore point #2 restored — Pending Equipment.');
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
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('3 shore points restored — Pending Equipment.');
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

  it('End Operation warns about still-deployed gear grouped by rig (#238 gate M3)', async () => {
    const user = userEvent.setup();
    const deployed = (id: string, status: ShorePointStatus, source: string) => ({
      ...makeSP(id, status),
      deployedBom: [{ role: 'strut' as const, model: 'LS 203', source, inventoryId: `i-${id}` }],
    });
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      deployed('sp-1', 'process', 'Rescue 2'),
      deployed('sp-2', 'secured', 'Rescue 2'),
      deployed('sp-3', 'process', 'Engine 1'),
      deployed('sp-4', 'returned', 'Ladder 5'), // returned — gear is back, excluded
      makeSP('sp-5', 'pending'), // never deployed, excluded
    ]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'End Operation' }));
    const dialog = screen.getByRole('dialog', { name: 'End Operation?' });
    expect(dialog).toHaveTextContent(/3 shore points are still up/); // 2 Rescue 2 + 1 Engine 1
    expect(dialog).toHaveTextContent(/Rescue 2\s*\(2\)/);
    expect(dialog).toHaveTextContent(/Engine 1\s*\(1\)/);
    expect(dialog).not.toHaveTextContent('Ladder 5'); // returned rig not listed
    // Non-blocking: the confirm is still there.
    expect(within(dialog).getByRole('button', { name: 'End Operation' })).toBeEnabled();
  });

  it('End Operation shows no warning when all equipment is returned', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-1', 'returned'), deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'i1' }] },
    ]);
    render(<OperationsBoard />);

    await user.click(screen.getByRole('button', { name: 'End Operation' }));
    const dialog = screen.getByRole('dialog', { name: 'End Operation?' });
    expect(dialog).not.toHaveTextContent(/still up/);
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
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-north-2', 'sp-north-1', 'sp-south']);

    // Filter to North tower via the Filters surface (a Building radio row, shown
    // only for multi-building ops).
    await applyFilter(user, 'North tower');
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-north-2', 'sp-north-1']);

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-north-2', 'sp-north-1', 'sp-south']);
  });

  // ---- phone phase grouping + scope drilldown (port of the desktop wins) -----

  it('phone: the seven lanes group under the three workflow-phase labels, in order', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending'), makeSP('sp-2', 'cutting')]);
    const { container } = render(<OperationsBoard />);
    const labels = Array.from(container.querySelectorAll('.fs-ops-phase-label')).map((el) => el.textContent);
    expect(labels).toEqual(['Strut placement', 'Cutting', 'Wood & return']);
    // Grouping is presentational — all seven lanes still render under the phases.
    for (const label of ['Pending Equipment', 'Equipment Assigned', 'Strut Set', 'Cutting Station', 'Runner', 'Wood Shore Secured', 'Strut Equipment Returned']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }
  });

  it('the Filters surface carries the Location (Division) options', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '1'), makeSP('sp-2', 'pending', '2')]);
    render(<OperationsBoard />);
    await openFilters(user);
    const dialog = screen.getByRole('dialog', { name: 'Filters & sort' });
    expect(within(dialog).getByRole('radio', { name: 'All divisions' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Div 2' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Div 1' })).toBeInTheDocument();
  });

  it('an active filter shows a removable chip that clears it on tap', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '1'), makeSP('sp-2', 'pending', '2')]);
    render(<OperationsBoard />);
    // No chips until a filter is set.
    expect(screen.queryByRole('button', { name: /Remove .* filter/ })).toBeNull();

    await applyFilter(user, 'Div 1');
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-1']);
    const chip = screen.getByRole('button', { name: 'Remove Div 1 filter' });
    expect(chip).toBeInTheDocument();

    // Tapping the chip removes just that filter — the whole board returns.
    await user.click(chip);
    expect(laneCardIds('Pending Equipment')).toEqual(['sp-2', 'sp-1']);
  });

  // ---- #356 — single-list view ----------------------------------------------

  // Singleton card ids in the flat list, in DOM order (grouped stacks have no
  // top-level data-sp-id, so ordering tests use singletons).
  function listCardIds(): string[] {
    const list = document.querySelector('.fs-ops-list')!;
    return Array.from(list.querySelectorAll(':scope > [role="listitem"][data-sp-id]')).map(
      (el) => el.getAttribute('data-sp-id')!,
    );
  }

  // The view switcher is a 3-option Segmented (Division · Board · List) — pick the
  // option by its radio name.
  async function switchToList(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('radio', { name: 'List view' }));
  }

  async function setListSort(user: ReturnType<typeof userEvent.setup>, optionName: string) {
    await applyFilter(user, optionName);
  }

  it('the List toggle replaces the seven lanes with one flat list of every point', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending'),
      makeSP('sp-2', 'cutting'),
      makeSP('sp-3', 'returned'),
    ]);
    render(<OperationsBoard />);
    // Lanes present by default.
    expect(screen.getByRole('region', { name: 'Pending Equipment' })).toBeInTheDocument();

    await switchToList(user);
    // Lanes gone; one list with all three points.
    expect(screen.queryByRole('region', { name: 'Pending Equipment' })).not.toBeInTheDocument();
    expect(document.querySelector('.fs-ops-list')).not.toBeNull();
    expect(listCardIds().sort()).toEqual(['sp-1', 'sp-2', 'sp-3']);
  });

  it('list Sort → Status orders cards along the lifecycle (pending → returned)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-ret', 'returned'),
      makeSP('sp-pend', 'pending'),
      makeSP('sp-cut', 'cutting'),
    ]);
    render(<OperationsBoard />);
    await switchToList(user);
    await setListSort(user, 'Status');
    expect(listCardIds()).toEqual(['sp-pend', 'sp-cut', 'sp-ret']);
  });

  it('list Sort → Status: a split-status group sits at its least-advanced leg', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    const gm = (id: string, status: ShorePointStatus, idx: number): ShorePoint => ({
      ...makeSP(id, status),
      shoreType: '3-post',
      groupId: 'g1',
      groupIndex: idx,
      groupTotal: 2,
      deployedBom: [{ role: 'strut', model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    // Group's front leg is 'secured' but a mate is still 'cutting'; a 'runner'
    // singleton sits between those two statuses in STATUS_ORDER.
    mockShorePoints.mockReturnValue([
      gm('sp-g-secured', 'secured', 1),
      gm('sp-g-cutting', 'cutting', 2),
      makeSP('sp-runner', 'runner'),
    ]);
    render(<OperationsBoard />);
    await switchToList(user);
    await setListSort(user, 'Status');
    const items = Array.from(document.querySelectorAll('.fs-ops-list > [role="listitem"]'));
    // Group keys on its least-advanced leg (cutting) → its compact row sits ahead
    // of the runner singleton. The row carries the group's front-leg id + ×2.
    expect(items[0]!.getAttribute('data-sp-id')).toBe('sp-g-secured');
    expect(items[0]!.querySelector('.fs-splist-grp')!.textContent).toContain('×2');
    expect(items[1]!.getAttribute('data-sp-id')).toBe('sp-runner');
  });

  it('list Sort → Added — newest first is newest-first', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    // All same status/location so only insertion order decides.
    mockShorePoints.mockReturnValue([
      makeSP('sp-a', 'pending'),
      makeSP('sp-b', 'pending'),
      makeSP('sp-c', 'pending'),
    ]);
    render(<OperationsBoard />);
    await switchToList(user);
    await setListSort(user, 'Added — newest first');
    expect(listCardIds()).toEqual(['sp-c', 'sp-b', 'sp-a']);
  });

  it('list Sort → Location orders by division desc then area asc', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      { ...makeSP('sp-d1b', 'pending', '1'), area: 'B' },
      { ...makeSP('sp-d2', 'pending', '2'), area: 'A' },
      { ...makeSP('sp-d1a', 'pending', '1'), area: 'A' },
    ]);
    render(<OperationsBoard />);
    await switchToList(user);
    // Default listSort is 'location'.
    expect(listCardIds()).toEqual(['sp-d2', 'sp-d1a', 'sp-d1b']);
  });

  it('a grouped multi-leg shore is one compact row (×N), not split rows, in the List', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([grouped3Post('sp-1', 1), grouped3Post('sp-2', 2), grouped3Post('sp-3', 3)]);
    render(<OperationsBoard />);
    await switchToList(user);
    const list = document.querySelector('.fs-ops-list')!;
    // One row for the whole shore (front leg id), tagged ×3 — not three rows.
    const rows = list.querySelectorAll(':scope > [role="listitem"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.getAttribute('data-sp-id')).toBe('sp-1');
    expect(rows[0]!.querySelector('.fs-splist-grp')!.textContent).toContain('×3');
  });

  // Heaviest interaction chain in the file (view switch + two full Filters
  // open→pick→Escape cycles = 7 userEvent steps); under contended parallel
  // workers it can brush the 5s default, so it gets its own budget.
  it('list Added direction lives in the Sort menu: newest ↔ oldest', { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-a', 'pending'),
      makeSP('sp-b', 'pending'),
      makeSP('sp-c', 'pending'),
    ]);
    render(<OperationsBoard />);
    await switchToList(user);
    await setListSort(user, 'Added — newest first');
    expect(listCardIds()).toEqual(['sp-c', 'sp-b', 'sp-a']);
    await setListSort(user, 'Added — oldest first');
    expect(listCardIds()).toEqual(['sp-a', 'sp-b', 'sp-c']);
  });

  it('the view switcher moves between Division, Board (lanes), and List', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    render(<OperationsBoard />);
    // Default = Board (lanes).
    expect(document.querySelector('.fs-ops-lanes')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    expect(document.querySelector('.fs-ops-list')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Division view' }));
    expect(document.querySelector('.fs-div')).not.toBeNull();
    expect(document.querySelector('.fs-ops-list')).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Board view' }));
    expect(document.querySelector('.fs-ops-lanes')).not.toBeNull();
    expect(document.querySelector('.fs-div')).toBeNull();
  });

  it('the view switcher is a three-option segmented (Division · Board · List)', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending')]);
    render(<OperationsBoard />);
    expect(screen.getByRole('radio', { name: 'Division view' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Board view' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'List view' })).toBeInTheDocument();
  });

  it('Division view stacks floors top→bottom with the Grade line between Div 1 and Sub 1', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-sub', 'pending', '-1'),
      makeSP('sp-grd', 'cutting', '1'),
      makeSP('sp-up', 'secured', '2'),
    ]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: 'Division view' }));

    // Bands read top floor → ground → basement.
    const gutters = [...document.querySelectorAll('.fs-div-gutter b')].map((e) => e.textContent);
    expect(gutters).toEqual(['2', '1', 'S1']);

    // Exactly one Grade line, and it sits with the sub-grade band (i.e. AFTER Div 1),
    // not above Div 1 (Alex's correction to the prototype).
    expect(document.querySelectorAll('.fs-div-grade')).toHaveLength(1);
    const subWrap = document.querySelector('.fs-div-lvl.is-sub')!.parentElement!;
    expect(subWrap.querySelector('.fs-div-grade')).not.toBeNull();
  });

  it('Division view drops legacy free-text divisions into a trailing Unplaced band, no grade', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending', '1'),
      makeSP('sp-roof', 'pending', 'Roof'),
    ]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: 'Division view' }));

    const unplaced = document.querySelector('.fs-div-lvl.is-unplaced');
    expect(unplaced).not.toBeNull();
    expect(unplaced!.querySelector('.fs-div-gutter span')!.textContent).toBe('Roof');
    // No above/below-grade split among unnumbered floors → no grade line at all here.
    expect(document.querySelectorAll('.fs-div-grade')).toHaveLength(0);
  });

  it('a Division tile opens the shore-point detail on tap', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'cutting', '2')]);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('radio', { name: 'Division view' }));
    await user.click(document.querySelector('.fs-divtile')! as HTMLElement);
    // The detail surface (drawer/sheet) opens for the tapped point.
    expect(document.querySelector('[data-sp-id="sp-1"]')).not.toBeNull();
  });

  it('layout + list sort persist across a remount (per-op localStorage)', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending'), makeSP('sp-2', 'returned')]);
    const { unmount } = render(<OperationsBoard />);
    await switchToList(user);
    await setListSort(user, 'Status');

    unmount();
    render(<OperationsBoard />);
    // Restored into List view with the Status sort — the Filters surface shows
    // Status as the selected sort row.
    expect(document.querySelector('.fs-ops-list')).not.toBeNull();
    await openFilters(user);
    expect(
      within(screen.getByRole('dialog', { name: 'Filters & sort' })).getByRole('radio', { name: 'Status' }),
    ).toBeChecked();
  });
});

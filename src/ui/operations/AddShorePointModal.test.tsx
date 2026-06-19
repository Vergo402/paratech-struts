// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddShorePointModal } from './AddShorePointModal';
import type { Operation, ShorePoint, FieldShoreEvent } from '@core/schema';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });
const mockOperation = vi.fn((): Operation | null => null);
const mockShorePoints = vi.fn((): ShorePoint[] => []);
const mockInventory = vi.fn(() => []);
const mockRecommendations = vi.fn(() => []);

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useShorePoints: () => mockShorePoints(),
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useInventory: () => mockInventory(),
  useRecommendations: () => mockRecommendations(),
}));

// Inline mode renders RecommendationCards in the form — mock to a bare Deploy
// button so the test drives the deploy path without fabricating a full combo.
vi.mock('./RecommendationCard', () => ({
  RecommendationCard: ({ combo, onDeploy }: { combo: { strut: { model: string } }; onDeploy: (c: unknown) => void }) => (
    <button type="button" onClick={() => onDeploy(combo)}>
      Deploy {combo.strut.model}
    </button>
  ),
  comboModel: (combo: { strut: { model: string } }) => combo.strut.model,
}));

const OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  inlineDeploy: false,
  divisions: [1],
  status: 'active',
  createdAt: 1000,
};

function makeSP(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 388,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

const submitButton = () => screen.getByRole('button', { name: 'Add Shore Point' });

/** Drive the measurement to N ft by typing into the Feet field (#248 re-drive). */
async function setMeasurementFeet(user: ReturnType<typeof userEvent.setup>, feet: number) {
  const ft = screen.getByRole('textbox', { name: 'Feet' });
  await user.clear(ft);
  await user.type(ft, String(feet));
}

describe('AddShorePointModal — create', () => {
  beforeEach(() => {
    mockCommit.mockClear();
    mockCommitMany.mockClear();
    mockOperation.mockReturnValue(OP);
    mockShorePoints.mockReturnValue([]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('submit is disabled until a measurement is entered', () => {
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('Enter the opening measurement')).toBeInTheDocument();
  });

  it('a single add commits ONE event with no group keys', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.click(submitButton());

    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const events = mockCommitMany.mock.calls[0]![0] as FieldShoreEvent[];
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event).toMatchObject({ type: 'ShorePointAdded', opId: 'op-1', by: 'device-test' });
    const sp = (event as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>).shorePoint;
    expect(sp).toMatchObject({ division: '1', shoreType: 't-shore', measurementEighths: 384, status: 'pending' });
    expect(sp).not.toHaveProperty('groupId');
    expect(sp).not.toHaveProperty('groupIndex');
    expect(sp).not.toHaveProperty('groupTotal');
    expect(sp).not.toHaveProperty('building');
    expect(sp).not.toHaveProperty('area');
    expect(sp).not.toHaveProperty('label');
  });

  it('KB-7: 3 T-Shores commit 3 INDEPENDENT events — single-strut shores are never grouped', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    render(<AddShorePointModal open onClose={() => {}} onAdded={onAdded} />);
    await setMeasurementFeet(user, 4);
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '3');
    await user.click(submitButton());

    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const events = mockCommitMany.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(events).toHaveLength(3);
    const sps = events.map((e) => e.shorePoint);
    for (const s of sps) {
      expect(s).not.toHaveProperty('groupId');
      expect(s).not.toHaveProperty('groupIndex');
      expect(s).not.toHaveProperty('groupTotal');
    }
    expect(new Set(sps.map((s) => s.id)).size).toBe(3); // distinct ids
    expect(new Set(sps.map((s) => s.measurementEighths))).toEqual(new Set([384]));
    expect(onAdded).toHaveBeenCalledWith(sps);
  });

  it('KB-7: ONE 3-Post commits 3 linked events — one groupId, indices 1..3, total 3', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    await user.click(submitButton());

    const events = mockCommitMany.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(events).toHaveLength(3);
    const sps = events.map((e) => e.shorePoint);
    const groupIds = new Set(sps.map((s) => s.groupId));
    expect(groupIds.size).toBe(1);
    expect([...groupIds][0]).toBeTruthy();
    expect(sps.map((s) => s.groupIndex)).toEqual([1, 2, 3]);
    expect(sps.every((s) => s.groupTotal === 3)).toBe(true);
    expect(new Set(sps.map((s) => s.id)).size).toBe(3);
  });

  it('KB-7: 2 Double-T shores commit 4 events in TWO per-shore groups of 2', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    render(<AddShorePointModal open onClose={() => {}} onAdded={onAdded} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: 'Double-T' }));
    await setMeasurementFeet(user, 4);
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '2');
    await user.click(submitButton());

    const events = mockCommitMany.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(events).toHaveLength(4);
    const sps = events.map((e) => e.shorePoint);
    const groupIds = [...new Set(sps.map((s) => s.groupId))];
    expect(groupIds).toHaveLength(2); // one group per PHYSICAL shore
    for (const gid of groupIds) {
      const shore = sps.filter((s) => s.groupId === gid);
      expect(shore.map((s) => s.groupIndex)).toEqual([1, 2]);
      expect(shore.every((s) => s.groupTotal === 2)).toBe(true);
    }
    expect(new Set(sps.map((s) => s.id)).size).toBe(4);
    expect(onAdded).toHaveBeenCalledWith(sps);
  });

  it('the helper pre-states the strut math (KB-7)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.queryByText(/= \d+ struts/)).not.toBeInTheDocument(); // 1 × T-Shore: silent

    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    expect(screen.getByText('i.e. 1 3-Post = 3 struts')).toBeInTheDocument();

    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '3');
    expect(screen.getByText('i.e. 3 3-Post = 9 struts')).toBeInTheDocument();
  });

  it('the warn threshold reads TOTAL struts — 4 × 3-Post = 12 trips it, never blocks (#220 OQ2)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '4');
    expect(screen.getByText('i.e. 4 3-Post = 12 struts — double-check the count')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('an empty / non-integer shore count disables submit with a reason', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.clear(screen.getByRole('textbox', { name: 'Number of Shore Sets' }));
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/whole number of 1 or more/)).toBeInTheDocument();
  });

  it('selecting 3-Post auto-fills 6×6 wood; switching back never resets (v3.9.1)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    const shoreType = screen.getByRole('radiogroup', { name: 'Shore type' });
    const headerGroup = () => screen.getByRole('radiogroup', { name: 'Header wood' });

    // #349: the deduction pickers start collapsed in the modal — open to reach Header wood.
    await user.click(screen.getByRole('button', { name: 'Deductions' }));
    expect(within(headerGroup()).getByRole('radio', { name: 'None' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(shoreType).getByRole('radio', { name: '3-Post' }));
    expect(within(headerGroup()).getByRole('radio', { name: '6×6' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(shoreType).getByRole('radio', { name: 'T-Shore' }));
    expect(within(headerGroup()).getByRole('radio', { name: '6×6' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Building shows only on a multi-building op, and is required there', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Building/ })).not.toBeInTheDocument();

    mockOperation.mockReturnValue({ ...OP, multiBuilding: true });
    rerender(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('Enter the building')).toBeInTheDocument();

    // Name a building via the picker's "Add building" input — required-gate clears.
    await user.click(screen.getByRole('button', { name: /Building/ }));
    await user.type(screen.getByRole('textbox', { name: 'Add building' }), 'North tower');
    await user.click(screen.getByRole('button', { name: '+ Add building' }));
    expect(submitButton()).toBeEnabled();
  });

  it('seeds building / division / area / shore type from the newest shore point', () => {
    mockOperation.mockReturnValue({ ...OP, multiBuilding: true, divisions: [1, 2] });
    mockShorePoints.mockReturnValue([
      makeSP({ id: 'a', division: '1' }),
      makeSP({ id: 'b', division: '2', shoreType: 'double-t', building: 'North tower', area: 'NW corner' }),
    ]);
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('2'); // compact: bare floor number
    const shoreType = screen.getByRole('radiogroup', { name: 'Shore type' });
    expect(within(shoreType).getByRole('radio', { name: 'Double-T' })).toHaveAttribute('aria-checked', 'true');
    // The whole location block carries over from the newest point (#248 re-drive).
    expect(screen.getByRole('button', { name: /Building/ })).toHaveTextContent('North tower');
    expect(screen.getByRole('textbox', { name: 'Area / Room #' })).toHaveValue('NW corner');
  });
});

describe('AddShorePointModal — edit (#220 3-R)', () => {
  const EDIT_SP = makeSP({ area: 'NW corner', label: 'B-2' });

  beforeEach(() => {
    mockCommit.mockClear();
    mockCommitMany.mockClear();
    mockOperation.mockReturnValue(OP);
    mockShorePoints.mockReturnValue([EDIT_SP]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('pre-populates, hides Number of Shore Sets, and titles "Edit Shore Point"', () => {
    render(<AddShorePointModal open onClose={() => {}} shorePoint={EDIT_SP} />);
    expect(screen.getByRole('dialog', { name: 'Edit Shore Point' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Number of Shore Sets' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Area / Room #' })).toHaveValue('NW corner');
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('B-2');
  });

  it('no changes → Save closes without committing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddShorePointModal open onClose={onClose} shorePoint={EDIT_SP} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockCommitMany).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('a diff-only patch: area change emits only { area }', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} shorePoint={EDIT_SP} />);
    const area = screen.getByRole('textbox', { name: 'Area / Room #' });
    await user.clear(area);
    await user.type(area, 'Stairwell B');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockCommit).toHaveBeenCalledTimes(1);
    const event = mockCommit.mock.calls[0]![0];
    expect(event).toMatchObject({ type: 'ShorePointEdited', spId: 'sp-1' });
    expect(event.patch).toEqual({ area: 'Stairwell B' });
  });

  it('clearing the label sends label: null (the null-clears convention)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} shorePoint={EDIT_SP} />);
    await user.clear(screen.getByRole('textbox', { name: 'Label' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockCommit.mock.calls[0]![0].patch).toEqual({ label: null });
  });

  it('changing the type to MORE struts rebuilds the shore (hard-remove old, add new group, keep #)', async () => {
    const user = userEvent.setup();
    const sp = makeSP({ id: 'sp-1', seq: 5 }); // T-Shore = 1 strut
    mockShorePoints.mockReturnValue([sp]);
    render(<AddShorePointModal open onClose={() => {}} shorePoint={sp} />);

    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: 'Double-T' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockCommit).not.toHaveBeenCalled(); // a restructure, not a patch
    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const events = mockCommitMany.mock.calls[0]![0] as FieldShoreEvent[];
    const deletes = events.filter((e) => e.type === 'ShorePointDeleted');
    const adds = events.filter((e) => e.type === 'ShorePointAdded') as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(deletes).toEqual([expect.objectContaining({ spId: 'sp-1', hard: true })]); // hard, not soft
    expect(adds).toHaveLength(2); // Double-T = 2 struts
    expect(adds.every((e) => e.shorePoint.shoreType === 'double-t')).toBe(true);
    expect(adds.every((e) => e.shorePoint.seq === 5)).toBe(true); // number preserved
    expect(adds.every((e) => e.shorePoint.groupTotal === 2)).toBe(true);
    expect(new Set(adds.map((e) => e.shorePoint.groupId)).size).toBe(1); // one shared group
  });

  it('changing the type to FEWER struts drops the extras hard (3-Post → T-Shore)', async () => {
    const user = userEvent.setup();
    const member = (id: string, i: number) =>
      makeSP({ id, seq: 7, shoreType: '3-post', groupId: 'g1', groupIndex: i, groupTotal: 3 });
    const members = [member('a', 1), member('b', 2), member('c', 3)];
    mockShorePoints.mockReturnValue(members);
    render(<AddShorePointModal open onClose={() => {}} shorePoint={members[0]} />);

    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: 'T-Shore' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const events = mockCommitMany.mock.calls[0]![0] as FieldShoreEvent[];
    const deletes = events.filter((e) => e.type === 'ShorePointDeleted');
    const adds = events.filter((e) => e.type === 'ShorePointAdded') as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(deletes).toHaveLength(3); // all 3 old struts removed
    expect(deletes.every((e) => 'hard' in e && e.hard === true)).toBe(true);
    expect(adds).toHaveLength(1); // T-Shore = 1 strut
    expect(adds[0]!.shorePoint.shoreType).toBe('t-shore');
    expect(adds[0]!.shorePoint.seq).toBe(7); // number preserved
    expect(adds[0]!.shorePoint.groupId).toBeUndefined(); // no longer grouped
  });
});

describe('AddShorePointModal — one-step inline deploy', () => {
  const INLINE_OP: Operation = { ...OP, inlineDeploy: true };
  const INV = [
    { id: 'inv-1', type: 'strut', model: 'LS 203', apparatus: 'Rescue 2', apparatusId: 'a1', quantity: 2, available: 2 },
  ];
  const COMBO = { strut: { id: 's1', inventoryId: 'inv-1', model: 'LS 203' }, extensions: [] };

  beforeEach(() => {
    mockCommit.mockClear();
    mockCommitMany.mockClear();
    mockOperation.mockReturnValue(INLINE_OP);
    mockShorePoints.mockReturnValue([]);
    mockInventory.mockReturnValue(INV as never);
    mockRecommendations.mockReturnValue([COMBO] as never);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('shows Find + Save as Pending (not the two-step Add button)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    expect(screen.getByRole('button', { name: 'Find Available Struts' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save as Pending' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Shore Point' })).toBeNull();
  });

  it('no available stock → a notice + "Add to Pending", no dead-end Find button', async () => {
    // every strut out (available 0) → one-step mode has nothing to deploy.
    mockInventory.mockReturnValue([
      { id: 'inv-1', type: 'strut', model: 'LS 203', apparatus: 'Rescue 2', apparatusId: 'a1', quantity: 2, available: 0 },
    ] as never);
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    expect(screen.getByText(/No stock available to deploy/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find Available Struts' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add to Pending' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Save as Pending' })).toBeNull();
  });

  it('offers a Group picker built from on-scene apparatus', () => {
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('Find reveals recommendations; Deploy creates the point AND deploys the strut', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddShorePointModal open onClose={onClose} />);
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // 1) the point is created via the atomic add batch …
    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const adds = mockCommitMany.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>[];
    expect(adds).toHaveLength(1);
    const created = adds[0]!.shorePoint;

    // 2) … then the chosen strut is deployed onto that same point (separate
    //    commit — commitMany can't carry inventory events).
    expect(mockCommit).toHaveBeenCalledTimes(1);
    const deploy = mockCommit.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'EquipmentDeployed' }>;
    expect(deploy.type).toBe('EquipmentDeployed');
    expect(deploy.spId).toBe(created.id);
    expect(deploy.deployedBom).toHaveLength(1);
    expect(deploy.deployedBom[0]).toMatchObject({ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' });
    expect(onClose).toHaveBeenCalled();
  });

  it('full success: onDeployed reports every point deployed, none Pending (audit W1)', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    render(<AddShorePointModal open onClose={() => {}} onDeployed={onDeployed} />);
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    expect(onDeployed).toHaveBeenCalledTimes(1);
    const [deployed, pending, model] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(1);
    expect(pending).toHaveLength(0);
    expect(model).toBe('LS 203');
  });

  it('partial stock: deploys what it can, reports the rest Pending — never a silent full success (audit W1)', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    const onClose = vi.fn();
    // One LS 203 on scene, but a 3-Post needs three struts.
    mockInventory.mockReturnValue([{ ...INV[0], quantity: 1, available: 1 }] as never);
    mockCommit
      .mockResolvedValueOnce({ ok: true }) // 1st strut deploys
      .mockResolvedValueOnce({ ok: false, reason: 'inventory item inv-1 has none available (L-8 abort)' });
    render(<AddShorePointModal open onClose={onClose} onDeployed={onDeployed} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // The loop stops at the first abort — 1 success + 1 failed attempt, no blind 3rd.
    expect(mockCommit).toHaveBeenCalledTimes(2);
    expect(onDeployed).toHaveBeenCalledTimes(1);
    const [deployed, pending, model] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(1);
    expect(pending).toHaveLength(2);
    expect(model).toBe('LS 203');
    expect(onClose).toHaveBeenCalled();
  });

  it('total failure: nothing deploys → all Pending, modal still closes, no false success (audit W1)', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    const onClose = vi.fn();
    mockCommit.mockResolvedValueOnce({ ok: false, reason: 'inventory item inv-1 has none available (L-8 abort)' });
    render(<AddShorePointModal open onClose={onClose} onDeployed={onDeployed} />);
    await setMeasurementFeet(user, 4); // single T-Shore
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    expect(mockCommit).toHaveBeenCalledTimes(1); // first attempt fails, loop breaks
    const [deployed, pending] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(0);
    expect(pending).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
  });
});

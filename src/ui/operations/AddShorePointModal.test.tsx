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

/** Drive the measurement to 4 ft via the foot stepper (96 eighths per tap). */
async function setMeasurementFeet(user: ReturnType<typeof userEvent.setup>, feet: number) {
  const up = screen.getByRole('button', { name: 'Up one foot' });
  for (let i = 0; i < feet; i++) await user.click(up);
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
    const qty = screen.getByRole('textbox', { name: 'Number of shores' });
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
    const qty = screen.getByRole('textbox', { name: 'Number of shores' });
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
    expect(screen.getByText('1 × 3-Post = 3 struts')).toBeInTheDocument();

    const qty = screen.getByRole('textbox', { name: 'Number of shores' });
    await user.clear(qty);
    await user.type(qty, '3');
    expect(screen.getByText('3 × 3-Post = 9 struts')).toBeInTheDocument();
  });

  it('the warn threshold reads TOTAL struts — 4 × 3-Post = 12 trips it, never blocks (#220 OQ2)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    const qty = screen.getByRole('textbox', { name: 'Number of shores' });
    await user.clear(qty);
    await user.type(qty, '4');
    expect(screen.getByText('4 × 3-Post = 12 struts — double-check the count')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('an empty / non-integer shore count disables submit with a reason', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.clear(screen.getByRole('textbox', { name: 'Number of shores' }));
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/whole number of 1 or more/)).toBeInTheDocument();
  });

  it('selecting 3-Post auto-fills 6×6 wood; switching back never resets (v3.9.1)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    const shoreType = screen.getByRole('radiogroup', { name: 'Shore type' });
    const headerGroup = () => screen.getByRole('radiogroup', { name: 'Header wood' });

    expect(within(headerGroup()).getByRole('radio', { name: 'None' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(shoreType).getByRole('radio', { name: '3-Post' }));
    expect(within(headerGroup()).getByRole('radio', { name: '6×6' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(shoreType).getByRole('radio', { name: 'T-Shore' }));
    expect(within(headerGroup()).getByRole('radio', { name: '6×6' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Building shows only on a multi-building op, and is required there', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.queryByRole('textbox', { name: 'Building' })).not.toBeInTheDocument();

    mockOperation.mockReturnValue({ ...OP, multiBuilding: true });
    rerender(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('Enter the building')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Building' }), 'North tower');
    expect(submitButton()).toBeEnabled();
  });

  it('seeds division / shore type / building from the newest shore point', () => {
    mockOperation.mockReturnValue({ ...OP, multiBuilding: true, divisions: [1, 2] });
    mockShorePoints.mockReturnValue([
      makeSP({ id: 'a', division: '1' }),
      makeSP({ id: 'b', division: '2', shoreType: 'double-t', building: 'North tower' }),
    ]);
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('Div 2 (+1 floor up)');
    const shoreType = screen.getByRole('radiogroup', { name: 'Shore type' });
    expect(within(shoreType).getByRole('radio', { name: 'Double-T' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: 'Building' })).toHaveValue('North tower');
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

  it('pre-populates, hides Number of shores, and titles "Edit Shore Point"', () => {
    render(<AddShorePointModal open onClose={() => {}} shorePoint={EDIT_SP} />);
    expect(screen.getByRole('dialog', { name: 'Edit Shore Point' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Number of shores' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Area' })).toHaveValue('NW corner');
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
    const area = screen.getByRole('textbox', { name: 'Area' });
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

  it('offers a Group picker built from on-scene apparatus', () => {
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByText('Group (assigned apparatus)')).toBeInTheDocument();
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
    const deploy = mockCommit.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'StrutDeployed' }>;
    expect(deploy.type).toBe('StrutDeployed');
    expect(deploy.spId).toBe(created.id);
    expect(deploy.deployedStrut).toMatchObject({ model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' });
    expect(onClose).toHaveBeenCalled();
  });
});

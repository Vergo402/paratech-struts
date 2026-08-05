// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddShorePointModal } from './AddShorePointModal';
import type { InventoryItem, Operation, ShorePoint, FieldShoreEvent } from '@core/schema';
import { findForShorePoint } from '@core/shorepoint';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });
const mockOperation = vi.fn((): Operation | null => null);
const mockShorePoints = vi.fn((): ShorePoint[] => []);
const mockInventory = vi.fn(() => []);
const mockRecommendations = vi.fn(() => []);
const mockW3wEnabled = vi.fn(() => false); // #441 — flipped on in the capture tests
const mockConvert = vi.fn(() => Promise.resolve('filled.count.soap'));

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useShorePoints: () => mockShorePoints(),
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useInventory: () => mockInventory(),
  useRecommendations: () => mockRecommendations(),
  // #441 — location capture reaches w3w through the seam.
  w3wEnabled: () => mockW3wEnabled(),
  convertToWords: () => mockConvert(),
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
  saws: ['A'],
  status: 'active',
  createdAt: 1000,
  currentPeriod: 1,
  periods: [{ number: 1, startedAt: 1000 }],
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
    expect(screen.getByText('1 3-Post = 3 struts')).toBeInTheDocument();

    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '3');
    // qty > 1 also states the sets are independent (SIM-IV O-5, #400).
    expect(screen.getByText('Each set is its own independent shore point · 3 3-Post = 9 struts')).toBeInTheDocument();
  });

  it('states "sets" are independent shore points for a 1-strut T-Shore (SIM-IV O-5, #400)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    // T-Shore is 1 strut, so the ratio note stays silent; the independence line
    // is the whole point — qty 3 T-Shores are 3 loose cards, not a linked group.
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '3');
    expect(screen.getByText('Each set is its own independent shore point')).toBeInTheDocument();
    expect(screen.queryByText(/= \d+ struts/)).not.toBeInTheDocument();
  });

  it('the warn threshold reads TOTAL struts — 4 × 3-Post = 12 trips it, never blocks (#220 OQ2)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    const qty = screen.getByRole('textbox', { name: 'Number of Shore Sets' });
    await user.clear(qty);
    await user.type(qty, '4');
    expect(
      screen.getByText('Each set is its own independent shore point · 4 3-Post = 12 struts — double-check the count'),
    ).toBeInTheDocument();
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

  // SME-2 (Phase J gate #260). v3.9.1 doctrine: ONLY 3-Post auto-fills its wood
  // (6×6, USACE/FEMA spec). T-Shore / Double-T can be built 4×4 or 6×6 by load and
  // span, so their wood must be an EXPLICIT operator choice — not "whatever 3-Post
  // happened to leave behind." These three cases pin the invariant symmetrically:
  // the auto-fill retracts on the way out, but never over an operator's own pick.
  // (Replaces a single test that pinned the old leaky behavior — it asserted the
  // 6×6 SURVIVED the switch to T-Shore, which is the deviation itself.)
  describe('SME-2 — 3-Post wood auto-fill is symmetric and never clobbers a choice', () => {
    /** #349: the deduction pickers start collapsed in the modal — open to reach them. */
    async function openForm() {
      const user = userEvent.setup();
      render(<AddShorePointModal open onClose={() => {}} />);
      await user.click(screen.getByRole('button', { name: /Deductions/ }));
      return {
        user,
        shoreType: () => screen.getByRole('radiogroup', { name: 'Shore type' }),
        header: () => screen.getByRole('radiogroup', { name: 'Header wood' }),
        footer: () => screen.getByRole('radiogroup', { name: 'Footer wood' }),
      };
    }
    const checked = (group: HTMLElement, name: string) =>
      within(group).getByRole('radio', { name }).getAttribute('aria-checked');

    it('3-Post seeds 6×6/6×6, and leaving 3-Post RETRACTS it back to None', async () => {
      const f = await openForm();
      expect(checked(f.header(), 'None')).toBe('true');

      await f.user.click(within(f.shoreType()).getByRole('radio', { name: '3-Post' }));
      expect(checked(f.header(), '6×6')).toBe('true');
      expect(checked(f.footer(), '6×6')).toBe('true');

      // The fix: a T-Shore must not inherit a 6×6 the operator never chose for it.
      await f.user.click(within(f.shoreType()).getByRole('radio', { name: 'T-Shore' }));
      expect(checked(f.header(), 'None')).toBe('true');
      expect(checked(f.footer(), 'None')).toBe('true');
    });

    it('an operator wood pick made on 3-Post SURVIVES the switch away — never clobbered', async () => {
      const f = await openForm();
      await f.user.click(within(f.shoreType()).getByRole('radio', { name: '3-Post' }));
      // Operator overrides the seeded header to 4×4 — an explicit choice.
      await f.user.click(within(f.header()).getByRole('radio', { name: '4×4' }));
      expect(checked(f.header(), '4×4')).toBe('true');

      await f.user.click(within(f.shoreType()).getByRole('radio', { name: 'T-Shore' }));
      // Both woods carry forward untouched: the pair no longer matches the seed, so
      // the retraction correctly stands down rather than wiping a deliberate choice.
      expect(checked(f.header(), '4×4')).toBe('true');
      expect(checked(f.footer(), '6×6')).toBe('true');
    });

    it('a deliberate 6×6 on a T-Shore survives T-Shore → Double-T (the `prev` gate)', async () => {
      const f = await openForm();
      // Never touches 3-Post: the operator picks 6×6 on a T-Shore themselves.
      await f.user.click(within(f.header()).getByRole('radio', { name: '6×6' }));
      await f.user.click(within(f.footer()).getByRole('radio', { name: '6×6' }));

      await f.user.click(within(f.shoreType()).getByRole('radio', { name: 'Double-T' }));
      // Value-equal to the 3-Post seed, but we're not LEAVING 3-Post — retraction
      // must not fire, or a non-3-Post switch would eat the operator's own 6×6.
      expect(checked(f.header(), '6×6')).toBe('true');
      expect(checked(f.footer(), '6×6')).toBe('true');
    });
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

  it('seeds building / division / area from the newest shore point, but resets shore type (O-6)', () => {
    mockOperation.mockReturnValue({ ...OP, multiBuilding: true, divisions: [1, 2] });
    mockShorePoints.mockReturnValue([
      makeSP({ id: 'a', division: '1' }),
      makeSP({ id: 'b', division: '2', shoreType: 'double-t', building: 'North tower', area: 'NW corner' }),
    ]);
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('2'); // compact: bare floor number
    const shoreType = screen.getByRole('radiogroup', { name: 'Shore type' });
    // Shore type is DELIBERATELY not carried (SIM-IV O-6) — every new point starts
    // at T-Shore so a carried 3-Post/Double-T can't silently mis-type the next shore.
    expect(within(shoreType).getByRole('radio', { name: 'T-Shore' })).toHaveAttribute('aria-checked', 'true');
    expect(within(shoreType).getByRole('radio', { name: 'Double-T' })).toHaveAttribute('aria-checked', 'false');
    // The rest of the location block still carries over from the newest point (#248 re-drive).
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

  // 2026-07-02 audit #3: a same-count measurement/deduction edit on ONE leg of a
  // grouped shore must fan out to every leg, or the physical shore's struts diverge
  // into different effective + cut lengths.
  it('editing one Double-T leg (count unchanged) fans the SAME patch to every live group-mate', async () => {
    const user = userEvent.setup();
    const member = (id: string, i: number) =>
      makeSP({ id, seq: 4, shoreType: 'double-t', measurementEighths: 96 * 8, groupId: 'g1', groupIndex: i, groupTotal: 2 });
    const members = [member('dt-1', 1), member('dt-2', 2)];
    mockShorePoints.mockReturnValue(members);
    render(<AddShorePointModal open onClose={() => {}} shorePoint={members[0]} />);

    // Change ONLY the measurement (shore type / count unchanged → the patch path).
    await setMeasurementFeet(user, 6); // 6 ft = 72"
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // NOT a single-target commit — a fan-out via commitMany, one edit per leg.
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const edits = mockCommitMany.mock.calls[0]![0] as Extract<FieldShoreEvent, { type: 'ShorePointEdited' }>[];
    expect(edits).toHaveLength(2);
    expect(new Set(edits.map((e) => e.spId))).toEqual(new Set(['dt-1', 'dt-2']));
    // Both legs get the identical measurement patch — no divergence.
    expect(edits.every((e) => e.patch.measurementEighths === 72 * 8)).toBe(true);
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

  // #259/ADR-008: the field is labelled "Assigned", NOT "Group" — it holds an
  // apparatus assignment (`assignedResource`), and in NIMS a Group is a functional
  // command unit, not a resource. The old "Group" label was the v3.5.0 misnomer.
  it('offers an Assigned picker built from on-scene apparatus', () => {
    render(<AddShorePointModal open onClose={() => {}} />);
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.queryByText('Group')).toBeNull();
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
    mockCommit.mockResolvedValueOnce({ ok: true }); // 1st strut deploys; there is no 2nd to draw
    render(<AddShorePointModal open onClose={onClose} onDeployed={onDeployed} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // #452 — the loop now decrements a working copy as it goes, so members 2–3 see
    // the model is out ACROSS every rig and stay Pending without a doomed round-trip.
    expect(mockCommit).toHaveBeenCalledTimes(1);
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

describe('location capture (#441) — explicit in the form', () => {
  beforeEach(() => {
    mockCommitMany.mockClear();
    mockConvert.mockClear();
    mockOperation.mockReturnValue(OP); // two-step (inlineDeploy:false) → "Add Shore Point"
    mockShorePoints.mockReturnValue([]);
    mockW3wEnabled.mockReturnValue(true);
    mockConvert.mockResolvedValue('filled.count.soap');
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 25.874, longitude: -80.1217 } }) },
    });
  });

  function addedFrom(): ShorePoint {
    const events = mockCommitMany.mock.calls.at(-1)![0] as FieldShoreEvent[];
    const added = events.find((e) => e.type === 'ShorePointAdded');
    return (added as Extract<FieldShoreEvent, { type: 'ShorePointAdded' }>).shorePoint;
  }

  it('captures GPS + words and writes both onto the created point', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: /Capture location/ }));
    expect(await screen.findByText('filled.count.soap')).toBeInTheDocument(); // words confirm in-form
    await user.click(submitButton());
    const sp = addedFrom();
    expect(sp.coords).toEqual({ lat: 25.874, lng: -80.1217 });
    expect(sp.w3w).toBe('filled.count.soap');
  });

  it('conversion off (no key/plan) → coordinates saved, words left for the backfill', async () => {
    mockW3wEnabled.mockReturnValue(false);
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: /Capture location/ }));
    expect(await screen.findByText(/25\.87400, -80\.12170/)).toBeInTheDocument(); // coords chip
    expect(mockConvert).not.toHaveBeenCalled();
    await user.click(submitButton());
    const sp = addedFrom();
    expect(sp.coords).toEqual({ lat: 25.874, lng: -80.1217 });
    expect(sp.w3w).toBeUndefined();
  });

  it('no capture → the point saves with no location (unchanged flow)', async () => {
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.click(submitButton());
    const sp = addedFrom();
    expect(sp.coords).toBeUndefined();
    expect(sp.w3w).toBeUndefined();
  });

  it('a failed conversion still keeps the captured coordinates', async () => {
    mockConvert.mockRejectedValue(new Error('quota'));
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} />);
    await setMeasurementFeet(user, 4);
    await user.click(screen.getByRole('button', { name: /Capture location/ }));
    expect(await screen.findByText(/25\.87400, -80\.12170/)).toBeInTheDocument();
    await user.click(submitButton());
    const sp = addedFrom();
    expect(sp.coords).toEqual({ lat: 25.874, lng: -80.1217 });
    expect(sp.w3w).toBeUndefined();
  });
});

/**
 * #452 — a group deploy must re-resolve its source row PER MEMBER.
 *
 * The bug: `handleDeploy` resolved `item`/`inventoryId` once, outside the loop, and
 * pinned that one row for every member. Once it was drained, members 2+ aborted
 * "stock exhausted" while the identical strut model sat on another rig's row.
 *
 * REAL ENGINE. `findForShorePoint` is NOT mocked here — every combo below comes from
 * the actual fit engine over the actual load tables, so the fixture can't drift into
 * a shape the app would never hand `handleDeploy`. `useRecommendations` is still the
 * seam (the component reads its combos through it), but what it returns is real.
 */
describe('AddShorePointModal — #452 per-member source resolution', () => {
  const INLINE_OP: Operation = { ...OP, inlineDeploy: true };

  const strutRow = (id: string, apparatus: string, available: number): InventoryItem => ({
    id,
    type: 'strut',
    model: 'LS 406', // 48–73″ collapsed/extended — fits the 5 ft opening below
    system: 'LongShore',
    apparatus,
    apparatusId: `ap-${id}`,
    quantity: available,
    available,
  });

  const plateRow = (id: string, apparatus: string, available: number): InventoryItem => ({
    id,
    type: 'plate',
    plateId: 'rigid6',
    apparatus,
    apparatusId: `ap-${id}`,
    quantity: available,
    available,
  });

  /** The real engine's LS 406 recommendation for a 5 ft opening over `inv`. */
  function realCombo(inv: InventoryItem[], deductions?: ShorePoint['deductions']) {
    const sp = makeSP({
      shoreType: '3-post',
      measurementEighths: 480, // 5 ft
      ...(deductions ? { deductions } : {}),
    });
    const combo = findForShorePoint(sp, inv).find((c) => c.strut.model === 'LS 406' && c.extensions.length === 0);
    expect(combo, 'the real engine should recommend a bare LS 406 for this fixture').toBeDefined();
    return combo!;
  }

  /** Build a 3-Post at 5 ft and fire the mocked card's Deploy. */
  async function deployThreePost(user: ReturnType<typeof userEvent.setup>) {
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 5);
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
  }

  const deployEvents = () =>
    mockCommit.mock.calls
      .map((c) => c[0] as FieldShoreEvent)
      .filter((e): e is Extract<FieldShoreEvent, { type: 'EquipmentDeployed' }> => e.type === 'EquipmentDeployed');

  /** Which inventory row each deploy drew its STRUT from, tallied. */
  function strutClaims() {
    const tally: Record<string, number> = {};
    for (const e of deployEvents()) {
      const strut = e.deployedBom.find((c) => c.role === 'strut')!;
      const key = strut.inventoryId ?? 'untracked';
      tally[key] = (tally[key] ?? 0) + 1;
    }
    return tally;
  }

  beforeEach(() => {
    mockCommit.mockReset().mockResolvedValue({ ok: true });
    mockCommitMany.mockReset().mockResolvedValue({ ok: true });
    mockOperation.mockReturnValue(INLINE_OP);
    mockShorePoints.mockReturnValue([]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('spreads a 3-Post across TWO rigs — 1 on one row, 2 on the next, none falsely Pending', async () => {
    // The model's stock is split 1 + 2. Pre-fix, member 1 drained the first row and
    // members 2–3 aborted "stock exhausted" with two identical struts still on scene.
    const inv = [strutRow('inv-a', 'Rescue 2', 1), strutRow('inv-b', 'Engine 4', 2)];
    mockInventory.mockReturnValue(inv as never);
    mockRecommendations.mockReturnValue([realCombo(inv)] as never);

    const user = userEvent.setup();
    const onDeployed = vi.fn();
    render(<AddShorePointModal open onClose={() => {}} onDeployed={onDeployed} />);
    await deployThreePost(user);

    const [deployed, pending] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(3);
    expect(pending).toHaveLength(0);

    // Each member drew a WHOLE row of its own (ADR-033 — never split across rows),
    // and the claims add up to the stock that was actually on scene. Which rig went
    // first is engine ordering, so assert the distribution, not the order.
    expect(deployEvents()).toHaveLength(3);
    expect(strutClaims()).toEqual({ 'inv-a': 1, 'inv-b': 2 });
    for (const e of deployEvents()) {
      expect(e.deployedBom.filter((c) => c.role === 'strut')).toHaveLength(1);
    }
  });

  it('genuine exhaustion: 2 struts on scene, 3 members → 2 deploy, 1 honestly Pending', async () => {
    const inv = [strutRow('inv-a', 'Rescue 2', 1), strutRow('inv-b', 'Engine 4', 1)];
    mockInventory.mockReturnValue(inv as never);
    mockRecommendations.mockReturnValue([realCombo(inv)] as never);

    const user = userEvent.setup();
    const onDeployed = vi.fn();
    const onClose = vi.fn();
    render(<AddShorePointModal open onClose={onClose} onDeployed={onDeployed} />);
    await deployThreePost(user);

    const [deployed, pending, model] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(2);
    expect(pending).toHaveLength(1);
    expect(model).toBe('LS 406');
    // The 3rd member never round-trips the store: the working copy already knows
    // no rig has an LS 406 left, so it stays Pending without a doomed commit.
    expect(deployEvents()).toHaveLength(2);
    expect(strutClaims()).toEqual({ 'inv-a': 1, 'inv-b': 1 });
    expect(onClose).toHaveBeenCalled();
  });

  it('never turns a running-out plate into a silent off-book deploy (ADR-033)', async () => {
    // Struts for all three, but ONE base plate on scene. Member 1 takes it; members
    // 2–3 must stay Pending rather than deploy carrying an untracked plate the store
    // would never decrement.
    const inv = [strutRow('inv-a', 'Rescue 2', 3), plateRow('inv-p', 'Rescue 2', 1)];
    mockInventory.mockReturnValue(inv as never);
    const withPlate = { headerWood: 'none', footerWood: 'none', topPlate: 'rigid6', bottomPlate: 'none' } as const;
    mockRecommendations.mockReturnValue([realCombo(inv, withPlate)] as never);

    const user = userEvent.setup();
    const onDeployed = vi.fn();
    render(<AddShorePointModal open onClose={() => {}} onDeployed={onDeployed} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' }));
    await setMeasurementFeet(user, 5);
    // Pick the 6" Rigid Base as the top plate through the form's own controls.
    await user.click(screen.getByRole('button', { name: /Deductions/ }));
    await user.click(screen.getByRole('button', { name: /Top plate/ }));
    // The grid's options sit under a CSS-animated overlay jsdom reports as
    // pointer-events: none — fire the click directly rather than fake a pointer.
    fireEvent.click(screen.getByRole('option', { name: /6" Rigid Base/ }));
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    const [deployed, pending] = onDeployed.mock.calls[0]!;
    expect(deployed).toHaveLength(1);
    expect(pending).toHaveLength(2);
    // The one deploy that landed carries the TRACKED plate — and nothing that ran
    // out ever rode as an inventoryId-less component.
    expect(deployEvents()).toHaveLength(1);
    // The PLATE is what held members 2–3, not the struts: the strut row had 3 and
    // gave up exactly 1. Without this the assertion above would also pass if strut
    // resolution had failed for an unrelated reason.
    expect(strutClaims()).toEqual({ 'inv-a': 1 });
    const plate = deployEvents()[0]!.deployedBom.find((c) => c.role === 'top-plate');
    expect(plate).toMatchObject({ inventoryId: 'inv-p', source: 'Rescue 2' });
    for (const e of deployEvents()) {
      expect(e.deployedBom.some((c) => c.inventoryId === undefined)).toBe(false);
    }
  });
});

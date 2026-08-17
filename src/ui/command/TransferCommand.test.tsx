// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedOrgState, defaultPositionId } from '@core/org';
import type { Apparatus, OrgPositions, ShorePoint } from '@core/schema';

/**
 * #489 — apparatus are first-class command-transfer targets. ADR-021 Addendum 2 scopes
 * the 4-digit accept code to named-individual AND apparatus targets; before this the
 * picker only ever offered individuals/devices, so "Battalion 1 has command" had to be
 * re-typed as free text (which mints an INDIVIDUAL ref for a rig).
 *
 * R6 (2026-08-17): the app has no on-scene telemetry, so the list is scoped to rigs
 * assigned to the ACTIVE OP — via an org-chart position or a live shore point's
 * assignedResource — never the full department roster. Idle rigs are excluded and the
 * unearned "Available" status text is gone.
 */

const mockEmit = vi.fn();
let positions: OrgPositions;
let apparatusRoster: Apparatus[];
let shorePoints: ShorePoint[];

vi.mock('./useOrgCommit', () => ({ useOrgCommit: () => mockEmit }));
// The ICS-201 brief pulls its own hook graph (SitStat) — not under test here.
vi.mock('./ICS201Brief', () => ({ ICS201Brief: () => null }));
vi.mock('@ui/hooks', () => ({
  useOrg: () => positions,
  useRoster: () => [],
  useApparatus: () => ({ roster: apparatusRoster, add: vi.fn(), remove: vi.fn() }),
  useShorePoints: () => shorePoints,
}));

import { TransferCommand } from './TransferCommand';

const ENGINE: Apparatus = { id: 'app-e1', name: 'Engine 1', type: 'Engine' };
const BATTALION: Apparatus = { id: 'app-b1', name: 'Battalion 1', type: 'Chief' };
const RESCUE: Apparatus = { id: 'app-r1', name: 'Rescue 1', type: 'Rescue' };

const icId = defaultPositionId('op1', 'ic');
const shoringId = defaultPositionId('op1', 'shoring');
const opsId = defaultPositionId('op1', 'ops');

function seed(): OrgPositions {
  const p = seedOrgState('op1', 'dev-1').positions;
  // A named individual holds command, another leads Operations; Engine 1 is assigned to
  // Shoring on the org chart. Battalion 1 and Rescue 1 hold no org-chart position — one
  // (Rescue 1) is picked up by the shore-point signal instead; Battalion 1 stays unassigned.
  return {
    ...p,
    [opsId]: {
      ...p[opsId]!,
      assignedResources: [{ ref: 'individual', value: 'BC Smith', label: 'BC Smith' }],
    },
    [icId]: {
      ...p[icId]!,
      assignedResources: [{ ref: 'individual', value: 'Capt. Doyle', label: 'Capt. Doyle' }],
    },
    [shoringId]: {
      ...p[shoringId]!,
      assignedResources: [{ ref: 'apparatus', value: ENGINE.id, label: ENGINE.name }],
    },
  };
}

function sp(overrides: Partial<ShorePoint>): ShorePoint {
  return {
    id: 'sp1',
    opId: 'op1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 80,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  mockEmit.mockReset().mockResolvedValue(undefined);
  positions = seed();
  apparatusRoster = [ENGINE, BATTALION, RESCUE];
  shorePoints = [sp({ assignedResource: RESCUE.name })];
});

describe('TransferCommand — apparatus targets (#489)', () => {
  it('offers the rigs assigned to the op (org chart or a shore point) in their own group', () => {
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).getByText('Engine 1')).toBeInTheDocument(); // org-chart signal
    expect(within(rigs).getByText('Rescue 1')).toBeInTheDocument(); // shore-point signal
    // People stay in their own group — the rigs are not mixed in.
    const chart = screen.getByRole('list', { name: 'On the org chart' });
    expect(within(chart).queryByText('Engine 1')).not.toBeInTheDocument();
  });

  it('excludes a rig assigned to neither an org-chart position nor a shore point (R6)', () => {
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).queryByText('Battalion 1')).not.toBeInTheDocument();
  });

  it('ignores a deleted shore point\'s assignment', () => {
    shorePoints = [sp({ assignedResource: RESCUE.name, deletedAt: Date.now() })];
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).queryByText('Rescue 1')).not.toBeInTheDocument();
  });

  it('shows a quiet empty line, not a hidden section, when no rigs are assigned to the op', () => {
    positions = seedOrgState('op1', 'dev-1').positions;
    shorePoints = [];
    render(<TransferCommand open onClose={vi.fn()} />);
    expect(screen.getByText('No apparatus assigned to this operation yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Apparatus on scene' })).not.toBeInTheDocument();
  });

  it('labels each rig with its org-chart position, and no unearned status when it has none', () => {
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).getByText('Shoring Group Supervisor')).toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it('a rig already holding command is not offered as a transfer target', () => {
    positions = {
      ...positions,
      [icId]: {
        ...positions[icId]!,
        assignedResources: [{ ref: 'apparatus', value: RESCUE.id, label: RESCUE.name }],
      },
    };
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).queryByText('Rescue 1')).not.toBeInTheDocument();
    expect(within(rigs).getByText('Engine 1')).toBeInTheDocument();
  });

  it('picking a rig initiates the transfer with an APPARATUS ref and mints a claim code', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TransferCommand open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Rescue 1/ }));
    await user.click(screen.getByRole('button', { name: 'Hand over command' }));

    expect(mockEmit).toHaveBeenCalledTimes(1);
    const ev = mockEmit.mock.calls[0]![0];
    expect(ev.type).toBe('CommandTransferInitiated');
    expect(ev.toResource).toEqual({ ref: 'apparatus', value: 'app-r1', label: 'Rescue 1' });
    expect(ev.claimCode).toMatch(/^\d{4}$/); // apparatus carries no uid → coded (ADR-021 Add. 2)
    expect(onClose).toHaveBeenCalled();
  });

  it('typing a name still mints an INDIVIDUAL ref and clears a picked rig', async () => {
    const user = userEvent.setup();
    render(<TransferCommand open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Rescue 1/ }));
    await user.type(screen.getByLabelText('Transfer to someone new'), 'Chief Alvarez');
    await user.click(screen.getByRole('button', { name: 'Hand over command' }));

    const ev = mockEmit.mock.calls[0]![0];
    expect(ev.toResource).toEqual({
      ref: 'individual',
      value: 'Chief Alvarez',
      label: 'Chief Alvarez',
    });
  });

  it('with no people on the chart the rig section still renders on its own signal', () => {
    positions = { ...seedOrgState('op1', 'dev-1').positions };
    render(<TransferCommand open onClose={vi.fn()} />);
    // No individuals/accounts are assigned, so the people-empty line is accurate here —
    // it no longer depends on the apparatus section, which renders independently below it.
    expect(screen.getByText(/No one else is assigned yet/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Apparatus on scene' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Apparatus on scene' })).getByText('Rescue 1')).toBeInTheDocument();
  });
});

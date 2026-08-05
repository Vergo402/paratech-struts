// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedOrgState, defaultPositionId } from '@core/org';
import type { Apparatus, OrgPositions } from '@core/schema';

/**
 * #489 — apparatus are first-class command-transfer targets. ADR-021 Addendum 2 scopes
 * the 4-digit accept code to named-individual AND apparatus targets; before this the
 * picker only ever offered individuals/devices, so "Battalion 1 has command" had to be
 * re-typed as free text (which mints an INDIVIDUAL ref for a rig).
 */

const mockEmit = vi.fn();
let positions: OrgPositions;
let apparatusRoster: Apparatus[];

vi.mock('./useOrgCommit', () => ({ useOrgCommit: () => mockEmit }));
// The ICS-201 brief pulls its own hook graph (SitStat) — not under test here.
vi.mock('./ICS201Brief', () => ({ ICS201Brief: () => null }));
vi.mock('@ui/hooks', () => ({
  useOrg: () => positions,
  useRoster: () => [],
  useApparatus: () => ({ roster: apparatusRoster, add: vi.fn(), remove: vi.fn() }),
}));

import { TransferCommand } from './TransferCommand';

const ENGINE: Apparatus = { id: 'app-e1', name: 'Engine 1', type: 'Engine' };
const BATTALION: Apparatus = { id: 'app-b1', name: 'Battalion 1', type: 'Chief' };

const icId = defaultPositionId('op1', 'ic');
const shoringId = defaultPositionId('op1', 'shoring');
const opsId = defaultPositionId('op1', 'ops');

function seed(): OrgPositions {
  const p = seedOrgState('op1', 'dev-1').positions;
  // A named individual holds command, another leads Operations; Engine 1 is assigned to
  // Shoring; Battalion 1 is free.
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

beforeEach(() => {
  mockEmit.mockReset().mockResolvedValue(undefined);
  positions = seed();
  apparatusRoster = [ENGINE, BATTALION];
});

describe('TransferCommand — apparatus targets (#489)', () => {
  it('offers the rigs in their own "Apparatus on scene" group, assigned and unassigned alike', () => {
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).getByText('Engine 1')).toBeInTheDocument();
    expect(within(rigs).getByText('Battalion 1')).toBeInTheDocument();
    // People stay in their own group — the rigs are not mixed in.
    const chart = screen.getByRole('list', { name: 'On the org chart' });
    expect(within(chart).queryByText('Engine 1')).not.toBeInTheDocument();
  });

  it('labels each rig with its org-chart position, or "Available" when unassigned', () => {
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).getByText('Shoring Group Supervisor')).toBeInTheDocument();
    expect(within(rigs).getByText('Available')).toBeInTheDocument();
  });

  it('a rig already holding command is not offered as a transfer target', () => {
    positions = {
      ...positions,
      [icId]: {
        ...positions[icId]!,
        assignedResources: [{ ref: 'apparatus', value: BATTALION.id, label: BATTALION.name }],
      },
    };
    render(<TransferCommand open onClose={vi.fn()} />);
    const rigs = screen.getByRole('list', { name: 'Apparatus on scene' });
    expect(within(rigs).queryByText('Battalion 1')).not.toBeInTheDocument();
    expect(within(rigs).getByText('Engine 1')).toBeInTheDocument();
  });

  it('picking a rig initiates the transfer with an APPARATUS ref and mints a claim code', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TransferCommand open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Battalion 1/ }));
    await user.click(screen.getByRole('button', { name: 'Hand over command' }));

    expect(mockEmit).toHaveBeenCalledTimes(1);
    const ev = mockEmit.mock.calls[0]![0];
    expect(ev.type).toBe('CommandTransferInitiated');
    expect(ev.toResource).toEqual({ ref: 'apparatus', value: 'app-b1', label: 'Battalion 1' });
    expect(ev.claimCode).toMatch(/^\d{4}$/); // apparatus carries no uid → coded (ADR-021 Add. 2)
    expect(onClose).toHaveBeenCalled();
  });

  it('typing a name still mints an INDIVIDUAL ref and clears a picked rig', async () => {
    const user = userEvent.setup();
    render(<TransferCommand open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Battalion 1/ }));
    await user.type(screen.getByLabelText('Transfer to someone new'), 'Chief Alvarez');
    await user.click(screen.getByRole('button', { name: 'Hand over command' }));

    const ev = mockEmit.mock.calls[0]![0];
    expect(ev.toResource).toEqual({
      ref: 'individual',
      value: 'Chief Alvarez',
      label: 'Chief Alvarez',
    });
  });

  it('with no people on the chart the rigs alone keep the empty-state copy away', () => {
    positions = { ...seedOrgState('op1', 'dev-1').positions };
    render(<TransferCommand open onClose={vi.fn()} />);
    expect(screen.queryByText(/No one else is assigned yet/)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Apparatus on scene' })).toBeInTheDocument();
  });
});

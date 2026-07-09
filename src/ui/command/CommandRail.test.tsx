// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedOrgState } from '@core/org';
import type { PendingTransfer } from '@core/org';

// jsdom has no matchMedia → useIsDesktop() = false → the phone rail, deterministic
// (same documented degrade as PickerSurface.test.tsx).

const mockEmit = vi.fn();
let pending: PendingTransfer | null = null;
let pendingResourceCount = 0;

vi.mock('./useOrgCommit', () => ({ useOrgCommit: () => mockEmit }));
// Null out children that drag in their own hook graphs — not under test here.
vi.mock('./SitStatRollup', () => ({ SitStatRollup: () => null }));
vi.mock('./TransferCommand', () => ({ TransferCommand: () => null }));
vi.mock('./OpPeriod', () => ({ OpPeriodIndicator: () => null, OpRolloverCard: () => null }));
vi.mock('@ui/hooks', () => ({
  useOperation: () => ({ id: 'op1', name: 'Test Op', location: '' }),
  useShorePoints: () => [],
  useOrg: () => seedOrgState('op1', 'dev-1').positions,
  useHazards: () => [],
  useCommandTransfer: () => pending,
  useDeviceUidValue: () => 'dev-1',
  usePendingResourceCount: () => pendingResourceCount,
}));

import { CommandRail } from './CommandRail';

const PERSON = { ref: 'individual', value: 'BC Smith', label: 'BC Smith' } as const;
const DEVICE = { ref: 'device', value: 'dev-2', label: 'Tablet 2' } as const;

beforeEach(() => {
  mockEmit.mockReset().mockResolvedValue(undefined);
  pending = null;
  pendingResourceCount = 0;
});

describe('CommandRail — hand-the-tablet accept (#401)', () => {
  it('an individual-ref pending on the INITIATING device renders Cancel AND the hand-over accept', () => {
    pending = { initiatedBy: 'dev-1', toResource: PERSON, at: 1 };
    render(<CommandRail />);
    expect(screen.getByRole('button', { name: 'Cancel transfer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BC Smith: Accept command' })).toBeInTheDocument();
    expect(screen.getByText('Accepting on this device?')).toBeInTheDocument();
    expect(screen.getByText(/hand this device to BC Smith/)).toBeInTheDocument();
  });

  it('pressing the hand-over accept emits CommandTransferAccepted', async () => {
    pending = { initiatedBy: 'dev-1', toResource: PERSON, at: 1 };
    const user = userEvent.setup();
    render(<CommandRail />);
    await user.click(screen.getByRole('button', { name: 'BC Smith: Accept command' }));
    expect(mockEmit).toHaveBeenCalledWith({ type: 'CommandTransferAccepted' });
  });

  it('a device-ref target stays strict: no accept on the initiating device', () => {
    pending = { initiatedBy: 'dev-1', toResource: DEVICE, at: 1 };
    render(<CommandRail />);
    expect(screen.getByRole('button', { name: 'Cancel transfer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept command/ })).not.toBeInTheDocument();
  });

  it('the incoming-device card still accepts (regression on the shared handler)', async () => {
    pending = { initiatedBy: 'someone-else', toResource: { ...DEVICE, value: 'dev-1' }, at: 1 };
    const user = userEvent.setup();
    render(<CommandRail />);
    await user.click(screen.getByRole('button', { name: 'Accept command' }));
    expect(mockEmit).toHaveBeenCalledWith({ type: 'CommandTransferAccepted' });
  });
});

describe('CommandRail — PAR/pending-sync indicator (#352)', () => {
  it('shows no pending-sync figure when nothing is pending sync', () => {
    pendingResourceCount = 0;
    render(<CommandRail />);
    expect(screen.queryByText('pending sync')).not.toBeInTheDocument();
  });

  it('shows the gold-accented count as a stat-strip figure when resources are pending sync', () => {
    pendingResourceCount = 2;
    render(<CommandRail />);
    expect(screen.getByText('pending sync')).toBeInTheDocument();
    const num = screen.getByText('2');
    expect(num.className).toContain('fs-statfig-v--accent'); // shared StatStrip primitive
  });
});

describe('CommandRail — stat strip + status board (#434 Stage 2c)', () => {
  it('renders the three strip figures with plural labels', () => {
    render(<CommandRail />);
    expect(screen.getByText('shore points')).toBeInTheDocument();
    expect(screen.getByText('apparatus')).toBeInTheDocument();
    expect(screen.getByText('individuals')).toBeInTheDocument();
  });

  it('renders the 7-status board as full-width rows with zero counts in quiet ink (data-zero)', () => {
    render(<CommandRail />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row).toHaveAttribute('data-zero');
      expect(row.querySelector('.fs-cmd-stat-key')).not.toBeNull();
    }
    expect(screen.getByText('Cutting Station')).toBeInTheDocument();
  });

  it('renders the command staff as one card with IC, Ops Chief, and Safety rows', () => {
    render(<CommandRail />);
    expect(screen.getByText('Incident Commander')).toBeInTheDocument();
    expect(screen.getByText('Operations Section Chief')).toBeInTheDocument();
    expect(screen.getByText('Safety Officer')).toBeInTheDocument();
  });
});

describe('CommandRail — entry rows (#434 Stage 2c)', () => {
  it('renders the Hazards row when onOpenHazards is given and fires it on press', async () => {
    const onOpenHazards = vi.fn();
    const user = userEvent.setup();
    render(<CommandRail onOpenHazards={onOpenHazards} />);
    expect(screen.getByText('No open hazards')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Hazards/ }));
    expect(onOpenHazards).toHaveBeenCalled();
  });

  it('renders the Org Chart row with position counts and fires onOpenOrg on press', async () => {
    const onOpenOrg = vi.fn();
    const user = userEvent.setup();
    render(<CommandRail onOpenOrg={onOpenOrg} />);
    const row = screen.getByRole('button', { name: /Org Chart/ });
    expect(row.textContent).toMatch(/positions · \d+ assigned/);
    await user.click(row);
    expect(onOpenOrg).toHaveBeenCalled();
  });

  it('renders no entry rows when neither callback is given (desktop rail default)', () => {
    render(<CommandRail />);
    expect(screen.queryByRole('button', { name: /Org Chart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hazards/ })).not.toBeInTheDocument();
  });
});

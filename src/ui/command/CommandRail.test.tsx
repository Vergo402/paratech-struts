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
  it('shows no third metric card when nothing is pending sync', () => {
    pendingResourceCount = 0;
    render(<CommandRail />);
    expect(screen.queryByText('Pending sync')).not.toBeInTheDocument();
  });

  it('shows the gold-accented count as a third metric card when resources are pending sync', () => {
    pendingResourceCount = 2;
    render(<CommandRail />);
    expect(screen.getByText('Pending sync')).toBeInTheDocument();
    const num = screen.getByText('2');
    expect(num.className).toContain('fs-cmd-metric-num--accent');
  });
});

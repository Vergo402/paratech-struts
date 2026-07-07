// @vitest-environment jsdom
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Hazards } from '@core/hazard';
import type { Operation } from '@core/schema';
import { HazardLog } from './HazardLog';

const mockHazards = vi.fn((): Hazards => ({}));
const mockOperation = vi.fn((): Operation | null => null);
const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockMembers = vi.fn((): Record<string, { displayName: string }> | null => null);
const mockManageUsers = vi.fn(() => false);

vi.mock('@ui/hooks', () => ({
  useHazards: () => mockHazards(),
  useOperation: () => mockOperation(),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useDeviceUidValue: () => 'device-test',
  usePermissions: () => ({ manageUsers: mockManageUsers() }),
  useUserManager: () => ({ members: mockMembers() }),
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

const SEEDED: Hazards = {
  h1: { id: 'h1', type: 'structural', location: 'Div 2', severity: 'high', reportedBy: 'u2', reportedAt: 2000 },
  h2: { id: 'h2', type: 'utility', location: 'Basement panel', severity: 'medium', reportedBy: 'u2', reportedAt: 1500 },
  h3: { id: 'h3', type: 'fall', location: 'Roof', severity: 'low', reportedBy: 'u2', reportedAt: 1000, mitigatedBy: 'u3', mitigatedAt: 3000 },
};

beforeEach(() => {
  mockHazards.mockReturnValue({});
  mockOperation.mockReturnValue(OP);
  mockCommit.mockClear();
  mockMembers.mockReturnValue(null);
  mockManageUsers.mockReturnValue(false);
});

describe('HazardLog', () => {
  it('empty: shows the all-clear state and disables export, Add stays available', () => {
    render(<HazardLog />);
    expect(screen.getByText('No hazards logged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export ICS-208' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Hazard' })).toBeEnabled();
  });

  it('register: open hazards (severity-sorted) over mitigated, with severity words', () => {
    mockHazards.mockReturnValue(SEEDED);
    render(<HazardLog />);
    expect(screen.getByText('Open (2)')).toBeInTheDocument();
    expect(screen.getByText('Mitigated (1)')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MED')).toBeInTheDocument();
    expect(screen.getByText('CLEARED')).toBeInTheDocument(); // mitigated reads CLEARED, not a severity badge

    // High sorts above Medium in the open section.
    const heads = screen.getAllByText(/^(HIGH|MED|LOW|CLEARED)$/).map((n) => n.textContent);
    expect(heads.indexOf('HIGH')).toBeLessThan(heads.indexOf('MED'));
  });

  it('attribution: shows the reporter name when members resolve (admin viewer)', () => {
    mockHazards.mockReturnValue({ h1: SEEDED.h1! }); // reportedBy 'u2'
    mockManageUsers.mockReturnValue(true);
    mockMembers.mockReturnValue({ u2: { displayName: 'Rescue 2' } });
    render(<HazardLog />);
    expect(screen.getByText(/Reported .* · Rescue 2/)).toBeInTheDocument();
  });

  it('attribution: falls back to a teammate when the name is unknown', () => {
    mockHazards.mockReturnValue({ h1: SEEDED.h1! }); // reportedBy 'u2', not me, no members
    render(<HazardLog />);
    expect(screen.getByText(/Reported .* · A teammate/)).toBeInTheDocument();
  });

  it('add: commits a well-formed HazardLogged event', async () => {
    const user = userEvent.setup();
    render(<HazardLog />);
    await user.click(screen.getByRole('button', { name: 'Add Hazard' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Location'), 'NE corner, Div 2');
    await user.click(within(dialog).getByRole('button', { name: 'Add Hazard' }));

    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HazardLogged',
        opId: 'op-1',
        by: 'device-test',
        hazard: expect.objectContaining({
          type: 'structural', // default
          location: 'NE corner, Div 2',
          severity: 'medium', // default
          reportedBy: 'device-test',
        }),
      }),
    );
  });

  it('mitigate: opening an open hazard and confirming commits HazardMitigated', async () => {
    const user = userEvent.setup();
    mockHazards.mockReturnValue({ h1: SEEDED.h1! });
    render(<HazardLog />);
    await user.click(screen.getByText('Structural instability')); // the row opens detail
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mitigate hazard' }));

    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HazardMitigated', opId: 'op-1', hazardId: 'h1', by: 'device-test' }),
    );
  });

  it('reopen: a mitigated hazard offers Reopen and commits HazardReopened', async () => {
    const user = userEvent.setup();
    mockHazards.mockReturnValue({ h3: SEEDED.h3! });
    render(<HazardLog />);
    await user.click(screen.getByText('Fall'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reopen hazard' }));

    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HazardReopened', opId: 'op-1', hazardId: 'h3', by: 'device-test' }),
    );
  });
});

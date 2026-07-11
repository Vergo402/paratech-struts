// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseMyMember = vi.fn();
const mockChangePassword = vi.fn();
const mockClearFlag = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@ui/hooks', () => ({
  useMyMember: () => mockUseMyMember(),
  useSession: () => ({
    identity: { kind: 'member', accountId: 'a1', displayName: 'Dana Kim' },
    changePassword: mockChangePassword,
    signOut: mockSignOut,
  }),
}));
vi.mock('@ui/dept/switchBucket', () => ({ reloadIntoActiveBucket: vi.fn() }));

import { ChangePasswordGate } from './ChangePasswordGate';

const member = (over: object = {}) => ({
  role: 'default', displayName: 'Dana Kim', joinedAt: 1, ...over,
});
const myMember = (m: object | null) => ({
  member: m,
  loading: false,
  refresh: mockRefresh,
  setRank: vi.fn(),
  clearMustChangePassword: mockClearFlag,
});

beforeEach(() => {
  mockChangePassword.mockReset().mockResolvedValue({ ok: true });
  mockClearFlag.mockReset().mockResolvedValue({ ok: true });
  mockRefresh.mockReset().mockResolvedValue(undefined);
  mockSignOut.mockReset().mockResolvedValue(undefined);
});

describe('ChangePasswordGate (#439 forced first-sign-in change)', () => {
  it('blocks the app when the OWN row carries mustChangePassword: true', () => {
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Set your password' })).toBeInTheDocument();
  });

  it('FAILS OPEN: a null row (loading / offline / guest / read error) renders the app', () => {
    mockUseMyMember.mockReturnValue(myMember(null));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();
  });

  it('renders the app for an ordinary member (flag absent) and a rotated one (flag false)', () => {
    mockUseMyMember.mockReturnValue(myMember(member()));
    const { unmount } = render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();
    unmount();
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: false })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();
  });

  it('a successful change clears the flag then re-reads the row (change → clear → refresh)', async () => {
    const user = userEvent.setup();
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.type(screen.getByLabelText('Starter password'), 'kim123!');
    await user.type(screen.getByLabelText('New password'), 'my-real-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'my-real-password');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(mockChangePassword).toHaveBeenCalledWith('kim123!', 'my-real-password');
    expect(mockClearFlag).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    // Ordering: never clear the flag before the password actually changed.
    expect(mockChangePassword.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearFlag.mock.invocationCallOrder[0]!,
    );
  });

  it('mismatched confirmation shows an inline error and never calls the service', async () => {
    const user = userEvent.setup();
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.type(screen.getByLabelText('Starter password'), 'kim123!');
    await user.type(screen.getByLabelText('New password'), 'my-real-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(screen.getByText(/don't match/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('re-using the starter as the new password is rejected locally', async () => {
    const user = userEvent.setup();
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.type(screen.getByLabelText('Starter password'), 'kim123!');
    await user.type(screen.getByLabelText('New password'), 'kim123!');
    await user.type(screen.getByLabelText('Confirm new password'), 'kim123!');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(screen.getByText(/different from the starter/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('a wrong starter password surfaces the service reason inline and keeps the gate up', async () => {
    const user = userEvent.setup();
    mockChangePassword.mockResolvedValue({ ok: false, reason: "That current password doesn't match." });
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.type(screen.getByLabelText('Starter password'), 'wrong');
    await user.type(screen.getByLabelText('New password'), 'my-real-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'my-real-password');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(screen.getByText(/doesn't match/i)).toBeInTheDocument();
    expect(mockClearFlag).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Set your password' })).toBeInTheDocument();
  });

  it('the Sign out escape hatch signs out (no wedged member)', async () => {
    const user = userEvent.setup();
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
afterEach(() => {
  vi.useRealTimers();
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

describe('ChangePasswordGate — the flag clear fails AFTER the password changed', () => {
  // The Auth change already succeeded, so the starter no longer works. clearMustChangePassword
  // reports failure by RETURNING { ok: false } (it never throws) and, offline, its RTDB
  // update() stays pending forever. The gate must say so honestly and retry ONLY the clear.
  const CLEAR_FAILED = /couldn.t finish setup/i;

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Starter password'), 'kim123!');
    await user.type(screen.getByLabelText('New password'), 'my-real-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'my-real-password');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
  }

  it('a returned { ok: false } shows an honest error and a retry — never the password form again', async () => {
    const user = userEvent.setup();
    mockClearFlag.mockResolvedValueOnce({ ok: false, reason: 'That change could not be saved. Try again.' });
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await fillAndSubmit(user);

    expect(await screen.findByText(CLEAR_FAILED)).toBeInTheDocument();
    // The member must be told the new password is already in effect (the starter is dead).
    expect(screen.getByText(/new password is already in effect/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Starter password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and continue' })).not.toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled(); // a failed clear is not a success
    expect(screen.queryByText('the app')).not.toBeInTheDocument();

    // Retry re-runs ONLY the clear, then re-reads the row.
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockClearFlag).toHaveBeenCalledTimes(2);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    expect(mockChangePassword).toHaveBeenCalledWith('kim123!', 'my-real-password');
  });

  it('a retry that fails again keeps the error and still never re-runs the Auth change', async () => {
    const user = userEvent.setup();
    mockClearFlag.mockResolvedValue({ ok: false, reason: 'That change could not be saved. Try again.' });
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await fillAndSubmit(user);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByText(CLEAR_FAILED)).toBeInTheDocument();
    expect(mockClearFlag).toHaveBeenCalledTimes(3);
    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('Sign out stays available in the failed state', async () => {
    const user = userEvent.setup();
    mockClearFlag.mockResolvedValueOnce({ ok: false, reason: 'x' });
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await fillAndSubmit(user);
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('an offline clear that never settles times out (no eternal "Saving…") into the same retry state', async () => {
    const user = userEvent.setup();
    // RTDB update() offline: pending forever, never rejects.
    mockClearFlag.mockReturnValue(new Promise(() => {}));
    mockUseMyMember.mockReturnValue(myMember(member({ mustChangePassword: true })));
    render(<ChangePasswordGate><p>the app</p></ChangePasswordGate>);
    await user.type(screen.getByLabelText('Starter password'), 'kim123!');
    await user.type(screen.getByLabelText('New password'), 'my-real-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'my-real-password');

    // Fake timers only for the submit: user-event + RTL waiters don't mix with vitest's
    // fake clock, so the click goes through fireEvent and the clock is advanced by hand.
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByText(CLEAR_FAILED)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Saving…' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

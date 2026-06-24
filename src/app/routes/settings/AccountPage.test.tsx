// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockUseSession = vi.fn();
const mockSignOut = vi.fn();
const mockDeleteAccount = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({ useSession: () => mockUseSession() }));
vi.mock('@ui/dept', () => ({ reloadIntoActiveBucket: vi.fn() }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { AccountPage } from './AccountPage';

function asMember() {
  mockUseSession.mockReturnValue({
    identity: { kind: 'member', accountId: 'a1', displayName: 'Capt. Marchetti' },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
  });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockDeleteAccount.mockReset().mockResolvedValue({ ok: true });
  mockUseSession.mockReturnValue({
    identity: { kind: 'guest' },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
  });
});

describe('AccountPage (workflow 06)', () => {
  it('a guest sees Sign In, which routes to /auth', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
  });

  it('a member sees their name and logs out through the destructive confirm', async () => {
    const user = userEvent.setup();
    asMember();
    render(<AccountPage />);
    expect(screen.getByText('Capt. Marchetti')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log Out' }));
    const dialog = screen.getByRole('dialog', { name: 'Log out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('AccountPage delete account', () => {
  const realLocation = window.location;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, assign: assignSpy },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('a wrong password shows the reason inline and does not navigate', async () => {
    const user = userEvent.setup();
    asMember();
    mockDeleteAccount.mockResolvedValue({ ok: false, reason: 'Wrong password' });
    render(<AccountPage />);
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete account?' });
    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'nope');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    expect(await within(dialog).findByText('Wrong password')).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('the correct password deletes the account and re-boots to /auth', async () => {
    const user = userEvent.setup();
    asMember();
    mockDeleteAccount.mockResolvedValue({ ok: true });
    render(<AccountPage />);
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete account?' });
    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'correct-horse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    expect(assignSpy).toHaveBeenCalledWith('/auth');
  });
});

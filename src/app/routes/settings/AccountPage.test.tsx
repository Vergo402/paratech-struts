// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockUseSession = vi.fn();
const mockSignOut = vi.fn();
const mockDeleteAccount = vi.fn();
const mockNavigate = vi.fn();
const mockSetRank = vi.fn();
const mockRefreshMember = vi.fn();
let mockMember: { rank?: string } | null = null;

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => ({ role: 'admin' }),
  useRoles: () => ({ admin: { id: 'admin', name: 'Admin', builtIn: true, permissions: {} } }),
  useMyMember: () => ({ member: mockMember, setRank: mockSetRank, refresh: mockRefreshMember }),
}));
vi.mock('@ui/dept', () => ({ reloadIntoActiveBucket: vi.fn() }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { AccountPage } from './AccountPage';

function asMember() {
  mockUseSession.mockReturnValue({
    identity: { kind: 'member', accountId: 'a1', displayName: 'Capt. Marchetti' },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
    currentEmail: () => 'marchetti@dept.gov',
  });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockDeleteAccount.mockReset().mockResolvedValue({ ok: true });
  mockSetRank.mockReset().mockResolvedValue({ ok: true });
  mockRefreshMember.mockReset().mockResolvedValue(undefined);
  mockMember = null;
  mockUseSession.mockReturnValue({
    identity: { kind: 'guest' },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
    currentEmail: () => null,
  });
});

describe('AccountPage (workflow 06)', () => {
  it('a guest sees the sign-in identity card, which routes to /auth', () => {
    render(<AccountPage />);
    const card = screen.getByRole('link', { name: /guest on this device/i });
    expect(card).toHaveAttribute('href', '/auth');
    expect(within(card).getByText('Sign in')).toBeInTheDocument();
  });

  it('a member sees their name and logs out through the destructive confirm', async () => {
    const user = userEvent.setup();
    asMember();
    render(<AccountPage />);
    expect(screen.getAllByText('Capt. Marchetti').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Log out/ }));
    const dialog = screen.getByRole('dialog', { name: 'Log out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('a member edits their rank and saves it through the seam', async () => {
    const user = userEvent.setup();
    asMember();
    mockMember = { rank: '' };
    render(<AccountPage />);
    const rank = screen.getByLabelText('Rank / title');
    await user.type(rank, 'Rescue Squad Lieutenant');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockSetRank).toHaveBeenCalledWith('Rescue Squad Lieutenant');
    expect(mockRefreshMember).toHaveBeenCalled();
  });

  it('shows the email read-only and no Save until the rank changes', () => {
    asMember();
    mockMember = { rank: 'Captain' };
    render(<AccountPage />);
    expect(screen.getByText('marchetti@dept.gov')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Delete account.*password/ }));
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
    await user.click(screen.getByRole('button', { name: /Delete account.*password/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete account?' });
    await user.type(within(dialog).getByLabelText('Enter your password to confirm'), 'correct-horse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    expect(assignSpy).toHaveBeenCalledWith('/auth');
  });
});

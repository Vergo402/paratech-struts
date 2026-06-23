// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseSyncStatus = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useSyncStatus: () => mockUseSyncStatus(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { SyncBanner } from './SyncBanner';

const GUEST = { identity: { kind: 'guest' }, signIn: vi.fn(), createAccount: vi.fn(), signOut: vi.fn() };
const MEMBER = { identity: { kind: 'member', accountId: 'a1', displayName: 'X' }, signIn: vi.fn(), createAccount: vi.fn(), signOut: vi.fn() };
const SYNCED = { online: true, pendingCount: 0, pendingJoin: null, syncError: false };

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseSession.mockReturnValue(GUEST);
  mockUseSyncStatus.mockReturnValue(SYNCED);
});

describe('SyncBanner — guest nudge', () => {
  it('shows for a guest and routes to /auth', async () => {
    const user = userEvent.setup();
    render(<SyncBanner />);
    await user.click(screen.getByRole('button', { name: 'Sign in to sync' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
  });

  it('dismiss hides it (and never navigates)', async () => {
    const user = userEvent.setup();
    render(<SyncBanner />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button', { name: 'Sign in to sync' })).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('SyncBanner — member sync status (Increment 4)', () => {
  beforeEach(() => mockUseSession.mockReturnValue(MEMBER));

  it('renders nothing when online and fully synced', () => {
    const { container } = render(<SyncBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an offline notice with the pending count', () => {
    mockUseSyncStatus.mockReturnValue({ online: false, pendingCount: 3, pendingJoin: null });
    render(<SyncBanner />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/3 changes/)).toBeInTheDocument();
  });

  it('shows a syncing notice when online with a backlog', () => {
    mockUseSyncStatus.mockReturnValue({ online: true, pendingCount: 1, pendingJoin: null, syncError: false });
    render(<SyncBanner />);
    expect(screen.getByText(/syncing 1 change…/i)).toBeInTheDocument();
  });

  it('shows a stuck/retrying notice (never "Syncing") when uploads are failing', () => {
    mockUseSyncStatus.mockReturnValue({ online: true, pendingCount: 2, pendingJoin: null, syncError: true });
    render(<SyncBanner />);
    expect(screen.getByText(/haven’t synced yet — retrying/i)).toBeInTheDocument();
    expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument();
  });

  it('shows a queued-join notice (named), taking priority over offline', () => {
    mockUseSyncStatus.mockReturnValue({ online: false, pendingCount: 2, pendingJoin: { code: 'X', deptName: 'Hamden FD' } });
    render(<SyncBanner />);
    expect(screen.getByText(/will join “Hamden FD” when you reconnect/i)).toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});

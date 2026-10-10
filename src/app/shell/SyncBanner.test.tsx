// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseSyncStatus = vi.fn();
const mockNavigate = vi.fn();
const mockUseOverridden = vi.fn();
const mockAck = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useSyncStatus: () => mockUseSyncStatus(),
  useOverridden: () => mockUseOverridden(),
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
  mockAck.mockReset();
  mockUseOverridden.mockReturnValue({ rows: [], acknowledge: mockAck });
  mockUseSession.mockReturnValue(GUEST);
  mockUseSyncStatus.mockReturnValue(SYNCED);
});

describe('SyncBanner — guest', () => {
  it('renders nothing for a guest (sign-in lives in the nav, not a banner)', () => {
    const { container } = render(<SyncBanner />);
    expect(container).toBeEmptyDOMElement();
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

  it('shows the dept-outbox notice while a created dept is still owed to the cloud (#419)', () => {
    mockUseSyncStatus.mockReturnValue({
      online: false, pendingCount: 0, pendingJoin: null, syncError: false,
      pendingDeptPush: { deptId: 'd1', deptName: 'Hamden Fire Rescue' },
    });
    render(<SyncBanner />);
    expect(screen.getByText(/“Hamden Fire Rescue” is saved on this device — will sync when you reconnect/)).toBeInTheDocument();
  });

  it('the dept-outbox notice says syncing (and mentions the invite code) when online', () => {
    mockUseSyncStatus.mockReturnValue({
      online: true, pendingCount: 0, pendingJoin: null, syncError: false,
      pendingDeptPush: { deptId: 'd1', deptName: 'Hamden Fire Rescue' },
    });
    render(<SyncBanner />);
    expect(screen.getByText(/syncing to the cloud \(invite code works after that\)/)).toBeInTheDocument();
  });
});

describe('SyncBanner — losing-branch line (#499)', () => {
  const ROW_A = { id: 'e1', title: 'Alpha — now Pending', line: 'Your Strut Set had no effect. Another device returned equipment to inventory while you were offline.', at: new Date(2026, 9, 10, 10, 5).getTime(), who: 'another device' };
  const ROW_B = { id: 'e2', title: 'Incident Commander — Lt. K. Chen', line: 'Your cancel had no effect.', at: new Date(2026, 9, 10, 10, 4).getTime(), who: 'another device' };
  beforeEach(() => mockUseSession.mockReturnValue(MEMBER));

  it('counts one lost change ("1 of your changes"), with the chevron toggle collapsed', () => {
    mockUseOverridden.mockReturnValue({ rows: [ROW_A], acknowledge: mockAck });
    render(<SyncBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('Synced — 1 of your changes had no effect');
    expect(screen.getByRole('button', { name: /Synced/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Alpha — now Pending')).not.toBeInTheDocument();
  });

  it('plural count, expands to one row per lost change (title, line, HH:MM meta), Got it clears', async () => {
    mockUseOverridden.mockReturnValue({ rows: [ROW_A, ROW_B], acknowledge: mockAck });
    const user = userEvent.setup();
    render(<SyncBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('Synced — 2 of your changes had no effect');
    await user.click(screen.getByRole('button', { name: /Synced/ }));
    expect(screen.getByRole('button', { name: /Synced/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Alpha — now Pending').tagName).toBe('STRONG');
    expect(screen.getByText(/Your Strut Set had no effect\. Another device returned equipment/)).toBeInTheDocument();
    expect(screen.getByText('Incident Commander — Lt. K. Chen')).toBeInTheDocument();
    expect(screen.getByText('10:05 · another device')).toBeInTheDocument();
    expect(screen.getByText('10:04 · another device')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(mockAck).toHaveBeenCalledTimes(1);
  });

  it('renders nothing extra for a guest, and offline status outranks it', () => {
    mockUseOverridden.mockReturnValue({ rows: [ROW_A], acknowledge: mockAck });
    mockUseSession.mockReturnValue(GUEST);
    const { container } = render(<SyncBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('queued/offline status keeps priority over the line', () => {
    mockUseOverridden.mockReturnValue({ rows: [ROW_A], acknowledge: mockAck });
    mockUseSyncStatus.mockReturnValue({ online: false, pendingCount: 1, pendingJoin: null, syncError: false });
    render(<SyncBanner />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/had no effect/)).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagerScreen } from './UserManagerScreen';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS, type Member, type Permissions, type Role } from '@core/schema';

const mockPerms = vi.fn((): Permissions => ADMIN_PERMISSIONS);
const mockRoles = vi.fn((): Record<string, Role> => ({}));
const mockSession = vi.fn(() => ({ identity: { kind: 'member', accountId: 'me', displayName: 'Capt Vergo' } }));
const actions = {
  assignRole: vi.fn().mockResolvedValue({ ok: true }),
  revokeMember: vi.fn().mockResolvedValue({ ok: true }),
  reactivateMember: vi.fn().mockResolvedValue({ ok: true }),
  createRole: vi.fn().mockResolvedValue({ ok: true }),
  editRole: vi.fn().mockResolvedValue({ ok: true }),
  deleteRole: vi.fn().mockResolvedValue({ ok: true }),
  refresh: vi.fn().mockResolvedValue(undefined),
};
const mockMembers = vi.fn((): Record<string, Member> | null => ({}));

vi.mock('@ui/hooks', () => ({
  usePermissions: () => mockPerms(),
  useRoles: () => mockRoles(),
  useSession: () => mockSession(),
  useUserManager: () => ({ members: mockMembers(), membersError: false, ...actions }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const ROLES: Record<string, Role> = {
  admin: { id: 'admin', name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
  default: { id: 'default', name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS },
  logistics: { id: 'logistics', name: 'Logistics', permissions: { ...DEFAULT_PERMISSIONS, manageInventory: true } },
};
const MEMBERS: Record<string, Member> = {
  me: { role: 'admin', displayName: 'Capt Vergo', joinedAt: 1 },
  diaz: { role: 'default', displayName: 'FF Diaz', joinedAt: 2 },
  marchetti: { role: 'logistics', displayName: 'Lt Marchetti', joinedAt: 3 },
  okafor: { role: 'default', displayName: 'FF Okafor', joinedAt: 4, active: false },
};

describe('UserManagerScreen', () => {
  beforeEach(() => {
    mockPerms.mockReturnValue(ADMIN_PERMISSIONS);
    mockRoles.mockReturnValue(ROLES);
    mockSession.mockReturnValue({ identity: { kind: 'member', accountId: 'me', displayName: 'Capt Vergo' } });
    mockMembers.mockReturnValue(MEMBERS);
    Object.values(actions).forEach((f) => f.mockClear());
  });

  it('blocks a member without manageUsers (direct-URL backstop)', () => {
    mockPerms.mockReturnValue(DEFAULT_PERMISSIONS);
    render(<UserManagerScreen />);
    expect(screen.getByText('Admin access only')).toBeInTheDocument();
  });

  it('Members face: own row tagged, revoked struck + reactivatable, anti-lockout note shown', () => {
    render(<UserManagerScreen />);
    expect(screen.getByText('· you')).toBeInTheDocument();
    expect(screen.getByText('FF Diaz')).toBeInTheDocument();
    expect(screen.getByText('Lt Marchetti')).toBeInTheDocument();
    // the revoked member: marked + a Reactivate control
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
    // the always-shown anti-lockout note
    expect(screen.getByText(/last Admin can.t be revoked or demoted/i)).toBeInTheDocument();
  });

  it('tapping an active member opens the assign-role sheet with the dept roles', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    expect(await screen.findByText('Assign role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke access/ })).toBeInTheDocument();
  });

  it('Roles face: lists built-ins + custom with summaries, and a Create role action', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByText('Roles'));
    expect(screen.getByText('Full access')).toBeInTheDocument(); // Admin summary
    expect(screen.getByText('built-in · editable')).toBeInTheDocument(); // Default tag
    expect(screen.getByText('Read · field work · inventory')).toBeInTheDocument(); // Logistics summary
    expect(screen.getByRole('button', { name: /Create role/ })).toBeInTheDocument();
  });

  it('opening a role shows the 8 permission toggles', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByText('Roles'));
    await user.click(screen.getByRole('button', { name: /Default/ }));
    expect(await screen.findByText('Edit role')).toBeInTheDocument();
    // a sampling of the exact mockup labels
    expect(screen.getByText('Manage users & roles')).toBeInTheDocument();
    expect(screen.getByText('Export / delete data')).toBeInTheDocument();
  });

  it('the last active Admin cannot be demoted or revoked from the assign sheet', async () => {
    // viewer holds a custom manageUsers role; "chief" is the ONLY admin → last admin
    const user = userEvent.setup();
    mockSession.mockReturnValue({ identity: { kind: 'member', accountId: 'me', displayName: 'Me' } });
    mockMembers.mockReturnValue({
      me: { role: 'logistics', displayName: 'Me', joinedAt: 1 },
      chief: { role: 'admin', displayName: 'Chief', joinedAt: 2 },
    });
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /Chief/ }));
    await screen.findByText('Assign role');
    // the Default pick is disabled with the promote-first reason; Revoke is disabled too
    expect(screen.getByRole('button', { name: /Default/ })).toBeDisabled();
    // the reason shows on both the disabled pick and the disabled Revoke button
    expect(screen.getAllByText(/Promote another member to Admin first/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Revoke access/ })).toBeDisabled();
  });
});

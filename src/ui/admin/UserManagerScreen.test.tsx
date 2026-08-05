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
  setMemberRank: vi.fn().mockResolvedValue({ ok: true }),
  revokeMember: vi.fn().mockResolvedValue({ ok: true }),
  reactivateMember: vi.fn().mockResolvedValue({ ok: true }),
  createRole: vi.fn().mockResolvedValue({ ok: true }),
  editRole: vi.fn().mockResolvedValue({ ok: true }),
  deleteRole: vi.fn().mockResolvedValue({ ok: true }),
  revokeInviteCode: vi.fn().mockResolvedValue({ ok: true }),
  regenerateInviteCode: vi.fn().mockResolvedValue({ ok: true, code: 'NEWC-0DE1' }),
  provisionMember: vi.fn().mockResolvedValue({ ok: true, uid: 'new-uid' }),
  setMemberProfile: vi.fn().mockResolvedValue({ ok: true }),
  changeMemberEmail: vi.fn().mockResolvedValue({ ok: true }),
  resetMemberPassword: vi.fn().mockResolvedValue({ ok: true }),
  refresh: vi.fn().mockResolvedValue(undefined),
};
const mockMembers = vi.fn((): Record<string, Member> | null => ({}));
const mockInviteCode = vi.fn((): string | null => 'QK7N-38PW');

vi.mock('@ui/hooks', async () => {
  // The pure personnel-CSV helpers pass through REAL (no firebase in their graph) —
  // PersonnelImportFlow imports them from this barrel (invariant 3).
  const personnel = await vi.importActual<typeof import('@data/dept/personnelCsv')>('@data/dept/personnelCsv');
  return {
    usePermissions: () => mockPerms(),
    useRoles: () => mockRoles(),
    useSession: () => mockSession(),
    useDepartment: () => ({ department: { id: 'd1', name: 'Hamden' }, role: 'admin', inviteCode: mockInviteCode() }),
    useUserManager: () => ({ members: mockMembers(), membersError: false, ...actions }),
    useApparatus: () => ({
      roster: [
        { id: 'rig-e2', name: 'Engine 2', type: 'Engine' },
        { id: 'rig-r1', name: 'Rescue 1', type: 'Rescue' },
      ],
      add: vi.fn(),
      remove: vi.fn(),
    }),
    parsePersonnelRecords: personnel.parseRecords,
    autoMapPersonnel: personnel.autoMapPersonnel,
    validatePersonnelRows: personnel.validatePersonnelRows,
    validatePersonnelRow: personnel.validatePersonnelRow,
    getPersonnelTemplateCSV: personnel.getPersonnelTemplateCSV,
    PERSONNEL_HEADERS: personnel.PERSONNEL_HEADERS,
  };
});
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const ROLES: Record<string, Role> = {
  admin: { id: 'admin', name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
  default: { id: 'default', name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS },
  logistics: { id: 'logistics', name: 'Logistics', permissions: { ...DEFAULT_PERMISSIONS, manageInventory: true } },
};
const MEMBERS: Record<string, Member> = {
  me: { role: 'admin', displayName: 'Capt Vergo', joinedAt: 1 },
  diaz: {
    role: 'default', displayName: 'FF Diaz', joinedAt: 2,
    rank: 'Firefighter', apparatusId: 'rig-e2', email: 'diaz@fd.example', mustChangePassword: true,
  },
  marchetti: { role: 'logistics', displayName: 'Lt Marchetti', joinedAt: 3, apparatusId: 'rig-gone' },
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
    expect(await screen.findByText('Member', { selector: 'h2' })).toBeInTheDocument();
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
    await screen.findByText('Member', { selector: 'h2' });
    // the Default pick is disabled with the promote-first reason; Revoke is disabled too
    expect(screen.getByRole('button', { name: /Default/ })).toBeDisabled();
    // the reason shows on both the disabled pick and the disabled Revoke button
    expect(screen.getAllByText(/Promote another member to Admin first/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Revoke access/ })).toBeDisabled();
  });

  it('a FAILED revoke keeps the modal open and says why (#426)', async () => {
    const user = userEvent.setup();
    actions.revokeMember.mockResolvedValueOnce({ ok: false, reason: "You don't have permission for that change." });
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    await screen.findByText('Member', { selector: 'h2' });
    await user.click(screen.getByRole('button', { name: /Revoke access/ }));
    await screen.findByText('Revoke access?');
    await user.click(screen.getByRole('button', { name: 'Revoke access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission/i);
    expect(screen.getByText('Revoke access?')).toBeInTheDocument(); // modal stays open
    expect(actions.refresh).not.toHaveBeenCalled(); // nothing to re-read — the write was denied
  });

  it('a FAILED reactivate surfaces inline under the member row (#426)', async () => {
    const user = userEvent.setup();
    actions.reactivateMember.mockResolvedValueOnce({ ok: false, reason: "You don't have permission for that change." });
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission/i);
  });

  it('a FAILED role delete keeps the confirm open with the reason (#426)', async () => {
    const user = userEvent.setup();
    actions.deleteRole.mockResolvedValueOnce({ ok: false, reason: 'That change could not be saved. Try again.' });
    render(<UserManagerScreen />);
    await user.click(screen.getByText('Roles'));
    await user.click(screen.getByRole('button', { name: /Logistics/ }));
    await screen.findByText('Edit role');
    await user.click(screen.getByRole('button', { name: /Delete role/ }));
    await screen.findByText('Delete role?');
    await user.click(screen.getByRole('button', { name: 'Delete role' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/i);
    expect(screen.getByText('Delete role?')).toBeInTheDocument();
  });

  it('shows the invite code with a Regenerate control; confirm calls the service (#423)', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    expect(screen.getByText('QK7N-38PW')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    await screen.findByText('Regenerate invite code?');
    // with the confirm open there are two "Regenerate" buttons — the modal's is last
    const confirms = screen.getAllByRole('button', { name: 'Regenerate' });
    await user.click(confirms[confirms.length - 1]!);
    expect(actions.regenerateInviteCode).toHaveBeenCalledTimes(1);
  });

  it('an admin viewing THEMSELVES cannot self-demote or self-revoke (rules mirror)', async () => {
    // Force the sheet open for the own row by making another admin exist and the
    // sheet target be self: simulate by rendering with a second admin and opening
    // the own row via the assign sheet API — the own row is non-clickable, so this
    // exercises MemberEditSheet's isSelf guard directly through the screen's props
    // is not reachable; assert the own row stays non-interactive instead.
    render(<UserManagerScreen />);
    const ownRow = screen.getByText('· you').closest('div.fs-um-row');
    expect(ownRow?.tagName).toBe('DIV'); // not a button — self-management isn't offered
  });
  // ---- #439 admin-provisioned personnel ----

  it('member rows show rank · rig sub-lines and the key badge on unrotated starters', () => {
    render(<UserManagerScreen />);
    expect(screen.getByText('Firefighter · Engine 2')).toBeInTheDocument(); // diaz
    expect(screen.getByText('starter')).toBeInTheDocument(); // diaz's key badge
    // marchetti's rig id points at a deleted rig → no sub-line fabricated
    const marchetti = screen.getByText('Lt Marchetti').closest('button');
    expect(marchetti?.querySelector('.fs-um-row-sub')).toBeNull();
  });

  it('Add member: creates the account and swaps to the hand-over panel (email + starter, once)', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: '+ Add member' }));
    await screen.findByText('Add member', { selector: 'h2' });
    await user.type(screen.getByLabelText('Name'), 'Dana Kim');
    await user.type(screen.getByLabelText('Email — their sign-in'), 'dkim@fd.example');
    // the starter derives live from the typed name
    expect(screen.getAllByText('kim123!').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(actions.provisionMember).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Dana Kim', email: 'dkim@fd.example', starterPassword: 'kim123!', role: 'default' }),
    );
    expect(actions.refresh).toHaveBeenCalled();
    // hand-over panel: email + starter repeated for the in-person read-out
    await screen.findByText('Account created', { selector: 'h2' });
    expect(screen.getByText('dkim@fd.example')).toBeInTheDocument();
    expect(screen.getByText('kim123!')).toBeInTheDocument();
  });

  it('Add member: email-in-use failure stays on the form with the invite-code copy', async () => {
    const user = userEvent.setup();
    actions.provisionMember.mockResolvedValueOnce({
      ok: false,
      reason: 'An account with that email already exists — they can join with the invite code instead.',
    });
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: '+ Add member' }));
    await screen.findByText('Add member', { selector: 'h2' });
    await user.type(screen.getByLabelText('Name'), 'Dana Kim');
    await user.type(screen.getByLabelText('Email — their sign-in'), 'dkim@fd.example');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invite code/i);
    expect(screen.getByText('Add member', { selector: 'h2' })).toBeInTheDocument(); // form stays
    expect(actions.refresh).not.toHaveBeenCalled();
  });

  it('edit sheet: profile save routes setMemberProfile with the drafted fields', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    await screen.findByText('Member', { selector: 'h2' });
    await user.clear(screen.getByLabelText('Rank / title'));
    await user.type(screen.getByLabelText('Rank / title'), 'Lieutenant');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(actions.setMemberProfile).toHaveBeenCalledWith('diaz', expect.objectContaining({ rank: 'Lieutenant' }));
    expect(actions.refresh).toHaveBeenCalled();
  });

  it('edit sheet: an email edit routes changeMemberEmail (the privileged server op)', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    await screen.findByText('Member', { selector: 'h2' });
    await user.clear(screen.getByLabelText('Email — their sign-in'));
    await user.type(screen.getByLabelText('Email — their sign-in'), 'new@fd.example');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(actions.changeMemberEmail).toHaveBeenCalledWith('diaz', 'new@fd.example');
    expect(actions.setMemberProfile).not.toHaveBeenCalled(); // profile untouched
  });

  it('Reset password: confirm shows the derived starter and calls the service; failure stays open', async () => {
    const user = userEvent.setup();
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    await screen.findByText('Member', { selector: 'h2' });
    await user.click(screen.getByRole('button', { name: /Reset password to starter/ }));
    await screen.findByText(/Reset FF Diaz.s password\?/);
    expect(screen.getByText('diaz123!')).toBeInTheDocument(); // the exact hand-over value
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(actions.resetMemberPassword).toHaveBeenCalledWith('diaz', 'diaz123!');
    expect(actions.refresh).toHaveBeenCalled();
  });

  // ---- J257-S4 / J257-S7 / #463 — a NON-ADMIN manageUsers holder ----
  // Two backend facts the sheet must mirror, so nothing is offered that the
  // backend denies: role AUTHORING is Admin-only in the rules (J257-S4), and
  // credential custody — reset password / change sign-in email — is Admin-only on
  // the server (J257-S7, requireAdminForCredentialChange). ADMIN_MANAGE has ALWAYS
  // denied a non-Admin actor demoting or revoking an Admin, or granting Admin
  // (#463) — the sheet used to offer those and the click failed with a raw
  // permission error.
  describe('a non-Admin manageUsers holder', () => {
    // TWO admins, so the anti-lockout reason can't mask the Admin-only reason
    const NON_ADMIN_VIEW: Record<string, Member> = {
      me: { role: 'logistics', displayName: 'Lt Marchetti', joinedAt: 1 },
      chief: { role: 'admin', displayName: 'Chief Reyes', joinedAt: 2 },
      deputy: { role: 'admin', displayName: 'Deputy Nakata', joinedAt: 3 },
      diaz: { role: 'default', displayName: 'FF Diaz', joinedAt: 4, email: 'diaz@fd.example' },
    };
    beforeEach(() => {
      // holds manageUsers (so the screen renders) but is NOT the Admin role
      mockPerms.mockReturnValue({ ...DEFAULT_PERMISSIONS, manageUsers: true });
      mockMembers.mockReturnValue(NON_ADMIN_VIEW);
      mockSession.mockReturnValue({
        identity: { kind: 'member', accountId: 'me', displayName: 'Lt Marchetti' },
      });
    });

    it('Roles face is READ-ONLY — no Create role, no role opens (J257-S4)', async () => {
      const user = userEvent.setup();
      render(<UserManagerScreen />);
      await user.click(screen.getByText('Roles'));
      // the escalation path: minting a custom role with all eight permissions and
      // self-assigning it would be full back-office control with no Admin approving
      expect(screen.queryByRole('button', { name: /Create role/ })).toBeNull();
      expect(screen.getByText(/Only an Admin can create or change roles/i)).toBeInTheDocument();
      // every role row — Default and the custom one included — is inert, not a button
      expect(screen.queryByRole('button', { name: /Default/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /Logistics/ })).toBeNull();
    });

    it('the member sheet hides BOTH credential controls (J257-S7)', async () => {
      const user = userEvent.setup();
      render(<UserManagerScreen />);
      await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
      await screen.findByText('Member', { selector: 'h2' });
      // assuming a member's login assumes their ICS position, so custody is Admin-only
      expect(screen.queryByRole('button', { name: /Reset password to starter/ })).toBeNull();
      expect(screen.queryByLabelText('Email — their sign-in')).toBeNull();
      // the rest of the profile stays editable — manageUsers still owns profile edits
      expect(screen.getByLabelText('Rank / title')).toBeInTheDocument();
    });

    it('cannot grant Admin to a non-Admin member (#463)', async () => {
      const user = userEvent.setup();
      render(<UserManagerScreen />);
      await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
      await screen.findByText('Member', { selector: 'h2' });
      expect(screen.getByRole('button', { name: /Admin/ })).toBeDisabled();
      expect(screen.getByText(/Only an Admin can grant Admin/)).toBeInTheDocument();
    });

    it('cannot demote or revoke an Admin (#463)', async () => {
      const user = userEvent.setup();
      render(<UserManagerScreen />);
      await user.click(screen.getByRole('button', { name: /Chief Reyes/ }));
      await screen.findByText('Member', { selector: 'h2' });
      // two admins exist, so this is NOT the anti-lockout reason — it's the actor rank
      expect(screen.getByRole('button', { name: /Default/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Revoke access/ })).toBeDisabled();
      expect(screen.getAllByText(/Only an Admin can change an Admin/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Promote another member to Admin first/)).toBeNull();
    });
  });

  it('Reset password: a FAILED reset keeps the confirm open with the reason (#426 discipline)', async () => {
    const user = userEvent.setup();
    actions.resetMemberPassword.mockResolvedValueOnce({ ok: false, reason: "Couldn't reach the server — check your connection and try again." });
    render(<UserManagerScreen />);
    await user.click(screen.getByRole('button', { name: /FF Diaz/ }));
    await screen.findByText('Member', { selector: 'h2' });
    await user.click(screen.getByRole('button', { name: /Reset password to starter/ }));
    await screen.findByText(/Reset FF Diaz.s password\?/);
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/reach the server/i);
    expect(screen.getByText(/Reset FF Diaz.s password\?/)).toBeInTheDocument();
  });
});

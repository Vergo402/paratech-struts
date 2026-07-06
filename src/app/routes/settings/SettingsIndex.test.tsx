// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Permissions } from '@core/schema';

const mockPerms = vi.fn();
const mockAudit = vi.fn();
const mockSession = vi.fn();
const mockDept = vi.fn();

vi.mock('@ui/primitives', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasRailNav: () => false, // force the phone page-list branch
}));
vi.mock('@ui/hooks', () => ({
  usePermissions: () => mockPerms(),
  useAuditAccess: () => mockAudit(),
  useSession: () => mockSession(),
  useDepartment: () => mockDept(),
  useRoles: () => ({}),
}));
vi.mock('@ui/picker', () => ({
  InlineSegmented: ({ label }: { label: string }) => <div>{label}</div>,
}));
vi.mock('../../theme', () => ({
  useTheme: () => ({ preference: 'dark', setPreference: vi.fn() }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-navigate={to} />,
}));

import { SettingsIndex } from './SettingsIndex';

const NONE: Permissions = {
  read: true, runFieldWork: true, manageOperations: false, manageInventory: false,
  manageRoster: false, manageSettings: false, manageUsers: false, manageData: false,
};

beforeEach(() => {
  mockAudit.mockReturnValue({ opId: null, opName: null, canIncident: false, canAdministrative: false, loading: false });
  mockPerms.mockReturnValue(NONE);
  mockSession.mockReturnValue({ identity: { kind: 'guest' } });
  mockDept.mockReturnValue({ department: null, role: null });
});

describe('SettingsIndex page-list gating (50-settings.md §Settings by context)', () => {
  it('a Default member sees the member subset — no Administration', () => {
    render(<SettingsIndex />);
    // 'Department' appears as both the section label and the page row — ≥1 is the contract
    for (const label of ['Appearance', 'Department', 'Help & reference']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('an admin (manageUsers) sees Administration', () => {
    mockPerms.mockReturnValue({ ...NONE, manageUsers: true, manageSettings: true });
    render(<SettingsIndex />);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('an Incident Commander (canIncident, no back-office perms) still sees Administration', () => {
    mockAudit.mockReturnValue({ opId: 'op1', opName: 'X', canIncident: true, canAdministrative: false, loading: false });
    render(<SettingsIndex />);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });
});

describe('SettingsIndex identity card (craft.md, #431)', () => {
  it('a guest sees the guest identity card with the sign-in affordance', () => {
    render(<SettingsIndex />);
    expect(screen.getByText('Guest on this device')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('a member sees name + department, and no sign-in chip', () => {
    mockSession.mockReturnValue({ identity: { kind: 'member', displayName: 'Alex Vergo' } });
    mockDept.mockReturnValue({ department: { id: 'd1', name: 'Hartsdale FD' }, role: 'admin' });
    render(<SettingsIndex />);
    expect(screen.getByText('Alex Vergo')).toBeInTheDocument();
    expect(screen.getByText(/Hartsdale FD/)).toBeInTheDocument();
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  });

  it('gated rows still hide for a Default member (data management)', () => {
    render(<SettingsIndex />);
    expect(screen.queryByText('Data management')).not.toBeInTheDocument();
  });
});

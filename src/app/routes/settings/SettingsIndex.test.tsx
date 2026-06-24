// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Permissions } from '@core/schema';

const mockPerms = vi.fn();
const mockAudit = vi.fn();

vi.mock('@ui/primitives', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasRailNav: () => false, // force the phone page-list branch
}));
vi.mock('@ui/hooks', () => ({
  usePermissions: () => mockPerms(),
  useAuditAccess: () => mockAudit(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
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
});

describe('SettingsIndex page-list gating (50-settings.md §Settings by context)', () => {
  it('a Default member sees the member subset — no Administration', () => {
    render(<SettingsIndex />);
    for (const label of ['Account', 'Appearance', 'Department', 'Help & reference']) {
      expect(screen.getByText(label)).toBeInTheDocument();
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

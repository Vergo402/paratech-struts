// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseOperation = vi.fn();
const mockUsePermissions = vi.fn();
const mockActions = { exportCsv: () => 'csv', templateCsv: () => 'tpl', importCsv: vi.fn(), importRows: vi.fn() };

vi.mock('@ui/hooks', async () => ({
  // real pure CSV helpers the barrel re-exports (ImportFlow needs them); hooks stay mocked
  ...(await vi.importActual<typeof import('@data/inventory/excel')>('@data/inventory/excel')),
  useOperation: () => mockUseOperation(),
  usePermissions: () => mockUsePermissions(),
  useInventoryActions: () => mockActions,
}));

import { DataManagementPage } from './DataManagementPage';
import { SETTINGS_PAGES } from '../../shell/settingsPages';

const PERMS = (over: Record<string, boolean>) => ({
  read: true,
  runFieldWork: false,
  manageOperations: false,
  manageInventory: false,
  manageRoster: false,
  manageSettings: false,
  manageUsers: false,
  manageData: false,
  ...over,
});

beforeEach(() => {
  mockUseOperation.mockReturnValue(null);
  mockUsePermissions.mockReturnValue(PERMS({ manageData: true }));
});

describe('DataManagementPage (50-settings §4)', () => {
  it('a manageData member sees Export + Template, no Import', () => {
    mockUsePermissions.mockReturnValue(PERMS({ manageData: true }));
    render(<DataManagementPage />);
    expect(screen.getByRole('button', { name: /Export inventory/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download template/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import inventory/ })).not.toBeInTheDocument();
  });

  it('a manageInventory member gets the Import button', () => {
    mockUsePermissions.mockReturnValue(PERMS({ manageInventory: true }));
    render(<DataManagementPage />);
    expect(screen.getByRole('button', { name: /Import inventory/ })).toBeInTheDocument();
  });

  it('shows the op-active import notice only when an operation is running (informs, never blocks)', () => {
    mockUseOperation.mockReturnValue(null);
    const { rerender } = render(<DataManagementPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    mockUseOperation.mockReturnValue({ id: 'op-1' });
    rerender(<DataManagementPage />);
    expect(screen.getByRole('status')).toHaveTextContent('importing is fine');
  });

  it('the nav entry is hidden from a member with neither data permission', () => {
    const page = SETTINGS_PAGES.find((p) => p.to === '/settings/data')!;
    expect(page.show({ perms: PERMS({}), canIncident: false })).toBe(false);
    expect(page.show({ perms: PERMS({ manageData: true }), canIncident: false })).toBe(true);
    expect(page.show({ perms: PERMS({ manageInventory: true }), canIncident: false })).toBe(true);
  });
});

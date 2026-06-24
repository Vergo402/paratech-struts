// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockUsePermissions = vi.fn();
const mockUseApparatus = vi.fn();
const mockUseApparatusTypes = vi.fn();

vi.mock('@ui/hooks', () => ({
  usePermissions: () => mockUsePermissions(),
  useApparatus: () => mockUseApparatus(),
  useApparatusTypes: () => mockUseApparatusTypes(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => vi.fn(),
}));

import { ApparatusTypesPage } from './ApparatusTypesPage';
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
  mockAdd.mockReset().mockResolvedValue({ ok: true });
  mockRemove.mockReset();
  mockUsePermissions.mockReturnValue(PERMS({ manageSettings: true }));
  mockUseApparatus.mockReturnValue({ roster: [] });
  mockUseApparatusTypes.mockReturnValue({
    types: [{ id: 'at-1', name: 'Water Tender' }],
    add: mockAdd,
    remove: mockRemove,
  });
});

describe('ApparatusTypesPage (50-settings §5)', () => {
  it('lists built-ins as locked and customs as removable', () => {
    render(<ApparatusTypesPage />);
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getAllByText('built-in').length).toBeGreaterThan(0);
    expect(screen.getByText('Water Tender')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('adds a type through the seam', async () => {
    const user = userEvent.setup();
    render(<ApparatusTypesPage />);
    await user.type(screen.getByLabelText('Add a type'), 'Crane');
    await user.click(screen.getByRole('button', { name: 'Add type' }));
    expect(mockAdd).toHaveBeenCalledWith('Crane');
  });

  it('blocks removing a type a rig still uses, and names the rig', async () => {
    const user = userEvent.setup();
    mockUseApparatus.mockReturnValue({ roster: [{ id: 'r1', name: 'Tender 7', type: 'Water Tender' }] });
    render(<ApparatusTypesPage />);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(mockRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Type is in use' })).toHaveTextContent('Tender 7');
  });

  it('removes an unused custom type', async () => {
    const user = userEvent.setup();
    render(<ApparatusTypesPage />);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(mockRemove).toHaveBeenCalledWith('at-1');
  });

  it('shows an admin-only backstop to a non-manageSettings member', () => {
    mockUsePermissions.mockReturnValue(PERMS({}));
    render(<ApparatusTypesPage />);
    expect(screen.getByText('Admin access only')).toBeInTheDocument();
  });

  it('the nav entry is gated on manageSettings', () => {
    const page = SETTINGS_PAGES.find((p) => p.to === '/settings/apparatus-types')!;
    expect(page.show({ perms: PERMS({}), canIncident: false })).toBe(false);
    expect(page.show({ perms: PERMS({ manageSettings: true }), canIncident: false })).toBe(true);
  });
});

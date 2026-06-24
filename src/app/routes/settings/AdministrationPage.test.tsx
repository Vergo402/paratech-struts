// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetAfterActionEmail = vi.fn();
const mockUsePermissions = vi.fn();
const mockUseDeptPolicies = vi.fn();

vi.mock('@ui/hooks', () => ({
  useDepartment: () => ({ department: { id: 'd1', name: 'Hamden' } }),
  usePermissions: () => mockUsePermissions(),
  useAuditAccess: () => ({ canIncident: false }),
  useCustomTitles: () => ({ titles: [], add: vi.fn(), remove: vi.fn() }),
  useDeptPolicies: () => mockUseDeptPolicies(),
}));
// Heavy children pull their own @data hooks — stub them; this test is about the policy toggle.
vi.mock('@ui/settings/ChecklistEditor', () => ({ ChecklistEditor: () => null }));
vi.mock('@ui/command/AddCustomTitleModal', () => ({ AddCustomTitleModal: () => null }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => vi.fn(),
}));

import { AdministrationPage } from './AdministrationPage';

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
  mockSetAfterActionEmail.mockReset();
  mockUsePermissions.mockReturnValue(PERMS({ manageSettings: true }));
  mockUseDeptPolicies.mockReturnValue({ afterActionEmail: true, setAfterActionEmail: mockSetAfterActionEmail });
});

describe('AdministrationPage — after-action policy toggle (#305)', () => {
  it('shows the toggle ON and flips it off through the seam', async () => {
    const user = userEvent.setup();
    render(<AdministrationPage />);
    const toggle = screen.getByRole('switch', { name: /after-action record by email/i });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(mockSetAfterActionEmail).toHaveBeenCalledWith(false);
  });

  it('hides Department policies from a member without manageSettings', () => {
    mockUsePermissions.mockReturnValue(PERMS({}));
    render(<AdministrationPage />);
    expect(screen.queryByText('Department policies')).not.toBeInTheDocument();
  });
});

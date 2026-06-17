// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseTheme = vi.fn();
const mockUseSession = vi.fn();
const mockUseDepartment = vi.fn();
const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../theme', () => ({ useTheme: () => mockUseTheme() }));
vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => mockUseDepartment(),
  useOnboarding: () => ({
    roleFocus: null,
    replayTour: vi.fn(),
    startLesson: vi.fn(),
    setRoleFocus: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { SettingsScreen } from './settings';

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockUseTheme.mockReturnValue({ preference: 'system', setPreference: vi.fn() });
  mockUseSession.mockReturnValue({
    identity: { kind: 'guest' },
    signIn: vi.fn(),
    createAccount: vi.fn(),
    signOut: mockSignOut,
  });
  mockUseDepartment.mockReset().mockReturnValue({
    department: null,
    role: null,
    inviteCode: null,
    createDepartment: vi.fn(),
  });
});

describe('SettingsScreen theme picker (audit W8)', () => {
  it('highlights the active theme', () => {
    mockUseTheme.mockReturnValue({ preference: 'sunlight', setPreference: vi.fn() });
    render(<SettingsScreen />);
    expect(screen.getByRole('radio', { name: 'Sunlight' })).toBeChecked();
  });

  it('shows NO pill selected when Broadcast is active — not a misleading Dark', () => {
    mockUseTheme.mockReturnValue({ preference: 'broadcast', setPreference: vi.fn() });
    render(<SettingsScreen />);
    for (const name of ['System', 'Light', 'Dark', 'Sunlight']) {
      expect(screen.getByRole('radio', { name })).not.toBeChecked();
    }
  });
});

describe('SettingsScreen account section (workflow 06)', () => {
  it('a guest sees Sign In, which routes to /auth', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
  });

  it('a member sees their name and logs out through the destructive confirm', async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      identity: { kind: 'member', accountId: 'a1', displayName: 'Capt. Marchetti' },
      signIn: vi.fn(),
      createAccount: vi.fn(),
      signOut: mockSignOut,
    });
    render(<SettingsScreen />);
    expect(screen.getByText('Capt. Marchetti')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log Out' }));
    const dialog = screen.getByRole('dialog', { name: 'Log out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Log Out' }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('SettingsScreen department section (workflow 07)', () => {
  function asMember() {
    mockUseSession.mockReturnValue({
      identity: { kind: 'member', accountId: 'a1', displayName: 'Capt. Marchetti' },
      signIn: vi.fn(),
      createAccount: vi.fn(),
      signOut: mockSignOut,
    });
  }

  it('a member without a department sees Create new department → /create-department', async () => {
    const user = userEvent.setup();
    asMember();
    render(<SettingsScreen />);
    await user.click(screen.getByRole('button', { name: 'Create new department' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/create-department' });
  });

  it('a member with a department sees its name and the Admin badge', () => {
    asMember();
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'admin',
      inviteCode: 'ABCD-2345',
      createDepartment: vi.fn(),
    });
    render(<SettingsScreen />);
    expect(screen.getByText('Hamden Fire Rescue')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('a member with a department sees the invite code and a Copy button that copies it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    asMember();
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'admin',
      inviteCode: 'ABCD-2345',
      createDepartment: vi.fn(),
    });
    render(<SettingsScreen />);
    expect(screen.getByText('ABCD-2345')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('ABCD-2345');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('a guest sees no department section', () => {
    render(<SettingsScreen />); // default mock = guest
    expect(screen.queryByRole('heading', { name: 'Department' })).not.toBeInTheDocument();
  });
});

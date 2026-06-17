// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseDepartment = vi.fn();
const mockSignIn = vi.fn();
const mockCreateAccount = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => mockUseDepartment(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { AuthScreen } from './AuthScreen';

const OK = { ok: true, member: { accountId: 'a1', displayName: 'X' } };

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignIn.mockReset().mockResolvedValue(OK);
  mockCreateAccount.mockReset().mockResolvedValue(OK);
  mockUseSession.mockReturnValue({
    identity: { kind: 'guest' },
    signIn: mockSignIn,
    createAccount: mockCreateAccount,
    signOut: vi.fn(),
  });
  // Default: a freshly-authed member has no department → forward to setup.
  mockUseDepartment.mockReset().mockReturnValue({
    department: null,
    role: null,
    createDepartment: vi.fn(),
  });
});

describe('AuthScreen (workflow 06 — sign in / create account)', () => {
  it('opens in Sign In mode — no display name field, Sign In submit', () => {
    render(<AuthScreen />);
    expect(screen.getByRole('radio', { name: 'Sign In' })).toBeChecked();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('switching to Create Account reveals the mandatory display name and relabels submit', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.click(screen.getByRole('radio', { name: 'Create Account' }));
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('submit is disabled until the required fields are filled', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    const submit = screen.getByRole('button', { name: 'Sign In' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    expect(submit).toBeEnabled();
  });

  it('Sign In calls the seam and forwards to department setup when none exists', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'reyes@dept14.gov', password: 'hunter2' });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/create-department' });
  });

  it('Sign In goes straight to the app when the member already has a department', async () => {
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'admin',
      createDepartment: vi.fn(),
    });
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/operations' });
  });

  it('Create Account passes the display name to the seam', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.click(screen.getByRole('radio', { name: 'Create Account' }));
    await user.type(screen.getByLabelText('Display name'), 'Capt. Marchetti');
    await user.type(screen.getByLabelText('Email'), 'cap@dept14.gov');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(mockCreateAccount).toHaveBeenCalledWith({
      email: 'cap@dept14.gov',
      password: 'hunter2',
      displayName: 'Capt. Marchetti',
    });
  });

  it('a rejected sign-in shows the reason inline and does not navigate', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ ok: false, reason: "That email and password don't match." });
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByText("That email and password don't match.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Continue as guest returns home without touching the seam', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/operations' });
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('the password reveal toggles masking', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    const pw = screen.getByLabelText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw).toHaveAttribute('type', 'text');
  });

  it('the cloud-dependent options are present but disabled', () => {
    render(<AuthScreen />);
    expect(screen.getByRole('button', { name: 'Email me a sign-in link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeDisabled();
  });
});

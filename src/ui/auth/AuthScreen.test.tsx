// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseDepartment = vi.fn();
const mockSignIn = vi.fn();
const mockCreateAccount = vi.fn();
const mockNavigate = vi.fn();
const mockSendMagicLink = vi.fn();
const mockSendPasswordReset = vi.fn();
const mockIsMagicLink = vi.fn();
const mockCompleteMagicLink = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => mockUseDepartment(),
  useOnboarding: () => ({ start: vi.fn() }),
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
  mockSendMagicLink.mockReset().mockResolvedValue({ ok: true });
  mockSendPasswordReset.mockReset().mockResolvedValue({ ok: true });
  mockIsMagicLink.mockReset().mockReturnValue(false); // not a magic-link landing by default
  mockCompleteMagicLink.mockReset().mockResolvedValue(OK);
  mockUseSession.mockReturnValue({
    identity: { kind: 'guest' },
    signIn: mockSignIn,
    createAccount: mockCreateAccount,
    signOut: vi.fn(),
    sendMagicLink: mockSendMagicLink,
    sendPasswordReset: mockSendPasswordReset,
    isMagicLink: mockIsMagicLink,
    completeMagicLink: mockCompleteMagicLink,
  });
  // Default: a freshly-authed member has no department → forward to setup.
  // currentDepartmentId() is the FRESH read used for the post-auth route.
  mockUseDepartment.mockReset().mockReturnValue({
    department: null,
    role: null,
    createDepartment: vi.fn(),
    currentDepartmentId: () => null,
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
      currentDepartmentId: () => 'd1',
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

  it('the email actions are disabled until an email is entered, then enable', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    const magic = screen.getByRole('button', { name: 'Email me a sign-in link' });
    const forgot = screen.getByRole('button', { name: 'Forgot password?' });
    expect(magic).toBeDisabled();
    expect(forgot).toBeDisabled();
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    expect(magic).toBeEnabled();
    expect(forgot).toBeEnabled();
  });

  it('the email actions are hidden in Create Account mode (display name needed first)', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.click(screen.getByRole('radio', { name: 'Create Account' }));
    expect(screen.queryByRole('button', { name: 'Email me a sign-in link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).not.toBeInTheDocument();
  });

  it('"Email me a sign-in link" sends the link and shows a check-your-email confirmation', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(mockSendMagicLink).toHaveBeenCalledWith('reyes@dept14.gov');
    expect(screen.getByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText('reyes@dept14.gov')).toBeInTheDocument();
    // a way back to the form
    expect(screen.getByRole('button', { name: 'Use password instead' })).toBeInTheDocument();
  });

  it('"Forgot password?" sends a reset and shows the reset confirmation', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(mockSendPasswordReset).toHaveBeenCalledWith('reyes@dept14.gov');
    expect(screen.getByText(/password-reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeInTheDocument();
  });

  it('a failed magic-link send shows the reason inline and stays on the form', async () => {
    mockSendMagicLink.mockResolvedValue({ ok: false, reason: 'Too many attempts — try again in a moment.' });
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email'), 'reyes@dept14.gov');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(screen.getByText('Too many attempts — try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });

  it('opening from a magic-link completes the sign-in and forwards into the app', async () => {
    mockIsMagicLink.mockReturnValue(true);
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'default',
      createDepartment: vi.fn(),
      currentDepartmentId: () => 'd1',
    });
    render(<AuthScreen />);
    // landing shows the "signing you in" view immediately
    expect(screen.getByText('Signing you in…')).toBeInTheDocument();
    await vi.waitFor(() => expect(mockCompleteMagicLink).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/operations' }));
  });

  it('a returning member (no dept at mount, re-discovered on completion) lands in the app, not setup', async () => {
    mockIsMagicLink.mockReturnValue(true);
    // department is null at mount (guest session row) but the store re-discovers
    // it during completion — currentDepartmentId reads the FRESH value, so the
    // route must be the app, not /create-department (the stale-closure bug).
    mockUseDepartment.mockReturnValue({
      department: null,
      role: null,
      createDepartment: vi.fn(),
      currentDepartmentId: () => 'd1',
    });
    render(<AuthScreen />);
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/operations' }));
    expect(mockNavigate).not.toHaveBeenCalledWith({ to: '/create-department' });
  });

  it('a failed magic-link landing drops back to the form with the reason', async () => {
    mockIsMagicLink.mockReturnValue(true);
    mockCompleteMagicLink.mockResolvedValue({
      ok: false,
      reason: 'Open the link on the same device you requested it from.',
    });
    render(<AuthScreen />);
    await vi.waitFor(() =>
      expect(
        screen.getByText('Open the link on the same device you requested it from.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });
});

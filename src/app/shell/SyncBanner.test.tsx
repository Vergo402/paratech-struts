// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({ useSession: () => mockUseSession() }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { SyncBanner } from './SyncBanner';

const GUEST = { identity: { kind: 'guest' }, signIn: vi.fn(), createAccount: vi.fn(), signOut: vi.fn() };

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseSession.mockReturnValue(GUEST);
});

describe('SyncBanner (workflow 06 — guest-only sync nudge)', () => {
  it('shows for a guest and routes to /auth', async () => {
    const user = userEvent.setup();
    render(<SyncBanner />);
    await user.click(screen.getByRole('button', { name: 'Sign in to sync' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
  });

  it('renders nothing for a signed-in member', () => {
    mockUseSession.mockReturnValue({
      identity: { kind: 'member', accountId: 'a1', displayName: 'X' },
      signIn: vi.fn(),
      createAccount: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(<SyncBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismiss hides it (and never navigates)', async () => {
    const user = userEvent.setup();
    render(<SyncBanner />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button', { name: 'Sign in to sync' })).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

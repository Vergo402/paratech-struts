// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseDepartment = vi.fn();
const mockNavigate = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => mockUseDepartment(),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { RequireDepartment } from './RequireDepartment';

const MEMBER = { kind: 'member', accountId: 'a1', displayName: 'Alex' } as const;

function setup(identity: unknown, department: { id: string; name: string } | null) {
  mockUseSession.mockReturnValue({ identity, signOut: mockSignOut });
  mockUseDepartment.mockReturnValue({ department });
  return render(
    <RequireDepartment>
      <div>TAB BODY</div>
    </RequireDepartment>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignOut.mockReset().mockResolvedValue(undefined);
});

describe('RequireDepartment (the dept-scoped tab gate)', () => {
  it('gates a signed-in member with no department — shows the set-up gate, not the tab', () => {
    setup(MEMBER, null);
    expect(screen.getByRole('heading', { name: 'Set up your department' })).toBeInTheDocument();
    expect(screen.queryByText('TAB BODY')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create department' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join an existing department' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('lets a member WITH a department through to the tab', () => {
    setup(MEMBER, { id: 'd1', name: 'Hamden Fire Rescue' });
    expect(screen.getByText('TAB BODY')).toBeInTheDocument();
    expect(screen.queryByText('Set up your department')).not.toBeInTheDocument();
  });

  it('never gates a guest (ADR-015, guest-first)', () => {
    setup({ kind: 'guest' }, null);
    expect(screen.getByText('TAB BODY')).toBeInTheDocument();
  });

  it('Create / Join route to their setup screens', async () => {
    const user = userEvent.setup();
    setup(MEMBER, null);
    await user.click(screen.getByRole('button', { name: 'Create department' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/create-department' });
    await user.click(screen.getByRole('button', { name: 'Join an existing department' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/join-department' });
  });

  it('Sign out signs out then returns to /auth', async () => {
    const user = userEvent.setup();
    setup(MEMBER, null);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalled();
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' }));
  });
});

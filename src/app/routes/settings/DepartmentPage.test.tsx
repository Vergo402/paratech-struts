// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseSession = vi.fn();
const mockUseDepartment = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({
  useSession: () => mockUseSession(),
  useDepartment: () => mockUseDepartment(),
}));
vi.mock('@ui/dept', () => ({ QrImage: () => null }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));

import { DepartmentPage } from './DepartmentPage';

function asMember() {
  mockUseSession.mockReturnValue({ identity: { kind: 'member', accountId: 'a1', displayName: 'Capt. Marchetti' } });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseSession.mockReturnValue({ identity: { kind: 'guest' } });
  mockUseDepartment.mockReturnValue({ department: null, role: null, inviteCode: null });
});

describe('DepartmentPage (workflow 07)', () => {
  it('a guest sees the forward sign-in path', async () => {
    const user = userEvent.setup();
    render(<DepartmentPage />);
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth' });
  });

  it('a member without a department sees Create new department → /create-department', async () => {
    const user = userEvent.setup();
    asMember();
    render(<DepartmentPage />);
    await user.click(screen.getByRole('button', { name: 'Create new department' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/create-department' });
  });

  it('a member with a department sees its name and the Admin badge', () => {
    asMember();
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'admin',
      inviteCode: 'ABCD-2345',
    });
    render(<DepartmentPage />);
    expect(screen.getByText('Hamden Fire Rescue')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('a member with a department copies the invite code', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    asMember();
    mockUseDepartment.mockReturnValue({
      department: { id: 'd1', name: 'Hamden Fire Rescue' },
      role: 'admin',
      inviteCode: 'ABCD-2345',
    });
    render(<DepartmentPage />);
    expect(screen.getByText('ABCD-2345')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('ABCD-2345');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateDepartment = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({
  useDepartment: () => ({ department: null, role: null, createDepartment: mockCreateDepartment }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('./switchBucket', () => ({ reloadIntoActiveBucket: vi.fn() }));

import { CreateDepartmentScreen } from './CreateDepartmentScreen';
import { reloadIntoActiveBucket } from './switchBucket';

const mockReload = vi.mocked(reloadIntoActiveBucket);

const OK = {
  ok: true,
  department: { id: 'd1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' },
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockReload.mockReset();
  mockCreateDepartment.mockReset().mockResolvedValue(OK);
});

describe('CreateDepartmentScreen (workflow 07 — department setup)', () => {
  it('disables Create until a name is entered', async () => {
    const user = userEvent.setup();
    render(<CreateDepartmentScreen />);
    const create = screen.getByRole('button', { name: 'Create department' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('Department name'), 'Hamden Fire Rescue');
    expect(create).toBeEnabled();
  });

  it('creates the department and shows the success sheet with the code + Admin badge', async () => {
    const user = userEvent.setup();
    render(<CreateDepartmentScreen />);
    await user.type(screen.getByLabelText('Department name'), 'Hamden Fire Rescue');
    await user.click(screen.getByRole('button', { name: 'Create department' }));
    expect(mockCreateDepartment).toHaveBeenCalledWith('Hamden Fire Rescue');
    expect(await screen.findByText('Hamden Fire Rescue is ready')).toBeInTheDocument();
    expect(screen.getByText('ABCD-2345')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows the failure reason inline and opens no sheet', async () => {
    mockCreateDepartment.mockResolvedValue({
      ok: false,
      reason: 'Sign in before creating a department.',
    });
    const user = userEvent.setup();
    render(<CreateDepartmentScreen />);
    await user.type(screen.getByLabelText('Department name'), 'Hamden');
    await user.click(screen.getByRole('button', { name: 'Create department' }));
    expect(await screen.findByText('Sign in before creating a department.')).toBeInTheDocument();
    expect(screen.queryByText(/is ready/)).not.toBeInTheDocument();
  });

  it('Done switches onto the new department (reloads its bucket), after the code Sheet shows', async () => {
    const user = userEvent.setup();
    render(<CreateDepartmentScreen />);
    await user.type(screen.getByLabelText('Department name'), 'Hamden Fire Rescue');
    await user.click(screen.getByRole('button', { name: 'Create department' }));
    // The Sheet (with the invite code) renders first — the reload is deferred to Done.
    await user.click(await screen.findByRole('button', { name: 'Done' }));
    expect(mockReload).toHaveBeenCalled();
  });

  it('Skip for now exits without creating a department', async () => {
    const user = userEvent.setup();
    render(<CreateDepartmentScreen />);
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/operations' });
    expect(mockCreateDepartment).not.toHaveBeenCalled();
  });
});

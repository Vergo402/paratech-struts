// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InventoryScreen } from './InventoryScreen';
import { ImportExport } from './ImportExport';
import type { Apparatus, InventoryItem, Operation } from '@core/schema';

const mockInventory = vi.fn((): InventoryItem[] => []);
const mockApparatus = vi.fn(() => ({ roster: [] as Apparatus[], add: vi.fn(), remove: vi.fn() }));
const mockOperation = vi.fn((): Operation | null => null);
const actions = {
  addOne: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
  setQuantity: vi.fn(),
  remove: vi.fn(),
  exportCsv: () => '',
  templateCsv: () => '',
  importCsv: vi.fn(),
};

vi.mock('@ui/hooks', () => ({
  useInventory: () => mockInventory(),
  useApparatus: () => mockApparatus(),
  useInventoryActions: () => actions,
  useOperation: () => mockOperation(),
}));

const rig = (id: string, name: string): Apparatus => ({ id, name, type: 'Engine' });
const item = (id: string, apparatusId: string, apparatus: string, model: string): InventoryItem => ({
  id,
  type: 'strut',
  model,
  system: model.startsWith('LS') ? 'LongShore' : 'AcmeThread',
  apparatus,
  apparatusId,
  quantity: 1,
  available: 1,
});

describe('InventoryScreen', () => {
  beforeEach(() => {
    mockInventory.mockReturnValue([]);
    mockApparatus.mockReturnValue({ roster: [], add: vi.fn(), remove: vi.fn() });
    mockOperation.mockReturnValue(null);
  });

  it('shows the first-run empty state when there are no apparatus', () => {
    render(<InventoryScreen />);
    expect(screen.getByText('No apparatus yet')).toBeInTheDocument();
  });

  it('scopes the equipment list to the selected apparatus tab', async () => {
    const user = userEvent.setup();
    mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1'), rig('r2', 'Rescue 2')], add: vi.fn(), remove: vi.fn() });
    mockInventory.mockReturnValue([item('a', 'e1', 'Engine 1', 'AT 25-36'), item('b', 'r2', 'Rescue 2', 'LS 203')]);
    render(<InventoryScreen />);
    // default selection is the first rig alphabetically (Engine 1)
    expect(screen.getByText('AT 25-36')).toBeInTheDocument();
    expect(screen.queryByText('LS 203')).toBeNull();
    await user.click(screen.getByRole('tab', { name: /Rescue 2/ }));
    expect(screen.getByText('LS 203')).toBeInTheDocument();
    expect(screen.queryByText('AT 25-36')).toBeNull();
  });

  it('blocks CSV import while an operation is active', () => {
    mockApparatus.mockReturnValue({ roster: [rig('e1', 'Engine 1')], add: vi.fn(), remove: vi.fn() });
    mockOperation.mockReturnValue({ id: 'op-1', name: 'Surfside', multiBuilding: false, inlineDeploy: false, divisions: [1], saws: ['A'], status: 'active', createdAt: 1 });
    render(<InventoryScreen />);
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled();
  });
});

describe('ImportExport', () => {
  it('surfaces an orphan-skipping import outcome in a Modal (not a toast)', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue({ imported: 1, skipped: 1, warnings: [] });
    const { container } = render(
      <ImportExport opActive={false} exportCsv={() => ''} templateCsv={() => ''} onImport={onImport} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'inv.csv', { type: 'text/csv' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/skipped/);
  });
});

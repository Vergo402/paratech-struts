// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import type { InventoryItem, ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';

const mockInventory = vi.fn((): InventoryItem[] => []);
const mockRecommendations = vi.fn((): StrutCombination[] => []);
const mockCommit = vi.fn();

vi.mock('@ui/hooks', () => ({
  useInventory: () => mockInventory(),
  useRecommendations: () => mockRecommendations(),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

function makeSP(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    area: 'NW corner',
    shoreType: 't-shore',
    measurementEighths: 60 * 8,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

const INV_ITEM: InventoryItem = {
  id: 'inv-1',
  type: 'strut',
  model: 'LS 406',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 2,
  available: 2,
};

const COMBO: StrutCombination = {
  strut: {
    id: 'ls-406',
    model: 'LS 406',
    system: 'LongShore',
    color: 'gold',
    collapsed: 48,
    extended: 73,
    inventoryId: 'inv-1',
    availableQty: 2,
  },
  extensions: [],
  extTotal: 0,
  adjCollapsed: 48,
  adjExtended: 73,
  capacity: 22000,
  capacityAll: [44000, 29333, 22000],
  margin: 22000,
  componentCount: 1,
  recommendedQty: 1,
  totalCapacity: 22000,
  deductions: null,
  effectiveLength: 60,
  openingLength: 60,
};

describe('AssignEquipmentSheet (#221 step 2)', () => {
  beforeEach(() => {
    mockInventory.mockReturnValue([]);
    mockRecommendations.mockReturnValue([]);
    mockCommit.mockReset();
    mockCommit.mockResolvedValue({ ok: true });
  });

  it('renders nothing when shorePoint is null', () => {
    render(<AssignEquipmentSheet shorePoint={null} onClose={vi.fn()} onDeployed={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a sheet with the SP context header', () => {
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Assign Equipment' });
    expect(sheet).toBeInTheDocument();
    expect(screen.getByText(/Div 1 · NW corner/)).toBeInTheDocument();
    expect(screen.getByText(/T-Shore/)).toBeInTheDocument();
  });

  it('renders a RecommendationCard per result; source + location resolved from the combo/SP', () => {
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} />);
    // S12 anatomy: model lives in the centered identity line; apparatus + the
    // SP location (division · area, wired via §7) ride the header, not a footer.
    // The sheet portals to document.body — query the document, not the container.
    expect(document.querySelector('.fs-rec-identity')!.textContent).toContain('LS 406');
    expect(document.querySelector('.fs-rec-apparatus')!.textContent).toBe('Equipment located on: Rescue 2');
    expect(document.querySelector('.fs-rec-loc')!.textContent).toBe('Div 1 · NW corner');
    expect(screen.queryByText('Equipment from: Rescue 2')).not.toBeInTheDocument();
  });

  it('Deploy commits EquipmentDeployed with the composed identity and reports back', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    const sp = makeSP();
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={sp} onClose={vi.fn()} onDeployed={onDeployed} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EquipmentDeployed',
        opId: 'op-1',
        spId: 'sp-1',
        by: 'device-test',
        deployedBom: expect.arrayContaining([
          expect.objectContaining({ role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'inv-1' }),
        ]),
      }),
    );
    expect(onDeployed).toHaveBeenCalledWith(sp, 'LS 406');
  });

  it('an extension combo decomposes into a strut + extension BOM (cradle-to-grave identity)', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    // The extension is in stock on the SAME rig as the strut (engine resolved its
    // source) → a clean one-rig assembly that deploys in one tap.
    const EXT_ITEM: InventoryItem = {
      id: 'inv-ext',
      type: 'extension',
      system: 'LongShore',
      length: 12,
      apparatus: 'Rescue 2',
      apparatusId: 'app-r2',
      quantity: 1,
      available: 1,
    };
    mockRecommendations.mockReturnValue([
      { ...COMBO, extensions: [12], extTotal: 12, adjCollapsed: 60, adjExtended: 85, extensionSources: [{ length: 12, inventoryId: 'inv-ext' }] },
    ]);
    mockInventory.mockReturnValue([INV_ITEM, EXT_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={onDeployed} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    // ADR-033: the strut member carries the BARE model; the extension is its own
    // BOM component. The combined "LS 406 + 12″" identity is reconstructed for
    // display (bomModelLabel) and reported to the board via onDeployed.
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        deployedBom: expect.arrayContaining([
          expect.objectContaining({ role: 'strut', model: 'LS 406' }),
          expect.objectContaining({ role: 'extension', length: 12 }),
        ]),
      }),
    );
    expect(onDeployed).toHaveBeenCalledWith(expect.anything(), 'LS 406 + 12″');
  });

  it('a failed commit keeps the sheet open and surfaces the reason as an alert', async () => {
    const user = userEvent.setup();
    const onDeployed = vi.fn();
    mockCommit.mockResolvedValue({ ok: false, reason: 'no stock for that strut' });
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={onDeployed} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('no stock for that strut');
    expect(onDeployed).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    // The lock releases on failure — Deploy is tappable again.
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeEnabled();
  });

  it('single-flight: a second tap while a deploy is in flight commits nothing', async () => {
    const user = userEvent.setup();
    let resolve!: (v: { ok: true }) => void;
    mockCommit.mockReturnValue(new Promise((r) => (resolve = r)));
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([INV_ITEM]);
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} />);

    const deploy = screen.getByRole('button', { name: /^Deploy/ });
    await user.click(deploy);
    await user.click(deploy);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true }));
  });

  it('a combo whose stock record vanished errors inline instead of committing', async () => {
    const user = userEvent.setup();
    mockRecommendations.mockReturnValue([COMBO]);
    mockInventory.mockReturnValue([]); // the id the combo carries no longer exists
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Deploy/ }));
    expect(mockCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/no longer in inventory/);
  });

  it('empty + geometry blocker → the no-match empty state (sheet still opens)', () => {
    // 16″ sits in the catalog gap — nothing fits even unrestricted.
    render(
      <AssignEquipmentSheet shorePoint={makeSP({ measurementEighths: 16 * 8 })} onClose={vi.fn()} onDeployed={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.getByText('No matching struts')).toBeInTheDocument();
  });

  it('empty + stock blocker → the no-inventory empty state (sheet still opens)', () => {
    // 60″ is catalog-reachable; the empty inventory is the blocker.
    render(<AssignEquipmentSheet shorePoint={makeSP()} onClose={vi.fn()} onDeployed={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.getByText('No apparatus stock available')).toBeInTheDocument();
  });
});

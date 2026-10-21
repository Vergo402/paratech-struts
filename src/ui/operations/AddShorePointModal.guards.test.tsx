// @vitest-environment jsdom
// One-step Add Shore Point: the result-card Deploy buttons must honor the SAME
// form checks as Save as Pending. Uses the REAL RecommendationCard (the sibling
// test file mocks it to a bare button, which is exactly how the bypass hid —
// 2026-10-17 land-qf-rec merge review, High).
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddShorePointModal } from './AddShorePointModal';
import type { Operation, ShorePoint, StockRow } from '@core/schema';
import { findStrutCombinations } from '@core/load';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });

const INV: StockRow[] = [
  { id: 'inv-1', type: 'strut', model: 'LS 304', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'a1', quantity: 4, held: 0, available: 4 },
];
// 48″ opening − 4×4 header/footer (3.5 + 3.5) = 41″ → LS 304 (36–50) fits.
const COMBO = findStrutCombinations(48, 0, 2, INV, null, { header: 3.5, sole: 3.5 })[0]!;
// Swappable per test (read lazily by the hook mocks below); defaults = the fixtures above.
let mockInv: StockRow[] = INV;
let mockRecs = [COMBO];

vi.mock('@ui/hooks', () => ({
  useOperation: () => OP,
  useShorePoints: () => [],
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useInventory: () => mockInv,
  useRecommendations: (sp: unknown) => (sp ? mockRecs : []),
  w3wEnabled: () => false,
  convertToWords: () => Promise.resolve(''),
}));

const OP: Operation = {
  id: 'op-1', name: 'Surfside', multiBuilding: false, inlineDeploy: true, divisions: [1], saws: ['A'],
  status: 'active', createdAt: 1000, currentPeriod: 1, periods: [{ number: 1, startedAt: 1000 }],
};

async function openAndFind(user: ReturnType<typeof userEvent.setup>, shoreType = 'T-Shore') {
  render(<AddShorePointModal open onClose={() => {}} />);
  await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: shoreType }));
  await user.type(screen.getByRole('textbox', { name: 'Feet' }), '4');
  for (const name of ['Header wood — required', 'Footer wood — required']) {
    const group = screen.getByRole('radiogroup', { name });
    if (!within(group).queryByRole('radio', { checked: true })) {
      await user.click(within(group).getByRole('radio', { name: '4×4' }));
    }
  }
  await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
  expect(deployButton()).toBeEnabled();
}
const deployButton = () => screen.getByRole('button', { name: /^Deploy/ });

describe('AddShorePointModal — card Deploy honors the form checks (real card)', () => {
  beforeEach(() => {
    mockCommit.mockClear();
    mockCommitMany.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('(a) 3-Post → Find → switch to T-Shore clears the wood: Deploy locks with the wood reason', async () => {
    const user = userEvent.setup();
    await openAndFind(user, '3-Post');
    await user.click(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: 'T-Shore' }));
    expect(deployButton()).toBeDisabled();
    expect(deployButton().nextElementSibling).toHaveTextContent('Pick header and footer wood');
    await user.click(deployButton());
    expect(mockCommitMany).not.toHaveBeenCalled();
  });

  it('(b) an over-limit load typed after Find locks every card button with the load reason', async () => {
    const user = userEvent.setup();
    await openAndFind(user);
    await user.type(screen.getByRole('textbox', { name: /Estimated load/ }), '9999999');
    // Over-limit load → the ×N short-deploy card: its "anyway" button carries the reason too.
    const anyway = screen.getByRole('button', { name: /^Deploy 1 of \d+ anyway/ });
    // Acknowledge the short deploy — the ack alone used to be the only lock here.
    await user.click(screen.getByRole('checkbox', { name: /team acknowledges the over-capacity deploy/i }));
    expect(anyway).toBeDisabled();
    // The reason sits right under the card button, not only under Save as Pending.
    expect(anyway.nextElementSibling).toHaveTextContent('Load must be between 0 and 500,000 lbs');
    await user.click(anyway);
    expect(mockCommitMany).not.toHaveBeenCalled();
  });

  it('(c) a blank shore count after Find locks Deploy with the count reason — no dead buttons, no throw', async () => {
    const user = userEvent.setup();
    await openAndFind(user);
    await user.clear(screen.getByRole('textbox', { name: 'Number of Shore Sets' }));
    expect(deployButton()).toBeDisabled();
    expect(deployButton().nextElementSibling).toHaveTextContent(/whole number of 1 or more/);
    await user.click(deployButton());
    expect(mockCommitMany).not.toHaveBeenCalled();
    // Re-entering a count unlocks it — the lock is the form's, not a stuck in-flight flag.
    await user.type(screen.getByRole('textbox', { name: 'Number of Shore Sets' }), '1');
    expect(deployButton()).toBeEnabled();
  });
});

// One-tap 3-Post on 6×6 (accepted mockup 2026-10-20). The cut length follows the picked
// wood, so a 3-Post the one-tap built on the form's 4×4 cut and strutted 4″ long on 6×6.
describe('AddShorePointModal — one-tap 3-Post builds on 6×6 (real card)', () => {
  beforeEach(() => {
    mockCommit.mockClear();
    mockCommitMany.mockClear();
    mockInv = INV;
    mockRecs = [COMBO];
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('T-Shore 48″ on 4×4 @ 50,000 lb → "deploy as 3-Post on 6×6" commits three 6×6 points; the form follows', async () => {
    const user = userEvent.setup();
    await openAndFind(user);
    await user.type(screen.getByRole('textbox', { name: /Estimated load/ }), '50000');
    const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
    expect(add.parentElement!.querySelector('.fs-rec-add-note')).toHaveTextContent(
      'Switches header and footer to 6×6: strut 37″, cut 35 1/2″. Deploys all 3 LS 304 from Rescue 2',
    );
    await user.click(add);

    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(3));
    const added = (mockCommitMany.mock.calls[0]![0] as Array<{ type: string; shorePoint: ShorePoint }>)
      .filter((e) => e.type === 'ShorePointAdded')
      .map((e) => e.shorePoint);
    expect(added).toHaveLength(3);
    for (const p of added) {
      expect(p.shoreType).toBe('3-post');
      expect(p.groupTotal).toBe(3);
      expect(p.deductions).toEqual({ headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' });
    }
    // Every member deployed the strut the card checked, with no short-deploy ack
    // (16,667 lb each is within LS 304's 22,000 lb at 37″).
    const deploys = mockCommit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'EquipmentDeployed');
    expect(deploys.map((e) => e.spId).sort()).toEqual(added.map((p) => p.id).sort());
    for (const e of deploys) {
      expect(e.deployedBom[0]).toMatchObject({ role: 'strut', model: 'LS 304', inventoryId: 'inv-1' });
      expect(e.overCapacityAcknowledged).toBeUndefined();
    }

    // The form's controls follow so the officer sees what was built.
    expect(within(screen.getByRole('radiogroup', { name: 'Shore type' })).getByRole('radio', { name: '3-Post' })).toBeChecked();
    for (const name of ['Header wood — required', 'Footer wood — required']) {
      expect(within(screen.getByRole('radiogroup', { name })).getByRole('radio', { name: '6×6' })).toBeChecked();
    }
  });

  it('a 6×6 refit that needs an extension no rig stocks locks the tap — never a Pending or off-book member', async () => {
    // 69″ − 4×4 = 62″ → LS 304 + 24″ (60–74), the 24″ on Rescue 2. On 6×6: 58″ → the
    // re-check re-derives LS 304 + 12″ (48–62), and no rig stocks a 12″ extension → locked.
    mockInv = [...INV, { id: 'inv-x24', type: 'extension', system: 'LongShore', length: 24, apparatus: 'Rescue 2', apparatusId: 'a1', quantity: 4, held: 0, available: 4 }];
    mockRecs = [
      findStrutCombinations(69, 0, 2, mockInv, null, { header: 3.5, sole: 3.5 }).find(
        (c) => c.strut.model === 'LS 304' && c.extensions.join() === '24',
      )!,
    ];
    const onDeployed = vi.fn();
    const user = userEvent.setup();
    render(<AddShorePointModal open onClose={() => {}} onDeployed={onDeployed} />);
    await user.type(screen.getByRole('textbox', { name: 'Feet' }), '5');
    await user.type(screen.getByRole('textbox', { name: 'Inches' }), '9');
    for (const name of ['Header wood — required', 'Footer wood — required']) {
      await user.click(within(screen.getByRole('radiogroup', { name })).getByRole('radio', { name: '4×4' }));
    }
    await user.click(screen.getByRole('button', { name: 'Find Available Struts' }));
    await user.type(screen.getByRole('textbox', { name: /Estimated load/ }), '50000');
    const add = screen.getByRole('button', { name: 'Add 2 more struts — deploy as 3-Post on 6×6' });
    expect(add).toBeDisabled();
    expect(add.nextElementSibling).toHaveTextContent('LS 304 on 6×6 needs a 12″ extension no rig on scene has.');
    await user.click(add);
    expect(onDeployed).not.toHaveBeenCalled();
    expect(mockCommit.mock.calls.filter((c) => c[0].type === 'EquipmentDeployed')).toHaveLength(0);
  });
});

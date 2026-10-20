// @vitest-environment jsdom
// One-step Add Shore Point: the result-card Deploy buttons must honor the SAME
// form checks as Save as Pending. Uses the REAL RecommendationCard (the sibling
// test file mocks it to a bare button, which is exactly how the bypass hid —
// 2026-10-17 land-qf-rec merge review, High).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddShorePointModal } from './AddShorePointModal';
import type { Operation, StockRow } from '@core/schema';
import { findStrutCombinations } from '@core/load';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });

const INV: StockRow[] = [
  { id: 'inv-1', type: 'strut', model: 'LS 304', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'a1', quantity: 4, held: 0, available: 4 },
];
// 48″ opening − 4×4 header/footer (3.5 + 3.5) = 41″ → LS 304 (36–50) fits.
const COMBO = findStrutCombinations(48, 0, 2, INV, null, { header: 3.5, sole: 3.5 })[0]!;

vi.mock('@ui/hooks', () => ({
  useOperation: () => OP,
  useShorePoints: () => [],
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useDeviceUid: () => () => Promise.resolve('device-test'),
  useInventory: () => INV,
  useRecommendations: (sp: unknown) => (sp ? [COMBO] : []),
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

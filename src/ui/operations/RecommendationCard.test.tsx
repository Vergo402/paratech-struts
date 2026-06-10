// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecommendationCard, comboModel } from './RecommendationCard';
import { findStrutCombinations, type StrutCombination } from '@core/load';
import { NO_DEDUCTIONS, type Deductions, type InventoryItem } from '@core/schema';

// Real-engine fixtures — the card is pinned against what the engine actually
// returns, so the test fails if the anatomy and the math ever drift apart.
const SELECTIONS: Deductions = {
  headerWood: '4x4',
  topPlate: 'channel4x4',
  bottomPlate: 'channel4x4',
  footerWood: 'none',
};
const INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    type: 'strut',
    model: 'LS 304',
    system: 'LongShore',
    apparatus: 'Rescue 2',
    apparatusId: 'app-r2',
    quantity: 4,
    available: 4,
  },
];
// 56 − (3.5 + 3.4 + 3.4) = 45.7 → floors to 45⅝″; LS 304 (36–50) fits.
const STANDARD = findStrutCombinations(56, 0, 2, INVENTORY, null, { header: 3.5, topPlate: 3.4, bottomPlate: 3.4 })[0]!;
// 200″ — past the 192″ LongShore chart: deployable-with-acknowledgment.
const UNRATED = findStrutCombinations(200, 0, 2, null, null, null)[0]!;
// 180″ caps at 4,500 lb (4:1); 60,000 lb needs >4 struts — the NEW-3 sentinel.
const OVER_CAPACITY = findStrutCombinations(180, 60000, 2, null, null, null)[0]!;

const WITH_EXT: StrutCombination = {
  ...STANDARD,
  extensions: [12],
  extTotal: 12,
  adjCollapsed: 48,
  adjExtended: 62,
};

describe('RecommendationCard (card.md §RecommendationCard)', () => {
  it('engine fixtures are the states they claim to be', () => {
    expect(STANDARD.strut.model).toBe('LS 304');
    expect(STANDARD.effectiveLength).toBe(45.625);
    expect(UNRATED.unrated).toBe(true);
    expect(OVER_CAPACITY.exceedsCapacity).toBe(true);
  });

  it('anatomy top-down: COLOR — SYSTEM, model, range, extension block, source, disclaimer', () => {
    render(<RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(screen.getByText('GOLD — LONGSHORE')).toBeInTheDocument();
    expect(screen.getByText('LS 304')).toBeInTheDocument();
    expect(screen.getByText('36″ – 50″')).toBeInTheDocument();
    expect(screen.getByText('No extensions needed')).toBeInTheDocument();
    expect(screen.getByText('Equipment from: Rescue 2')).toBeInTheDocument();
    expect(screen.getByText('Planning aid, not an engineering certification.')).toBeInTheDocument();
  });

  it('extension combo: chips + the strut-alone range; comboModel carries the suffix', () => {
    render(<RecommendationCard combo={WITH_EXT} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(screen.getByText('12″')).toBeInTheDocument();
    expect(screen.getByText('strut alone 36″ – 50″')).toBeInTheDocument();
    expect(screen.queryByText('No extensions needed')).not.toBeInTheDocument();
    expect(comboModel(WITH_EXT)).toBe('LS 304 + 12″');
    expect(comboModel(STANDARD)).toBe('LS 304');
  });

  it('ledger: rigid physical order with every slot shown, N/S in danger for unselected', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    const labels = [...container.querySelectorAll('.fs-rec-slot .fs-rec-slot-label')].map((el) => el.textContent);
    expect(labels).toEqual(['Header', 'Top Connector', 'Bottom Connector', 'Footer']);
    // Footer is unselected → N/S + "not selected".
    expect(screen.getByText('N/S')).toBeInTheDocument();
    expect(screen.getByText('not selected')).toBeInTheDocument();
    // Selected slots carry their names on the sub-line.
    expect(screen.getByText('4×4')).toBeInTheDocument();
    expect(screen.getAllByText('Channel Base 4"x4"')).toHaveLength(2);
  });

  it('ledger math: Opening, ≈-marked plate rows with the exact-math footnote, promoted Effective', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(container.querySelector('.fs-rec-opening')!.textContent).toBe('56″');
    // Channel Base 3.4″ is not an exact eighth — both plate rows mark ≈.
    expect(screen.getAllByText('≈')).toHaveLength(2);
    expect(
      screen.getByText('≈ plate heights to nearest 1/8″ — exact 3.4″ used in the math'),
    ).toBeInTheDocument();
    // 45⅝″ — digit-pair fraction (45, 5 over 8).
    expect(container.querySelector('.fs-rec-effective')!.textContent).toBe('4558″');
    expect(screen.getByText('↓ floored to 1/8″')).toBeInTheDocument();
  });

  it('no ledger danger marks when every slot is selected', () => {
    const allSelected: Deductions = { headerWood: '4x4', topPlate: 'rigid6', bottomPlate: 'rigid6', footerWood: '6x6' };
    render(<RecommendationCard combo={STANDARD} deductions={allSelected} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(screen.queryByText('N/S')).not.toBeInTheDocument();
    // Rigid Base 1.0″ is an exact eighth — no ≈ footnote either.
    expect(screen.queryByText(/exact .* used in the math/)).not.toBeInTheDocument();
  });

  it('Deploy carries the full strut identity for assistive tech and fires onDeploy', async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    render(<RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={onDeploy} />);
    const deploy = screen.getByRole('button', {
      name: 'Deploy LS 304, gold LongShore, effective 45 and 5/8 inches, from Rescue 2',
    });
    await user.click(deploy);
    expect(onDeploy).toHaveBeenCalledWith(STANDARD);
  });

  it('without onDeploy (Quick Find mode) there is no Deploy button', () => {
    render(<RecommendationCard combo={STANDARD} deductions={SELECTIONS} />);
    expect(screen.queryByRole('button', { name: /Deploy/ })).not.toBeInTheDocument();
  });

  it('unrated: gate + ack checkbox; Deploy disabled-with-reason until acknowledged, disclosure persists', async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    const { container } = render(
      <RecommendationCard combo={UNRATED} deductions={NO_DEDUCTIONS} source="Engine 1" onDeploy={onDeploy} />,
    );
    expect(container.querySelector('.fs-rec.is-gated')).toBeTruthy();
    expect(screen.getByText(/not rated by Paratech — rescue engineering consultation required/)).toBeInTheDocument();

    const deploy = screen.getByRole('button', { name: /^Deploy/ });
    expect(deploy).toBeDisabled();
    expect(screen.getByText('Acknowledge the unrated zone first')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the unrated zone/ }));
    expect(deploy).toBeEnabled();
    // Acknowledging unlocks the action and KEEPS the disclosure.
    expect(screen.getByText(/not rated by Paratech — rescue engineering consultation required/)).toBeInTheDocument();
    await user.click(deploy);
    expect(onDeploy).toHaveBeenCalledWith(UNRATED);
  });

  it('over-capacity (#40): gate explains, no acknowledgment exists, Deploy is closed outright', () => {
    const onDeploy = vi.fn();
    const { container } = render(
      <RecommendationCard combo={OVER_CAPACITY} deductions={NO_DEDUCTIONS} onDeploy={onDeploy} />,
    );
    expect(container.querySelector('.fs-rec.is-gated')).toBeTruthy();
    expect(screen.getByText(/Load exceeds rated capacity at the 4:1 safety factor/)).toBeInTheDocument();
    expect(screen.getByText(/exceeds 4-strut capacity/)).toBeInTheDocument(); // engine detail line
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeDisabled();
  });

  it('fully-extended boundary renders the zero-margin caution', () => {
    const combo: StrutCombination = { ...STANDARD, boundaryWarning: 'fully-extended' };
    render(<RecommendationCard combo={combo} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(screen.getByText(/Fully extended — zero margin/)).toBeInTheDocument();
  });

  it('deployDisabled (the sheet single-flight lock) disables Deploy without a reason line', () => {
    render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} deployDisabled />,
    );
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeDisabled();
    expect(screen.queryByText('Acknowledge the unrated zone first')).not.toBeInTheDocument();
  });
});

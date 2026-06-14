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
// A LockStroke combo (catalog mode, system-filtered) — physically grey, but the
// face must carry the cyan "LockStroke" word + .fs-rec--lockstroke (S12 §3.1).
// LK 37-58 @45″, rated 20,000 lb, no extensions.
const LOCKSTROKE = findStrutCombinations(45, 0, 2, null, ['LockStroke'], null)[0]!;
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
    // LockStroke struts are color:'grey' physically — the card keys off system.
    expect(LOCKSTROKE.strut.system).toBe('LockStroke');
    expect(LOCKSTROKE.strut.color).toBe('grey');
    expect(UNRATED.unrated).toBe(true);
    expect(OVER_CAPACITY.exceedsCapacity).toBe(true);
  });

  it('anatomy: centered identity (system word · model), apparatus in the header, fit badge, disclaimer', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    // Identity = system WORD (gold→"Gold") + model; the product/type name is gone.
    const identity = container.querySelector('.fs-rec-identity')!;
    expect(identity.textContent).toContain('Gold');
    expect(identity.textContent).toContain('LS 304');
    expect(identity.querySelector('b')!.textContent).toBe('Gold');
    expect(screen.queryByText('GOLD — LONGSHORE')).not.toBeInTheDocument();
    // The adjusted-range header value is gone from the face (survives in ext-alone).
    expect(screen.queryByText('36″ – 50″')).not.toBeInTheDocument();
    // Apparatus lives in the header with its label (Alex, post-S12), not the
    // old "Equipment from:" footer line.
    expect(container.querySelector('.fs-rec-apparatus')!.textContent).toBe('Equipment located on: Rescue 2');
    expect(screen.queryByText('Equipment from: Rescue 2')).not.toBeInTheDocument();
    // Fit badge default + the permanent disclaimer (the card's last word).
    expect(screen.getByText('Fits')).toBeInTheDocument();
    expect(screen.getByText('No extensions needed')).toBeInTheDocument();
    expect(screen.getByText('Planning aid, not an engineering certification.')).toBeInTheDocument();
  });

  it('extension combo: [+] tile + added length + reach note; comboModel carries the suffix', () => {
    render(<RecommendationCard combo={WITH_EXT} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />);
    // Design-system ext anatomy: accent tile, "12″ / extension" amount column,
    // and the reach note stating bare vs assembly reach (LS 304: 36–50 + 12).
    expect(document.querySelector('.fs-rec-ext-tile')).toBeInTheDocument();
    expect(document.querySelector('.fs-rec-ext-len')!.textContent).toBe('12″');
    expect(screen.getByText('extension')).toHaveClass('fs-rec-ext-word');
    expect(document.querySelector('.fs-rec-ext-note')!.textContent).toBe(
      'LS 304 alone reaches 50″ — extension takes the assembly to 62″',
    );
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

  it('ledger math: Raw opening and promoted Required strut length', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(container.querySelector('.fs-rec-opening')!.textContent).toBe('56″');
    // 45 5/8″ — diagonal fraction the value font composes (ADR-028); effective
    // uses exact plate heights (no on-card ≈/footnote/floor note — declutter).
    expect(container.querySelector('.fs-rec-effective')!.textContent).toBe('45 5/8″');
    // Declutter (#248): no floor note, no plate-rounding footnote, no ≈ markers.
    expect(screen.queryByText('↓ floored to 1/8″')).toBeNull();
    expect(screen.queryByText(/plate heights to nearest/)).toBeNull();
    expect(screen.queryByText('≈')).toBeNull();
  });

  it('no ledger danger marks when every slot is selected', () => {
    const allSelected: Deductions = { headerWood: '4x4', topPlate: 'rigid6', bottomPlate: 'rigid6', footerWood: '6x6' };
    render(<RecommendationCard combo={STANDARD} deductions={allSelected} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(screen.queryByText('N/S')).not.toBeInTheDocument();
    // Rigid Base 1.0″ is an exact eighth — no ≈ footnote either.
    expect(screen.queryByText(/exact .* used in the math/)).not.toBeInTheDocument();
  });

  it('connectors line: selected top/bottom plate names, omitted when neither is selected', () => {
    // SELECTIONS picks channel4x4 top + bottom → both names on the connectors line.
    const { container, rerender } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(container.querySelector('.fs-rec-connectors')!.textContent).toBe(
      'Channel Base 4"x4" · Channel Base 4"x4"',
    );
    // No plates selected → no connectors line at all.
    rerender(<RecommendationCard combo={STANDARD} deductions={NO_DEDUCTIONS} source="Rescue 2" onDeploy={vi.fn()} />);
    expect(container.querySelector('.fs-rec-connectors')).toBeNull();
  });

  it('LockStroke combo: cyan "LockStroke" word + .fs-rec--lockstroke, despite the grey physical color', () => {
    const { container } = render(<RecommendationCard combo={LOCKSTROKE} deductions={NO_DEDUCTIONS} />);
    expect(container.querySelector('.fs-rec--lockstroke')).toBeTruthy();
    expect(container.querySelector('.fs-rec--grey')).toBeNull();
    const identity = container.querySelector('.fs-rec-identity')!;
    expect(identity.querySelector('b')!.textContent).toBe('LockStroke');
    expect(identity.textContent).toContain('LK 37-58');
  });

  it('location prop renders as a header line; absent by default', () => {
    const { container, rerender } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(container.querySelector('.fs-rec-loc')).toBeNull();
    rerender(
      <RecommendationCard
        combo={STANDARD}
        deductions={SELECTIONS}
        source="Rescue 2"
        location="Division 2 · C side"
        onDeploy={vi.fn()}
      />,
    );
    expect(container.querySelector('.fs-rec-loc')!.textContent).toBe('Division 2 · C side');
  });

  it('rated-capacity footer: quiet value + effective length on a clean card, after Deploy', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    const cap = container.querySelector('.fs-rec-cap')!;
    expect(cap).toBeTruthy();
    // STANDARD is rated 22,000 lb at the 45⅝″ effective length.
    expect(cap.querySelector('.fs-rec-cap-val')!.textContent).toBe('22,000 lb');
    expect(cap.querySelector('.fs-rec-cap-label')!.textContent).toContain('Rated capacity at');
    expect(cap.querySelector('.fs-rec-cap-label')!.textContent).toContain('45 5/8″'); // 45⅝″ diagonal
    // Doctrine: the footer sits BELOW Deploy and ABOVE the permanent disclaimer
    // (the disclaimer is always the card's last word).
    const order = [...container.querySelectorAll('button, .fs-rec-cap, .fs-gate--disclaimer')];
    const deployIdx = order.findIndex((el) => el.matches('button'));
    const capIdx = order.findIndex((el) => el.matches('.fs-rec-cap'));
    const discIdx = order.findIndex((el) => el.matches('.fs-gate--disclaimer'));
    expect(deployIdx).toBeGreaterThanOrEqual(0);
    expect(capIdx).toBeGreaterThan(deployIdx);
    expect(discIdx).toBeGreaterThan(capIdx);
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
    // Gated fit badge reads "Unrated" in the danger variant; no quiet capacity footer.
    const fit = container.querySelector('.fs-rec-fit')!;
    expect(fit.textContent).toBe('Unrated');
    expect(fit.classList.contains('fs-rec-fit--no')).toBe(true);
    expect(container.querySelector('.fs-rec-cap')).toBeNull();
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
    // "Over capacity" wins the fit badge (over unrated) and rides the danger variant;
    // the quiet capacity footer is suppressed even though the per-strut number is > 0.
    const fit = container.querySelector('.fs-rec-fit')!;
    expect(fit.textContent).toBe('Over capacity');
    expect(fit.classList.contains('fs-rec-fit--no')).toBe(true);
    expect(OVER_CAPACITY.capacity).toBeGreaterThan(0); // the number exists — but it's meaningless here
    expect(container.querySelector('.fs-rec-cap')).toBeNull();
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

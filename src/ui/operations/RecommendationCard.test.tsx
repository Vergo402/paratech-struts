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
// LK 36-57 @45″, rated 20,000 lb, no extensions.
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
    // Identity = system NAME (LongShore, never the "Gold" color code — §8) + model.
    const identity = container.querySelector('.fs-rec-identity')!;
    expect(identity.textContent).toContain('LongShore');
    expect(identity.textContent).toContain('LS 304');
    expect(identity.querySelector('b')!.textContent).toBe('LongShore');
    expect(screen.queryByText('GOLD — LONGSHORE')).not.toBeInTheDocument();
    // The adjusted-range header value is gone from the face (survives in ext-alone).
    expect(screen.queryByText('36″ – 50″')).not.toBeInTheDocument();
    // Apparatus lives in the header with its label (Alex, post-S12), not the
    // old "Equipment from:" footer line.
    expect(container.querySelector('.fs-rec-apparatus')!.textContent).toBe('Equipment located on: Rescue 2');
    expect(screen.queryByText('Equipment from: Rescue 2')).not.toBeInTheDocument();
    // A clean recommendation shows NO fit badge — it fits by definition (#248);
    // the badge is reserved for the gated danger tells (Unrated / Over capacity).
    expect(screen.queryByText('Fits')).toBeNull();
    expect(container.querySelector('.fs-rec-fit')).toBeNull();
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
    // Footer is unselected → "Not recorded" + "not selected".
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.getByText('not selected')).toBeInTheDocument();
    // Selected slots carry their names on the sub-line (scoped to the ledger —
    // the connectors line also shows the plate names now, #248).
    expect(screen.getByText('4×4')).toBeInTheDocument();
    const slotNames = [...container.querySelectorAll('.fs-rec-slot-name')].map((el) => el.textContent);
    expect(slotNames.filter((n) => n === '4"x4" Channel Base')).toHaveLength(2);
  });

  it('ledger math: the column FOOTS — exact decimal rows + explicit ⅛″ floor step', () => {
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(container.querySelector('.fs-rec-opening')!.textContent).toBe('56″');
    // Off-grid plate heights show the EXACT catalog decimal (channel4x4 = 3.4″),
    // never a nearest-⅛ fraction — rounded rows made hand-sums miss the total.
    const values = [...container.querySelectorAll('.fs-rec-slot-value')].map((el) => el.textContent);
    expect(values).toEqual(['−3 1/2″', '−3.4″', '−3.4″', 'Not recorded']);
    // The floor step is explicit: rows sum to the exact 45.7″, floored → 45⅝″.
    expect(screen.getByText('Exact — floored to ⅛″')).toBeInTheDocument();
    expect(container.querySelector('.fs-rec-floor-value')!.textContent).toBe('45.7″');
    // 45 5/8″ — diagonal fraction the value font composes (ADR-028).
    expect(container.querySelector('.fs-rec-effective')!.textContent).toBe('45 5/8″');
    // Still no ≈ markers (the #248 declutter) — the exact value replaces them.
    expect(screen.queryByText('≈')).toBeNull();
  });

  it('no ledger danger marks — and no floor row when the exact result is on-grid', () => {
    const allSelected: Deductions = { headerWood: '4x4', topPlate: 'rigid6', bottomPlate: 'rigid6', footerWood: '6x6' };
    const { container } = render(
      <RecommendationCard combo={STANDARD} deductions={allSelected} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    expect(screen.queryByText('Not recorded')).not.toBeInTheDocument();
    // 56 − (3.5 + 1 + 1 + 5.5) = 45 — on the ⅛″ grid, so no floor step to show.
    expect(container.querySelector('.fs-rec-floor')).toBeNull();
  });

  it('connectors line: selected top/bottom plate names, omitted when neither is selected', () => {
    // SELECTIONS picks channel4x4 top + bottom → both names on the connectors line.
    const { container, rerender } = render(
      <RecommendationCard combo={STANDARD} deductions={SELECTIONS} source="Rescue 2" onDeploy={vi.fn()} />,
    );
    // Each plate is its own whole unit (#248 — splits across lines, never truncates);
    // the " · " separator is a CSS pseudo-element, so it's not in the DOM text.
    expect([...container.querySelectorAll('.fs-rec-conn')].map((s) => s.textContent)).toEqual([
      '4"x4" Channel Base',
      '4"x4" Channel Base',
    ]);
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
    expect(identity.textContent).toContain('LK 36-57');
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

// Per-strut over-capacity (accepted mockup 2026-07-01): 58½″ @ 34,000 lbs — the
// LS 406 fits and is rated 22,000 lb (4:1), so ONE strut can't carry the load.
// The engine returns it UNFLAGGED (recommendedQty 2 is advisory) — the exact
// combo that produced the false SAFE; the card must judge it itself.
describe('RecommendationCard — short deploy (×N struts needed)', () => {
  const SHORT = findStrutCombinations(58.5, 34000, 2, null, null, null).find(
    (c) => c.strut.model === 'LS 406' && c.extensions.length === 0,
  )!;

  it('engine fixture is the state it claims to be — unflagged, needs 2 struts', () => {
    expect(SHORT.capacity).toBe(22000);
    expect(SHORT.recommendedQty).toBe(2);
    expect(SHORT.unrated ?? false).toBe(false);
    expect(SHORT.exceedsCapacity ?? false).toBe(false);
  });

  it('deploy mode: ×2 tile, Add-1-more-strut primary, gated Deploy-anyway (mockup A)', async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    const onAddStruts = vi.fn();
    const { container } = render(
      <RecommendationCard
        combo={SHORT}
        deductions={NO_DEDUCTIONS}
        source="Eng 1"
        onDeploy={onDeploy}
        onAddStruts={onAddStruts}
        estimatedLoad={34000}
        currentStruts={1}
      />,
    );
    // Badge + ×N tile: the danger tell and the plain-numbers explanation.
    expect(container.querySelector('.fs-rec-fit')!.textContent).toBe('Over capacity');
    expect(container.querySelector('.fs-rec-need-tile')!.textContent).toBe('×2');
    expect(screen.getByText('struts needed for this load')).toBeInTheDocument();
    expect(screen.getByText(/One strut is rated 22,000 lb/)).toBeInTheDocument();
    expect(screen.getByText('34,000 lbs')).toBeInTheDocument(); // ledger row
    // The FIX is the primary action — converts and deploys as a Double-T.
    const add = screen.getByRole('button', { name: /Add 1 more strut — deploy as Double-T/ });
    await user.click(add);
    expect(onAddStruts).toHaveBeenCalledWith(SHORT, 'double-t', 2);
    // Deploying short stays possible but locked behind the recorded acknowledgment.
    const anyway = screen.getByRole('button', { name: /Deploy 1 of 2 anyway/ });
    expect(anyway).toBeDisabled();
    expect(screen.getByText('Acknowledge the over-capacity deploy first')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ }));
    expect(anyway).toBeEnabled();
    await user.click(anyway);
    expect(onDeploy).toHaveBeenCalledWith(SHORT);
    // No plain Deploy button — the short-deploy block replaces it.
    expect(screen.queryByRole('button', { name: /^Deploy LS 406/ })).not.toBeInTheDocument();
  });

  it('display-only (Quick Find, mockup B): tile + badge, no gate, keeps the capacity footer', () => {
    const { container } = render(<RecommendationCard combo={SHORT} deductions={NO_DEDUCTIONS} estimatedLoad={34000} />);
    expect(container.querySelector('.fs-rec-need-tile')!.textContent).toBe('×2');
    expect(container.querySelector('.fs-rec-fit')!.textContent).toBe('Over capacity');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deploy/ })).not.toBeInTheDocument();
    expect(container.querySelector('.fs-rec-cap')).toBeTruthy();
  });

  it('a Double-T member carrying its 17,000 lb share reads clean — no tile, plain Deploy (mockup C)', () => {
    const { container } = render(
      <RecommendationCard
        combo={SHORT}
        deductions={NO_DEDUCTIONS}
        source="Eng 1"
        onDeploy={vi.fn()}
        estimatedLoad={34000}
        currentStruts={2}
      />,
    );
    expect(container.querySelector('.fs-rec-need-tile')).toBeNull();
    expect(container.querySelector('.fs-rec-fit')).toBeNull();
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeEnabled();
  });

  it('no one-tap fix without onAddStruts (deployed group mate) — gate + Deploy-anyway only', () => {
    render(
      <RecommendationCard
        combo={SHORT}
        deductions={NO_DEDUCTIONS}
        source="Eng 1"
        onDeploy={vi.fn()}
        estimatedLoad={34000}
        currentStruts={1}
      />,
    );
    expect(screen.queryByRole('button', { name: /Add 1 more strut/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy 1 of 2 anyway/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ })).toBeInTheDocument();
  });
});

/**
 * #456 — an acknowledgment is given for ONE risk picture. The Assign Equipment sheet
 * keys these cards only on the strut/extension identity, so a PEER edit of the shore
 * point's load, measurement, or deductions while the sheet is open re-renders the same
 * card with a different risk. A surviving ack would be a recorded acknowledgment for a
 * warning nobody was shown — and, on the unrated card, would leave Deploy unlocked.
 *
 * Real engine: every combo below comes from findStrutCombinations, so "the risk
 * changed" means the engine really returned a different one.
 */
describe('RecommendationCard — acknowledgment resets when the risk changes (#456)', () => {
  // Two real unrated combos at different openings (both past the 192″ LongShore chart).
  const UNRATED_200 = findStrutCombinations(200, 0, 2, null, null, null)[0]!;
  const UNRATED_210 = findStrutCombinations(210, 0, 2, null, null, null)[0]!;
  const SHORT_DEPLOY = findStrutCombinations(58.5, 34000, 2, null, null, null).find(
    (c) => c.strut.model === 'LS 406' && c.extensions.length === 0,
  )!;

  it('a changed MEASUREMENT (new combo) clears the unrated ack and re-locks Deploy', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RecommendationCard combo={UNRATED_200} deductions={NO_DEDUCTIONS} onDeploy={vi.fn()} />,
    );
    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the unrated zone/ }));
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeEnabled();

    rerender(<RecommendationCard combo={UNRATED_210} deductions={NO_DEDUCTIONS} onDeploy={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /Team acknowledges the unrated zone/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeDisabled();
    expect(screen.getByText('Acknowledge the unrated zone first')).toBeInTheDocument();
  });

  it('a changed LOAD clears the over-capacity-short ack', async () => {
    const user = userEvent.setup();
    const props = { combo: SHORT_DEPLOY, deductions: NO_DEDUCTIONS, onDeploy: vi.fn(), currentStruts: 1 };
    const { rerender } = render(<RecommendationCard {...props} estimatedLoad={34000} />);
    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ }));
    expect(screen.getByRole('button', { name: /Deploy 1 of 2 anyway/ })).toBeEnabled();

    // A peer re-estimates the load upward — now 3 struts are needed, not 2.
    rerender(<RecommendationCard {...props} estimatedLoad={60000} />);
    expect(screen.getByRole('button', { name: /Deploy 1 of 3 anyway/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ })).not.toBeChecked();
  });

  it('changed DEDUCTIONS clear the ack (same object shape, different values)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RecommendationCard combo={UNRATED_200} deductions={NO_DEDUCTIONS} onDeploy={vi.fn()} />,
    );
    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the unrated zone/ }));
    rerender(
      <RecommendationCard
        combo={UNRATED_200}
        deductions={{ ...NO_DEDUCTIONS, topPlate: 'swivel6' }}
        onDeploy={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeDisabled();
  });

  it('an unrelated re-render KEEPS the ack (a fresh deductions object is not a new risk)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RecommendationCard combo={UNRATED_200} deductions={{ ...NO_DEDUCTIONS }} onDeploy={vi.fn()} />,
    );
    await user.click(screen.getByRole('checkbox', { name: /Team acknowledges the unrated zone/ }));
    // New object identity, same VALUES, plus an unrelated prop change.
    rerender(
      <RecommendationCard
        combo={UNRATED_200}
        deductions={{ ...NO_DEDUCTIONS }}
        source="Engine 1"
        onDeploy={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /^Deploy/ })).toBeEnabled();
  });
});

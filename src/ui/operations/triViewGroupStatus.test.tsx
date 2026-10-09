// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { cutLengthInches, cutTooSmall } from '@core/shorepoint';
import { DivisionView, type DivisionBand } from './DivisionView';
import { ShorePointListRow } from './ShorePointListRow';

/**
 * The two DENSE tri-views (Division tile + List row) read a grouped shore correctly:
 *
 *  #454 — a split-status group displays at its LEAST-ADVANCED live leg (Alex's ruling
 *         2026-07-28). Both surfaces rendered from members[0], so a set with one leg
 *         secured and two still cutting read "Secured ×3" — overstated progress.
 *  #483 — the compact amber "⚠ Too small" chip appears when the shelf is showing a CUT
 *         length that floored to 0″, on ANY live member of the group.
 *
 * REAL MATH: cutTooSmall/cutLengthInches run for real (nothing stubbed) — the fixture
 * asserts the break-even below so a future change to the cut formula fails here loudly
 * rather than silently turning the chip off. 3-Post cut deduction = 2 × 5.5″ (6×6
 * header + footer) + 1.5″ wedge = 12.5″, so a 12″ opening leaves nothing to cut.
 */

const TOO_SMALL_EIGHTHS = 96; // 12″ — below the 3-Post 12.5″ break-even
const CUTTABLE_EIGHTHS = 480; // 60″ — 47.5″ of cuttable wood

function leg(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division: '1',
    shoreType: '3-post',
    groupId: 'g1',
    groupTotal: 3,
    measurementEighths: CUTTABLE_EIGHTHS,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'cutting',
    ...over,
  };
}

const band = (members: ShorePoint[]): DivisionBand[] => [
  { division: '1', n: 1, items: [{ kind: 'group', groupId: 'g1', members }] },
];

const renderDivision = (members: ShorePoint[]) =>
  render(<DivisionView bands={band(members)} onOpenDetail={vi.fn()} flagOf={() => null} />);

describe('fixture math is what it claims (real engine)', () => {
  it('12″ leaves no cuttable 3-Post length; 60″ does', () => {
    expect(cutLengthInches(leg('x', { measurementEighths: TOO_SMALL_EIGHTHS }))).toBe(0);
    expect(cutTooSmall(leg('x', { measurementEighths: TOO_SMALL_EIGHTHS }))).toBe(true);
    expect(cutTooSmall(leg('x'))).toBe(false);
  });
});

describe('#454 — a split group reads at its least-advanced leg', () => {
  const SPLIT = [leg('a', { status: 'secured' }), leg('b'), leg('c')]; // front leg is DONE

  it('Division tile: status class + short label come from the slowest leg, not members[0]', () => {
    const { container } = renderDivision(SPLIT);
    const tile = container.querySelector('.fs-divtile')!;
    expect(tile.classList.contains('is-cutting')).toBe(true);
    expect(tile.classList.contains('is-secured')).toBe(false);
    expect(tile.querySelector('.fs-divtile-st')!.textContent).toBe('Cutting');
  });

  it('List row: the status edge comes from the slowest leg', () => {
    const { container } = render(
      <ShorePointListRow sp={SPLIT[0]!} count={3} members={SPLIT} flag={null} onOpen={vi.fn()} />,
    );
    const row = container.querySelector('.fs-splist-row')!;
    expect(row.classList.contains('is-cutting')).toBe(true);
    expect(row.classList.contains('is-secured')).toBe(false);
  });

  it('a DELETED slow leg does not drag the group backwards', () => {
    const withDeleted = [leg('a', { status: 'secured' }), leg('b', { deletedAt: 1 })];
    const { container } = renderDivision(withDeleted);
    expect(container.querySelector('.fs-divtile')!.classList.contains('is-secured')).toBe(true);
  });

  it('an ungrouped row/tile still reads its own status', () => {
    const solo = leg('solo', { groupId: undefined, groupTotal: undefined, status: 'runner' });
    const { container } = render(<ShorePointListRow sp={solo} count={1} flag={null} onOpen={vi.fn()} />);
    expect(container.querySelector('.fs-splist-row')!.classList.contains('is-runner')).toBe(true);
  });
});

describe('#485 — value is the RAW opening until the group reaches cutting', () => {
  // 60″ opening, 3-Post (12.5″ deduction) → cut length 47½″.
  const RAW_TEXT = '60″';
  const CUT_TEXT = '47 1/2″';
  const SPLIT_PRECUT = [leg('a', { status: 'cutting' }), leg('b', { status: 'strutset' })];
  const ALL_CUTTING = [leg('a', { status: 'secured' }), leg('b'), leg('c')];

  it('Division tile: a split group with one leg cutting + one strut-set reads raw "opening"', () => {
    const { container } = renderDivision(SPLIT_PRECUT);
    const tile = container.querySelector('.fs-divtile')!;
    expect(tile.querySelector('.fs-divtile-num')!.textContent).toBe(RAW_TEXT);
    expect(tile.querySelector('.fs-divtile-sfx')!.textContent).toBe('opening');
    expect(tile.querySelector('.fs-divtile-st')!.textContent).toBe('Strut Set');
  });

  it('List row: same split group reads raw "opening" at status strut set', () => {
    const { container } = render(
      <ShorePointListRow sp={SPLIT_PRECUT[0]!} count={2} members={SPLIT_PRECUT} flag={null} onOpen={vi.fn()} />,
    );
    const row = container.querySelector('.fs-splist-row')!;
    expect(row.querySelector('.fs-splist-num')!.textContent).toBe(RAW_TEXT);
    expect(row.querySelector('.fs-splist-sfx')!.textContent).toBe('opening');
    expect(row.classList.contains('is-strutset')).toBe(true);
  });

  it('Division tile: every live leg cutting-or-later (front leg secured) reads the cut length', () => {
    const { container } = renderDivision(ALL_CUTTING);
    const tile = container.querySelector('.fs-divtile')!;
    expect(tile.querySelector('.fs-divtile-num')!.textContent).toBe(CUT_TEXT);
    expect(tile.querySelector('.fs-divtile-sfx')!.textContent).toBe('cut');
  });

  it('List row: every live leg cutting-or-later reads the cut length', () => {
    const { container } = render(
      <ShorePointListRow sp={ALL_CUTTING[0]!} count={3} members={ALL_CUTTING} flag={null} onOpen={vi.fn()} />,
    );
    const row = container.querySelector('.fs-splist-row')!;
    expect(row.querySelector('.fs-splist-num')!.textContent).toBe(CUT_TEXT);
    expect(row.querySelector('.fs-splist-sfx')!.textContent).toBe('cut');
  });

  it('an ungrouped pre-cut point reads raw "opening" on both views', () => {
    const solo = leg('solo', { groupId: undefined, groupTotal: undefined, status: 'process' });
    const { container } = render(<ShorePointListRow sp={solo} count={1} flag={null} onOpen={vi.fn()} />);
    expect(container.querySelector('.fs-splist-num')!.textContent).toBe(RAW_TEXT);
    expect(container.querySelector('.fs-splist-sfx')!.textContent).toBe('opening');
  });
});

describe('#483 — compact "Too small" chip on both dense views', () => {
  it('Division tile shows it when ANY live member is too small', () => {
    // Front leg is fine; the third leg's opening is unusable.
    const members = [leg('a'), leg('b'), leg('c', { measurementEighths: TOO_SMALL_EIGHTHS })];
    const { container } = renderDivision(members);
    const chip = screen.getByText('⚠ Too small');
    expect(chip).toHaveClass('fs-spc-flag');
    expect(chip).toHaveClass('fs-spc-flag--warning'); // amber, not the red capacity chip
    expect(chip).toHaveClass('fs-spc-flag--compact'); // one line at tile density
    // Same slot as the red chip: a .fs-spc-flag-row inside the tile button.
    expect(container.querySelector('.fs-divtile .fs-spc-flag-row')).toBeTruthy();
  });

  it('List row shows it when ANY live member is too small', () => {
    const members = [leg('a'), leg('b', { measurementEighths: TOO_SMALL_EIGHTHS })];
    const { container } = render(
      <ShorePointListRow sp={members[0]!} count={2} members={members} flag={null} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('⚠ Too small')).toBeInTheDocument();
    expect(container.querySelector('.fs-splist-row .fs-spc-flag-row')).toBeTruthy();
  });

  it('no chip when every member has a cuttable length', () => {
    renderDivision([leg('a'), leg('b')]);
    expect(screen.queryByText('⚠ Too small')).not.toBeInTheDocument();
  });

  it('no chip BEFORE the cut phase — it can never explain a number the shelf is not showing', () => {
    renderDivision([leg('a', { status: 'process', measurementEighths: TOO_SMALL_EIGHTHS })]);
    expect(screen.queryByText('⚠ Too small')).not.toBeInTheDocument();
  });

  it('a DELETED too-small leg does not flag the group', () => {
    renderDivision([leg('a'), leg('b', { measurementEighths: TOO_SMALL_EIGHTHS, deletedAt: 1 })]);
    expect(screen.queryByText('⚠ Too small')).not.toBeInTheDocument();
  });

  it('the red capacity chip and the amber chip coexist in the same slot', () => {
    const members = [leg('a', { measurementEighths: TOO_SMALL_EIGHTHS })];
    const { container } = render(
      <ShorePointListRow sp={members[0]!} count={1} members={members} flag="over-capacity" onOpen={vi.fn()} />,
    );
    const chips = container.querySelectorAll('.fs-spc-flag-row');
    expect(chips).toHaveLength(2);
    expect(screen.getByText('⚠ Over capacity')).toBeInTheDocument();
    expect(screen.getByText('⚠ Too small')).toBeInTheDocument();
  });
});

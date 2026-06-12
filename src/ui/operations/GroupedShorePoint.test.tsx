// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { slideToCommit } from '@ui/primitives/Slider.testkit';
import { GroupedShorePoint } from './GroupedShorePoint';
import type { ShorePoint, ShorePointStatus } from '@core/schema';

// A grouped member — defaults to a 3-Post post (KB-7: one physical shore, N
// points sharing a groupId). Process+ members carry a deployedStrut so the card
// renders its lifecycle (slides) rather than the pending action area.
function member(id: string, groupIndex: number, status: ShorePointStatus = 'process'): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division: '1',
    shoreType: '3-post',
    label: 'C-2',
    groupId: 'g1',
    groupIndex,
    groupTotal: 3,
    measurementEighths: 480,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status,
    ...(status === 'pending'
      ? {}
      : { deployedStrut: { model: 'LS 304', source: 'Rescue 2', inventoryId: 'inv-1' } }),
  };
}

const THREE = [member('sp-1', 1), member('sp-2', 2), member('sp-3', 3)];

/** The collapsed front-card wrapper (carries the active member's data-sp-id). */
function front(): HTMLElement {
  const el = document.querySelector('.fs-gs-front');
  if (!el) throw new Error('no .fs-gs-front in the document');
  return el as HTMLElement;
}

describe('GroupedShorePoint', () => {
  it('collapsed: renders the front card + n−1 tabs + a dot per member', () => {
    const { container } = render(<GroupedShorePoint members={THREE} />);
    // Front = active member (default index 0 → sp-1); two fallen tabs for sp-2, sp-3.
    expect(front().getAttribute('data-sp-id')).toBe('sp-1');
    const tabs = container.querySelectorAll('.fs-gs-tab');
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Bring Post 2 to front' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bring Post 3 to front' })).toBeInTheDocument();
    // One dot per member; the active one carries is-on.
    const dots = container.querySelectorAll('.fs-gs-dot');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveClass('is-on');
    expect(dots[1]).not.toHaveClass('is-on');
  });

  it('collapsed: exposes the group context on the container', () => {
    render(<GroupedShorePoint members={THREE} />);
    expect(
      screen.getByRole('group', { name: 'C-2 · 3-Post — 3 cards, showing Post 1' }),
    ).toBeInTheDocument();
  });

  it('tab click rotates the clicked member to front; the clicked member leaves the tab pile', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupedShorePoint members={THREE} />);

    // Bring Post 3 (sp-3) to front.
    await user.click(screen.getByRole('button', { name: 'Bring Post 3 to front' }));
    expect(front().getAttribute('data-sp-id')).toBe('sp-3');
    // sp-3 is no longer a tab (it's the front now); sp-1 + sp-2 are the tabs.
    expect(container.querySelector('[data-sp-id="sp-3"].fs-gs-tab')).toBeNull();
    expect(container.querySelector('[data-sp-id="sp-1"].fs-gs-tab')).not.toBeNull();
    expect(container.querySelector('[data-sp-id="sp-2"].fs-gs-tab')).not.toBeNull();
  });

  it('rotating to the nearest tab sends the old front to the leftmost (bottom) slot', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupedShorePoint members={THREE} />);

    // Start: active = sp-1. Tab order left→right mirrors pile bottom→top, so the
    // NEAREST tab (highest `left`) is the top of the pile: here sp-2 at left:30px.
    // Bringing it forward sends the old front sp-1 to the pile bottom = leftmost
    // slot (left: 0). (handoff §2 — "previous front goes to the BOTTOM".)
    const sp2Tab = container.querySelector('[data-sp-id="sp-2"].fs-gs-tab') as HTMLElement;
    expect(sp2Tab.style.left).toBe('30px'); // the nearest/top tab
    await user.click(sp2Tab);

    expect(front().getAttribute('data-sp-id')).toBe('sp-2');
    const sp1Tab = container.querySelector('[data-sp-id="sp-1"].fs-gs-tab') as HTMLElement;
    expect(sp1Tab.style.left).toBe('0px'); // old front fell to the bottom
  });

  it('callbacks route with the ACTIVE member sp; advancing the front commits THAT member only', async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    render(<GroupedShorePoint members={THREE} onAdvance={onAdvance} />);

    // Front is sp-1 — its slide commits sp-1.
    await slideToCommit('Slide to set Strut Set');
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenCalledWith(THREE[0]); // sp-1

    // Rotate to sp-2, advance again — now it's sp-2.
    await user.click(screen.getByRole('button', { name: 'Bring Post 2 to front' }));
    await slideToCommit('Slide to set Strut Set');
    expect(onAdvance).toHaveBeenLastCalledWith(THREE[1]); // sp-2
  });

  it('initialActiveId fronts the named member on mount', () => {
    render(<GroupedShorePoint members={THREE} initialActiveId="sp-2" />);
    expect(front().getAttribute('data-sp-id')).toBe('sp-2');
    expect(
      screen.getByRole('group', { name: /showing Post 2/ }),
    ).toBeInTheDocument();
  });

  it('re-fronts when initialActiveId changes on an already-mounted stack', () => {
    const { rerender } = render(<GroupedShorePoint members={THREE} initialActiveId="sp-1" />);
    expect(front().getAttribute('data-sp-id')).toBe('sp-1');
    // Same lane, no remount — a later commit re-targets the scroll id (R3 fix).
    rerender(<GroupedShorePoint members={THREE} initialActiveId="sp-3" />);
    expect(front().getAttribute('data-sp-id')).toBe('sp-3');
  });

  it('per-member advanceDisabledReason is applied to that member only', async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    // Gate sp-2 only.
    const reasonFor = (sp: ShorePoint) =>
      sp.id === 'sp-2' ? 'Waiting on group — 1 of 3 still Pending' : undefined;
    render(
      <GroupedShorePoint members={THREE} onAdvance={onAdvance} advanceDisabledReasonFor={reasonFor} />,
    );

    // Front sp-1 is ungated — advance commits.
    await slideToCommit('Slide to set Strut Set');
    expect(onAdvance).toHaveBeenCalledTimes(1);

    // Rotate to sp-2; the gate reason shows and the slide is disabled → no commit.
    await user.click(screen.getByRole('button', { name: 'Bring Post 2 to front' }));
    expect(screen.getByText('Waiting on group — 1 of 3 still Pending')).toBeInTheDocument();
    const advance = screen.getByText('Slide to set Strut Set').closest('.fs-slide')!;
    expect(advance).toHaveClass('fs-slide--disabled');
    await slideToCommit(advance as HTMLElement);
    expect(onAdvance).toHaveBeenCalledTimes(1); // still just the sp-1 commit
  });

  it('dead-space click on the front card expands the stack', async () => {
    const user = userEvent.setup();
    render(<GroupedShorePoint members={THREE} />);
    // The front card's identity/value area is dead space (no button/slide).
    // The headline is now "label · type" (design-system title).
    await user.click(screen.getByText('C-2 · 3-Post'));
    expect(screen.getByText('C-2 · 3-Post · 3 cards')).toBeInTheDocument();
  });

  it('clicking a slide thumb does NOT expand the stack', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupedShorePoint members={THREE} onAdvance={vi.fn()} />);
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    expect(thumb).not.toBeNull();
    await user.click(thumb);
    // Still collapsed — no expanded header.
    expect(screen.queryByText('C-2 · 3-Post · 3 cards')).not.toBeInTheDocument();
    expect(front()).toBeInTheDocument();
  });

  it('the quiet expand button opens the stack via keyboard', async () => {
    const user = userEvent.setup();
    render(<GroupedShorePoint members={THREE} />);
    const expand = screen.getByRole('button', { name: 'Show all 3 cards' });
    expand.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('C-2 · 3-Post · 3 cards')).toBeInTheDocument();
  });

  it('expanded: shows every member as a full card; Stack collapses back', async () => {
    const user = userEvent.setup();
    render(<GroupedShorePoint members={THREE} defaultExpanded onAdvance={vi.fn()} />);

    // All three members render their advance slide (full interactive cards).
    expect(screen.getAllByText('Slide to set Strut Set')).toHaveLength(3);
    expect(screen.getByText('C-2 · 3-Post · 3 cards')).toBeInTheDocument();

    // Stack collapses back to the rolodex.
    await user.click(screen.getByRole('button', { name: 'Stack C-2 · 3-Post back into one card' }));
    expect(screen.queryByText('C-2 · 3-Post · 3 cards')).not.toBeInTheDocument();
    expect(front()).toBeInTheDocument();
  });

  it('data-sp-id is present for the front, each tab, and each expanded member', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupedShorePoint members={THREE} />);
    // Collapsed: front carries sp-1; tabs carry sp-2 / sp-3.
    expect(container.querySelector('.fs-gs-front[data-sp-id="sp-1"]')).not.toBeNull();
    expect(container.querySelector('.fs-gs-tab[data-sp-id="sp-2"]')).not.toBeNull();
    expect(container.querySelector('.fs-gs-tab[data-sp-id="sp-3"]')).not.toBeNull();

    // Expanded: each member wrapper carries its id.
    await user.click(screen.getByRole('button', { name: 'Show all 3 cards' }));
    for (const id of ['sp-1', 'sp-2', 'sp-3']) {
      expect(container.querySelector(`.fs-gs-member[data-sp-id="${id}"]`)).not.toBeNull();
    }
  });

  it('a 2-member group (Double-T) collapses with one tab and two dots', () => {
    const two = [member('dt-1', 1, 'cutting'), member('dt-2', 2, 'strutset')];
    const { container } = render(<GroupedShorePoint members={two} />);
    expect(container.querySelectorAll('.fs-gs-tab')).toHaveLength(1);
    expect(container.querySelectorAll('.fs-gs-dot')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Bring Post 2 to front' })).toBeInTheDocument();
  });

  it('reduced-motion roll classes are inert markers in jsdom (no throw, front still resolves)', async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupedShorePoint members={THREE} />);
    // A rotation applies the roll class; jsdom has no animation engine, so this
    // is purely a class toggle — the front must still resolve to the new member.
    await user.click(screen.getByRole('button', { name: 'Bring Post 3 to front' }));
    const f = container.querySelector('.fs-gs-front') as HTMLElement;
    expect(f.className).toMatch(/fs-gs-roll-(r|l)/);
    expect(f.getAttribute('data-sp-id')).toBe('sp-3');
  });

  it('empty members renders nothing', () => {
    const { container } = render(<GroupedShorePoint members={[]} />);
    expect(container.querySelector('.fs-gs')).toBeNull();
  });

  it('per-member callbacks (edit/delete/assign) fire for pending members', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onAssign = vi.fn();
    // A pending front member exposes the stripe (Assign equipment) + tap-to-expand Edit.
    const pendingMembers = [member('p-1', 1, 'pending'), member('p-2', 2, 'pending')];
    render(
      <GroupedShorePoint members={pendingMembers} onEdit={onEdit} onAssignEquipment={onAssign} />,
    );

    // The front pending card's stripe is a real "Assign equipment" button.
    const frontCard = within(front());
    await user.click(frontCard.getByRole('button', { name: 'Assign equipment' }));
    expect(onAssign).toHaveBeenCalledWith(pendingMembers[0]);
  });
});

// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { slideToCommit } from '@ui/primitives/Slider.testkit';
import { peerCutStore } from '@data/sync';
import { CuttingStation } from './CuttingStation';
import type { ShorePoint, ShorePointStatus } from '@core/schema';

function makeSP(id: string, over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 388,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'cutting' as ShorePointStatus,
    deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    ...over,
  };
}

const noop = vi.fn();

describe('CuttingStation', () => {
  afterEach(() => peerCutStore.reset()); // the badge store is a singleton — don't leak

  it('#404: shows the "N new" peer-cut badge and clears the count on unmount', () => {
    peerCutStore.add(2); // two cuts arrived from another device
    const { unmount } = render(
      <CuttingStation
        queue={[makeSP('a')]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    expect(screen.getByText('2 new')).toBeInTheDocument();
    unmount(); // leaving the station clears it — next visit reflects only new arrivals
    expect(peerCutStore.store.getState().count).toBe(0);
  });

  it('empty queue, nothing sent: shows the upstream-blocked "No cuts queued" empty state (#389)', () => {
    render(
      <CuttingStation
        queue={[]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    expect(screen.getByText('No cuts queued')).toBeInTheDocument();
    expect(screen.getByText(/Cuts arrive when a shore point is moved to Cutting/)).toBeInTheDocument();
  });

  it('empty queue but cuts were sent: shows the "All cuts done" all-clear + the sent tail (#389)', () => {
    render(
      <CuttingStation
        queue={[]}
        sent={[makeSP('a', { label: 'A-1' })]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    expect(screen.getByText('All cuts done')).toBeInTheDocument();
    expect(screen.getByText(/sent to the runner/)).toBeInTheDocument();
    expect(screen.getByText('Sent to runner')).toBeInTheDocument(); // the tail stays visible
  });

  it('renders the queue in the order given, with a live count', () => {
    render(
      <CuttingStation
        queue={[makeSP('a', { label: 'A-1' }), makeSP('b', { label: 'B-2' })]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    // #435: the count numeral is its own mono-stat span, so the text spans elements.
    expect(document.querySelector('.fs-cutstation-count')).toHaveTextContent('2 cuts in queue');
    // The hero+list shows the location subtitle, not the card title; assert the
    // queue order via the data-sp-id the hero (queue head) + up-next rows carry.
    const ids = Array.from(document.querySelectorAll('.fs-cutstation [data-sp-id]')).map((el) =>
      el.getAttribute('data-sp-id'),
    );
    expect(ids).toEqual(['a', 'b']);
  });

  it('singular count copy when one cut is queued', () => {
    render(
      <CuttingStation
        queue={[makeSP('a')]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    expect(document.querySelector('.fs-cutstation-count')).toHaveTextContent('1 cut in queue');
  });

  it('Mark Cut Done fires onMarkCutDone for that card', async () => {
    const onMarkCutDone = vi.fn();
    const sp = makeSP('a');
    render(
      <CuttingStation
        queue={[sp]}
        sent={[]}
        onMarkCutDone={onMarkCutDone}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    await slideToCommit('Slide to mark Cut Done');
    expect(onMarkCutDone).toHaveBeenCalledWith(sp);
  });

  it('a cut-done card offers Send to Runner, which fires onSendToRunner', async () => {
    const onSendToRunner = vi.fn();
    const sp = makeSP('a', { cuttingDone: true });
    render(
      <CuttingStation
        queue={[sp]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={onSendToRunner}
        onStepBack={noop}
      />,
    );
    expect(screen.getByText('✓ Cut done')).toBeInTheDocument();
    await slideToCommit('Slide to send to Runner');
    expect(onSendToRunner).toHaveBeenCalledWith(sp);
  });

  it('step-back out of cutting fires onStepBack AND leaves a dismissible red-slash (Principle 10)', async () => {
    const user = userEvent.setup();
    const onStepBack = vi.fn();
    const sp = makeSP('a', { label: 'A-1' });
    render(
      <CuttingStation
        queue={[sp]}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={onStepBack}
      />,
    );
    await slideToCommit('Slide back to Strut Set');
    expect(onStepBack).toHaveBeenCalledWith(sp);
    // The card does not vanish silently — it shows the red-slash until dismissed.
    expect(screen.getByText('Removed from cut list')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Removed from cut list')).not.toBeInTheDocument();
  });

  it('#390: phone multi-saw = pick-your-station screen, then the view locks to that saw', async () => {
    const user = userEvent.setup();
    render(
      <CuttingStation
        queue={[makeSP('a', { sawId: 'A', seq: 22 }), makeSP('b', { sawId: 'B', division: '2', seq: 23 })]}
        saws={['A', 'B']}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
        onClaim={noop}
      />,
    );
    // Screen 1 — the station select: one card per saw, each naming its current cut.
    expect(screen.getByText(/Pick it — you’ll see only your cut/)).toBeInTheDocument();
    const sawACard = screen.getByRole('button', { name: /Saw A.*SP-22/s });
    expect(screen.getByRole('button', { name: /Saw B.*SP-23/s })).toBeInTheDocument();

    // Pick Saw A → screen 2, locked: header says which saw, back control present,
    // Saw B's cut is one muted sentence — not a selectable row.
    await user.click(sawACard);
    expect(screen.getByRole('heading', { name: 'Saw A' })).toBeInTheDocument();
    expect(screen.getByText(/Up next/)).toBeInTheDocument();
    expect(screen.getByText(/Saw B is on its own cut \(SP-23\) — not in your queue/)).toBeInTheDocument();

    // Back returns to the station select.
    await user.click(screen.getByRole('button', { name: '‹ Stations' }));
    expect(screen.getByText(/Pick it — you’ll see only your cut/)).toBeInTheDocument();
  });

  it('#390: a clear saw shows the per-saw all-clear, not a blank card', async () => {
    const user = userEvent.setup();
    // Saw B holds the only cut; Saw A has nothing claimed and nothing waiting.
    render(
      <CuttingStation
        queue={[makeSP('b', { sawId: 'B' })]}
        saws={['A', 'B']}
        sent={[]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
        onClaim={noop}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Saw A/ }));
    expect(screen.getByText('Saw A is clear')).toBeInTheDocument();
    expect(screen.getByText(/stand by for the next shore point/)).toBeInTheDocument();
  });

  it('renders the read-only sent-to-runner tail', () => {
    render(
      <CuttingStation
        queue={[]}
        sent={[makeSP('s', { label: 'S-9', status: 'runner' })]}
        onMarkCutDone={noop}
        onClearCutDone={noop}
        onSendToRunner={noop}
        onStepBack={noop}
      />,
    );
    const tail = screen.getByText('Sent to runner').closest('.fs-cutstation-sent') as HTMLElement;
    expect(within(tail).getByText('S-9 · T-Shore')).toBeInTheDocument();
    // Read-only: no slide controls on the tail card.
    expect(within(tail).queryByText(/Slide/)).not.toBeInTheDocument();
  });

  // SME-3 (Phase J gate #260) — the hero's promoted number is now clamped at 0 in
  // `cutLengthInches`, so the station must SAY why instead of printing a bare 0″ the
  // saw operator can't act on. Real reducer math throughout; nothing stubbed.
  describe('SME-3 — opening too small for the shore-type wood', () => {
    const hero = () => screen.getByText('Cut length').closest('.fs-cutstation-hero') as HTMLElement;
    const TOO_SMALL = /Opening too small for standard 6×6 wood — verify measurement/;

    function renderQueue(sp: ShorePoint) {
      render(
        <CuttingStation
          queue={[sp]}
          sent={[]}
          onMarkCutDone={noop}
          onClearCutDone={noop}
          onSendToRunner={noop}
          onStepBack={noop}
        />,
      );
    }

    it('warns (and shows 0″, never a negative) when the raw cut goes below zero', () => {
      // 3-Post, 12″ opening: 12 − 2×5.5 − 1.5 = −0.5 raw → clamped to 0.
      renderQueue(makeSP('a', { shoreType: '3-post', measurementEighths: 96 }));
      expect(within(hero()).getByText(TOO_SMALL)).toBeInTheDocument();
      // The clamp holds at the display layer too: the ONE promoted number reads a
      // plain 0″, never the "−1/2″" MeasurementValue would happily render.
      // (Scoped to the numeral — the math line below it legitimately shows minuses.)
      expect(hero().querySelector('.fs-cutstation-hero-num')).toHaveTextContent(/^0″$/);
    });

    it('warns at the exact 12.5″ break-even — a 0″ cut is as unactionable as a negative', () => {
      renderQueue(makeSP('b', { shoreType: '3-post', measurementEighths: 100 }));
      expect(within(hero()).getByText(TOO_SMALL)).toBeInTheDocument();
    });

    it('does NOT warn one eighth above break-even — the boundary is not off by one', () => {
      // 12.625 − 12.5 = 0.125: a real, if tiny, cut.
      renderQueue(makeSP('c', { shoreType: '3-post', measurementEighths: 101 }));
      expect(within(hero()).queryByText(TOO_SMALL)).toBeNull();
    });

    it('a normal cut carries no warning', () => {
      renderQueue(makeSP('d')); // T-Shore at 48.5″ — the file default
      expect(screen.queryByText(/Opening too small/)).toBeNull();
    });

    it('a clean hero with no verdict threaded carries NO chip row at all (SME-1 pixel-identity)', () => {
      // The hero gained a capacity chip above the too-small one; both are absent on a
      // healthy cut, so a clean hero renders exactly what it rendered before either
      // shipped. Counting rows (not matching text) is what makes this a real pin.
      renderQueue(makeSP('e'));
      expect(hero().querySelectorAll('.fs-spc-flag-row')).toHaveLength(0);
    });
  });
});

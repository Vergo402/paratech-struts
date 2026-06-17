// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { slideToCommit } from '@ui/primitives/Slider.testkit';
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
    deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
    ...over,
  };
}

const noop = vi.fn();

describe('CuttingStation', () => {
  it('empty queue: shows the "No cuts in queue" empty state', () => {
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
    expect(screen.getByText('No cuts in queue')).toBeInTheDocument();
    expect(screen.getByText(/Move a shore point to Cutting/)).toBeInTheDocument();
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
    expect(screen.getByText('2 cuts in queue')).toBeInTheDocument();
    expect(screen.getByText('A-1 · T-Shore')).toBeInTheDocument();
    expect(screen.getByText('B-2 · T-Shore')).toBeInTheDocument();
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
    expect(screen.getByText('1 cut in queue')).toBeInTheDocument();
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
});

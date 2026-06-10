// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WarningGate, GATE_COPY } from './WarningGate';

describe('WarningGate', () => {
  it('renders the three doctrine sentences verbatim', () => {
    render(<WarningGate use="unrated" acknowledged={false} onAcknowledge={() => {}} />);
    expect(
      screen.getByText(
        'LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required.',
      ),
    ).toBeInTheDocument();

    render(<WarningGate use="over-capacity" />);
    expect(
      screen.getByText(
        'Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening.',
      ),
    ).toBeInTheDocument();

    render(<WarningGate use="disclaimer" />);
    expect(screen.getByText('Planning aid, not an engineering certification.')).toBeInTheDocument();
  });

  it('unrated: acknowledgment fires the callback and the disclosure persists', async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    const { rerender } = render(
      <WarningGate use="unrated" acknowledged={false} onAcknowledge={onAcknowledge} />,
    );
    const ack = screen.getByRole('checkbox', { name: /team acknowledges the unrated zone/i });
    expect(ack).toHaveAttribute('aria-checked', 'false');

    await user.click(ack);
    expect(onAcknowledge).toHaveBeenCalledTimes(1);

    // Parent flips the state — disclosure must STAY visible (ack ≠ dismiss).
    rerender(<WarningGate use="unrated" acknowledged={true} onAcknowledge={onAcknowledge} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(GATE_COPY.unrated)).toBeInTheDocument();
  });

  it('over-capacity: no acknowledgment control — the deploy path stays closed', () => {
    render(<WarningGate use="over-capacity" />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

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

    render(<WarningGate use="over-capacity-short" acknowledged={false} onAcknowledge={() => {}} />);
    expect(
      screen.getByText('Deploying short of the required struts needs a recorded team acknowledgment.'),
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

  it('over-capacity-short: acknowledgment fires the callback and the disclosure persists', async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(<WarningGate use="over-capacity-short" acknowledged={false} onAcknowledge={onAcknowledge} />);
    const ack = screen.getByRole('checkbox', { name: /team acknowledges the over-capacity deploy/i });
    await user.click(ack);
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(screen.getByText(GATE_COPY['over-capacity-short'])).toBeInTheDocument();
  });

  it('disclaimer: no acknowledgment control — it is a permanent footnote', () => {
    render(<WarningGate use="disclaimer" />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { STATUS_LABELS, STATUS_ORDER } from '@core/shorepoint';
import { Badge } from './Badge';

describe('Badge', () => {
  it('status variant renders every locked STATUS_LABELS word verbatim', () => {
    for (const status of STATUS_ORDER) {
      const { unmount } = render(<Badge variant="status" status={status} />);
      const el = screen.getByText(STATUS_LABELS[status]);
      expect(el).toHaveClass('fs-badge--status', `is-${status}`);
      unmount();
    }
  });

  it('does not animate on first render, animates only after a status change', () => {
    const { rerender } = render(<Badge variant="status" status="process" />);
    const el = screen.getByText(STATUS_LABELS.process);
    expect(el).not.toHaveClass('fs-badge--animate');

    // Re-render with the SAME status — still no animation class.
    rerender(<Badge variant="status" status="process" />);
    expect(el).not.toHaveClass('fs-badge--animate');

    // Status commit — the cross-fade class appears.
    rerender(<Badge variant="status" status="strutset" />);
    expect(screen.getByText(STATUS_LABELS.strutset)).toHaveClass('fs-badge--animate');
  });

  it('count renders tabular number, dot always carries adjacent text', () => {
    render(<Badge variant="count" value={12} srLabel="12 shore points" />);
    expect(screen.getByLabelText('12 shore points')).toHaveTextContent('12');

    render(<Badge variant="dot" tone="danger" text="Sync queued" />);
    expect(screen.getByText('Sync queued')).toBeInTheDocument();
  });

  it('severity renders the word on the feedback palette class', () => {
    render(<Badge variant="severity">2 hazards</Badge>);
    expect(screen.getByText('2 hazards')).toHaveClass('fs-badge--severity');
  });
});

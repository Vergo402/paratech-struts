// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ArchivedOperationSummary } from '@core/operation';
import { PastOperationsList } from './PastOperationsList';

const mockArchive = vi.fn<() => { data: ArchivedOperationSummary[] | undefined }>();
vi.mock('@ui/hooks', () => ({ usePastOperations: () => mockArchive() }));

describe('PastOperationsList (#238)', () => {
  it('renders nothing when there are no finished incidents', () => {
    mockArchive.mockReturnValue({ data: [] });
    const { container } = render(<PastOperationsList onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each finished incident and opens it on tap', async () => {
    mockArchive.mockReturnValue({
      data: [
        { id: 'op2', name: 'Cascade Fire', endedAt: 1_700_000_000_000, shorePointCount: 12 },
        { id: 'op1', name: 'Mill Collapse', endedAt: 1_600_000_000_000, shorePointCount: 1 },
      ],
    });
    const onOpen = vi.fn();
    render(<PastOperationsList onOpen={onOpen} />);

    expect(screen.getByText('Cascade Fire')).toBeInTheDocument();
    expect(screen.getByText(/12 shore points/)).toBeInTheDocument();
    expect(screen.getByText(/1 shore point$/)).toBeInTheDocument(); // singular

    await userEvent.click(screen.getByText('Cascade Fire'));
    expect(onOpen).toHaveBeenCalledWith('op2');
  });
});

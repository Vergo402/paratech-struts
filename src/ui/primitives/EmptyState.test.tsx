// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders headline (the what) and reason (the why)', () => {
    render(
      <EmptyState
        variant="first-run"
        headline="No shore points yet"
        reason="Tap Add Shore Point to add the first"
        action={{ label: 'Add Shore Point', onPress: () => {} }}
      />,
    );
    expect(screen.getByText('No shore points yet')).toBeInTheDocument();
    expect(screen.getByText('Tap Add Shore Point to add the first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Shore Point' })).toBeInTheDocument();
  });

  it('all-clear is a calm confirmation — never renders an action', () => {
    render(
      <EmptyState
        variant="all-clear"
        headline="All equipment returned"
        reason="Every deployed strut is back on its apparatus"
        action={{ label: 'Should not render', onPress: () => {} }}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

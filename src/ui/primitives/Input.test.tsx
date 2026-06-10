// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TextField } from './Input';

function Harness({ error }: { error?: string }) {
  const [v, setV] = useState('');
  return <TextField label="Operation name" value={v} onChange={setV} error={error} />;
}

describe('TextField', () => {
  it('label is always visible and bound to the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Operation name');
    await user.type(input, 'Surfside');
    expect(input).toHaveValue('Surfside');
  });

  it('error sets aria-invalid and renders the adjacent message', () => {
    render(<Harness error="Name the operation before starting it" />);
    const input = screen.getByLabelText('Operation name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Name the operation before starting it');
    expect(screen.getByText('Name the operation before starting it')).toBeInTheDocument();
  });

  it('no error → no aria-invalid', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Operation name')).not.toHaveAttribute('aria-invalid');
  });
});

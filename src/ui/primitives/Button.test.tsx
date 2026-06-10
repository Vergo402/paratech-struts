// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('intrinsic double-fire guard: a second click while in-flight does not re-fire', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const onPress = vi.fn(() => new Promise<void>((res) => (release = res)));
    render(
      <Button variant="primary" onPress={onPress}>
        Deploy
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Deploy' });

    await user.click(btn);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');

    await user.click(btn); // swallowed — disabled while in-flight
    expect(onPress).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => expect(btn).toBeEnabled());
    await user.click(btn);
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('disabled renders its reason adjacent — never hidden-why', () => {
    render(
      <Button onPress={() => {}} disabled disabledReason="Acknowledge the unrated zone first">
        Deploy
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Deploy' })).toBeDisabled();
    expect(screen.getByText('Acknowledge the unrated zone first')).toBeInTheDocument();
  });

  it('variant + destructive classes compose', () => {
    render(
      <Button variant="primary" destructive onPress={() => {}}>
        End Operation
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'End Operation' });
    expect(btn).toHaveClass('fs-button--primary', 'fs-button--destructive');
  });
});

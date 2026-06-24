// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSubmit = vi.fn();
vi.mock('@ui/hooks', () => ({ useFeedback: () => ({ submit: mockSubmit }) }));

import { FeedbackSheet } from './FeedbackSheet';

beforeEach(() => {
  mockSubmit.mockReset().mockResolvedValue({ ok: true });
});

describe('FeedbackSheet (#321 inc4d)', () => {
  it('submits the category + message and shows the sent state', async () => {
    const user = userEvent.setup();
    render(<FeedbackSheet open onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("What's on your mind?"), 'the slider sticks');
    await user.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(mockSubmit).toHaveBeenCalledWith({ category: 'bug', text: 'the slider sticks' });
    expect(await screen.findByText(/your feedback was sent/i)).toBeInTheDocument();
  });

  it('surfaces a failure reason inline and stays open', async () => {
    const user = userEvent.setup();
    mockSubmit.mockResolvedValue({ ok: false, reason: 'Sign in to send feedback.' });
    render(<FeedbackSheet open onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("What's on your mind?"), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(await screen.findByText('Sign in to send feedback.')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { QuickFind } from './QuickFind';

// Calculator cards (#433) carry no deduction ledger — the shared math lives once
// in the sheet's stat strip — so count cards by their root class instead.
const cardCount = () => document.querySelectorAll('.fs-rec').length;
const feetField = () => screen.getByRole('textbox', { name: 'Feet' });
const inchesField = () => screen.getByRole('textbox', { name: 'Inches' });

// 30" (2 ft 6 in) — a span where LongShore (gold), AcmeThread (grey) and
// LockStroke all fit, so the system filter has something to narrow.
async function enter30in(user: ReturnType<typeof userEvent.setup>) {
  await user.type(feetField(), '2');
  await user.type(inchesField(), '6');
}

describe('QuickFind', () => {
  it('shows no result cards until Find Struts is tapped, then computes', async () => {
    const user = userEvent.setup();
    render(<QuickFind />);
    await enter30in(user);
    expect(cardCount()).toBe(0); // measurement entered, but not searched yet
    await user.click(screen.getByRole('button', { name: 'Find Struts' }));
    expect(cardCount()).toBeGreaterThan(0);
  });

  it('narrows results to the selected system (client-side filter)', async () => {
    const user = userEvent.setup();
    render(<QuickFind />);
    await enter30in(user);
    await user.click(screen.getByRole('button', { name: 'Find Struts' }));
    const all = cardCount();
    expect(all).toBeGreaterThan(0);
    // Keep only Acme thread (AcmeThread) — LongShore + LockStroke cards drop out.
    await user.click(screen.getByRole('button', { name: 'Acme thread' }));
    const greyOnly = cardCount();
    expect(greyOnly).toBeGreaterThan(0);
    expect(greyOnly).toBeLessThan(all);
  });
});

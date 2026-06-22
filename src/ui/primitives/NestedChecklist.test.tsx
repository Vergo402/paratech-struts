// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ChecklistTemplate } from '@core/schema';
import type { ChecklistInstance } from '@core/checklist';
import { NestedChecklist } from './NestedChecklist';

const template: ChecklistTemplate = {
  id: 'task-level',
  title: 'T',
  source: 'fieldshore-baseline',
  autoCollapseCompleted: false,
  nodes: [
    {
      id: 'sec',
      label: 'Search',
      children: [
        { id: 'a', label: 'Primary search' },
        { id: 'b', label: 'Mark searched' },
      ],
    },
  ],
};

// local-time constructor so clockTime()'s getHours()/getMinutes() read 14:32 in any TZ
const checkedA: ChecklistInstance = {
  a: { by: 'dev', role: 'Rescue Group Supervisor', at: new Date(2026, 0, 1, 14, 32).getTime() },
};

describe('NestedChecklist', () => {
  it('renders leaves as checkboxes with their checked state', () => {
    render(<NestedChecklist template={template} attestations={checkedA} onCheck={() => {}} onUncheck={() => {}} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /Primary search/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /Mark searched/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the attribution (role + time) on a checked leaf', () => {
    render(<NestedChecklist template={template} attestations={checkedA} onCheck={() => {}} onUncheck={() => {}} />);
    expect(screen.getByText(/Rescue Group Supervisor · 14:32/)).toBeInTheDocument();
  });

  it('tap toggles: an unchecked leaf calls onCheck, a checked one calls onUncheck', async () => {
    const onCheck = vi.fn();
    const onUncheck = vi.fn();
    render(<NestedChecklist template={template} attestations={checkedA} onCheck={onCheck} onUncheck={onUncheck} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Mark searched/ }));
    expect(onCheck).toHaveBeenCalledWith('b');
    await userEvent.click(screen.getByRole('checkbox', { name: /Primary search/ }));
    expect(onUncheck).toHaveBeenCalledWith('a');
  });

  it('a section is a group carrying progress as words — not a mixed checkbox', () => {
    render(<NestedChecklist template={template} attestations={checkedA} onCheck={() => {}} onUncheck={() => {}} />);
    // The disclosure header announces "Search, 1 of 2 complete"; never aria-checked=mixed.
    expect(screen.getByRole('button', { name: /Search, 1 of 2 complete/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Search/ })).toBeNull();
  });

  it('read-only renders state but no toggle button (broadcast / archive)', () => {
    render(<NestedChecklist template={template} attestations={checkedA} onCheck={() => {}} onUncheck={() => {}} readOnly />);
    const a = screen.getByRole('checkbox', { name: /Primary search/ });
    expect(a).toHaveAttribute('aria-disabled', 'true');
    expect(a.tagName).not.toBe('BUTTON');
  });
});

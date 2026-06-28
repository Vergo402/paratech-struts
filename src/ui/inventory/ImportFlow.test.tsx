// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportFlow } from './ImportFlow';

const HEADER = 'ID,Apparatus,Apparatus ID,Type,Model,System,Plate ID,Plate Name,Extension Length (in),Quantity';

function csvFile(body: string): File {
  return new File([`${HEADER}\r\n${body}`], 'inv.csv', { type: 'text/csv' });
}

async function pickFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
}

describe('ImportFlow', () => {
  it('drives a clean file through all four steps and commits the parsed rows', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue({ imported: 1, skipped: 0 });
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);

    await pickFile(user, csvFile('s1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4'));
    await screen.findByText(/First 5 rows/); // step 1 preview

    await user.click(screen.getByRole('button', { name: 'Continue' })); // → step 2 (all auto-mapped)
    await screen.findByText('Map your columns');
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → step 3
    await screen.findByText('Check the rows');
    expect(screen.getByText('1 will import')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → step 4

    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));
    await waitFor(() => expect(importRows).toHaveBeenCalledTimes(1));
    expect(importRows.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ apparatus: 'Rescue 2', type: 'strut', model: 'LS 203', quantity: 4 }),
    ]);
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
  });

  it('lets the operator fix a flagged quantity inline, then imports the corrected row', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue({ imported: 1, skipped: 0 });
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);

    await pickFile(user, csvFile('s1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,two'));
    await screen.findByText(/First 5 rows/);
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 2
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 3
    expect(screen.getByText('1 to fix')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 4

    // 0 importable until fixed → Import button disabled
    expect(screen.getByText(/invalid Quantity/)).toBeInTheDocument();
    const qty = screen.getByRole('textbox', { name: 'Quantity' });
    await user.clear(qty);
    await user.type(qty, '3');

    const importBtn = await screen.findByRole('button', { name: /Import 1 row/ });
    await user.click(importBtn);
    await waitFor(() => expect(importRows).toHaveBeenCalledTimes(1));
    expect(importRows.mock.calls[0]![0]).toEqual([expect.objectContaining({ quantity: 3 })]);
  });

  it('a flagged field with no mapped column shows a remap note, not a dead editor', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue({ imported: 0, skipped: 0 });
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);

    // A file with Apparatus/Type/Quantity but NO Model column — the strut row flags
    // Model, whose column is unmapped (the cells[-1] dead-end the review caught).
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['Apparatus,Type,Quantity\r\nRescue 2,Strut,4'], 'nomodel.csv', { type: 'text/csv' }));
    await screen.findByText(/First 5 rows/);
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 2 (Apparatus/Type/Quantity auto-map)
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 3
    await user.click(screen.getByRole('button', { name: 'Continue' })); // step 4

    // No inline editor for the unmapped Model column — a remap note instead, and no model picker.
    expect(screen.getByText(/No .*Model.* column was mapped/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Strut model' })).toBeNull();
    // The only importable count is 0 → Import is disabled until the row is skipped or remapped.
    expect(screen.getByRole('button', { name: /Import 0 rows/ })).toBeDisabled();
  });
});

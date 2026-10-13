// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportFlow } from './ImportFlow';
import type { ImportResult } from '@ui/hooks';

const HEADER = 'ID,Apparatus,Apparatus ID,Type,Model,System,Plate ID,Plate Name,Extension Length (in),Quantity';

function csvFile(body: string): File {
  return new File([`${HEADER}\r\n${body}`], 'inv.csv', { type: 'text/csv' });
}

async function pickFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
}

/** A store ImportResult (#514 shape); defaults to a clean, synced import of 1 row. */
function result(over: { imported?: number; strand?: number; retype?: number; cloud?: ImportResult['cloud'] } = {}): ImportResult {
  return {
    imported: over.imported ?? 1,
    skipped: { strand: over.strand ?? 0, retype: over.retype ?? 0 },
    cloud: over.cloud ?? { status: 'synced', failed: 0, reverted: 0 },
  };
}

/** Pick a file and walk Steps 1→4 (every column auto-maps from HEADER). */
async function toReview(user: ReturnType<typeof userEvent.setup>, file: File) {
  await pickFile(user, file);
  await screen.findByText(/First 5 rows/);
  await user.click(screen.getByRole('button', { name: 'Continue' })); // step 2
  await user.click(screen.getByRole('button', { name: 'Continue' })); // step 3
  await user.click(screen.getByRole('button', { name: 'Continue' })); // step 4
  await screen.findByText('Review and import');
}

/** The result block's lines, in order (each its own <p>). */
function resultLines(): string[] {
  const block = screen.getByRole('heading', { name: /Import (complete|failed)/ }).parentElement!;
  return [...block.querySelectorAll('p')].map((p) => p.textContent ?? '');
}

describe('ImportFlow — the import result (#514)', () => {
  const CLEAN = csvFile('s1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4\r\n'); // trailing newline: no blank row

  it('a rejected import says nothing was saved, shows Done, and never leaves Import stuck', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const importRows = vi.fn().mockRejectedValue(new Error('The device database refused the write (QuotaExceededError).'));
    render(<ImportFlow open onClose={onClose} opActive={false} importRows={importRows} />);
    await toReview(user, CLEAN);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));

    expect(await screen.findByRole('heading', { name: 'Import failed' })).toBeInTheDocument();
    expect(resultLines()).toEqual(['Nothing was saved. The device database refused the write (QuotaExceededError).']);
    expect(screen.queryByText('Import complete')).toBeNull();
    expect(screen.queryByRole('button', { name: /Import 1 row/ })).toBeNull(); // not stuck on "Importing…"
    const done = screen.getAllByRole('button', { name: 'Done' });
    await user.click(done[done.length - 1]!);
    expect(onClose).toHaveBeenCalled();
  });

  it('accounts for every row: imported, each skip by its reason, flagged, hand-skipped, blank — cloud line last', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(
      result({ imported: 3, strand: 1, retype: 1, cloud: { status: 'failed', failed: 1, reverted: 0 } }),
    );
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    const body = [
      's1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4',
      ',,,,,,,,,', // blank row — dropped by the parser
      's2,Rescue 2,app-r2,Strut,LS 203,Gold,,,,two', // flagged, left unfixed
      's3,Rescue 2,app-r2,Strut,LS 203,Gold,,,,x', // flagged, left unfixed
      's4,Rescue 2,app-r2,Strut,LS 203,Gold,,,,y', // flagged, skipped by the operator
    ].join('\r\n');
    await toReview(user, csvFile(body));
    const skips = screen.getAllByRole('button', { name: /Skip this row instead/ });
    await user.click(skips[skips.length - 1]!); // skip row 6 (s4)
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));

    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual([
      '3 rows imported.',
      '1 skipped — would strand deployed stock.',
      "1 skipped — type doesn't match the item already on the rig.",
      '2 rows not imported — still flagged to fix.',
      '1 row skipped by you.',
      '1 blank row ignored.',
      "Saved on this device — 1 row didn't reach the cloud.",
      'Other rows were saved on this device and in the cloud.',
    ]);
  });

  it('uses the plural and singular forms of the accounting lines', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(result({ imported: 2, strand: 2, retype: 3, cloud: { status: 'failed', failed: 2, reverted: 0 } }));
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    const body = [
      's1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4',
      ',,,,,,,,,',
      ',,,,,,,,,',
      's2,Rescue 2,app-r2,Strut,LS 203,Gold,,,,two', // flagged, left unfixed
      's3,Rescue 2,app-r2,Strut,LS 203,Gold,,,,x', // skipped by the operator
      's4,Rescue 2,app-r2,Strut,LS 203,Gold,,,,y', // skipped by the operator
    ].join('\r\n');
    await toReview(user, csvFile(body));
    await user.click(screen.getAllByRole('button', { name: /Skip this row instead/ })[1]!);
    await user.click(screen.getAllByRole('button', { name: /Skip this row instead/ })[1]!);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));

    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual([
      '2 rows imported.',
      '2 skipped — would strand deployed stock.',
      "3 skipped — type doesn't match the item already on the rig.",
      '1 row not imported — still flagged to fix.',
      '2 rows skipped by you.',
      '2 blank rows ignored.',
      "Saved on this device — 2 rows didn't reach the cloud.",
    ]);
  });

  it.each([
    [{ imported: 1, cloud: { status: 'synced', failed: 0, reverted: 0 } }, ['1 row imported.', 'Saved on this device and in the cloud.']],
    [{ imported: 1, cloud: { status: 'pending', failed: 0, reverted: 0 } }, ['1 row imported.', 'Saved on this device — will sync to the cloud when you reconnect.']],
    [{ imported: 1, cloud: { status: 'local', failed: 0, reverted: 0 } }, ['1 row imported.', 'Saved on this device.']],
    [{ imported: 0, strand: 1, cloud: { status: 'local', failed: 0, reverted: 0 } }, ['No rows imported.', '1 skipped — would strand deployed stock.', 'Saved on this device.']],
  ] as const)('a clean file shows only the lines that apply (%j)', async (over, lines) => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(
      result({ imported: over.imported, strand: 'strand' in over ? over.strand : 0, cloud: { ...over.cloud } }),
    );
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    await toReview(user, CLEAN);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));
    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual([...lines]);
  });
});

// Fix round 1 (#514 review): the up-to-4 s cloud settle made the commit window long
// enough to Cancel/Escape mid-import — the rows were saved but the user saw the flow
// vanish, and the late result then hijacked the next open.
// Fix round 2 — a refused row the cloud's newer value overwrote (LWW pull-down) is NOT
// "saved on this device"; the copy must say the device now shows the cloud's value.
describe('ImportFlow — rows reverted to the cloud value (#514 fix round 2)', () => {
  const ROW = 's1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4';
  async function run(sent: number, cloud: ImportResult['cloud'], imported = sent) {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(result({ imported, cloud }));
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    const rows = Array.from({ length: sent }, (_, i) => ROW.replace('s1', `s${i + 1}`).replace('LS 203', ['LS 203', 'LS 304', 'LS 406'][i]!));
    await toReview(user, csvFile(rows.join('\r\n')));
    await user.click(screen.getByRole('button', { name: new RegExp(`Import ${sent} rows?`) }));
    await screen.findByRole('heading', { name: 'Import complete' });
  }
  const warnLines = () =>
    [...document.querySelectorAll('.fs-import-result p.fs-import-result-warn')].map((p) => p.textContent);

  it('one reverted row, nothing else landed: only the reverted line', async () => {
    await run(1, { status: 'failed', failed: 0, reverted: 1 });
    expect(resultLines()).toEqual(["1 row imported.", "1 row didn't reach the cloud — this device now shows the cloud's value for it."]);
    expect(warnLines()).toHaveLength(1);
  });

  it('reverted rows plus rows that landed: the reverted line, then the other rows are in the cloud', async () => {
    await run(3, { status: 'failed', failed: 0, reverted: 2 });
    expect(resultLines()).toEqual([
      '3 rows imported.',
      "2 rows didn't reach the cloud — this device now shows the cloud's values for them.",
      'Other rows were saved on this device and in the cloud.',
    ]);
  });

  it('failed, reverted and landed rows together: failed line, reverted line, then the other rows (fix round 3)', async () => {
    await run(3, { status: 'failed', failed: 1, reverted: 1 });
    expect(resultLines()).toEqual([
      '3 rows imported.',
      "Saved on this device — 1 row didn't reach the cloud.",
      "1 row didn't reach the cloud — this device now shows the cloud's value for it.",
      'Other rows were saved on this device and in the cloud.',
    ]);
    expect(warnLines()).toHaveLength(2);
  });

  it('failed rows beside landed rows also mention the landed ones (fix round 3)', async () => {
    await run(2, { status: 'failed', failed: 1, reverted: 0 });
    expect(resultLines()).toEqual([
      '2 rows imported.',
      "Saved on this device — 1 row didn't reach the cloud.",
      'Other rows were saved on this device and in the cloud.',
    ]);
  });

  it('when nothing landed there is no "Other rows" line', async () => {
    await run(2, { status: 'failed', failed: 1, reverted: 1 });
    expect(resultLines()).toEqual([
      '2 rows imported.',
      "Saved on this device — 1 row didn't reach the cloud.",
      "1 row didn't reach the cloud — this device now shows the cloud's value for it.",
    ]);
  });

  it('plural failed and reverted together', async () => {
    await run(3, { status: 'failed', failed: 2, reverted: 2 }, 4);
    expect(resultLines().slice(-2)).toEqual([
      "Saved on this device — 2 rows didn't reach the cloud.",
      "2 rows didn't reach the cloud — this device now shows the cloud's values for them.",
    ]);
  });
});

describe('ImportFlow — the commit window (#514 fix round 1)', () => {
  const CLEAN = csvFile('s1,Rescue 2,app-r2,Strut,LS 203,Gold,,,,4\r\n');
  function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  }

  it('while importing, Cancel is disabled with the reason "Importing…" and Escape does not close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const d = deferred<ImportResult>();
    render(<ImportFlow open onClose={onClose} opActive={false} importRows={() => d.promise} />);
    await toReview(user, CLEAN);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toBeDisabled();
    expect(screen.getAllByText('Importing…').length).toBeGreaterThan(0);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => d.resolve(result({ imported: 1 })));
    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeInTheDocument();
  });

  it('a result that arrives after the dialog closed is dropped; reopening starts at Step 1', async () => {
    const user = userEvent.setup();
    const d = deferred<ImportResult>();
    const props = { onClose: () => {}, opActive: false, importRows: () => d.promise };
    const { rerender } = render(<ImportFlow open {...props} />);
    await toReview(user, CLEAN);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));

    rerender(<ImportFlow open={false} {...props} />); // the parent closes it mid-import
    rerender(<ImportFlow open {...props} />);
    await act(async () => d.resolve(result({ imported: 1 })));

    expect(screen.getByText('Pick your file')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Import (complete|failed)/ })).toBeNull();
  });

  it('reopening after a finished import starts clean (no stale result block)', async () => {
    const user = userEvent.setup();
    const props = { onClose: () => {}, opActive: false, importRows: vi.fn().mockResolvedValue(result({ imported: 1 })) };
    const { rerender } = render(<ImportFlow open {...props} />);
    await toReview(user, CLEAN);
    await user.click(screen.getByRole('button', { name: /Import 1 row/ }));
    await screen.findByRole('heading', { name: 'Import complete' });

    rerender(<ImportFlow open={false} {...props} />);
    rerender(<ImportFlow open {...props} />);
    expect(screen.getByText('Pick your file')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('rows folded into an identical row are accounted for on their own line (ruling A)', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(result({ imported: 1 }));
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    const row = ',Rescue 2,app-r2,Strut,LS 203,Gold,,,,2';
    await toReview(user, csvFile([row, row, row].join('\r\n')));
    await user.click(screen.getByRole('button', { name: /Import 3 rows/ }));
    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual(['1 row imported.', '2 rows merged with identical rows.', 'Saved on this device and in the cloud.']);
  });

  it('a re-typed carrier and the blank row folded into it read as one skip line, never "merged" (fix round 2)', async () => {
    const user = userEvent.setup();
    // the store counts the carrier + its folded sibling in the skip (2), imports nothing
    const importRows = vi.fn().mockResolvedValue(result({ imported: 0, retype: 2, cloud: { status: 'local', failed: 0, reverted: 0 } }));
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    await toReview(user, csvFile(['inv-p,Rescue 2,app-r2,Strut,LS 203,Gold,,,,2', ',Rescue 2,app-r2,Strut,LS 203,Gold,,,,3'].join('\r\n')));
    await user.click(screen.getByRole('button', { name: /Import 2 rows/ }));
    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual([
      'No rows imported.',
      "2 skipped — type doesn't match the item already on the rig.",
      'Saved on this device.',
    ]);
  });

  it('one folded row reads in the singular', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(result({ imported: 1 }));
    render(<ImportFlow open onClose={() => {}} opActive={false} importRows={importRows} />);
    const row = ',Rescue 2,app-r2,Strut,LS 203,Gold,,,,2';
    await toReview(user, csvFile([row, row].join('\r\n')));
    await user.click(screen.getByRole('button', { name: /Import 2 rows/ }));
    await screen.findByRole('heading', { name: 'Import complete' });
    expect(resultLines()).toEqual(['1 row imported.', '1 row merged with an identical row.', 'Saved on this device and in the cloud.']);
  });
});

describe('ImportFlow', () => {
  it('drives a clean file through all four steps and commits the parsed rows', async () => {
    const user = userEvent.setup();
    const importRows = vi.fn().mockResolvedValue(result({ imported: 1 }));
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
    const importRows = vi.fn().mockResolvedValue(result({ imported: 1 }));
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
    const importRows = vi.fn().mockResolvedValue(result({ imported: 0 }));
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

import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ChangeEvent } from 'react';
import { STRUTS, BASE_PLATES } from '@core/load';
import { Button, Modal, TextField, useNativeControls } from '@ui/primitives';
import { BottomSheetPicker, FullScreenList, PowerSelect, type SheetPickerOption } from '@ui/picker';
import {
  parseRecords,
  autoMap,
  validateRows,
  validateRow,
  CSV_HEADERS,
  type ColumnMapping,
  type FieldKey,
  type RowOutcome,
  type ParsedImportRow,
} from '@ui/hooks';

// The 4-step validated import (40-inventory.md §"Validated import flow"; ADR-038 —
// bespoke, no library): file pick + preview → column map → row validation → review
// + commit. Built on existing primitives (FullScreenList / BottomSheetPicker /
// TextField / Modal) over the pure parse/validate seam in core. CSV-only this slice
// (xlsx deferred). The Step-2 mapper is the OQ-#36 subject; Step-4 inline fix/skip
// and importing during an active op (warned, never blocked) are the 2026-06-28
// discovery decisions.

export interface ImportFlowProps {
  open: boolean;
  onClose: () => void;
  /** Surfaces the Step-3 active-operation banner. Import is allowed during an op —
   *  the store preserves deployed counts and skips any row that would strand gear. */
  opActive: boolean;
  importRows: (rows: ParsedImportRow[]) => Promise<{ imported: number; skipped: number }>;
}

type Step = 1 | 2 | 3 | 4;
// A file column's assignment in Step 2: a FieldShore field, an explicit "ignore",
// or "unset" (auto-map found no match — the operator must map or ignore it).
type ColAssign = FieldKey | 'ignore' | 'unset';

const FIELD_OPTIONS: SheetPickerOption<string>[] = [
  ...CSV_HEADERS.map((h) => ({ value: h, label: h })),
  { value: 'ignore', label: 'Ignore this column' },
];
const MODEL_OPTIONS: SheetPickerOption<string>[] = STRUTS.map((s) => ({ value: s.model, label: s.model, sub: s.system }));
const PLATE_OPTIONS: SheetPickerOption<string>[] = BASE_PLATES.map((p) => ({ value: p.id, label: p.name }));
// CSV tokens stay 'Gold'/'Grey' for round-trip compatibility; the picker LABEL speaks
// the system's human name (craft.md §8, shared with systemLabels.ts).
const SYSTEM_OPTIONS: SheetPickerOption<string>[] = [
  { value: 'Gold', label: 'LongShore' },
  { value: 'Grey', label: 'Acme thread' },
  { value: 'LockStroke', label: 'LockStroke' },
];
const TYPE_OPTIONS: SheetPickerOption<string>[] = [
  { value: 'Strut', label: 'Strut' },
  { value: 'Extension', label: 'Extension' },
  { value: 'Plate', label: 'Plate' },
];
const REQUIRED: FieldKey[] = ['Type', 'Apparatus', 'Quantity'];

// FileReader (not Blob.text()) — broader support (older Safari, jsdom in tests).
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Invert auto-map into per-column assignments: the field a column matched, else "unset".
function initialAssign(header: string[]): ColAssign[] {
  const m = autoMap(header);
  return header.map((_, i) => CSV_HEADERS.find((k) => m[k] === i) ?? 'unset');
}

function deriveMapping(assign: ColAssign[]): ColumnMapping {
  const mapping = {} as ColumnMapping;
  for (const k of CSV_HEADERS) mapping[k] = -1;
  assign.forEach((a, i) => {
    if (a !== 'ignore' && a !== 'unset') mapping[a] = i;
  });
  return mapping;
}

// A many-option single-select with a labeled trigger (BottomSheetPicker handles
// ≤7; this wraps FullScreenList for the larger/searchable sets — field chooser,
// strut model, plate).
function SelectField({
  label,
  placeholder,
  options,
  value,
  onSelect,
  invalid,
}: {
  label: string;
  placeholder: string;
  options: SheetPickerOption<string>[];
  value: string | null;
  onSelect: (v: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  // Native-controls fallback (accessibility.md §The Power Select fallback): the
  // controlled overlay collapses to an OS-native <select>; a leading disabled
  // option carries the placeholder while nothing is chosen.
  if (useNativeControls()) {
    const nativeOptions =
      value == null ? [{ value: '', label: placeholder, disabled: true }, ...options] : options;
    return <PowerSelect label={label} options={nativeOptions} value={value ?? ''} onChange={onSelect} />;
  }

  return (
    <>
      <button
        type="button"
        className={`fs-picker-trigger${invalid ? ' fs-import-trigger--warn' : ''}`}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value">{current?.label ?? placeholder}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <FullScreenList open={open} onClose={() => setOpen(false)} title={label} options={options} value={value} onSelect={onSelect} />
    </>
  );
}

export function ImportFlow({ open, onClose, opActive, importRows }: ImportFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState<string[][]>([]);
  const [assign, setAssign] = useState<ColAssign[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({} as ColumnMapping);
  const [outcomes, setOutcomes] = useState<RowOutcome[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [showReady, setShowReady] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const header = records[0] ?? [];
  const width = header.length;

  function reset() {
    setStep(1);
    setFileName('');
    setRecords([]);
    setAssign([]);
    setMapping({} as ColumnMapping);
    setOutcomes([]);
    setSkipped(new Set());
    setParseError(null);
    setShowReady(false);
    setCommitting(false);
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    const text = await readFileText(file);
    const { records: recs, unterminated } = parseRecords(text);
    if (unterminated) {
      setParseError('Unterminated quote (") in the file. Fix the quoting and pick the file again — nothing was read.');
      return;
    }
    if (recs.length < 2) {
      setParseError('That file has no data rows. Pick a file with a header row plus at least one item.');
      return;
    }
    setRecords(recs);
    setFileName(file.name);
    setAssign(initialAssign(recs[0] ?? []));
  }

  function setColumn(i: number, value: string) {
    setAssign((prev) => {
      const next = [...prev];
      if (value !== 'ignore') {
        // a field maps to exactly one column — free whichever column held it
        for (let j = 0; j < next.length; j++) if (next[j] === value) next[j] = 'ignore';
      }
      next[i] = value as ColAssign;
      return next;
    });
  }

  const requiredMet = REQUIRED.every((f) => assign.includes(f));

  function toStep3() {
    const m = deriveMapping(assign);
    const { outcomes: outs } = validateRows(records, m);
    setMapping(m);
    setOutcomes(outs);
    setSkipped(new Set());
    setStep(3);
  }

  function editCell(line: number, field: FieldKey, value: string) {
    if (mapping[field] < 0) return; // unmapped column — no cell to write (FixControl shows a remap note instead)
    setOutcomes((prev) =>
      prev.map((o) => {
        if (o.line !== line) return o;
        const cells = [...o.cells];
        cells[mapping[field]] = value;
        return validateRow(cells, line, mapping, width) ?? o; // null only for blank/template — never on a real edit
      }),
    );
  }

  function toggleSkip(line: number) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  const validOutcomes = outcomes.filter((o) => o.row);
  const flaggedOutcomes = outcomes.filter((o) => o.error);
  const importable = outcomes.filter((o) => o.row && !skipped.has(o.line));
  const liveFlagged = flaggedOutcomes.filter((o) => !skipped.has(o.line));

  async function doImport() {
    setCommitting(true);
    const res = await importRows(importable.map((o) => o.row as ParsedImportRow));
    setCommitting(false);
    setResult(res);
  }

  function StepBar() {
    return (
      <div className="fs-import-stepbar" aria-hidden="true">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <span key={s} className={`fs-import-stepseg${s <= step ? ' fs-import-stepseg--on' : ''}`} />
        ))}
      </div>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Content className="fs-fullscreen fs-import" aria-describedby={undefined}>
          <header className="fs-fullscreen-head">
            <Dialog.Title className="fs-fullscreen-title">Import inventory</Dialog.Title>
            <button type="button" className="fs-fullscreen-cancel" onClick={close}>
              {result ? 'Done' : 'Cancel'}
            </button>
          </header>
          <div className="fs-import-progress">
            <span className="fs-import-stepnum" aria-live="polite">
              Step {step} of 4
            </span>
            <StepBar />
          </div>

          <div className="fs-fullscreen-body fs-import-body">
            {result ? (
              <div className="fs-import-done">
                <h2 className="fs-import-h">Import complete</h2>
                <p className="fs-import-sub">
                  {result.imported} row{result.imported === 1 ? '' : 's'} imported
                  {result.skipped > 0 ? ` · ${result.skipped} skipped (would strand deployed stock)` : ''}.
                </p>
                <Button variant="primary" onPress={close}>
                  Done
                </Button>
              </div>
            ) : step === 1 ? (
              <div>
                <h2 className="fs-import-h">Pick your file</h2>
                {records.length === 0 ? (
                  <>
                    <p className="fs-import-sub">Choose a CSV file exported from FieldShore, or your own spreadsheet saved as CSV.</p>
                    <label className="fs-import-filebtn">
                      <input type="file" accept=".csv,text/csv" onChange={onFile} />
                      <span>
                        <i aria-hidden="true">＋</i> Choose CSV file
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="fs-import-filerow">
                      <span className="fs-import-filemeta">
                        <strong>{fileName}</strong>
                        <span>
                          {width} column{width === 1 ? '' : 's'} · {records.length - 1} row{records.length - 1 === 1 ? '' : 's'}
                        </span>
                      </span>
                      <label className="fs-import-change">
                        <input type="file" accept=".csv,text/csv" onChange={onFile} />
                        <span>Change</span>
                      </label>
                    </div>
                    <p className="fs-import-previewlabel">First 5 rows</p>
                    <div className="fs-import-tablewrap">
                      <table className="fs-import-table">
                        <thead>
                          <tr>
                            {header.map((h, i) => (
                              <th key={i}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {records.slice(1, 6).map((r, ri) => (
                            <tr key={ri}>
                              {r.map((c, ci) => (
                                <td key={ci}>{c}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : step === 2 ? (
              <div>
                <h2 className="fs-import-h">Map your columns</h2>
                <p className="fs-import-sub">Match each column in your file to a FieldShore field. Auto-matched columns are checked; pick a field (or Ignore) for the rest.</p>
                {!requiredMet && (
                  <p className="fs-import-need">Type, Apparatus, and Quantity must each be mapped to continue.</p>
                )}
                <div className="fs-import-maplist">
                  {header.map((h, i) => {
                    const a = assign[i] ?? 'unset';
                    const matched = a !== 'ignore' && a !== 'unset';
                    const unset = a === 'unset';
                    return (
                      <div key={i} className={`fs-import-maprow${unset ? ' fs-import-maprow--warn' : ''}`}>
                        <span className="fs-import-mapicon" aria-hidden="true">
                          {matched ? '✓' : unset ? '!' : '—'}
                        </span>
                        <span className="fs-import-mapcol">
                          <strong>{h || `Column ${i + 1}`}</strong>
                          <span>{unset ? 'no match — pick a field' : 'your column'}</span>
                        </span>
                        <span className="fs-import-mappick">
                          <SelectField
                            label={`Map "${h || `Column ${i + 1}`}"`}
                            placeholder="Choose…"
                            options={FIELD_OPTIONS}
                            value={unset ? null : a === 'ignore' ? 'ignore' : a}
                            onSelect={(v) => setColumn(i, v)}
                            invalid={unset}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : step === 3 ? (
              <div>
                <h2 className="fs-import-h">Check the rows</h2>
                <div className="fs-import-chips" role="status" aria-live="polite">
                  <span className="fs-import-chip fs-import-chip--ok">{validOutcomes.length} will import</span>
                  {flaggedOutcomes.length > 0 && <span className="fs-import-chip fs-import-chip--warn">{flaggedOutcomes.length} to fix</span>}
                </div>
                {flaggedOutcomes.length === 0 ? (
                  <p className="fs-import-sub">Every row checks out. Continue to import.</p>
                ) : (
                  <ul className="fs-import-warnlist">
                    {flaggedOutcomes.map((o) => (
                      <li key={o.line}>
                        <i aria-hidden="true">⚠</i> Row {o.line}: {o.error?.message}
                      </li>
                    ))}
                  </ul>
                )}
                {opActive && (
                  <div className="fs-import-banner">
                    <i aria-hidden="true">ℹ</i> An operation is active — deployed items are not changed by this import, and any row that would strand deployed gear is skipped.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="fs-import-h">Review and import</h2>
                <p className="fs-import-sub">Fix or skip the flagged rows. Nothing is saved until you import.</p>
                <div className="fs-import-chips" role="status" aria-live="polite">
                  <span className="fs-import-chip fs-import-chip--ok">{importable.length} ready</span>
                  {liveFlagged.length > 0 && <span className="fs-import-chip fs-import-chip--warn">{liveFlagged.length} to fix</span>}
                </div>

                <button type="button" className="fs-import-readyrow" onClick={() => setShowReady((v) => !v)}>
                  <i aria-hidden="true">✓</i>
                  <span>
                    {importable.length} row{importable.length === 1 ? '' : 's'} ready to import
                  </span>
                  <span className="fs-import-readytoggle">{showReady ? 'Hide' : 'Review'} ▾</span>
                </button>
                {showReady && (
                  <ul className="fs-import-readylist">
                    {importable.map((o) => {
                      const r = o.row as ParsedImportRow;
                      const desc = r.type === 'strut' ? r.model : r.type === 'extension' ? `${r.length}″ extension` : BASE_PLATES.find((p) => p.id === r.plateId)?.name;
                      return (
                        <li key={o.line}>
                          {r.apparatus} · {desc} · ×{r.quantity}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {outcomes
                  .filter((o) => o.error)
                  .map((o) => {
                    const isSkipped = skipped.has(o.line);
                    const apparatus = mapping['Apparatus'] >= 0 ? o.cells[mapping['Apparatus']] : '';
                    const typeLabel = mapping['Type'] >= 0 ? o.cells[mapping['Type']] : '';
                    if (isSkipped) {
                      return (
                        <div key={o.line} className="fs-import-skipped">
                          <i aria-hidden="true">⊖</i>
                          <span>
                            Row {o.line} · {apparatus} {typeLabel}
                          </span>
                          <button type="button" onClick={() => toggleSkip(o.line)}>
                            Undo
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div key={o.line} className="fs-import-fixcard">
                        <div className="fs-import-fixhead">
                          Row {o.line} · {apparatus} · {typeLabel}
                        </div>
                        <div className="fs-import-fixmsg">{o.error?.message}</div>
                        <FixControl outcome={o} mapping={mapping} onEdit={editCell} />
                        <button type="button" className="fs-import-skiplink" onClick={() => toggleSkip(o.line)}>
                          ⊖ Skip this row instead
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {!result && (
            <footer className="fs-import-foot">
              {step === 1 && (
                <Button variant="primary" disabled={records.length === 0} disabledReason="Pick a file first" onPress={() => setStep(2)}>
                  Continue
                </Button>
              )}
              {step === 2 && (
                <>
                  <Button variant="secondary" onPress={() => setStep(1)}>
                    Back
                  </Button>
                  <Button variant="primary" disabled={!requiredMet} disabledReason="Map Type, Apparatus, and Quantity" onPress={toStep3}>
                    Continue
                  </Button>
                </>
              )}
              {step === 3 && (
                <>
                  <Button variant="secondary" onPress={() => setStep(2)}>
                    Back
                  </Button>
                  <Button variant="primary" onPress={() => setStep(4)}>
                    Continue
                  </Button>
                </>
              )}
              {step === 4 && (
                <>
                  <Button variant="secondary" onPress={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={importable.length === 0 || committing}
                    disabledReason={committing ? 'Importing…' : 'Fix or unskip a row to import'}
                    onPress={doImport}
                  >
                    Import {importable.length} row{importable.length === 1 ? '' : 's'}
                  </Button>
                </>
              )}
            </footer>
          )}

          <Modal
            open={parseError != null}
            onClose={() => setParseError(null)}
            title="Couldn't read that file"
            variant="alert"
            footer={
              <Button variant="primary" onPress={() => setParseError(null)}>
                OK
              </Button>
            }
          >
            <p>{parseError}</p>
          </Modal>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The one-field editor for a flagged row, chosen by which field failed.
function FixControl({
  outcome,
  mapping,
  onEdit,
}: {
  outcome: RowOutcome;
  mapping: ColumnMapping;
  onEdit: (line: number, field: FieldKey, value: string) => void;
}) {
  const field = outcome.error?.field;
  if (!field) {
    return <p className="fs-import-fixnote">This row does not match the columns — skip it and fix the file.</p>;
  }
  if (mapping[field] < 0) {
    // The failing field has no column in the file (e.g. strut rows with no Model
    // column) — there's nothing to edit inline. Point back to Step 2, or skip.
    return <p className="fs-import-fixnote">No “{field}” column was mapped — go Back to map one, or skip this row.</p>;
  }
  const cell = mapping[field] >= 0 ? outcome.cells[mapping[field]] ?? '' : '';
  const set = (v: string) => onEdit(outcome.line, field, v);

  if (field === 'Quantity' || field === 'Extension Length (in)') {
    return (
      <div className="fs-import-fixfield">
        <TextField label={field} value={cell} onChange={set} inputMode="numeric" size="standard" />
      </div>
    );
  }
  if (field === 'Apparatus') {
    return (
      <div className="fs-import-fixfield">
        <TextField label="Apparatus" value={cell} onChange={set} size="standard" />
      </div>
    );
  }
  if (field === 'Model') {
    return (
      <div className="fs-import-fixfield">
        <SelectField label="Strut model" placeholder="Choose model…" options={MODEL_OPTIONS} value={cell || null} onSelect={set} invalid />
      </div>
    );
  }
  if (field === 'Plate ID') {
    return (
      <div className="fs-import-fixfield">
        <SelectField label="Plate" placeholder="Choose plate…" options={PLATE_OPTIONS} value={cell || null} onSelect={set} invalid />
      </div>
    );
  }
  if (field === 'System') {
    // Pass the raw cell: an invalid value shows the picker's empty state, never a
    // fake-valid default the operator hasn't actually chosen.
    return (
      <div className="fs-import-fixfield">
        <BottomSheetPicker label="System" options={SYSTEM_OPTIONS} value={cell} onSelect={set} />
      </div>
    );
  }
  // Type
  return (
    <div className="fs-import-fixfield">
      <BottomSheetPicker label="Type" options={TYPE_OPTIONS} value={cell} onSelect={set} />
    </div>
  );
}

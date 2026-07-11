import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ChangeEvent } from 'react';
import { Button, Modal, TextField } from '@ui/primitives';
import { BottomSheetPicker, type SheetPickerOption } from '@ui/picker';
import { starterPasswordFor } from '@core/personnel';
import type { Apparatus, Role } from '@core/schema';
import {
  parsePersonnelRecords as parseRecords,
  autoMapPersonnel,
  validatePersonnelRows,
  validatePersonnelRow,
  getPersonnelTemplateCSV,
  PERSONNEL_HEADERS,
  type ParsedPersonnelRow,
  type PersonnelColumnMapping,
  type PersonnelFieldKey,
  type PersonnelRowOutcome,
  type AdminMutationResult,
  type ProvisionMemberInput,
} from '@ui/hooks';
import { download } from '../util/download';

// The #439 personnel bulk add — the 4-step validated import (file pick + preview →
// column map → row validation → review + commit), modeled on the inventory
// ImportFlow (ADR-038 bespoke pattern; shares its fs-import-* styles) over the
// pure personnelCsv seam. The COMMIT differs fundamentally from inventory's one
// store call: each row creates a real login (sequential provisionAccount calls —
// Auth throttles parallel account creation), with live progress and a results
// screen that doubles as the admin's starter-password DISTRIBUTION SHEET (shown
// once; partial success is normal and unmistakable — created rows stay created).

export interface PersonnelImportFlowProps {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  roster: Apparatus[];
  /** Whether the importing admin holds the Admin role (gates Admin-role rows). */
  actorIsAdmin: boolean;
  onProvision: (input: ProvisionMemberInput) => Promise<AdminMutationResult & { uid?: string }>;
}

type Step = 1 | 2 | 3 | 4;
type ColAssign = PersonnelFieldKey | 'ignore' | 'unset';

const FIELD_OPTIONS: SheetPickerOption<string>[] = [
  ...PERSONNEL_HEADERS.map((h) => ({ value: h, label: h })),
  { value: 'ignore', label: 'Ignore this column' },
];
const REQUIRED: PersonnelFieldKey[] = ['Name', 'Email'];

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function initialAssign(header: string[]): ColAssign[] {
  const m = autoMapPersonnel(header);
  return header.map((_, i) => PERSONNEL_HEADERS.find((k) => m[k] === i) ?? 'unset');
}

function deriveMapping(assign: ColAssign[]): PersonnelColumnMapping {
  const mapping = {} as PersonnelColumnMapping;
  for (const k of PERSONNEL_HEADERS) mapping[k] = -1;
  assign.forEach((a, i) => {
    if (a !== 'ignore' && a !== 'unset') mapping[a] = i;
  });
  return mapping;
}

interface CommitResult {
  created: { name: string; email: string; starter: string }[];
  failed: { name: string; reason: string }[];
}

export function PersonnelImportFlow({
  open,
  onClose,
  roles,
  roster,
  actorIsAdmin,
  onProvision,
}: PersonnelImportFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState<string[][]>([]);
  const [assign, setAssign] = useState<ColAssign[]>([]);
  const [mapping, setMapping] = useState<PersonnelColumnMapping>({} as PersonnelColumnMapping);
  const [outcomes, setOutcomes] = useState<PersonnelRowOutcome[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);

  const ctx = { roles, roster, actorIsAdmin };
  const header = records[0] ?? [];
  const width = header.length;

  function reset() {
    setStep(1);
    setFileName('');
    setRecords([]);
    setAssign([]);
    setMapping({} as PersonnelColumnMapping);
    setOutcomes([]);
    setSkipped(new Set());
    setParseError(null);
    setProgress(null);
    setResult(null);
  }

  function close() {
    if (progress && !result) return; // never dismissable mid-creation — accounts are landing
    reset();
    onClose();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await readFileText(file);
    const { records: recs, unterminated } = parseRecords(text);
    if (unterminated) {
      setParseError('Unterminated quote (") in the file. Fix the quoting and pick the file again — nothing was read.');
      return;
    }
    if (recs.length < 2) {
      setParseError('That file has no data rows. Pick a file with a header row plus at least one member.');
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
        for (let j = 0; j < next.length; j++) if (next[j] === value) next[j] = 'ignore';
      }
      next[i] = value as ColAssign;
      return next;
    });
  }

  const requiredMet = REQUIRED.every((f) => assign.includes(f));

  function toStep3() {
    const m = deriveMapping(assign);
    const { outcomes: outs } = validatePersonnelRows(records, m, ctx);
    setMapping(m);
    setOutcomes(outs);
    setSkipped(new Set());
    setStep(3);
  }

  function editCell(line: number, field: PersonnelFieldKey, value: string) {
    if (mapping[field] < 0) return;
    setOutcomes((prev) =>
      prev.map((o) => {
        if (o.line !== line) return o;
        const cells = [...o.cells];
        cells[mapping[field]] = value;
        return validatePersonnelRow(cells, line, mapping, ctx) ?? o;
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
    const rows = importable.map((o) => o.row as ParsedPersonnelRow);
    const created: CommitResult['created'] = [];
    const failed: CommitResult['failed'] = [];
    setProgress({ done: 0, total: rows.length });
    // SEQUENTIAL on purpose: Firebase Auth throttles parallel account creation,
    // and a mid-run failure must leave an honest ledger (earlier rows stay created).
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const starter = starterPasswordFor(row.displayName);
      const res = await onProvision({ ...row, starterPassword: starter });
      if (res.ok) created.push({ name: row.displayName, email: row.email, starter });
      else failed.push({ name: row.displayName, reason: res.reason ?? 'That change could not be saved.' });
      setProgress({ done: i + 1, total: rows.length });
    }
    setResult({ created, failed });
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

  const committing = progress !== null && result === null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Content className="fs-fullscreen fs-import" aria-describedby={undefined}>
          <header className="fs-fullscreen-head">
            <Dialog.Title className="fs-fullscreen-title">Add members from CSV</Dialog.Title>
            {!committing && (
              <button type="button" className="fs-fullscreen-cancel" onClick={close}>
                {result ? 'Done' : 'Cancel'}
              </button>
            )}
          </header>
          {!result && !committing && (
            <div className="fs-import-progress">
              <span className="fs-import-stepnum" aria-live="polite">
                Step {step} of 4
              </span>
              <StepBar />
            </div>
          )}

          <div className="fs-fullscreen-body fs-import-body">
            {committing ? (
              <div className="fs-import-done" role="status" aria-live="polite">
                <h2 className="fs-import-h">Creating accounts…</h2>
                <p className="fs-import-sub">
                  Creating {Math.min((progress?.done ?? 0) + 1, progress?.total ?? 0)} of {progress?.total} — keep this open.
                </p>
              </div>
            ) : result ? (
              <div>
                <h2 className="fs-import-h">Import complete</h2>
                <p className="fs-import-sub" role="status" aria-live="polite">
                  {result.created.length} account{result.created.length === 1 ? '' : 's'} created
                  {result.failed.length > 0 ? ` · ${result.failed.length} failed` : ''}.
                </p>
                {result.created.length > 0 && (
                  <>
                    <div className="fs-um-handover">
                      {result.created.map((c) => (
                        <div key={c.email} className="fs-um-handover-row">
                          <span className="fs-um-handover-value" style={{ textAlign: 'left' }}>{c.name}</span>
                          <span className="fs-um-handover-starter">{c.starter}</span>
                        </div>
                      ))}
                    </div>
                    <p className="fs-import-sub" style={{ marginTop: 'var(--space-2)' }}>
                      Read each starter password to its owner in person — this list isn&rsquo;t shown
                      again, and each member must change it at first sign-in.
                    </p>
                  </>
                )}
                {result.failed.length > 0 && (
                  <ul className="fs-import-warnlist">
                    {result.failed.map((f, i) => (
                      <li key={i}>
                        <i aria-hidden="true">⚠</i> {f.name} — {f.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <Button variant="primary" onPress={close}>
                    Done
                  </Button>
                </div>
              </div>
            ) : step === 1 ? (
              <div>
                <h2 className="fs-import-h">Pick your file</h2>
                {records.length === 0 ? (
                  <>
                    <p className="fs-import-sub">
                      Choose a CSV roster — columns: {PERSONNEL_HEADERS.join(', ')}. Each row becomes a
                      real login with a starter password.
                    </p>
                    <label className="fs-import-filebtn">
                      <input type="file" accept=".csv,text/csv" onChange={onFile} />
                      <span>
                        <i aria-hidden="true">＋</i> Choose CSV file
                      </span>
                    </label>
                    <p className="fs-import-sub" style={{ marginTop: 'var(--space-3)' }}>
                      <button
                        type="button"
                        className="fs-import-skiplink"
                        onClick={() => download('fieldshore-personnel-template.csv', getPersonnelTemplateCSV())}
                      >
                        Download a blank template
                      </button>
                    </p>
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
                <p className="fs-import-sub">
                  Match each column in your file to a FieldShore field. Auto-matched columns are
                  checked; pick a field (or Ignore) for the rest.
                </p>
                {!requiredMet && <p className="fs-import-need">Name and Email must each be mapped to continue.</p>}
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
                          <BottomSheetPicker
                            label={`Map "${h || `Column ${i + 1}`}"`}
                            options={FIELD_OPTIONS}
                            value={unset ? '' : a}
                            onSelect={(v) => setColumn(i, v)}
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
                  <span className="fs-import-chip fs-import-chip--ok">{validOutcomes.length} will be added</span>
                  {flaggedOutcomes.length > 0 && (
                    <span className="fs-import-chip fs-import-chip--warn">{flaggedOutcomes.length} to fix</span>
                  )}
                </div>
                {flaggedOutcomes.length === 0 ? (
                  <p className="fs-import-sub">Every row checks out. Continue to review.</p>
                ) : (
                  <ul className="fs-import-warnlist">
                    {flaggedOutcomes.map((o) => (
                      <li key={o.line}>
                        <i aria-hidden="true">⚠</i> Row {o.line}: {o.error?.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <h2 className="fs-import-h">Review and add</h2>
                <p className="fs-import-sub">
                  Fix or skip the flagged rows. Each added row creates a login with its starter
                  password — nothing happens until you add them.
                </p>
                <div className="fs-import-chips" role="status" aria-live="polite">
                  <span className="fs-import-chip fs-import-chip--ok">{importable.length} ready</span>
                  {liveFlagged.length > 0 && (
                    <span className="fs-import-chip fs-import-chip--warn">{liveFlagged.length} to fix</span>
                  )}
                </div>

                {importable.length > 0 && (
                  <ul className="fs-import-readylist">
                    {importable.map((o) => {
                      const r = o.row as ParsedPersonnelRow;
                      const rig = r.apparatusId ? roster.find((a) => a.id === r.apparatusId)?.name : undefined;
                      return (
                        <li key={o.line}>
                          {r.displayName} · {r.email}
                          {rig ? ` · ${rig}` : ''} · {starterPasswordFor(r.displayName)}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {outcomes
                  .filter((o) => o.error)
                  .map((o) => {
                    const isSkipped = skipped.has(o.line);
                    const name = mapping['Name'] >= 0 ? o.cells[mapping['Name']] : '';
                    if (isSkipped) {
                      return (
                        <div key={o.line} className="fs-import-skipped">
                          <i aria-hidden="true">⊖</i>
                          <span>
                            Row {o.line} · {name}
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
                          Row {o.line} · {name}
                        </div>
                        <div className="fs-import-fixmsg">{o.error?.message}</div>
                        <PersonnelFixControl outcome={o} mapping={mapping} roles={roles} roster={roster} onEdit={editCell} />
                        <button type="button" className="fs-import-skiplink" onClick={() => toggleSkip(o.line)}>
                          ⊖ Skip this row instead
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {!result && !committing && (
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
                  <Button variant="primary" disabled={!requiredMet} disabledReason="Map Name and Email" onPress={toStep3}>
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
                    disabled={importable.length === 0}
                    disabledReason="Fix or unskip a row to add members"
                    onPress={doImport}
                  >
                    Add {importable.length} member{importable.length === 1 ? '' : 's'}
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
function PersonnelFixControl({
  outcome,
  mapping,
  roles,
  roster,
  onEdit,
}: {
  outcome: PersonnelRowOutcome;
  mapping: PersonnelColumnMapping;
  roles: Role[];
  roster: Apparatus[];
  onEdit: (line: number, field: PersonnelFieldKey, value: string) => void;
}) {
  const field = outcome.error?.field;
  if (!field) {
    return <p className="fs-import-fixnote">This row does not match the columns — skip it and fix the file.</p>;
  }
  if (mapping[field] < 0) {
    return <p className="fs-import-fixnote">No “{field}” column was mapped — go Back to map one, or skip this row.</p>;
  }
  const cell = outcome.cells[mapping[field]] ?? '';
  const set = (v: string) => onEdit(outcome.line, field, v);

  if (field === 'Role') {
    return (
      <div className="fs-import-fixfield">
        <BottomSheetPicker
          label="Role"
          options={roles.map((r) => ({ value: r.name, label: r.name }))}
          value={cell}
          onSelect={set}
        />
      </div>
    );
  }
  if (field === 'Apparatus') {
    return (
      <div className="fs-import-fixfield">
        <BottomSheetPicker
          label="Apparatus"
          options={roster.map((a) => ({ value: a.name, label: a.name, sub: a.type }))}
          value={cell}
          onSelect={set}
        />
      </div>
    );
  }
  return (
    <div className="fs-import-fixfield">
      <TextField label={field} value={cell} onChange={set} size="standard" />
    </div>
  );
}

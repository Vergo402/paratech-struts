import { STRUTS, BASE_PLATES } from '@core/load';
import { System, type InventoryItem } from '@core/schema';
import { serialize } from '@core/csv';

// Pure CSV round-trip for the inventory cache (40-inventory.md §Excel import/export).
// The 10-column contract; CSV-only this slice (xlsx + Reference sheet deferred). No
// Dexie / no React — the store's `upsertImport` consumes parseCsv()'s output and owns
// the durable write + id minting. RFC-4180 quoting is mandatory: apparatus names are
// free text and plate names carry the inch-mark (").

export const CSV_HEADERS = [
  'ID',
  'Apparatus',
  'Apparatus ID',
  'Type',
  'Model',
  'System',
  'Plate ID',
  'Plate Name',
  'Extension Length (in)',
  'Quantity',
] as const;

// The System column shows the field-visible color label (40-inventory.md:90), not
// the internal system name; import accepts either, so a hand-typed file still loads.
const SYSTEM_TO_LABEL: Record<System, string> = {
  LongShore: 'Gold',
  AcmeThread: 'Grey',
  LockStroke: 'LockStroke',
};

function labelToSystem(raw: string): System | null {
  const t = raw.trim();
  if (t === 'Gold' || t === 'LongShore') return 'LongShore';
  if (t === 'Grey' || t === 'Gray' || t === 'AcmeThread') return 'AcmeThread';
  if (t === 'LockStroke') return 'LockStroke';
  return null;
}

const TYPE_ORDER: Record<InventoryItem['type'], number> = { strut: 0, extension: 1, plate: 2 };
const SYS_ORDER: Record<System, number> = { LongShore: 0, AcmeThread: 1, LockStroke: 2 };

function collapsedOf(model?: string): number {
  return STRUTS.find((s) => s.model === model)?.collapsed ?? 0;
}
function plateName(plateId?: string): string {
  return BASE_PLATES.find((p) => p.id === plateId)?.name ?? '';
}

// Spec sort: Apparatus (alphabetical) → Type (Strut→Extension→Plate) → within Strut by
// system group + collapsed length; Extension by system + length; Plate by plate name.
function compareItems(a: InventoryItem, b: InventoryItem): number {
  const an = a.apparatus.localeCompare(b.apparatus);
  if (an !== 0) return an;
  const at = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  if (at !== 0) return at;
  if (a.type === 'strut') {
    const sd = SYS_ORDER[a.system ?? 'LongShore'] - SYS_ORDER[b.system ?? 'LongShore'];
    return sd !== 0 ? sd : collapsedOf(a.model) - collapsedOf(b.model);
  }
  if (a.type === 'extension') {
    const sd = SYS_ORDER[a.system ?? 'LongShore'] - SYS_ORDER[b.system ?? 'LongShore'];
    return sd !== 0 ? sd : (a.length ?? 0) - (b.length ?? 0);
  }
  return plateName(a.plateId).localeCompare(plateName(b.plateId));
}

function rowFor(i: InventoryItem): string[] {
  const typeLabel = i.type === 'strut' ? 'Strut' : i.type === 'extension' ? 'Extension' : 'Plate';
  return [
    i.id,
    i.apparatus,
    i.apparatusId,
    typeLabel,
    i.type === 'strut' ? i.model ?? '' : '',
    i.system ? SYSTEM_TO_LABEL[i.system] : '',
    i.type === 'plate' ? i.plateId ?? '' : '',
    i.type === 'plate' ? plateName(i.plateId) : '',
    i.type === 'extension' && i.length != null ? String(i.length) : '',
    String(i.quantity),
  ];
}

/** The cache as CSV, sorted per the spec. Zero-quantity rows are omitted
 *  (blank = not carried); `Available` is never written (app-managed state). */
export function toCsv(items: InventoryItem[]): string {
  const sorted = items.filter((i) => i.quantity > 0).slice().sort(compareItems);
  return serialize([CSV_HEADERS, ...sorted.map(rowFor)]);
}

// The exact marker the template stamps in the Apparatus column. Import skips ONLY
// this literal — never a loose 'EXAMPLE' prefix, which would silently drop a rig
// legitimately named e.g. "EXAMPLE Co".
export const TEMPLATE_SENTINEL = 'EXAMPLE — delete before importing';

/** Headers + one labeled EXAMPLE row per type (blank IDs) for first-time loading. */
export function getTemplateCSV(): string {
  const examples: string[][] = [
    ['', TEMPLATE_SENTINEL, '', 'Strut', 'LS 203', 'Gold', '', '', '', '4'],
    ['', TEMPLATE_SENTINEL, '', 'Extension', '', 'Gold', '', '', '12', '2'],
    ['', TEMPLATE_SENTINEL, '', 'Plate', '', '', 'rigid6', '6" Rigid Base', '', '8'],
  ];
  return serialize([CSV_HEADERS, ...examples]);
}

// ---- import ----------------------------------------------------------------

/** A validated import row — catalog-resolved, ready for the store to upsert.
 *  `id` / `apparatusId` are '' when the file left them blank (new record / rig). */
export interface ParsedImportRow {
  id: string;
  apparatus: string;
  apparatusId: string;
  type: InventoryItem['type'];
  model?: string;
  system?: System;
  plateId?: string;
  length?: number;
  quantity: number;
}

/** Per-data-row result — what the import UI's Step 4 needs to offer inline
 *  fix/skip. Exactly one of `row` (valid) or `error` (flagged) is set; a flagged
 *  row names the offending `field` (when there is one) so the UI can focus it. */
export interface RowOutcome {
  /** 1-based file line, header included — matches what a spreadsheet shows. */
  line: number;
  /** The raw row cells, so an edit re-writes one cell and re-validates. */
  cells: string[];
  /** Catalog-resolved row — present iff the row is valid. */
  row?: ParsedImportRow;
  /** The reason a row is flagged, with the field to fix (omitted for a whole-row
   *  structural problem like a column-count mismatch — only Skip applies there). */
  error?: { field?: FieldKey; message: string };
}

export interface ParseResult {
  rows: ParsedImportRow[];
  /** Human-readable notes for rows skipped or coerced (surfaced after import). */
  warnings: string[];
  /** Per-row outcomes (valid + flagged), in file order. Drives Step-4 fix/skip;
   *  the no-UI callers read `rows`/`warnings` and ignore this. */
  outcomes: RowOutcome[];
}

/** A FieldShore field name (the 10-column contract). */
export type FieldKey = (typeof CSV_HEADERS)[number];

/** Which file column feeds each FieldShore field. -1 = not mapped (ignored).
 *  `autoMap` derives it from the header; the import UI's Step 2 lets the operator
 *  override it before `validateRows` consumes it. */
export type ColumnMapping = Record<FieldKey, number>;

/** Auto-detect: case-insensitive header-name match, FieldShore field → file column
 *  index (-1 when the header has no matching column). The Step-2 pre-fill. */
export function autoMap(header: string[]): ColumnMapping {
  const lower = header.map((h) => h.trim().toLowerCase());
  const mapping = {} as ColumnMapping;
  for (const key of CSV_HEADERS) mapping[key] = lower.indexOf(key.toLowerCase());
  return mapping;
}

// RFC-4180 char-by-char parse: quotes protect commas/newlines; "" is an escaped
// quote. \r\n, lone \n, and lone \r each terminate a record (when not in quotes).
export function parseRecords(text: string): { records: string[][]; unterminated: boolean } {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (inQuotes) {
      if (c === '"') {
        if (text[k + 1] === '"') {
          field += '"';
          k++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[k + 1] === '\n') k++;
      row.push(field);
      records.push(row);
      field = '';
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return { records, unterminated: inQuotes };
}

const REQUIRED_COLS = ['Type', 'Apparatus', 'Quantity'];

// Accept only a plain run of digits. Number() would otherwise swallow 0x12, 1e2,
// 0b10, +3 and silently import a wrong count/length.
function parsePosInt(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Validate + catalog-resolve ONE data row against the mapping. Returns a
 *  `RowOutcome` (valid `row` or flagged `error`) — or `null` for a blank /
 *  template row the caller drops entirely. `width` is the file's column count
 *  (the header's length); a row that disagrees is a structural mismatch
 *  (Skip-only, no field). Re-run on an edited `cells` to re-validate a single
 *  Step-4 row without re-running the whole batch. */
export function validateRow(
  cells: string[],
  line: number,
  mapping: ColumnMapping,
  width: number,
): RowOutcome | null {
  if (cells.join('').trim() === '') return null; // blank line
  const base = { line, cells };
  // A run-on (e.g. a mis-pasted multi-line value) collapses to a single field —
  // flag any row whose field count disagrees with the header instead of guessing.
  if (cells.length !== width) {
    return { ...base, error: { message: `${cells.length} columns, expected ${width} — skipped` } };
  }
  const at = (key: FieldKey) => {
    const i = mapping[key];
    return i >= 0 ? (cells[i] ?? '').trim() : '';
  };

  const typeRaw = at('Type');
  const type = typeRaw.toLowerCase();
  if (type !== 'strut' && type !== 'extension' && type !== 'plate') {
    return { ...base, error: { field: 'Type', message: `unknown Type "${typeRaw}" — skipped` } };
  }
  const apparatus = at('Apparatus');
  if (apparatus === TEMPLATE_SENTINEL) return null; // the template's example rows
  if (!apparatus) {
    return { ...base, error: { field: 'Apparatus', message: `missing Apparatus — skipped` } };
  }
  const quantity = parsePosInt(at('Quantity'));
  if (quantity === null) {
    return { ...base, error: { field: 'Quantity', message: `invalid Quantity "${at('Quantity')}" — skipped` } };
  }
  const id = at('ID');
  const apparatusId = at('Apparatus ID');

  if (type === 'strut') {
    const model = at('Model');
    const strut = STRUTS.find((s) => s.model === model);
    if (!strut) {
      return { ...base, error: { field: 'Model', message: `unknown strut Model "${model}" — skipped` } };
    }
    return { ...base, row: { id, apparatus, apparatusId, type: 'strut', model, system: strut.system, quantity } };
  }
  if (type === 'extension') {
    const length = parsePosInt(at('Extension Length (in)'));
    if (length === null) {
      return { ...base, error: { field: 'Extension Length (in)', message: `invalid Extension Length "${at('Extension Length (in)')}" — skipped` } };
    }
    const system = labelToSystem(at('System'));
    if (!system) {
      return { ...base, error: { field: 'System', message: `unknown extension System "${at('System')}" — skipped` } };
    }
    return { ...base, row: { id, apparatus, apparatusId, type: 'extension', system, length, quantity } };
  }
  const plateId = at('Plate ID');
  if (!BASE_PLATES.some((p) => p.id === plateId)) {
    return { ...base, error: { field: 'Plate ID', message: `unknown Plate ID "${plateId}" — skipped` } };
  }
  return { ...base, row: { id, apparatus, apparatusId, type: 'plate', plateId, quantity } };
}

/** Validate + catalog-resolve data rows against an explicit column mapping. The
 *  import UI calls this after Step 2; `parseCsv` calls it with the auto-mapping.
 *  `records` includes the header row (records[0]); data starts at records[1]. */
export function validateRows(records: string[][], mapping: ColumnMapping): ParseResult {
  if (records.length === 0) return { rows: [], warnings: [], outcomes: [] };

  // No recognizable mapping → the file's first row was mis-read as the header (or
  // the operator mapped nothing essential). Say so once, not per line.
  if (REQUIRED_COLS.every((c) => mapping[c as FieldKey] < 0)) {
    return { rows: [], warnings: [`No recognizable header row — expected columns: ${CSV_HEADERS.join(', ')}.`], outcomes: [] };
  }

  const width = records[0]?.length ?? 0;
  const outcomes: RowOutcome[] = [];
  for (let n = 1; n < records.length; n++) {
    const o = validateRow(records[n] ?? [], n + 1, mapping, width);
    if (o) outcomes.push(o);
  }

  const rows = outcomes.flatMap((o) => (o.row ? [o.row] : []));
  const warnings = outcomes.flatMap((o) => (o.error ? [`Row ${o.line}: ${o.error.message}`] : []));
  return { rows, warnings, outcomes };
}

/** One-pass parse with auto-mapping — the no-UI path (round-trip, tests, and the
 *  store's import facade). The 4-step import UI composes the same pieces but lets
 *  the operator edit the mapping between parse and validate. */
export function parseCsv(text: string): ParseResult {
  const { records, unterminated } = parseRecords(text);
  // A stray/unescaped quote opens a string that never closes, swallowing every row
  // below it into one mega-field. Reject the whole file loudly — never import a
  // silently-truncated set.
  if (unterminated) {
    return { rows: [], warnings: ['Unterminated quote (") in the file — fix the quoting and re-import. Nothing was imported.'], outcomes: [] };
  }
  return validateRows(records, autoMap(records[0] ?? []));
}

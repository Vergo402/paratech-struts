import { STRUTS, BASE_PLATES } from '@core/load';
import { System, type InventoryItem } from '@core/schema';

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

function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
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

function serialize(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
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

export interface ParseResult {
  rows: ParsedImportRow[];
  /** Human-readable notes for rows skipped or coerced (surfaced after import). */
  warnings: string[];
}

// RFC-4180 char-by-char parse: quotes protect commas/newlines; "" is an escaped
// quote. \r\n, lone \n, and lone \r each terminate a record (when not in quotes).
function parseRecords(text: string): { records: string[][]; unterminated: boolean } {
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

export function parseCsv(text: string): ParseResult {
  const rows: ParsedImportRow[] = [];
  const warnings: string[] = [];

  const { records, unterminated } = parseRecords(text);
  // A stray/unescaped quote opens a string that never closes, swallowing every row
  // below it into one mega-field. Reject the whole file loudly — never import a
  // silently-truncated set.
  if (unterminated) {
    return { rows: [], warnings: ['Unterminated quote (") in the file — fix the quoting and re-import. Nothing was imported.'] };
  }
  if (records.length === 0) return { rows, warnings };

  const header = (records[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string): number => header.indexOf(name.toLowerCase());
  // No recognizable header → the first data row was mis-read as the header. Say so
  // once, instead of emitting an opaque "unknown Type" for every line.
  if (REQUIRED_COLS.every((c) => col(c) < 0)) {
    return { rows: [], warnings: [`No recognizable header row — expected columns: ${CSV_HEADERS.join(', ')}.`] };
  }

  const idxId = col('ID');
  const idxAppar = col('Apparatus');
  const idxApparId = col('Apparatus ID');
  const idxType = col('Type');
  const idxModel = col('Model');
  const idxSystem = col('System');
  const idxPlateId = col('Plate ID');
  const idxLength = col('Extension Length (in)');
  const idxQty = col('Quantity');

  for (let n = 1; n < records.length; n++) {
    const rec = records[n];
    if (!rec) continue;
    const line = n + 1; // 1-based, including header — matches what a spreadsheet shows
    if (rec.join('').trim() === '') continue; // blank line
    // A run-on (e.g. a mis-pasted multi-line value) collapses to a single field —
    // reject any row whose field count disagrees with the header instead of guessing.
    if (rec.length !== header.length) {
      warnings.push(`Row ${line}: ${rec.length} columns, expected ${header.length} — skipped`);
      continue;
    }
    const at = (i: number) => (i >= 0 ? (rec[i] ?? '').trim() : '');

    const typeRaw = at(idxType);
    const type = typeRaw.toLowerCase();
    if (type !== 'strut' && type !== 'extension' && type !== 'plate') {
      warnings.push(`Row ${line}: unknown Type "${typeRaw}" — skipped`);
      continue;
    }
    const apparatus = at(idxAppar);
    if (apparatus === TEMPLATE_SENTINEL) continue; // the template's example rows
    if (!apparatus) {
      warnings.push(`Row ${line}: missing Apparatus — skipped`);
      continue;
    }
    const quantity = parsePosInt(at(idxQty));
    if (quantity === null) {
      warnings.push(`Row ${line}: invalid Quantity "${at(idxQty)}" — skipped`);
      continue;
    }
    const id = at(idxId);
    const apparatusId = at(idxApparId);

    if (type === 'strut') {
      const model = at(idxModel);
      const strut = STRUTS.find((s) => s.model === model);
      if (!strut) {
        warnings.push(`Row ${line}: unknown strut Model "${model}" — skipped`);
        continue;
      }
      rows.push({ id, apparatus, apparatusId, type: 'strut', model, system: strut.system, quantity });
    } else if (type === 'extension') {
      const length = parsePosInt(at(idxLength));
      if (length === null) {
        warnings.push(`Row ${line}: invalid Extension Length "${at(idxLength)}" — skipped`);
        continue;
      }
      const system = labelToSystem(at(idxSystem));
      if (!system) {
        warnings.push(`Row ${line}: unknown extension System "${at(idxSystem)}" — skipped`);
        continue;
      }
      rows.push({ id, apparatus, apparatusId, type: 'extension', system, length, quantity });
    } else {
      const plateId = at(idxPlateId);
      if (!BASE_PLATES.some((p) => p.id === plateId)) {
        warnings.push(`Row ${line}: unknown Plate ID "${plateId}" — skipped`);
        continue;
      }
      rows.push({ id, apparatus, apparatusId, type: 'plate', plateId, quantity });
    }
  }
  return { rows, warnings };
}

import { serialize } from '@core/csv';
import type { AuditRow } from './describe';

// Raw-CSV export of an Audit Log view (#211, the v4.0 export — ICS-form/PDF assembly is
// v4.1/Phase H). Pure over already-described rows; the "By" column uses the row's resolved
// actor name, falling back to the raw device uid so the analysis file always keeps
// attribution. One column set for both views.

const AUDIT_CSV_HEADERS = ['When', 'Type', 'Action', 'Detail', 'By'] as const;

// Formula-injection guard (CWE-1236, pre-Phase-J audit Low folded into #257): the
// Action/Detail/By cells carry PEER-controlled text (event content, display names) —
// a value like `=HYPERLINK(...)` would execute when the export opens in Excel/Sheets.
// Prefix the formula trigger characters with a literal apostrophe (the spreadsheet
// convention for "this is text"). Audit exports are analysis files, never re-imported
// by the app, so the prefix is safe here — do NOT push this into @core/csv serialize:
// the inventory CSV round-trips through our own importer, which a prefix would corrupt.
function formulaSafe(cell: string): string {
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
}

/** The described rows as CSV, in the given order. */
export function auditRowsToCsv(rows: AuditRow[]): string {
  const body = rows.map((r) => [
    new Date(r.at).toISOString(),
    formulaSafe(r.badge),
    formulaSafe(r.text),
    formulaSafe(r.detail ?? ''),
    formulaSafe(r.actor ?? r.by),
  ]);
  return serialize([AUDIT_CSV_HEADERS, ...body]);
}

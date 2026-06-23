import { serialize } from '@core/csv';
import type { AuditRow } from './describe';

// Raw-CSV export of an Audit Log view (#211, the v4.0 export — ICS-form/PDF assembly is
// v4.1/Phase H). Pure over already-described rows; the "By" column uses the row's resolved
// actor name, falling back to the raw device uid so the analysis file always keeps
// attribution. One column set for both views.

const AUDIT_CSV_HEADERS = ['When', 'Type', 'Action', 'Detail', 'By'] as const;

/** The described rows as CSV, in the given order. */
export function auditRowsToCsv(rows: AuditRow[]): string {
  const body = rows.map((r) => [
    new Date(r.at).toISOString(),
    r.badge,
    r.text,
    r.detail ?? '',
    r.actor ?? r.by,
  ]);
  return serialize([AUDIT_CSV_HEADERS, ...body]);
}

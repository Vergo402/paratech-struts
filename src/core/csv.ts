// core/csv — the shared RFC-4180 writer. One implementation for every CSV export
// (inventory cache + the Audit Log). Quoting is mandatory: free-text fields carry
// commas, quotes, and the inch-mark ("). CRLF line endings + a trailing CRLF, the
// Excel-friendly shape. Parsing stays in data/inventory/excel.ts (only inventory imports).

/** Quote a single field iff it contains a comma, quote, or newline (RFC-4180). */
export function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** Join rows of fields into a CRLF-delimited CSV document (trailing CRLF). */
export function serialize(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}

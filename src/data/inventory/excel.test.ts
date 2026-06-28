import { describe, it, expect } from 'vitest';
import { toCsv, parseCsv, getTemplateCSV, CSV_HEADERS, autoMap, validateRow, validateRows, parseRecords, type ColumnMapping } from './excel';
import type { InventoryItem } from '@core/schema';

const items: InventoryItem[] = [
  { id: 's1', type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 4, available: 4 },
  { id: 'e1', type: 'extension', system: 'LongShore', length: 12, apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 2, available: 2 },
  { id: 'p1', type: 'plate', plateId: 'swivel6', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 3, available: 3 },
];

describe('inventory CSV round-trip', () => {
  it('preserves id + quantity for strut, extension AND plate (v3 dropped plates)', () => {
    const { rows, warnings } = parseCsv(toCsv(items));
    expect(warnings).toEqual([]);
    expect(rows.map((r) => r.id).sort()).toEqual(['e1', 'p1', 's1']);
    expect(rows.find((r) => r.type === 'plate')).toMatchObject({ id: 'p1', plateId: 'swivel6', quantity: 3 });
    expect(rows.find((r) => r.type === 'extension')).toMatchObject({ id: 'e1', system: 'LongShore', length: 12, quantity: 2 });
  });

  it('omits zero-quantity rows (blank = not carried)', () => {
    const withZero = [
      ...items,
      { id: 'z', type: 'strut', model: 'LS 304', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 0, available: 0 } as InventoryItem,
    ];
    expect(toCsv(withZero)).not.toContain('LS 304');
  });

  it('export writes the catalog plate name (resolved, not stored)', () => {
    // The inch-mark (") is RFC-4180-escaped in the file, so assert the unescaped part.
    expect(toCsv(items)).toContain('Swivel Base');
  });

  it('sorts apparatus → type (Strut before Plate)', () => {
    const mixed: InventoryItem[] = [
      { id: 'b', type: 'plate', plateId: 'rigid6', apparatus: 'Engine 1', apparatusId: 'e1', quantity: 1, available: 1 },
      { id: 'a', type: 'strut', model: 'AT 25-36', system: 'AcmeThread', apparatus: 'Engine 1', apparatusId: 'e1', quantity: 1, available: 1 },
    ];
    const lines = toCsv(mixed).trim().split('\r\n');
    expect(lines[1]).toContain('AT 25-36');
    expect(lines[2]).toContain('rigid6');
  });

  it('round-trips a comma-bearing apparatus name + inch-mark plate name (RFC-4180)', () => {
    const tricky: InventoryItem[] = [
      { id: 'p', type: 'plate', plateId: 'swivel6', apparatus: 'Engine 1, Reserve', apparatusId: 'er', quantity: 1, available: 1 },
    ];
    const { rows, warnings } = parseCsv(toCsv(tricky));
    expect(warnings).toEqual([]);
    expect(rows[0]).toMatchObject({ apparatus: 'Engine 1, Reserve', plateId: 'swivel6' });
  });

  it('validates the catalog — keeps a valid Plate ID, skips an unknown one', () => {
    const header = CSV_HEADERS.join(',');
    const valid = ['', 'Rescue 2', 'app-r2', 'Plate', '', '', 'rigid6', '', '', '2'].join(',');
    const bad = ['', 'Rescue 2', 'app-r2', 'Plate', '', '', 'bogusplate', '', '', '2'].join(',');
    const { rows, warnings } = parseCsv([header, valid, bad].join('\r\n'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ plateId: 'rigid6', quantity: 2 });
    expect(warnings).toHaveLength(1);
  });

  it('template ships headers + an EXAMPLE row per type, all skipped on import', () => {
    const tpl = getTemplateCSV();
    expect(tpl).toContain('EXAMPLE');
    expect(parseCsv(tpl).rows).toEqual([]);
  });

  it('rejects the whole file on an unterminated quote (no silent truncation)', () => {
    const header = CSV_HEADERS.join(',');
    const ok = ['', 'Rescue 2', 'app-r2', 'Strut', 'LS 203', 'Gold', '', '', '', '4'].join(',');
    const stray = ['', 'Truck 6" Reserve', 'app-x', 'Strut', 'LS 304', 'Gold', '', '', '', '2'].join(',');
    const { rows, warnings } = parseCsv([header, ok, stray].join('\r\n'));
    expect(rows).toEqual([]);
    expect(warnings[0]).toMatch(/Unterminated quote/);
  });

  it('warns on a header-less file instead of dropping every row silently', () => {
    const headerless = ['', 'Engine 1', '', 'Strut', 'LS 203', 'Gold', '', '', '', '4'].join(',');
    const { rows, warnings } = parseCsv(headerless);
    expect(rows).toEqual([]);
    expect(warnings[0]).toMatch(/No recognizable header/);
  });

  it('rejects alternate-radix / exponent numbers (Number() would accept 0x4 → 4)', () => {
    const header = CSV_HEADERS.join(',');
    const hex = ['', 'Rescue 2', 'app-r2', 'Strut', 'LS 203', 'Gold', '', '', '', '0x4'].join(',');
    const { rows, warnings } = parseCsv([header, hex].join('\r\n'));
    expect(rows).toEqual([]);
    expect(warnings[0]).toMatch(/invalid Quantity/);
  });

  it('skips only the exact template sentinel, not any name starting with EXAMPLE', () => {
    const header = CSV_HEADERS.join(',');
    const row = ['', 'EXAMPLE Co', 'app-ex', 'Plate', '', '', 'rigid6', '', '', '2'].join(',');
    const { rows } = parseCsv([header, row].join('\r\n'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ apparatus: 'EXAMPLE Co', plateId: 'rigid6' });
  });
});

describe('autoMap (header → FieldShore field column index)', () => {
  it('maps every standard header by case-insensitive name', () => {
    const m = autoMap(['ID', 'apparatus', 'Apparatus ID', 'TYPE', 'Model', 'System', 'Plate ID', 'Plate Name', 'Extension Length (in)', 'quantity']);
    expect(m['Type']).toBe(3);
    expect(m['Quantity']).toBe(9);
    expect(m['Apparatus']).toBe(1);
  });

  it('leaves a FieldShore field at -1 when the file has no matching column', () => {
    const m = autoMap(['Truck', 'Kind', 'Count']); // none match the contract
    expect(m['Type']).toBe(-1);
    expect(m['Apparatus']).toBe(-1);
    expect(m['Quantity']).toBe(-1);
  });
});

describe('validateRows (operator-supplied mapping drives resolution)', () => {
  // A file whose columns are in a non-standard ORDER + an extra column the operator
  // chooses to ignore. The mapping — not the header names — decides which column
  // feeds each field.
  const records = parseRecords(
    [
      ['Count', 'Rig', 'Kind', 'StrutModel', 'Sys', 'Note'].join(','),
      ['4', 'Rescue 2', 'Strut', 'LS 203', 'Gold', 'spare'].join(','),
    ].join('\r\n'),
  ).records;

  const mapping: ColumnMapping = {
    ID: -1,
    Apparatus: 1,
    'Apparatus ID': -1,
    Type: 2,
    Model: 3,
    System: 4,
    'Plate ID': -1,
    'Plate Name': -1,
    'Extension Length (in)': -1,
    Quantity: 0,
  };

  it('resolves a row through a remapped, reordered file (Note column ignored)', () => {
    const { rows, warnings } = validateRows(records, mapping);
    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ apparatus: 'Rescue 2', type: 'strut', model: 'LS 203', quantity: 4 });
  });

  it('warns "No recognizable header" when Type/Apparatus/Quantity are all unmapped', () => {
    const blank: ColumnMapping = { ...mapping, Apparatus: -1, Type: -1, Quantity: -1 };
    const { rows, warnings } = validateRows(records, blank);
    expect(rows).toEqual([]);
    expect(warnings[0]).toMatch(/No recognizable header/);
  });
});

describe('RowOutcome (Step-4 inline fix/skip)', () => {
  const header = CSV_HEADERS.join(',');
  const good = ['', 'Rescue 2', 'app-r2', 'Strut', 'LS 203', 'Gold', '', '', '', '4'].join(',');
  const badQty = ['', 'Rescue 2', 'app-r2', 'Strut', 'LS 203', 'Gold', '', '', '', 'two'].join(',');
  const badModel = ['', 'Rescue 2', 'app-r2', 'Strut', 'LS 999', 'Gold', '', '', '', '2'].join(',');

  it('returns one outcome per data row, each carrying either a row or a field-tagged error', () => {
    const { outcomes } = parseCsv([header, good, badQty, badModel].join('\r\n'));
    expect(outcomes).toHaveLength(3);
    expect(outcomes[0]!.row).toMatchObject({ model: 'LS 203', quantity: 4 });
    expect(outcomes[1]!.error).toMatchObject({ field: 'Quantity' });
    expect(outcomes[2]!.error).toMatchObject({ field: 'Model' });
    // the flagged outcomes still surface in `warnings` (the no-UI path), unchanged
    expect(parseCsv([header, badQty].join('\r\n')).warnings[0]).toMatch(/invalid Quantity/);
  });

  it('blank + template rows produce no outcome (dropped, not flagged)', () => {
    const tpl = ['', 'EXAMPLE — delete before importing', '', 'Strut', 'LS 203', 'Gold', '', '', '', '4'].join(',');
    const { outcomes } = parseCsv([header, good, '', tpl].join('\r\n'));
    expect(outcomes).toHaveLength(1); // only `good`
  });

  it('re-validating an edited row (validateRow) flips a flagged row to valid', () => {
    const records = parseRecords([header, badQty].join('\r\n')).records;
    const width = records[0]!.length;
    const map = autoMap(records[0]!);
    const fixed = [...records[1]!];
    fixed[map['Quantity']] = '2'; // operator corrects "two" → 2
    const outcome = validateRow(fixed, 2, map, width);
    // a fixed row is a RowOutcome object with `row` set (never the IGNORED sentinel)
    expect(outcome).toBeTypeOf('object');
    expect((outcome as { row?: unknown }).row).toMatchObject({ quantity: 2 });
  });
});

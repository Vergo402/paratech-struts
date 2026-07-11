import { serialize } from '@core/csv';
import { ADMIN_ROLE_ID, DEFAULT_ROLE_ID, type Apparatus, type Role } from '@core/schema';
import { parseRecords } from '../inventory/excel';

// Pure CSV validation for the #439 personnel bulk add — the 8-column contract.
// Mirrors the inventory importer's shape (data/inventory/excel.ts: RowOutcome /
// ParseResult / autoMap / template sentinel) WITHOUT genericizing it — the two
// schemas resolve against different catalogs (roles + rig roster vs the strut/
// plate catalogs) and drift independently. parseRecords (RFC-4180) is shared.
// No Dexie / no React — the import UI drives provisionMember per validated row.

export const PERSONNEL_HEADERS = [
  'Name',
  'Email',
  'Rank',
  'Apparatus',
  'Badge',
  'Phone',
  'Certs',
  'Role',
] as const;

export type PersonnelFieldKey = (typeof PERSONNEL_HEADERS)[number];
export type PersonnelColumnMapping = Record<PersonnelFieldKey, number>;

/** A validated personnel row — role + rig resolved to ids, ready to provision
 *  (the UI derives the starter password from `displayName` at commit time). */
export interface ParsedPersonnelRow {
  displayName: string;
  email: string;
  role: string; //             a resolved roleId
  rank?: string;
  apparatusId?: string;
  badge?: string;
  phone?: string;
  certifications?: string;
}

export interface PersonnelRowOutcome {
  /** 1-based file line, header included — matches what a spreadsheet shows. */
  line: number;
  /** The raw row cells, so an edit re-writes one cell and re-validates. */
  cells: string[];
  /** Resolved row — present iff the row is valid. */
  row?: ParsedPersonnelRow;
  /** The reason a row is flagged, with the field to fix. */
  error?: { field?: PersonnelFieldKey; message: string };
}

export interface PersonnelParseResult {
  rows: ParsedPersonnelRow[];
  warnings: string[];
  outcomes: PersonnelRowOutcome[];
}

/** What row validation resolves against: the dept's roles + rig roster, and
 *  whether the importing admin may mint Admin accounts (the escalation guard —
 *  the server enforces it too; flagging it here keeps the failure pre-commit). */
export interface PersonnelContext {
  roles: Role[];
  roster: Apparatus[];
  actorIsAdmin: boolean;
}

// Synonyms a hand-built spreadsheet plausibly uses; first match wins.
const HEADER_SYNONYMS: Record<PersonnelFieldKey, string[]> = {
  Name: ['name', 'full name', 'member'],
  Email: ['email', 'e-mail', 'email address'],
  Rank: ['rank', 'title', 'rank / title'],
  Apparatus: ['apparatus', 'rig', 'unit'],
  Badge: ['badge', 'badge / id', 'id'],
  Phone: ['phone', 'phone number', 'cell'],
  Certs: ['certs', 'certifications'],
  Role: ['role'],
};

export function autoMapPersonnel(header: string[]): PersonnelColumnMapping {
  const lower = header.map((h) => h.trim().toLowerCase());
  const mapping = {} as PersonnelColumnMapping;
  for (const key of PERSONNEL_HEADERS) {
    mapping[key] = lower.findIndex((h) => HEADER_SYNONYMS[key].includes(h));
  }
  return mapping;
}

export const PERSONNEL_TEMPLATE_SENTINEL = 'EXAMPLE — delete before importing';

/** Headers + one labeled example row for first-time loading. */
export function getPersonnelTemplateCSV(): string {
  return serialize([
    [...PERSONNEL_HEADERS],
    [PERSONNEL_TEMPLATE_SENTINEL, 'dkim@dept14.gov', 'Lieutenant', 'Engine 2', '312', '914-555-0182', 'FF2, EMT-B', 'Default'],
  ]);
}

// Loose shape check only — the authoritative validation is Firebase's at create.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAPS: Partial<Record<PersonnelFieldKey, number>> = {
  Name: 80,
  Email: 120,
  Rank: 80,
  Badge: 40,
  Phone: 40,
  Certs: 500,
};

/** Validate ONE row (the import UI's inline-fix re-validation path). null =
 *  blank line / template sentinel. NOTE: single-row re-validation can't see the
 *  file-wide duplicate-email pass — a fixed duplicate lands as the server's
 *  already-exists per-row failure at commit (honest, never silent). */
export function validatePersonnelRow(
  cells: string[],
  line: number,
  mapping: PersonnelColumnMapping,
  ctx: PersonnelContext,
): PersonnelRowOutcome | null {
  const base = { line, cells };
  const at = (key: PersonnelFieldKey): string => {
    const i = mapping[key];
    return i >= 0 ? (cells[i] ?? '').trim() : '';
  };

  if (cells.every((c) => c.trim() === '')) return null; // blank line

  const name = at('Name');
  if (name === PERSONNEL_TEMPLATE_SENTINEL) return null; // the template's example row
  if (!name) return { ...base, error: { field: 'Name', message: 'missing Name' } };

  const email = at('Email');
  if (!email) return { ...base, error: { field: 'Email', message: 'missing Email' } };
  if (!EMAIL_SHAPE.test(email)) {
    return { ...base, error: { field: 'Email', message: `"${email}" doesn't look like an email address` } };
  }

  for (const [key, cap] of Object.entries(CAPS) as [PersonnelFieldKey, number][]) {
    if (at(key).length > cap) {
      return { ...base, error: { field: key, message: `${key} is too long (max ${cap} characters)` } };
    }
  }

  // Role: blank → Default; otherwise resolve by name (case-insensitive) or id.
  const roleRaw = at('Role');
  let roleId = DEFAULT_ROLE_ID;
  if (roleRaw) {
    const role = ctx.roles.find(
      (r) => r.name.toLowerCase() === roleRaw.toLowerCase() || r.id === roleRaw,
    );
    if (!role) {
      return { ...base, error: { field: 'Role', message: `unknown role "${roleRaw}"` } };
    }
    roleId = role.id;
  }
  if (roleId === ADMIN_ROLE_ID && !ctx.actorIsAdmin) {
    // The server's escalation guard would reject this at commit — flag it now.
    return { ...base, error: { field: 'Role', message: 'only an Admin can add another Admin' } };
  }

  // Apparatus: blank → unassigned; otherwise resolve by name (case-insensitive) or id.
  const rigRaw = at('Apparatus');
  let apparatusId: string | undefined;
  if (rigRaw) {
    const rig = ctx.roster.find(
      (a) => a.name.toLowerCase() === rigRaw.toLowerCase() || a.id === rigRaw,
    );
    if (!rig) {
      return { ...base, error: { field: 'Apparatus', message: `unknown apparatus "${rigRaw}"` } };
    }
    apparatusId = rig.id;
  }

  return {
    ...base,
    row: {
      displayName: name,
      email,
      role: roleId,
      rank: at('Rank') || undefined,
      apparatusId,
      badge: at('Badge') || undefined,
      phone: at('Phone') || undefined,
      certifications: at('Certs') || undefined,
    },
  };
}

/** Validate data rows against an explicit column mapping. `records` includes the
 *  header row (records[0]); data starts at records[1]. In-file duplicate emails
 *  flag every LATER occurrence (the first row keeps the address). */
export function validatePersonnelRows(
  records: string[][],
  mapping: PersonnelColumnMapping,
  ctx: PersonnelContext,
): PersonnelParseResult {
  if (records.length === 0) return { rows: [], warnings: [], outcomes: [] };
  if (mapping.Name < 0 && mapping.Email < 0) {
    return {
      rows: [],
      warnings: [`No recognizable header row — expected columns: ${PERSONNEL_HEADERS.join(', ')}.`],
      outcomes: [],
    };
  }

  const outcomes: PersonnelRowOutcome[] = [];
  const seenEmails = new Map<string, number>(); // lowercased email → first line
  for (let n = 1; n < records.length; n++) {
    const o = validatePersonnelRow(records[n] ?? [], n + 1, mapping, ctx);
    if (!o) continue;
    if (o.row) {
      const key = o.row.email.toLowerCase();
      const first = seenEmails.get(key);
      if (first !== undefined) {
        outcomes.push({
          line: o.line,
          cells: o.cells,
          error: { field: 'Email', message: `duplicate email — row ${first} already uses "${o.row.email}"` },
        });
        continue;
      }
      seenEmails.set(key, o.line);
    }
    outcomes.push(o);
  }

  const rows = outcomes.flatMap((o) => (o.row ? [o.row] : []));
  const warnings = outcomes.flatMap((o) => (o.error ? [`Row ${o.line}: ${o.error.message}`] : []));
  return { rows, warnings, outcomes };
}

export { parseRecords };

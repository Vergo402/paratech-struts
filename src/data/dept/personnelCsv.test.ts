import { describe, it, expect } from 'vitest';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS, type Role, type Apparatus } from '@core/schema';
import {
  PERSONNEL_HEADERS,
  autoMapPersonnel,
  validatePersonnelRows,
  getPersonnelTemplateCSV,
  parseRecords,
  type PersonnelContext,
} from './personnelCsv';

const roles: Role[] = [
  { id: 'admin', name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
  { id: 'default', name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS },
  { id: 'duty-1', name: 'Duty Officer', permissions: { ...DEFAULT_PERMISSIONS, manageUsers: true } },
];
const roster: Apparatus[] = [
  { id: 'rig-e2', name: 'Engine 2', type: 'Engine' },
  { id: 'rig-r1', name: 'Rescue 1', type: 'Rescue' },
];
const ctx: PersonnelContext = { roles, roster, actorIsAdmin: true };

const HEADER = [...PERSONNEL_HEADERS];
const map = autoMapPersonnel(HEADER);
const validate = (rows: string[][], c: PersonnelContext = ctx) =>
  validatePersonnelRows([HEADER, ...rows], map, c);

describe('personnelCsv (#439 bulk add)', () => {
  it('auto-maps the canonical header and common synonyms', () => {
    expect(map.Name).toBe(0);
    expect(map.Role).toBe(7);
    const m2 = autoMapPersonnel(['Full Name', 'E-mail', 'Title', 'Rig', 'ID', 'Cell', 'Certifications', 'Role']);
    expect(m2.Name).toBe(0);
    expect(m2.Email).toBe(1);
    expect(m2.Rank).toBe(2);
    expect(m2.Apparatus).toBe(3);
    expect(m2.Badge).toBe(4);
    expect(m2.Phone).toBe(5);
    expect(m2.Certs).toBe(6);
  });

  it('resolves a full row: role + rig by name (case-insensitive), optionals passed through', () => {
    const r = validate([['Dana Kim', 'dkim@fd.example', 'Lieutenant', 'engine 2', '312', '914-555-0182', 'FF2, EMT-B', 'duty officer']]);
    expect(r.outcomes).toHaveLength(1);
    expect(r.rows[0]).toEqual({
      displayName: 'Dana Kim',
      email: 'dkim@fd.example',
      role: 'duty-1',
      rank: 'Lieutenant',
      apparatusId: 'rig-e2',
      badge: '312',
      phone: '914-555-0182',
      certifications: 'FF2, EMT-B',
    });
  });

  it('blank Role → Default; blank Apparatus → unassigned; blank optionals omitted', () => {
    const r = validate([['Dana Kim', 'dkim@fd.example', '', '', '', '', '', '']]);
    expect(r.rows[0]).toEqual({ displayName: 'Dana Kim', email: 'dkim@fd.example', role: 'default' });
  });

  it('flags missing name/email, bad email shape, unknown role, unknown rig — each with its field', () => {
    const r = validate([
      ['', 'a@b.example', '', '', '', '', '', ''],
      ['No Email', '', '', '', '', '', '', ''],
      ['Bad Email', 'not-an-email', '', '', '', '', '', ''],
      ['Bad Role', 'br@fd.example', '', '', '', '', '', 'Ghost Role'],
      ['Bad Rig', 'brig@fd.example', '', 'Ladder 9', '', '', '', ''],
    ]);
    const fields = r.outcomes.map((o) => o.error?.field);
    expect(fields).toEqual(['Name', 'Email', 'Email', 'Role', 'Apparatus']);
    expect(r.rows).toHaveLength(0);
  });

  it('a non-Admin importer cannot mint Admin rows (mirrors the server escalation guard)', () => {
    const r = validate([['Chief Alvarez', 'ca@fd.example', '', '', '', '', '', 'Admin']], { ...ctx, actorIsAdmin: false });
    expect(r.outcomes[0]?.error?.message).toMatch(/only an Admin/i);
    // an Admin importer CAN
    const ok = validate([['Chief Alvarez', 'ca@fd.example', '', '', '', '', '', 'Admin']]);
    expect(ok.rows[0]?.role).toBe('admin');
  });

  it('in-file duplicate emails flag every LATER occurrence (first row wins)', () => {
    const r = validate([
      ['Dana Kim', 'dkim@fd.example', '', '', '', '', '', ''],
      ['Dana K.', 'DKIM@fd.example', '', '', '', '', '', ''],
    ]);
    expect(r.rows).toHaveLength(1);
    expect(r.outcomes[1]?.error?.message).toMatch(/duplicate email — row 2/);
  });

  it('skips blank lines + the template sentinel row; the template round-trips clean', () => {
    const { records } = parseRecords(getPersonnelTemplateCSV());
    const r = validatePersonnelRows(records, autoMapPersonnel(records[0] ?? []), ctx);
    expect(r.outcomes).toHaveLength(0); // the example row is a sentinel, not an error
  });

  it('an unrecognizable header (neither Name nor Email mapped) fails once, loudly', () => {
    const r = validatePersonnelRows([['foo', 'bar'], ['x', 'y']], autoMapPersonnel(['foo', 'bar']), ctx);
    expect(r.warnings[0]).toMatch(/No recognizable header row/);
    expect(r.outcomes).toHaveLength(0);
  });

  it('caps overlong fields with the field named', () => {
    const r = validate([['x'.repeat(90), 'ok@fd.example', '', '', '', '', '', '']]);
    expect(r.outcomes[0]?.error?.field).toBe('Name');
    expect(r.outcomes[0]?.error?.message).toMatch(/max 80/);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildV4OrgsRules } from './rules';
import { PERMISSION_KEYS } from './department';

// L-11 drift gate — the permanent fix for v3's worst bug (a hand-edited rule
// that silently rejected every write for months). The committed rules file's
// /orgs block MUST equal what the generator produces from the Zod schemas; a
// field drift becomes THIS failure, not silent data loss. Regenerate with
// `npm run gen:rules`, then commit the file, to go green.
const rulesPath = fileURLToPath(new URL('../../../database.rules.json', import.meta.url));
const committed = JSON.parse(readFileSync(rulesPath, 'utf8'));

describe('database.rules.json — v4 /orgs block (L-11 drift gate)', () => {
  it('the committed /orgs block equals the generator output', () => {
    expect(committed.rules.orgs).toEqual(buildV4OrgsRules());
  });

  it('department creation is create-only and self-stamped (write-once founding)', () => {
    const w = committed.rules.orgs.$deptId['.write'];
    expect(w).toContain('!data.exists()');
    expect(w).toContain("newData.child('createdBy').val() === auth.uid");
  });

  it('a department is readable only by its own members', () => {
    expect(committed.rules.orgs.$deptId['.read']).toContain(
      "data.child('members').child(auth.uid).exists()",
    );
  });

  it('every permission key is a validated boolean under roles/$roleId/permissions', () => {
    const perms = committed.rules.orgs.$deptId.roles.$roleId.permissions;
    for (const k of PERMISSION_KEYS) {
      expect(perms[k], `permission ${k} missing from rules`).toBeDefined();
      expect(perms[k]['.validate']).toContain('isBoolean');
    }
    // the hasChildren list names exactly the Zod permission keys (catches add/remove)
    expect(perms['.validate']).toContain(PERMISSION_KEYS.map((k) => `'${k}'`).join(','));
  });

  it('a member requires role + displayName + joinedAt and rejects extra fields', () => {
    const member = committed.rules.orgs.$deptId.members.$uid;
    expect(member['.validate']).toBe("newData.hasChildren(['role','displayName','joinedAt'])");
    expect(member.$other['.validate']).toBe(false);
  });

  it('leaves v3 rules byte-for-byte untouched (the namespace-safety guard)', () => {
    expect(committed.rules.departments.$deptId.members.$uid['.validate']).toBe('newData.isBoolean()');
    expect(committed.rules.$other).toEqual({ '.read': false, '.write': false });
    // /orgs is a sibling of /departments, never nested inside it
    expect(committed.rules.departments.orgs).toBeUndefined();
  });
});

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

  it('a member can self-join only as their own uid, Default role, with an active code for THIS dept', () => {
    const w = committed.rules.orgs.$deptId.members.$uid['.write'];
    expect(w).toContain('$uid === auth.uid'); // only your own row
    expect(w).toContain('!data.exists()'); //    never overwrite an existing member
    expect(w).toContain("newData.child('role').val() === 'default'"); // no self-promote to Admin
    // viaCode must resolve to THIS dept and still be active (the anti-injection check)
    expect(w).toContain(
      "root.child('orgs').child('inviteCodes').child(newData.child('viaCode').val()).child('deptId').val() === $deptId",
    );
    expect(w).toContain(
      "root.child('orgs').child('inviteCodes').child(newData.child('viaCode').val()).child('active').val() === true",
    );
    // viaCode is an allowed (optional) member field — present, not in the required set
    expect(committed.rules.orgs.$deptId.members.$uid.viaCode['.validate']).toContain('isString');
  });

  it('an invite code is create-only by the dept founder and readable by any signed-in holder', () => {
    const code = committed.rules.orgs.inviteCodes.$code;
    expect(code['.read']).toBe('auth != null'); // know-the-code is the authorization; no enumeration
    expect(code['.write']).toContain('!data.exists()'); // create-only
    expect(code['.write']).toContain("newData.child('createdBy').val() === auth.uid"); // self-stamped
    // only for a dept the writer actually founded — no publishing codes into others' depts
    expect(code['.write']).toContain(
      "root.child('orgs').child(newData.child('deptId').val()).child('createdBy').val() === auth.uid",
    );
    expect(code['.validate']).toContain('deptName'); // carries the name a not-yet-member can't read
    expect(committed.rules.orgs.inviteCodes.$other).toBeUndefined(); // no stray parent rule => no enumeration
  });

  it('the event log is membership-gated, append-only, and validates the coarse envelope', () => {
    const event = committed.rules.orgs.$deptId.events.$opId.$eventId;
    // membership write gate (Alex 2026-06-23) — any member, looked up via root
    expect(event['.write']).toContain("root.child('orgs').child($deptId).child('members').child(auth.uid).exists()");
    // APPEND-ONLY: !data.exists() makes each event id write-once (no overwrite, no delete)
    expect(event['.write']).toContain('!data.exists()');
    // coarse envelope: identity/clock/actor children present, right primitive types.
    // `at` is required (reconcile sorts on it); `by` is NOT bound to auth.uid (device uid)
    expect(event['.validate']).toContain("newData.hasChildren(['id','opId','type','at','by'])");
    expect(event['.validate']).toContain("newData.child('at').isNumber()");
    expect(event['.write']).not.toContain("child('by').val() === auth.uid"); // by = device uid, not account
    // reads cascade from the dept node's .read; no own .read, no $other (coarse — extras pass)
    expect(event['.read']).toBeUndefined();
    expect(event.$other).toBeUndefined();
  });

  it('non-event state (inventory/apparatus/titles/checklists) is permission-gated (member→role→permission) + monotonic LWW', () => {
    const dept = committed.rules.orgs.$deptId;
    const writes = [
      dept.inventory.$itemId['.write'],
      dept.apparatus['.write'],
      dept.titles['.write'],
      dept.checklists['.write'],
    ];
    for (const w of writes) {
      // membership floor (any member of THIS dept)
      expect(w).toContain("root.child('orgs').child($deptId).child('members').child(auth.uid).exists()");
      // data-driven capability: read the member's roleId, index into roles/{id}/permissions/...
      expect(w).toContain("root.child('orgs').child($deptId).child('members').child(auth.uid).child('role').val()");
      expect(w).toContain("child('permissions')");
      expect(w).toContain('.val() === true');
      // no role NAMES in the STATE rule (ADR-017 invariant) — the capability is looked up, not hard-coded
      expect(w).not.toContain("'admin'");
      expect(w).not.toContain("'default'");
      // monotonic last-write-wins guard, >= so an idempotent re-push isn't wedged
      expect(w).toContain("newData.child('lastWriteAt').val() >= data.child('lastWriteAt').val()");
      expect(w).not.toContain('!data.exists() &&'); // NOT append-only — state is overwrite
    }
    // the capability MAPPING is the security-relevant part — a swapped key is a vuln
    expect(dept.inventory.$itemId['.write']).toContain("child('manageInventory')");
    expect(dept.apparatus['.write']).toContain("child('manageInventory')");
    expect(dept.titles['.write']).toContain("child('manageSettings')");
    expect(dept.checklists['.write']).toContain("child('manageSettings')");
    // validate requires the LWW clock as a number; inventory also keys on id (tombstone shape)
    expect(dept.inventory.$itemId['.validate']).toContain("newData.hasChildren(['id','lastWriteAt'])");
    expect(dept.apparatus['.validate']).toContain("newData.child('lastWriteAt').isNumber()");
    // the blob does NOT require `value` — RTDB drops an empty array/object, so an emptied
    // roster serializes to just { lastWriteAt }; requiring value would block that write
    expect(dept.apparatus['.validate']).not.toContain("'value'");
    // reads cascade from the dept node's .read — no own .read on the state subtrees
    expect(dept.inventory['.read']).toBeUndefined();
    expect(dept.apparatus['.read']).toBeUndefined();
  });

  it('member management is manageUsers-gated with a count-free >=1-Admin anti-lockout (#380)', () => {
    const w = committed.rules.orgs.$deptId.members.$uid['.write'];
    // the self-join path survives (a joiner still creates their own Default row)
    expect(w).toContain("newData.child('role').val() === 'default'");
    expect(w).toContain('$uid === auth.uid');
    // the admin-management path is manageUsers-gated (data-driven)
    expect(w).toContain("child('permissions').child('manageUsers').val() === true");
    // "an admin is losing admin" guard: currently admin, becoming non-admin OR deleted
    expect(w).toContain("data.child('role').val() === 'admin'");
    expect(w).toContain("newData.child('role').val() !== 'admin'");
    expect(w).toContain('!newData.exists()');
    // #381 — DEACTIVATING an admin also counts as "losing admin" (a revoke can't strand the dept)
    expect(w).toContain("newData.child('active').val() === false");
    // ...allowed only when the actor is a DIFFERENT admin → >=1 admin always remains
    expect(w).toContain('$uid !== auth.uid');
    expect(w).toContain("child(auth.uid).child('role').val() === 'admin'");
  });

  it('membership gating is active-aware — a revoked member (active:false) is denied (#381)', () => {
    const dept = committed.rules.orgs.$deptId;
    const ACTIVE = ".child('active').val() != false";
    // the dept READ + every member-gated WRITE require the member to be active (not revoked)
    expect(dept['.read']).toContain(`data.child('members').child(auth.uid)${ACTIVE}`);
    expect(dept.events.$opId.$eventId['.write']).toContain(ACTIVE);
    expect(dept.inventory.$itemId['.write']).toContain(ACTIVE);
    expect(dept.apparatus['.write']).toContain(ACTIVE);
    expect(dept.audit.$auditId['.write']).toContain(ACTIVE);
    expect(dept.members.$uid['.write']).toContain(ACTIVE); // the admin-manage actor must be active
    // `active` is an allowed optional boolean on the member; unknown fields still rejected
    expect(dept.members.$uid.active['.validate']).toContain('isBoolean');
    expect(dept.members.$uid.$other['.validate']).toBe(false);
  });

  it('the governance audit log is manageUsers-gated, append-only, and read-gated on the parent (#380/#381)', () => {
    const audit = committed.rules.orgs.$deptId.audit.$auditId;
    expect(audit['.write']).toContain("child('permissions').child('manageUsers').val() === true");
    expect(audit['.write']).toContain('!data.exists()'); // write-once — tamper-proof
    expect(audit['.validate']).toContain("newData.hasChildren(['id','type','at','by'])");
    // #381 — the Administrative view reads the WHOLE node, so the .read is on the PARENT
    // (not per-entry), gated active-member + manageUsers (the Incident view's IC/Operations
    // gate is client-side — an ICS position the rules can't see).
    expect(audit['.read']).toBeUndefined(); // no per-entry read; it cascades from the parent
    const parentRead = committed.rules.orgs.$deptId.audit['.read'];
    expect(parentRead).toContain("child('permissions').child('manageUsers').val() === true");
    expect(parentRead).toContain(".child('active').val() != false"); // active-aware (#381)
  });

  it('leaves v3 rules byte-for-byte untouched (the namespace-safety guard)', () => {
    expect(committed.rules.departments.$deptId.members.$uid['.validate']).toBe('newData.isBoolean()');
    expect(committed.rules.$other).toEqual({ '.read': false, '.write': false });
    // /orgs is a sibling of /departments, never nested inside it
    expect(committed.rules.departments.orgs).toBeUndefined();
  });
});

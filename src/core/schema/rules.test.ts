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

  it('a member may self-edit ONLY their own rank — no privilege escalation', () => {
    const w = committed.rules.orgs.$deptId.members.$uid['.write'];
    // the self-edit branch exists: editing an existing row (not create) for your own uid
    expect(w).toContain('$uid === auth.uid');
    expect(w).toContain('data.exists()');
    // a revoked member can't self-edit
    expect(w).toContain("data.child('active').val() != false");
    // every field EXCEPT rank is pinned to its prior value — member can't promote own role,
    // rename, or rewrite provenance; writing ANOTHER member's row fails on $uid === auth.uid
    expect(w).toContain("newData.child('role').val() === data.child('role').val()");
    expect(w).toContain("newData.child('displayName').val() === data.child('displayName').val()");
    expect(w).toContain("newData.child('joinedAt').val() === data.child('joinedAt').val()");
    expect(w).toContain("newData.child('active').val() === data.child('active').val()");
    // rank is the one mutable field — bounded to a string ≤80 by its leaf validate
    expect(committed.rules.orgs.$deptId.members.$uid.rank['.validate']).toBe(
      '!newData.exists() || (newData.isString() && newData.val().length <= 80)',
    );
  });

  it('an invite code is created only by the dept founder or a manageUsers admin, readable by any signed-in holder', () => {
    const code = committed.rules.orgs.inviteCodes.$code;
    expect(code['.read']).toBe('auth != null'); // know-the-code is the authorization; no enumeration
    expect(code['.write']).toContain('!data.exists()'); // the create branch is create-only
    expect(code['.write']).toContain("newData.child('createdBy').val() === auth.uid"); // self-stamped
    // for a dept the writer founded — or administers (#423: a non-founder admin can regenerate)
    expect(code['.write']).toContain(
      "root.child('orgs').child(newData.child('deptId').val()).child('createdBy').val() === auth.uid",
    );
    expect(code['.write']).toContain("child('permissions').child('manageUsers').val() === true");
    expect(code['.validate']).toContain('deptName'); // carries the name a not-yet-member can't read
    expect(committed.rules.orgs.inviteCodes.$other).toBeUndefined(); // no stray parent rule => no enumeration
  });

  it('an invite code can be revoked (active→false only, fields frozen) but never deleted or reactivated (#423)', () => {
    const w = committed.rules.orgs.inviteCodes.$code['.write'];
    // the revoke branch: an update on an existing code...
    expect(w).toContain('data.exists() && newData.exists()');
    // ...whose ONLY allowed transition is active → false (no reactivation branch exists)
    expect(w).toContain("newData.child('active').val() === false");
    expect(w).not.toContain("newData.child('active').val() === true &&"); // no re-arm path
    // every identity field is frozen to its prior value — a revoke can't re-point a code
    expect(w).toContain("newData.child('deptId').val() === data.child('deptId').val()");
    expect(w).toContain("newData.child('deptName').val() === data.child('deptName').val()");
    expect(w).toContain("newData.child('createdBy').val() === data.child('createdBy').val()");
    expect(w).toContain("newData.child('createdAt').val() === data.child('createdAt').val()");
    // deletes are impossible: BOTH branches require newData (create: hasChildren via
    // .validate + !data.exists(); revoke: newData.exists()) — a remove() matches neither
    expect(w).toContain(
      "root.child('orgs').child(data.child('deptId').val()).child('createdBy').val() === auth.uid",
    );
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
      dept.apparatusTypes['.write'],
      dept.deptPolicies['.write'],
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
    expect(dept.apparatusTypes['.write']).toContain("child('manageSettings')");
    expect(dept.deptPolicies['.write']).toContain("child('manageSettings')");
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

  it('promotion TO Admin requires an admin actor — no manageUsers escalation (#257 fold)', () => {
    const w = committed.rules.orgs.$deptId.members.$uid['.write'];
    // the gaining-admin guard: newData admin + data non-admin → actor must be admin
    expect(w).toContain("newData.child('role').val() === 'admin' && data.child('role').val() !== 'admin'");
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

  it('custom-role management is ADMIN-ONLY with the built-ins structurally protected (#418, J257-S4)', () => {
    const w = committed.rules.orgs.$deptId.roles.$roleId['.write'];
    // the write rule EXISTS — the pre-Phase-J audit H4 defect was its total absence
    // (default-deny killed the whole ADR-017 custom-role feature in production)
    expect(w).toBeDefined();
    // active membership is still the floor
    expect(w).toContain(".child('active').val() != false");
    // J257-S4 — the actor must hold the ADMIN ROLE ITSELF. Role AUTHORING is the
    // escalation path: a manageUsers holder could mint a custom role carrying all
    // eight permissions and self-assign it (adminGainingAdmin never fires — the new
    // role's id isn't the literal `admin` token), taking full back-office control
    // with no Admin ever approving it.
    expect(w).toContain(
      "root.child('orgs').child($deptId).child('members').child(auth.uid).child('role').val() === 'admin'",
    );
    // ...and the manageUsers path is GONE. This negative IS the J257-S4 fix: a
    // non-Admin manageUsers holder is denied role create / edit / delete. A positive
    // 'admin' assertion alone would still pass if the old permission gate survived
    // alongside it.
    expect(w).not.toContain('manageUsers');
    // the Admin role is fully immutable post-create (the anti-lockout floor)
    expect(w).toContain("$roleId !== 'admin'");
    // Default is editable but never deletable (every join lands on it)
    expect(w).toContain("( $roleId !== 'default' || newData.exists() )");
  });

  it('a member row can never be self-deleted by the client — the delete path MUST be the server callable (J257-S1)', () => {
    // This pins WHY `deleteOwnAccount` exists as a Cloud Function. A client
    // remove() on your own member row sets newData to null, so:
    //   · the self-edit branch fails every field-equality clause, and
    //   · the admin-manage branch requires `$uid !== auth.uid` for an admin
    //     losing admin, and manageUsers for anyone else.
    // If a future rule edit ever opened a client-side self-delete, the callable's
    // sole-Admin refusal would be bypassable — so the shape is asserted here.
    const w = committed.rules.orgs.$deptId.members.$uid['.write'];
    // the self-edit branch pins role/displayName/joinedAt to their PRIOR values;
    // against a null newData every one of those is false → no self-delete
    expect(w).toContain("newData.child('role').val() === data.child('role').val()");
    // the only branch that tolerates `!newData.exists()` is the admin-manage one,
    // and it demands a DIFFERENT active admin actor
    expect(w).toContain('!newData.exists()');
    expect(w).toContain('$uid !== auth.uid');
    // there is no self-delete branch: no clause pairs your own uid with a removal
    expect(w).not.toContain('$uid === auth.uid && !newData.exists()');
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

  it('legacy trees are locked down — v4-dead /departments denied, live side-channels hardened (#424)', () => {
    // /departments is v4-dead (v4 writes nothing there; v3 prod is paratech-c3ab4,
    // NOT this project) — pre-#424 its permissive v3 rules let any signed-in user
    // write unlimited junk. Now deny-all.
    expect(committed.rules.departments).toEqual({ '.read': false, '.write': false });
    // /feedback IS a live v4 write path (feedbackService) — write-once, typed,
    // capped, and NOT client-readable (pre-#424 any signed-in user read ALL feedback).
    expect(committed.rules.feedback['.read']).toBe(false);
    expect(committed.rules.feedback.$feedbackId['.write']).toBe('auth != null && !data.exists()');
    expect(committed.rules.feedback.$feedbackId['.validate']).toContain("matches(/^(bug|idea|other)$/)");
    expect(committed.rules.feedback.$feedbackId['.validate']).toContain('length <= 5000');
    // /diagnostics IS a live v4 write path (logSyncEvent) — write-once, no client read.
    expect(committed.rules.diagnostics['.read']).toBe(false);
    expect(committed.rules.diagnostics.sync.$logId['.write']).toBe('auth != null && !data.exists()');
    // the catch-all denies everything else
    expect(committed.rules.$other).toEqual({ '.read': false, '.write': false });
    // /orgs is a top-level sibling, never nested inside a legacy tree
    expect(committed.rules.departments.orgs).toBeUndefined();
  });

  // ---- J257-S5 — the two auth-only side channels are SHAPED and CAPPED ----
  // Both nodes were `auth != null` with no closed shape and (for diagnostics) no
  // type or size constraint at all, on a metered Blaze project: any signed-in
  // account could push multi-megabyte payloads under unbounded arbitrary keys.
  // These trees are HAND-MAINTAINED (gen-rules.ts splices only /orgs and preserves
  // everything else verbatim), so they get the same drift gate the generator gives
  // /orgs: the writer's key list is enumerated against the rule's named children.
  // The v3.8.2 incident is the reason — a validate rule that didn't match the
  // payload shape silently rejected every write for months.

  it('/feedback names exactly the fields feedbackService writes and rejects the rest (J257-S5)', () => {
    const node = committed.rules.feedback.$feedbackId;
    // the closed shape — unknown children are rejected outright
    expect(node.$other).toEqual({ '.validate': false });
    // every key feedbackService.submit() sends has a named validator; a writer that
    // adds a key without a rule fails HERE instead of PERMISSION_DENIED in the field
    const written = ['category', 'text', 'timestamp', 'deptId', 'deptName', 'appVersion', 'uid'];
    expect(Object.keys(node).filter((k) => !k.startsWith('.') && k !== '$other').sort()).toEqual(
      [...written].sort(),
    );
    // required trio is type-pinned
    expect(node.category['.validate']).toContain('isString');
    expect(node.text['.validate']).toContain('length <= 5000');
    expect(node.timestamp['.validate']).toBe('newData.isNumber()');
    // deptId/deptName are OPTIONAL: the writer sends `?? null` and RTDB DROPS a null
    // child, so a member with no department writes neither key. A required validator
    // here would silently kill feedback from exactly those users.
    for (const k of ['deptId', 'deptName', 'appVersion', 'uid']) {
      expect(node[k]['.validate'], `${k} must tolerate an absent child`).toContain(
        '!newData.exists() ||',
      );
    }
    // caps, pinned by number so a rule edit can't quietly widen them
    expect(node.deptId['.validate']).toContain('length <= 64');
    expect(node.deptName['.validate']).toContain('length <= 100');
    expect(node.appVersion['.validate']).toContain('length <= 40');
    // attributability: the stamped uid must BE the caller (identity.accountId is the
    // Firebase account uid — the same value /userDepts/$uid is gated on)
    expect(node.uid['.validate']).toContain("newData.val() === auth.uid");
  });

  it('/diagnostics/sync names exactly the SyncDiagnosticDetail keys and caps every one (J257-S5)', () => {
    const node = committed.rules.diagnostics.sync.$logId;
    expect(node.$other).toEqual({ '.validate': false });
    // ts + event are the envelope; the five optional keys ARE SyncDiagnosticDetail
    // (diagnostics.ts) — the closed TS type and this list must stay in lockstep
    const written = ['ts', 'event', 'deptId', 'error', 'reason', 'path', 'id'];
    expect(Object.keys(node).filter((k) => !k.startsWith('.') && k !== '$other').sort()).toEqual(
      [...written].sort(),
    );
    // the envelope is now TYPED (pre-fix it was bare hasChild — any value of any size)
    expect(node['.validate']).toContain("newData.child('ts').isNumber()");
    expect(node['.validate']).toContain("newData.child('event').isString()");
    // caps must equal diagnostics.ts's EVENT_CAP / DETAIL_CAPS, which CLAMP before the
    // write — a cap with no writer-side clamp converts "logged a long error" into
    // "logged nothing", losing the diagnostic exactly when it fires
    expect(node.event['.validate']).toContain('length <= 80'); // EVENT_CAP
    expect(node.deptId['.validate']).toContain('length <= 64');
    expect(node.error['.validate']).toContain('length <= 500');
    expect(node.reason['.validate']).toContain('length <= 500');
    expect(node.path['.validate']).toContain('length <= 200');
    expect(node.id['.validate']).toContain('length <= 128');
    // all five details are optional — logSyncEvent omits empty values by design
    for (const k of ['deptId', 'error', 'reason', 'path', 'id']) {
      expect(node[k]['.validate']).toContain('!newData.exists() ||');
    }
  });
});

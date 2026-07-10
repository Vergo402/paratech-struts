import { z } from 'zod';
import { Department, Member, Role, InviteCode, ADMIN_ROLE_ID, DEFAULT_ROLE_ID } from './department';

// core/schema — generate the v4 portion of database.rules.json from the SAME Zod
// schemas the client validates against (L-11, the permanent fix for v3's worst
// bug: a hand-edited rule that silently rejected every write for months). Edit a
// field in department.ts → `npm run gen:rules` → the drift test (rules.test.ts)
// fails until the committed file matches. Pure: no Firebase, no fs (the fs-side
// assembly + v3 freeze live in scripts/gen-rules.ts).
//
// NAMESPACE — all v4 data lives under /orgs, a purely additive sibling of v3's
// live /departments tree. v3 stores members as booleans; v4 stores member
// objects with a role. Same project, one rules file: v3 stays byte-for-byte
// untouched (scripts/gen-rules.ts copies it verbatim) and the drift test asserts
// it. See ADR-009 (shared project) + ADR-017 (the role model).
//
// SCOPE (this session) — only the rules an exercising client uses NOW: create a
// department + read it back (workflow 07). Deferred to their own features, each
// with its own exercising client (lesson 5: never ship an untested rule):
//   · the data-driven permission GATES on STATE writes (inventory/apparatus/titles/
//     checklists) → LANDED #380; the operations event log stays membership-gated (its
//     discriminated union can't be cracked by rules — per-event-type gating deferred).
//   · member-management writes (the manageUsers role-change path + the ≥1-Admin
//     anti-lockout) + the append-only audit log → RULES landed #380; the User Manager
//     UI that exercises them is P4 (#381 / ADR-017 #32).
//   · the invite-code cloud path + the join self-write → with workflow #232.
//   · the racing founding-Admin "claim" latch → with the v3→v4 claim banner.
// Until those land, those paths are default-deny (safe), not open.

// A node in the rules tree: a rule string/boolean, or a nested subtree.
type Rule = string | boolean;
export type RuleTree = { [key: string]: Rule | RuleTree };

// --- the closed Zod→.validate mapper -----------------------------------------
// Handles only the node kinds our department schemas use; throws on anything
// else so an unhandled Zod type is a loud build error, never silent-wrong rules.

function leafValidate(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodOptional) {
    // optional → the field may be absent, or must satisfy the inner rule.
    return `!newData.exists() || (${leafValidate(schema.unwrap() as z.ZodTypeAny)})`;
  }
  if (schema instanceof z.ZodString) {
    const parts = ['newData.isString()'];
    if (schema.minLength != null) parts.push(`newData.val().length >= ${schema.minLength}`);
    if (schema.maxLength != null) parts.push(`newData.val().length <= ${schema.maxLength}`);
    return parts.join(' && ');
  }
  if (schema instanceof z.ZodNumber) {
    const parts = ['newData.isNumber()'];
    if (schema.minValue != null) parts.push(`newData.val() >= ${schema.minValue}`);
    if (schema.maxValue != null) parts.push(`newData.val() <= ${schema.maxValue}`);
    return parts.join(' && ');
  }
  if (schema instanceof z.ZodBoolean) {
    return 'newData.isBoolean()';
  }
  throw new Error(`rules.ts: unsupported Zod leaf type ${schema.constructor.name}`);
}

/** A complete object: hasChildren(required) + per-field validate + reject extras. */
function objectRules(schema: z.ZodObject<z.ZodRawShape>): RuleTree {
  const shape = schema.shape;
  const required = Object.entries(shape)
    .filter(([, v]) => !(v instanceof z.ZodOptional))
    .map(([k]) => k);
  const node: RuleTree = {
    '.validate': `newData.hasChildren([${required.map((k) => `'${k}'`).join(',')}])`,
  };
  for (const [key, child] of Object.entries(shape)) {
    node[key] =
      child instanceof z.ZodObject
        ? objectRules(child as z.ZodObject<z.ZodRawShape>)
        : { '.validate': leafValidate(child as z.ZodTypeAny) };
  }
  node['$other'] = { '.validate': false }; // a complete shape — reject unknown fields
  return node;
}

// --- the /orgs block ----------------------------------------------------------
// Structural auth strings (hand-authored — they are authorization logic, not
// field validation, so they are not Zod-derived; they reference no role NAMES):
//   READ  — only a member of the department may read it.
//   WRITE — CREATE-ONLY: the dept node may be written only when it does not yet
//           exist AND the writer stamps themselves as createdBy. One atomic set
//           writes name/createdBy/createdAt + members/{uid}=admin + the two
//           built-in roles; the create-only grant cascades to that subtree, so
//           no per-child .write is needed. After creation the node exists → this
//           is false → children are default-deny until their feature adds a rule.
// Membership is ACTIVE-aware (#381 soft-revoke). A member row must exist AND not be
// flagged inactive: `active` is optional (ABSENT = active — every pre-#381 row and every
// fresh join), so the gate is `!= false` and only an explicit active:false (a revoked
// member) is denied. Centralized so READ + every member-gated WRITE share one definition.
// Two forms: `data`-relative for the dept node's own .read; root-relative for the writes
// nested under $deptId. CAUTION: NO literal { } (gen-rules.ts brace-matches the orgs block).
const MEMBER_DATA = "data.child('members').child(auth.uid)";
const MEMBER_ROOT = "root.child('orgs').child($deptId).child('members').child(auth.uid)";
const activeMemberData = `${MEMBER_DATA}.exists() && ${MEMBER_DATA}.child('active').val() != false`;
const activeMemberRoot = `${MEMBER_ROOT}.exists() && ${MEMBER_ROOT}.child('active').val() != false`;

const READ_MEMBER = 'auth != null && ' + activeMemberData;
const CREATE_ONLY = "auth != null && !data.exists() && newData.child('createdBy').val() === auth.uid";

// JOIN (workflow #232) — a signed-in user adds ONLY their own member row to an
// existing dept, and only:
//   · for their own uid, never overwriting an existing member (no stomping),
//   · as the DEFAULT role (the stable token, NOT a name — no self-promotion to
//     Admin; ADR-017),
//   · carrying a viaCode that resolves to THIS dept and is still active.
// The viaCode dereference is what proves the join used a real, founder-published
// code: without it a member could write into any department they could name.
const JOIN_SELF_WRITE = [
  'auth != null',
  '$uid === auth.uid',
  '!data.exists()',
  `newData.child('role').val() === '${DEFAULT_ROLE_ID}'`,
  "root.child('orgs').child('inviteCodes').child(newData.child('viaCode').val()).child('deptId').val() === $deptId",
  "root.child('orgs').child('inviteCodes').child(newData.child('viaCode').val()).child('active').val() === true",
].join(' && ');

// INVITE CODE (workflow #232, revocation #423) — the resolver entries at
// orgs/inviteCodes/{code} → {deptId, deptName, ...}. Two branches:
//   CREATE — publish a new code, self-stamped, only for a dept the writer founded
//     OR administers (an active manageUsers-holder; pre-#423 this was founder-only,
//     which would have blocked a non-founder admin's regenerate).
//   REVOKE — the ONLY allowed update is flipping active → false (kill a leaked or
//     rotated code); every other field is frozen to its prior value, and no branch
//     permits delete or reactivation — a dead code stays dead, auditably. Without
//     this branch codes were create-only: a leaked code granted irrevocable join
//     access (pre-Phase-J audit #423).
// The code nodes live under the $code wildcard (no $deptId in scope), so the
// member/permission lookups are parameterized on the deptId read from the code
// entry itself. CAUTION: NO literal { }.
const codeMember = (deptExpr: string): string =>
  `root.child('orgs').child(${deptExpr}).child('members').child(auth.uid)`;
const codeDeptAdmin = (deptExpr: string): string =>
  [
    `root.child('orgs').child(${deptExpr}).child('createdBy').val() === auth.uid`,
    `( ${codeMember(deptExpr)}.exists() && ${codeMember(deptExpr)}.child('active').val() != false && ` +
      `root.child('orgs').child(${deptExpr}).child('roles').child(${codeMember(deptExpr)}.child('role').val())` +
      `.child('permissions').child('manageUsers').val() === true )`,
  ].join(' || ');
const INVITE_CODE_CREATE = [
  'auth != null',
  '!data.exists()',
  'newData.child(\'createdBy\').val() === auth.uid',
  `( ${codeDeptAdmin("newData.child('deptId').val()")} )`,
].join(' && ');
const INVITE_CODE_REVOKE = [
  'auth != null',
  'data.exists()',
  'newData.exists()',
  "newData.child('active').val() === false",
  "newData.child('deptId').val() === data.child('deptId').val()",
  "newData.child('deptName').val() === data.child('deptName').val()",
  "newData.child('createdBy').val() === data.child('createdBy').val()",
  "newData.child('createdAt').val() === data.child('createdAt').val()",
  `( ${codeDeptAdmin("data.child('deptId').val()")} )`,
].join(' && ');
// A specific code is readable by any signed-in user — knowing the code IS the
// authorization (resolve code → dept). The inviteCodes PARENT has no read, so
// codes can't be enumerated; you can only read one you already hold.
const INVITE_CODE_READ = 'auth != null';

// EVENT (cloud-sync Increment 2) — the operations event log at
// /orgs/{deptId}/events/{opId}/{eventId}. Write gate = department MEMBERSHIP + APPEND-
// ONLY (Alex, 2026-06-23): any signed-in member may CREATE a new event, but `!data.exists()`
// makes each event id write-once — a member can neither overwrite a peer's event nor
// delete one (a delete sets newData=null, which `.validate` skips, so the immutability
// MUST live in `.write`). The log is the immutable, append-only source of truth + audit
// record (ADR-009); deletes/edits are modeled as NEW events, never RTDB removals. The
// app's on-screen permission gates remain the fine-grained control; this is the floor
// (stops non-members and other departments). One coarse rule covers the WHOLE event
// stream — Firebase rules don't crack the discriminated union, so per-event-type gating
// is deferred. Reads cascade from the dept node's READ_MEMBER (no .read needed here).
// CAUTION: rule strings must contain NO literal { } — gen-rules.ts brace-matches the
// orgs block; a literal brace would mis-slice the file (see scripts/gen-rules.ts).
const EVENT_WRITE = 'auth != null && ' + activeMemberRoot + ' && !data.exists()';
// Coarse envelope only — require the identity/clock/actor children with the right
// primitive types. NOT the per-type fields: the client FieldShoreEvent.safeParse
// (operationStore.doCommit) is the strict gate; the cloud is not the payload-integrity
// boundary. No $other:false either — unknown per-type fields pass and are stripped by
// the client Zod parse on read. `at` is REQUIRED because reconcile sorts on it (causal
// order). DO NOT bind `by` to auth.uid: `by` is the per-DEVICE uid (ADR-024), a different
// identity than the Firebase account auth.uid — binding them would reject every write.
const EVENT_ENVELOPE_VALIDATE =
  "newData.hasChildren(['id','opId','type','at','by']) && " +
  "newData.child('id').isString() && newData.child('opId').isString() && " +
  "newData.child('type').isString() && newData.child('at').isNumber()";

// STATE (cloud-sync Increment 3) — non-event department state at /orgs/{deptId}/
// {inventory|apparatus|titles|checklists}. Unlike the append-only event log, STATE is
// OVERWRITE (last-write-wins): the write gate is department MEMBERSHIP + a MONOTONIC
// lastWriteAt guard, so a stale write (older stamp) is rejected and a late-arriving
// offline edit can't clobber a newer one. `>=` (NOT `>`) so an idempotent re-push of an
// unchanged record (first-merge backlog) is never rejected and wedged. PERMISSION-GATED
// (#380): membership is the floor, and the write additionally requires the member's role to
// carry the matching capability (inventory/apparatus → manageInventory; titles/checklists →
// manageSettings) via the data-driven member→role→permission lookup. The cloud is now the
// fine-grained gate; the UI's usePermissions hook is the friendly front that hides what a
// member can't do. Reads cascade from the dept node's READ_MEMBER. CAUTION: NO literal { }
// (gen-rules.ts brace-matches the orgs block).
const STATE_MEMBER = 'auth != null && ' + activeMemberRoot;
const LWW_MONOTONIC =
  "(!data.exists() || newData.child('lastWriteAt').val() >= data.child('lastWriteAt').val())";

// Data-driven permission gate (ADR-017 §Enforcement, #380). Read THIS member's roleId from
// their member row, index it straight into roles/{roleId}/permissions/{permKey}, require true.
// NO role NAME appears — the roleId is read from the data, so one rule covers the built-in
// Admin/Default AND any department-defined custom role (the exact ADR-017 enforcement chain).
const memberRole = "root.child('orgs').child($deptId).child('members').child(auth.uid).child('role').val()";
const permissionGate = (permKey: string): string =>
  `root.child('orgs').child($deptId).child('roles').child(${memberRole}).child('permissions').child('${permKey}').val() === true`;
// A STATE write = membership + the looked-up capability + the monotonic LWW clock.
const stateWrite = (permKey: string): string =>
  STATE_MEMBER + ' && ' + permissionGate(permKey) + ' && ' + LWW_MONOTONIC;
// Coarse envelope: require the LWW clock (also what the guard reads) as a number. Inventory
// also requires `id` (its key echo / the tombstone shape). Per-field validation stays
// client-side (Zod on read), like the event envelope. No $other:false (extras pass).
// NOTE: the blob does NOT require `value` — RTDB drops an empty array/object, so an emptied
// roster/titles/overrides serializes to just { lastWriteAt }. Requiring `value` would make
// "I deleted my last rig" un-syncable (permission_denied). The reader Zod-`.catch`es an
// absent value to empty, so this is safe.
const STATE_BLOB_VALIDATE = "newData.hasChildren(['lastWriteAt']) && newData.child('lastWriteAt').isNumber()";
const INVENTORY_ROW_VALIDATE =
  "newData.hasChildren(['id','lastWriteAt']) && newData.child('lastWriteAt').isNumber()";

// MEMBER MANAGEMENT (#380 anti-lockout + #381 soft-revoke) — beyond the create-only
// self-join (JOIN_SELF_WRITE), an ACTIVE manageUsers-holder may change, revoke, or
// reactivate OTHER members. The ≥1-Admin guarantee is COUNT-FREE (RTDB can't count
// children; a cooperative counter is bypassable): an admin can only LOSE admin by ANOTHER
// admin's action, so at least one admin always remains and the LAST admin can never be
// removed. "Losing admin" = currently admin AND becoming non-admin, deleted, OR DEACTIVATED
// (#381 — a revoke must not strand the dept any more than a demote); that case additionally
// requires the actor to be a DIFFERENT admin — which also closes the hole where a custom
// role granted manageUsers (but not the admin role) could otherwise strand the dept. Uses
// the ADMIN_ROLE_ID stable token structurally (same precedent as JOIN_SELF_WRITE's
// DEFAULT_ROLE_ID), NOT a role NAME. The "disabled-with-reason" affordance lives in the
// User Manager UI; this is the rule floor. CAUTION: NO literal { }.
const actorIsMember = activeMemberRoot; // active-aware (#381): a revoked admin can't manage
const actorIsAdmin = `${memberRole} === '${ADMIN_ROLE_ID}'`;
const adminLosingAdmin =
  `data.child('role').val() === '${ADMIN_ROLE_ID}' && ` +
  `(!newData.exists() || newData.child('role').val() !== '${ADMIN_ROLE_ID}' || newData.child('active').val() === false)`;
const ADMIN_MANAGE = [
  'auth != null',
  actorIsMember,
  permissionGate('manageUsers'),
  `( !(${adminLosingAdmin}) || ( ${actorIsAdmin} && $uid !== auth.uid ) )`,
].join(' && ');

// ROLE MANAGEMENT (#418, pre-Phase-J audit H4) — custom-role create/edit/delete at
// /orgs/{deptId}/roles/{roleId}. The generator emitted only .validate here, so the
// whole ADR-017 custom-role feature was default-deny in production (createRole/
// editRole/deleteRole all PERMISSION_DENIED; deleteRole half-applied — holders
// reassigned, role survived). Gate = active membership + manageUsers (the same
// axis as ADMIN_MANAGE; "Manage users & roles" is one permission key), with the
// built-ins protected STRUCTURALLY by their stable id tokens:
//   · the Admin role is fully immutable post-create (its fixed all-true
//     permissions are the anti-lockout floor — an editable Admin could be
//     hollowed out into a lockout),
//   · the Default role is editable (ADR-017: departments tune what a fresh
//     joiner can do) but never deletable (JOIN_SELF_WRITE hard-codes it as the
//     landing role; deleting it would break every future join).
// Delete-protection MUST live in .write — a remove() sets newData to null and
// .validate is skipped entirely. Dept creation is unaffected: the create-only
// dept grant cascades to this subtree at founding (a child .write only ADDS
// grants). CAUTION: NO literal { }.
const ROLE_MANAGE = [
  'auth != null',
  actorIsMember,
  permissionGate('manageUsers'),
  `$roleId !== '${ADMIN_ROLE_ID}'`,
  `( $roleId !== '${DEFAULT_ROLE_ID}' || newData.exists() )`,
].join(' && ');

// SELF-EDIT RANK (#321 P5 inc3) — the ONE narrow exception to "member rows are write-once on
// join, admin-only after": a member may edit ONLY their own `rank` (free-text title). NO
// privilege escalation — every other field must equal its prior value, so role/displayName/
// joinedAt/viaCode/active are all immutable on this branch; `rank` is the only thing free to
// change (still bounded by its leaf `.validate`, ≤80 chars). `data.exists()` = edit not create;
// a revoked member (active === false) is locked out. An absent optional field reads as null on
// both sides, so the equality holds for rows that never carried viaCode/active. CAUTION: NO
// literal { }.
const SELF_EDIT_RANK = [
  'auth != null',
  '$uid === auth.uid',
  'data.exists()',
  "data.child('active').val() != false",
  "newData.child('role').val() === data.child('role').val()",
  "newData.child('displayName').val() === data.child('displayName').val()",
  "newData.child('joinedAt').val() === data.child('joinedAt').val()",
  "newData.child('viaCode').val() === data.child('viaCode').val()",
  "newData.child('active').val() === data.child('active').val()",
].join(' && ');

// AUDIT LOG (#380 write, #381 read) — governance actions (role create/edit/delete, assign/
// promote/revoke) at /orgs/{deptId}/audit/{auditId}. Append-only + manageUsers-gated:
// !data.exists() makes each entry write-once (no edit, no delete) — tamper-proof. The P4
// Audit Log screen's Administrative view reads the WHOLE node, so the .read sits on the
// audit PARENT (below), gated active-member + manageUsers — the same axis as the write. The
// Incident view reads the EVENT log instead (member-readable via the dept .read), gated to
// IC/Operations CLIENT-side (an ICS position the rules can't see). Coarse envelope only
// (id/type/at/by), like the event log; the per-entry schema stays client-side. CAUTION: NO
// literal { }.
const AUDIT_WRITE =
  'auth != null && ' + actorIsMember + ' && ' + permissionGate('manageUsers') + ' && !data.exists()';
const AUDIT_READ = 'auth != null && ' + actorIsMember + ' && ' + permissionGate('manageUsers');
const AUDIT_VALIDATE =
  "newData.hasChildren(['id','type','at','by']) && newData.child('id').isString() && " +
  "newData.child('type').isString() && newData.child('at').isNumber()";

/** The `orgs` value for database.rules.json. Pure — same output every run. */
export function buildV4OrgsRules(): RuleTree {
  const deptFields = Department.omit({ id: true }).shape; // name/createdBy/createdAt (id is the key)
  const RoleNode = Role.omit({ id: true }); //               name/builtIn?/permissions (id is the key)

  const deptNode: RuleTree = {
    '.read': READ_MEMBER,
    '.write': CREATE_ONLY,
  };
  for (const [key, child] of Object.entries(deptFields)) {
    deptNode[key] = { '.validate': leafValidate(child as z.ZodTypeAny) };
  }
  const memberNode = objectRules(Member);
  // joiners self-write (create-only, Default); manageUsers-holders manage OTHERS, with the
  // count-free ≥1-Admin anti-lockout. Founder's own row writes via the dept create-cascade.
  memberNode['.write'] = `(${JOIN_SELF_WRITE}) || (${SELF_EDIT_RANK}) || (${ADMIN_MANAGE})`;
  deptNode['members'] = { $uid: memberNode };
  // manageUsers-holders manage custom roles; Admin immutable, Default undeletable (#418).
  const roleNode = objectRules(RoleNode);
  roleNode['.write'] = ROLE_MANAGE;
  deptNode['roles'] = { $roleId: roleNode };

  // The operations event log — hand-authored (membership gate + coarse envelope, NOT
  // Zod-derived: objectRules can't express the FieldShoreEvent discriminated union).
  // Reads cascade from the dept node's .read.
  deptNode['events'] = {
    $opId: { $eventId: { '.write': EVENT_WRITE, '.validate': EVENT_ENVELOPE_VALIDATE } },
  };

  // Non-event STATE (cloud-sync Increment 3, last-write-wins) — membership + monotonic
  // lastWriteAt guard. Inventory is per-row (key = itemId; a live row or a tombstone);
  // apparatus/titles/checklists are whole { value, lastWriteAt } blobs. Reads cascade
  // from the dept node's .read.
  deptNode['inventory'] = { $itemId: { '.write': stateWrite('manageInventory'), '.validate': INVENTORY_ROW_VALIDATE } };
  deptNode['apparatus'] = { '.write': stateWrite('manageInventory'), '.validate': STATE_BLOB_VALIDATE };
  deptNode['titles'] = { '.write': stateWrite('manageSettings'), '.validate': STATE_BLOB_VALIDATE };
  deptNode['checklists'] = { '.write': stateWrite('manageSettings'), '.validate': STATE_BLOB_VALIDATE };
  deptNode['apparatusTypes'] = { '.write': stateWrite('manageSettings'), '.validate': STATE_BLOB_VALIDATE };
  deptNode['deptPolicies'] = { '.write': stateWrite('manageSettings'), '.validate': STATE_BLOB_VALIDATE };

  // The append-only governance audit log (#380 write, #381 read) — write-once per entry;
  // the parent .read is manageUsers-gated for the Audit Log Administrative view. (The
  // Incident view reads the event log, gated to IC/Operations client-side.)
  deptNode['audit'] = { '.read': AUDIT_READ, $auditId: { '.write': AUDIT_WRITE, '.validate': AUDIT_VALIDATE } };

  // The invite-code resolver — a sibling of $deptId under /orgs (a named child
  // alongside the wildcard; RTDB applies the named rules to `inviteCodes` and
  // $deptId to every other key). objectRules gives the InviteCode .validate +
  // extra-field rejection; the read/write authz is layered on top.
  const codeNode = objectRules(InviteCode);
  codeNode['.read'] = INVITE_CODE_READ;
  codeNode['.write'] = `(${INVITE_CODE_CREATE}) || (${INVITE_CODE_REVOKE})`;

  return { $deptId: deptNode, inviteCodes: { $code: codeNode } };
}

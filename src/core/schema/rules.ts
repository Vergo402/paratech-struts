import { z } from 'zod';
import { Department, Member, Role, InviteCode, DEFAULT_ROLE_ID } from './department';

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
//   · the data-driven permission GATES (operations/inventory writes) → with the
//     operations event-log sync (Engine A) and Inventory.
//   · member management writes → with the User Manager (ADR-017 #32).
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
const READ_MEMBER = "auth != null && data.child('members').child(auth.uid).exists()";
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

// INVITE CODE (workflow #232) — the founder publishes one resolver entry per code
// (orgs/inviteCodes/{code} → {deptId, deptName, ...}). Create-only, self-stamped,
// and ONLY for a dept the writer actually founded (root createdBy === auth.uid) —
// so no one can publish a code that injects members into someone else's dept.
const INVITE_CODE_CREATE = [
  'auth != null',
  '!data.exists()',
  'newData.child(\'createdBy\').val() === auth.uid',
  "root.child('orgs').child(newData.child('deptId').val()).child('createdBy').val() === auth.uid",
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
const EVENT_WRITE =
  "auth != null && root.child('orgs').child($deptId).child('members').child(auth.uid).exists() && !data.exists()";
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
  memberNode['.write'] = JOIN_SELF_WRITE; // founder writes via the dept create-cascade; joiners via this
  deptNode['members'] = { $uid: memberNode };
  deptNode['roles'] = { $roleId: objectRules(RoleNode) };

  // The operations event log — hand-authored (membership gate + coarse envelope, NOT
  // Zod-derived: objectRules can't express the FieldShoreEvent discriminated union).
  // Reads cascade from the dept node's .read.
  deptNode['events'] = {
    $opId: { $eventId: { '.write': EVENT_WRITE, '.validate': EVENT_ENVELOPE_VALIDATE } },
  };

  // The invite-code resolver — a sibling of $deptId under /orgs (a named child
  // alongside the wildcard; RTDB applies the named rules to `inviteCodes` and
  // $deptId to every other key). objectRules gives the InviteCode .validate +
  // extra-field rejection; the read/write authz is layered on top.
  const codeNode = objectRules(InviteCode);
  codeNode['.read'] = INVITE_CODE_READ;
  codeNode['.write'] = INVITE_CODE_CREATE;

  return { $deptId: deptNode, inviteCodes: { $code: codeNode } };
}

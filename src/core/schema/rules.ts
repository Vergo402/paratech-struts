import { z } from 'zod';
import { Department, Member, Role } from './department';

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
  deptNode['members'] = { $uid: objectRules(Member) };
  deptNode['roles'] = { $roleId: objectRules(RoleNode) };

  return { $deptId: deptNode };
}

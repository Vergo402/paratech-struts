import { z } from 'zod';

// core/schema — department / identity / RBAC state (ADR-017). UNLIKE operations
// (the event log under events/{opId}), departments are PLAIN RTDB state: set /
// update, not events. This file is the SINGLE source for BOTH the client-side
// validation AND the generated database.rules.json (.validate) — the L-11
// permanent fix for v3's worst bug (a hand-edited rule that silently rejected
// every write for months). Edit a field here → regenerate the rules (npm run
// gen:rules) → the drift test (rules.test.ts) fails until the committed file
// matches. All v4 data lives under the /orgs namespace (v3's /departments tree
// is left byte-for-byte untouched — the two apps share one project + rules file).

// The ~8 back-office permission toggles (ADR-017 §"Back-office permission
// taxonomy"). Declaration order IS canonical; PERMISSION_KEYS exposes it as the
// ordered tuple the rules generator iterates so the .validate, the per-capability
// gates, and this schema can never drift apart. The fireground actions
// (deploy / cut / secure / return) are NOT here — they stay ICS-position-gated
// (ADR-008); a department role gates back-office only.
export const Permissions = z.object({
  read: z.boolean(), //            1. Read department data
  runFieldWork: z.boolean(), //    2. Run field work in operations you're part of   (Default = 1+2)
  manageOperations: z.boolean(), // 3. Create & end operations
  manageInventory: z.boolean(), //  4. Manage inventory & apparatus
  manageRoster: z.boolean(), //     5. Manage roster / accountability
  manageSettings: z.boolean(), //   6. Manage department settings
  manageUsers: z.boolean(), //      7. Manage users & roles            (Admin)
  manageData: z.boolean(), //       8. Export / delete department data (Admin)
});
export type Permissions = z.infer<typeof Permissions>;

/** The 8 permission keys in canonical (declaration) order. */
export const PERMISSION_KEYS = Object.keys(Permissions.shape) as (keyof Permissions)[];

// The two built-in role IDs are STABLE TOKENS (not random) so the rules + the
// anti-lockout guard can reference "the Admin role" structurally WITHOUT
// hard-coding a role NAME (ADR-017: no role names in the rules). The display
// .name is still data and is department-editable for Default; Admin's is fixed.
export const ADMIN_ROLE_ID = 'admin';
export const DEFAULT_ROLE_ID = 'default';

export const Role = z.object({
  id: z.string().min(1), //          the RTDB key; built-ins use the tokens above, custom roles use newId()
  name: z.string().min(1).max(60), // display name (Default editable; Admin fixed)
  builtIn: z.boolean().optional(), // true for admin + default; absent on custom
  permissions: Permissions,
});
export type Role = z.infer<typeof Role>;

export const Member = z.object({
  role: z.string().min(1), //        a roleId present under roles/ (the rules check existence)
  displayName: z.string().min(1).max(80),
  joinedAt: z.number().int().nonnegative(),
  // Provenance of a JOIN (workflow #232): the invite code the member joined with.
  // Absent on a founding Admin (they created the dept, not joined). The join
  // self-write rule dereferences it (orgs/inviteCodes/{viaCode}) to prove the
  // join used a real, active code for THIS dept — so a member can only add
  // themselves with a valid code, never write into an arbitrary department.
  viaCode: z.string().optional(),
});
export type Member = z.infer<typeof Member>;

export const Department = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100), // matches the v3 dept-name length ceiling
  createdBy: z.string().min(1), //    founding uid (audit only — NOT the authority key; see rules)
  createdAt: z.number().int().nonnegative(),
});
export type Department = z.infer<typeof Department>;

// ADR-022 — invite codes are MULTI-USE, revocable, regenerable (NOT one-time /
// 24h; a one-time code could never onboard a 40-person dept across three
// shifts). Resolver path /orgs/inviteCodes/{code} → deptId. Regenerate = flip
// the old one's active:false and mint a new code. The unambiguous-glyph format
// (no 0/O, 1/l) is a client-minting concern, not a schema constraint.
export const InviteCode = z.object({
  deptId: z.string().min(1),
  // Carried on the code so a not-yet-member can resolve the department NAME from
  // the code alone — the dept node itself is member-read-gated (the joiner isn't a
  // member yet). Set by the founder when the code is published; the founder-only
  // code-write rule keeps this from being spoofed.
  deptName: z.string().min(1).max(100),
  createdBy: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  active: z.boolean(),
});
export type InviteCode = z.infer<typeof InviteCode>;

// The two built-in roles a freshly-created department gets (ADR-017 §Decision 2).
// The client writes BOTH at create time so the members→role lookup target always
// exists. Admin = all 8; Default = read + run-field-work only.
export const ADMIN_PERMISSIONS: Permissions = {
  read: true,
  runFieldWork: true,
  manageOperations: true,
  manageInventory: true,
  manageRoster: true,
  manageSettings: true,
  manageUsers: true,
  manageData: true,
};
export const DEFAULT_PERMISSIONS: Permissions = {
  read: true,
  runFieldWork: true,
  manageOperations: false,
  manageInventory: false,
  manageRoster: false,
  manageSettings: false,
  manageUsers: false,
  manageData: false,
};

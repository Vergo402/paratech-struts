# FieldShore v4 Autonomous Audit — 2026-07-01

Branch: `v4-redesign` · Scope: `src/**` only · All changes uncommitted (safe-fix lane) · v3 root app out of scope.

## Baseline

- `npm test` — **1110 tests pass** (132 files), 0 failures.
- `npm run typecheck` — clean.
- `npm run lint` — **1 pre-existing error** (finding B-1 below). Consequence for this audit: the safe-fix lane's "lint passes afterward" gate is interpreted as "no NEW lint errors," since the baseline is already red.

---

## Pass A — Safety-critical correctness

**Verdict: no Critical or High findings.** Every checked invariant holds and is pinned by tests.

### Verified-correct (what was checked and why it passes)

- **Conservative-floor row selection** — `src/core/load/engine.ts:88-93`: a measurement between two table rows returns the **longer (upper) row's capacity**, which under-reports and never over-reports (capacity falls with length; linear interpolation over-reports for the convex 1/L² buckling curve). Pinned by `engine.test.ts` at the exact historical bug points: ACME 130″ → 3932 (the 132″ row; interpolation would read ~4595) and LongShore 150″ → 7000 (the 156″ row; interpolation ~8250). ⚠️ Note: the audit instruction's parenthetical ("must use the shorter/higher-capacity row") states the **anti-conservative** direction — the code, its comments, and the pinned tests all agree on the safe direction (longer/lower-capacity row). Same loose phrasing exists in CLAUDE.md's v3.7.2 note; the code is right.
- **LongShore unrated zone** — `engine.ts:213`: `capacity <= 0 && system === 'LongShore' && searchLength > 192` → surfaced as a non-deployable-by-default warning combo requiring explicit acknowledgment; `deployVerdict` + the store pre-flight (`operationStore.ts:176`) reject an unrated deploy without a recorded acknowledgment.
- **≤4-strut boundary** — `engine.ts:219-234`: `recommendedQty = ceil(load/capacity)`; exactly 4 is allowed, >4 is rejected and tracked; the NEW-3 exceeds-capacity informational warning fires only when no valid combo exists. The store pre-flight (`operationStore.ts:175`) independently rejects an over-capacity deploy.
- **⅛″ floor direction** — `engine.ts:118`, `reducer.ts:100`, `reducer.ts:126`: all three use `Math.floor(x*8)/8` — rounds DOWN (short is absorbed by the wedge; long is the hazard). Deduction is the exact component sum with a single final floor (no double-rounding).
- **Cut length** — `reducer.ts:124-127`: measurement − 2×shore-type lumber − 1.5″ wedge (`WEDGE_DEDUCTION = 1.5`, `plates.ts:83`), NO plates, floored to ⅛″. `CUT_LUMBER` (4×4 T-Shore/Double-T, 6×6 3-Post) is an exhaustive `Record<ShoreTypeId, WoodSizeId>`, so a new shore type without a cut-lumber entry is a compile error. Correctly decoupled from the strut-sizing deduction (§7 known-intentional).
- **Deploy/return atomicity** — `operationStore.ts:180-186, 202-208, 223-238`: every tracked component's stock move and the event append share ONE Dexie `rw` transaction; `applyDeployTxn` throws on missing node or `available <= 0` (over-claim guard) which aborts the whole transaction — no event, no partial stock move. `applyReturnTxn` clamps `available` to `quantity` (no over-increment) and restores each component to its own row/rig (the BOM carries per-component `inventoryId`). Commits are serialized through one promise chain, so two near-simultaneous deploys can't both pass the Pending pre-flight.
- **No silent untracked deploys** — `DeployResolution.tsx:183,208`: a piece with no `inventoryId` and no explicit off-book decision sets `unresolved`, which disables Confirm; the three ways out (quick-add / off-book / drop-plate) are all explicit. `assembleBom` (`bom.ts:72-75`) tracks per-row claims within one assembly so same-plate-both-ends draws two distinct units.
- **Event-owned vs LWW split** — `stateSync.ts:25-41`: the cloud inventory row type is `Omit<InventoryItem, 'available'>` — `available` (event-owned) is structurally excluded from the last-write-wins path; peers recompute it from the event log.
- **First-snapshot merge** — `eventListener.ts:77-86`: two-way merge; local events absent from the cloud are re-enqueued and flushed UP (covers the reload-with-unsent-offline-work case, since the upload queue is in-memory only), cloud events reconcile DOWN through the L-7 guard + the single commit path. An empty first snapshot is "push everything up," never a delete.

### Findings

**A-1 · Low · `src/ui/operations/DeployResolution.tsx:71-80` · Manual source re-pointing collapses a rig's split stock rows, which can false-block a satisfiable deploy.**
`sourceOptions` dedups by apparatus, keeping only the FIRST matching row's `inventoryId` while summing `available` across rows. If one rig stocks the same item as two rows (e.g. two rows of the same plate, each `available: 1`) and the operator manually points two BOM pieces at that rig, both pieces get the same row id; the over-claim guard (line 199-203) then compares 2 claims against that single row's `available: 1` and blocks Confirm — even though the rig physically has 2 units. Failure direction is conservative (never over-claims stock; auto-sourcing via `assembleBom` distributes across split rows correctly) and the precondition (duplicate rows for the same catalog item on one rig) is rare given upsert-by-ID imports. Report-only; a fix would allocate distinct row ids per claim in `sourceOptions`/`setSource`, mirroring `assembleBom`'s `claimed` map. Confidence: high that the behavior exists, low that it matters in practice.

**A-2 · Low (informational) · `src/data/sync/syncService.ts:115-136` · A first-merge backlog event that races its own prior upload could wedge the queue in "retrying" until reload.**
`flush()` uses a create-only set; a failed upload stays queued forever (by design, best-effort). The thin race: an event uploaded just before a reload whose write lands in the cloud after the post-reload first snapshot was taken would be re-enqueued by `firstMerge` and then permanently rejected by the append-only rule, leaving the sync banner stuck on "couldn't sync, retrying" until the next reload. No data loss or divergence (the event is durably in both the local log and the cloud); purely a stale banner. Confidence: low (needs a narrow timing window); report-only.

---

## Pass B — Security

### Verified-clean

- **XSS**: zero `dangerouslySetInnerHTML` / `innerHTML` / `insertAdjacentHTML` / `document.write` in `src/`. The only dynamic `src=` interpolation is `DeductionPicker.tsx:43` (`/plates/${id}.jpg`) where `id` is a catalog plate id, not user data. React text-node escaping covers everything else. No real sinks.
- **Secrets**: no private keys, service-account JSON, or credential literals in `src/`. Firebase web config literals are present and public-by-design (documented platform fact, not flagged). `password` hits are all auth-form UI state.
- **Dependencies**: all 18 runtime + 22 dev packages in `package.json` exist on the npm registry (HTTP 200 each) — no phantom/typo-squat entries. `npm audit` is not in the allowed-command list, so advisory scanning was limited to registry existence + reviewer knowledge; no known-critical advisory recognized for these packages at the pinned ranges. Report-only.
- **Rules — verified-correct highlights** (`database.rules.json`, read-only; confirmed in-sync with its generator `src/core/schema/rules.ts` for everything below): org reads are active-member-gated; event log is append-only (`!data.exists()`) and membership-gated; inventory/apparatus/titles/checklists/apparatusTypes/deptPolicies writes are capability-gated (manageInventory / manageSettings) with the monotonic `lastWriteAt >=` LWW clock; audit log is write-once + manageUsers-gated both directions; the count-free ≥1-Admin anti-lockout holds (an admin can lose admin only by a *different* admin's action); self-join is invite-code-dereferenced, create-only, Default-role-pinned; the self-edit branch pins every member field except `rank`; invite codes are 8 crypto-random chars from a 32-glyph alphabet (~2⁴⁰) and not enumerable (read rule sits on `$code`, not the parent). `event.by` is correctly NOT bound to `auth.uid` (documented schema fact).

### Findings

**B-1 · Medium (baseline lint error) · `src/ui/settings/FeedbackSheet.tsx:5` · Layering violation: ui/* imports `@data/feedback` directly, breaking invariant 3 (ui reaches data only through ui/hooks) — the repo's only lint failure.**
Failure scenario: none at runtime today (it's a type-only import), but the red lint baseline masks future violations and breaks any CI gate on lint. Proposed fix (3 files, exceeds the safe-fix lane's single-file gate → not applied):

```diff
--- a/src/ui/hooks/useFeedback.ts
+++ b/src/ui/hooks/useFeedback.ts
@@ -1,4 +1,5 @@
 import { feedbackService, type FeedbackInput, type FeedbackResult } from '@data/feedback';
+export type { FeedbackCategory } from '@data/feedback';
--- a/src/ui/hooks/index.ts
+++ b/src/ui/hooks/index.ts
@@ -36 +36 @@
-export { useFeedback, type FeedbackApi } from './useFeedback';
+export { useFeedback, type FeedbackApi, type FeedbackCategory } from './useFeedback';
--- a/src/ui/settings/FeedbackSheet.tsx
+++ b/src/ui/settings/FeedbackSheet.tsx
@@ -4,5 +4,4 @@
-import { useFeedback, type FeedbackApi } from '@ui/hooks';
-import type { FeedbackCategory } from '@data/feedback';
+import { useFeedback, type FeedbackApi, type FeedbackCategory } from '@ui/hooks';
```
Confidence: high.

**B-2 · High · `database.rules.json` (`orgs/$deptId/roles` — no `.write` rule) · The shipped role editor (create/edit/delete custom roles) is denied by the database rules: every post-creation write to `orgs/{deptId}/roles/{roleId}` fails PERMISSION_DENIED.**
The generator (`src/core/schema/rules.ts:276`) emits `deptNode['roles'] = { $roleId: objectRules(RoleNode) }` — validation only, no `.write`. The only write grant covering the roles subtree is the dept-node CREATE_ONLY rule (`!data.exists()`), which is false for every existing department. Yet `departmentService.createRole/editRole/deleteRole` (`src/data/dept/departmentService.ts:514,537,564`) write that path directly, and they are fully wired into the shipped User Manager UI (`src/ui/admin/UserManagerScreen.tsx:277,332` via `useUserManager`). The generator's own comment states the contract: "children are default-deny **until their feature adds a rule**" — the role-editor feature never added one.
Failure scenario: an Admin opens User Manager → creates or edits a role → the RTDB set/update is rejected → inline error; no role changes are possible in any department after creation. Compounding: `deleteRole` reassigns every holder to Default **before** removing the role node (lines ~545-560), so the member reassignments (which DO pass rules via ADMIN_MANAGE) land and then the role removal fails — a partial mutation that strips members' roles while leaving the role in place.
This fails **closed** (no security exposure — the direction is safe); the impact is a broken shipped RBAC-governance feature plus the partial-mutation hazard. Caveat: I can only read the repo's rules file; if the live `fieldshore-database` project has different deployed rules, the live behavior could differ — worth a one-minute live check (create a throwaway role) before acting.
Fix direction (report-only — `database.rules.json` and its generator are in the never-modify zone, and `npm run gen:rules` is forbidden): add a manageUsers-gated write in `buildV4OrgsRules()`, e.g. `roleNode['.write'] = AUDIT_WRITE`-style (`auth != null && activeMemberRoot && permissionGate('manageUsers')`), plus protection for the built-in Admin role node if desired, then regenerate + deploy. Also reorder `deleteRole` to remove the role first (or verify writability first) so member reassignment can't strand. Confidence: high (code + generator + checked-in rules all agree), modulo the live-deploy caveat.

**B-3 · Medium · `database.rules.json` (`orgs/$deptId/members/$uid` ADMIN_MANAGE branch) · A non-admin role holding `manageUsers` can promote members — including THEMSELVES — to Admin (privilege escalation to full control).**
ADMIN_MANAGE (`rules.ts:216-221`) requires only `manageUsers === true` plus the admin-*losing*-admin guard. Promotion *into* admin has no guard, and the branch doesn't exclude `$uid === auth.uid`. Failure scenario: a department defines a custom "Membership Clerk" role with only `manageUsers` toggled on; any holder writes their own member row with `role: 'admin'` (one RTDB update, no UI needed) and now holds every permission, including demoting real admins. The downward guard shows deliberate protection of the admin tier, so the missing upward guard reads as an oversight rather than a decision — but it may be "manageUsers means full people-management" by design (ADR-017 territory). Flagged for a human ruling. Possible tightening: require `actorIsAdmin` when `newData.child('role').val() === ADMIN_ROLE_ID && data.child('role').val() !== ADMIN_ROLE_ID`, and/or `$uid !== auth.uid` for role changes. Confidence: high on behavior, medium on intent.

**B-4 · Medium · `database.rules.json` (`orgs/inviteCodes/$code` — create-only write) · A leaked invite code can never be revoked, and only the department FOUNDER can mint codes.**
The write rule is `!data.exists() && createdBy === auth.uid && root.orgs[deptId].createdBy === auth.uid` — create-only, so the `active` flag can never be flipped to `false` after minting (no client revoke path exists either; `departmentService` only mints at creation, line 223). Failure scenario: an invite code is posted in the wrong group chat; every holder can self-join the department indefinitely with no way to shut the door short of Firebase-console surgery. Secondary: `createdBy === root.orgs[deptId].createdBy` means admins who aren't the founder can't mint replacement codes at all (and if the founder account is deleted, no new codes ever). Fix direction: allow the founder/admins to update `active`, and gate minting on the admin role rather than `createdBy`. Report-only. Confidence: high.

**B-5 · Low · `database.rules.json` (`feedback` node) · Any authenticated user can read ALL feedback across every department.**
`.read: "auth != null"` at the feedback root, and v4 accounts are open self-signup (email/password). Feedback entries carry free-text plus department name/app metadata. Modest cross-department information disclosure; likely a v3 carry-over default. Fix direction: restrict reads to a maintainer capability, or drop `.read` entirely (write-only drop-box). Confidence: high.

**B-6 · Low · `database.rules.json` (`departments` tree) + `orgs/$deptId/events` gating · Two smaller rules notes.**
(a) The legacy v3 `departments` tree ships in the same rules file with v3's open-claim write (`!data.child('members').exists()` lets any authenticated user create arbitrary department nodes). On the v4 `fieldshore-database` project this is unused-but-writable surface (junk-data/quota abuse only). Consider omitting the v3 tree from the v4 project's rules. (b) Event-log writes are gated on active membership only — a role with `runFieldWork: false` (the permission exists in the Role schema) can still append operation events; ADR-017's "fireground is ICS-position-gated, not RBAC-gated" doctrine may make this intentional, but the unused `runFieldWork` toggle then over-promises what it enforces. Flagged for a doctrine ruling, not as a defect. Confidence: high on behavior.

---

## Pass C — Async, state, lifecycle

### Verified-clean

- **Swallowed errors**: every `catch` in `src/data` either maps the error into a `{ ok: false, reason }` result the UI displays, or is a documented best-effort path (diagnostics, storage-unavailable, audit append). No silent-undefined returns on consumed paths.
- **useEffect cleanup**: all listener/timer sites checked (`VisualGridPicker`, `FullScreenList`, `SideDrawer`, `useMediaQuery`, `FloatingPanel`, `OrgFullScreen`, `OpPeriod`, `useElapsed`, `theme.tsx`, `AboutPage`, `nativeControls`, `useOrgDragDrop`) return matching removals/clears; the hand-rolled org drag tears down its window listeners on unmount via a cleanup ref. `FeedbackSheet`'s 1.2 s close timer isn't cleared on unmount, but firing `onClose` on an already-closed sheet is a no-op — not a defect.
- **Un-awaited promises**: `no-floating-promises` is NOT enforced (eslint uses the non-type-checked preset), so this was a manual sweep of boot/auth/sync. All fire-and-forget calls are explicit `void`-marked with rationale comments (audit appends, diagnostics, restorePendingJoin); the boot sequence (`main.tsx`) correctly orders bootData → listeners → mount, with StrictMode-safe idempotent `start()`s and a cancelled flag.
- **Local write races**: commits are serialized through one promise chain (`operationStore.ts:107-115`), so two same-device deploys can't both pass the Pending pre-flight. `groupAdvance` guards missing trigger / stale trigger / per-member lockstep — empty and single-member groups are safe.
- **LWW clock skew & delete resurrection**: real hazards, but explicitly documented as accepted v4.0 limitations in `stateListener.ts:38-47` (deferred logical clock). Settled doctrine — not re-reported.
- **Deploy-vs-inventory listener ordering**: the dropped-deploy window between the two uncoordinated subscriptions is closed in both orderings via `onInventoryReady → eventListenerSync.resync()` (documented and implemented).

### Findings

**C-1 · Medium · `src/data/sync/syncService.ts:161-174` + `src/data/store/operationStore.ts:165` · Two devices deploying the SAME shore point concurrently diverge permanently: each device keeps its own BOM/stock view, and neither ever ingests the other's deploy event.**
Mechanics (all confirmed in code): device A and device B both see the point Pending and deploy different assemblies near-simultaneously. Each commits locally (own event log + own stock decrement) and uploads; both events land in the append-only cloud log (distinct ids). When A reconciles B's `EquipmentDeployed`, the pre-flight guard rejects it (`deploy requires a Pending shore point` — A's point is already `process`), so it lands in `dropped` and is never appended to A's local log; symmetrically on B. Unlike a dropped `ShorePointStatusChanged` (which self-heals when the point reaches `event.from`), a deployed point never returns to Pending with the same window, so the drop is permanent. Result: A and B display different deployed equipment for the same physical shore and their inventory `available` counts disagree (each decremented only its own BOM); a fresh device replaying the full log converges to whichever event has the earlier `at` — which may match neither active device's view. Mitigating context: the Operations-Section persona (one inputter per division) makes the trigger unlikely, and the returned/re-deploy path eventually reconverges. But for a life-safety board, two commanders seeing different struts on the same opening is worth a deliberate decision: either document it as accepted (like the stateListener limitations) or add a conflict rule (e.g. on reconcile, an incoming deploy with earlier `at` than the locally-applied one wins: return local BOM to stock, apply the peer's). Report-only (`src/data/sync` is a never-modify zone). Confidence: high on mechanics, medium on operational impact.

---

## Pass D — Quality triage

- **Console/PII**: all production-path console output is diagnostic (`skipped N unreadable events`, boundary crash logs, dev-misuse warnings). No member uids, department names, or feedback text logged. Clean.
- **Lint/typecheck**: the mechanical quality layer is green except B-1 (the one layering error).
- **Duplication/complexity**: not deep-scanned — remaining budget was prioritized toward verifying the Pass B/C findings above. The repeated permission-gate strings in `database.rules.json` are generator output, not hand-duplication.

---

## Safe-fix lane

**No fixes applied.** The only candidate (B-1) requires touching 3 files, which fails the single-file gate — its full diff is in the finding. Everything else found is either in a never-modify zone (rules, sync, store event dispatch) or needs a human decision. The working tree is untouched: `git status` shows only this report directory.

## Coverage statement

**Scanned:** `src/core/load` (engine, tables, struts, plates — read-only, incl. pinned tests), `src/core/shorepoint` (reducer, bom, status via usage), `src/core/operation/reducer.ts` (groupAdvance), `src/data/store` (operationStore, inventoryStore txn helpers, registry/boot/seed spot-checks), `src/data/sync` (syncService, eventListener, stateListener, stateSync, rolesListener wiring), `src/data/auth` + `src/data/dept` (catch-block sweep, role CRUD, invite codes), `src/ui/operations/DeployResolution.tsx` + `bom` consumers, all UI listener/timer sites, XSS-sink grep across all of `src/ui`, `database.rules.json` vs its generator `src/core/schema/rules.ts`, `package.json` registry existence (40/40).

**Skipped and why:** everything outside `src/` (v3 production app, docs, .claude, scripts — out of scope by instruction); `npm audit`-grade advisory scanning (command not on the allowed list; registry existence checked instead); deep duplication/complexity metrics (Pass D budget rule); live Firebase rule verification (firebase CLI forbidden — B-2 carries the corresponding caveat); v4 deep UI component-by-component review beyond the safety-critical and lifecycle surfaces (triage-first mandate).

**Bottom line:** the life-safety math layer (Pass A) is in excellent shape — conservative in every direction checked and pinned by tests. The real risk lives in the RBAC rules layer: B-2 (role editor denied by rules) should be live-verified and fixed before the next admin touches the role editor, and B-3 (manageUsers → self-promotion to Admin) deserves an explicit ruling.


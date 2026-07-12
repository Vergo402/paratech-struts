# v4 — Command & positions follow the PERSON (account), not the device

Status: design (architect). Branch: `v4-redesign`. Supersedes the earlier
"command follows the signed-in account" pass; incorporates Alex's three deltas
(generalize beyond IC, automatic legacy reclaim, account-to-account handoff).

## Problem (confirmed live)
`isIC` keys off the per-DEVICE uid (`useDeviceUidValue`) at three sites
(`OrgChart.tsx:64`, `SitStat.tsx:55`, `CommandRail.tsx:114`). On
`OperationCreated`, `seedOrgState` (orgReducer.ts:24) seeds the IC as a **device
ref** `{ref:'device', value: by}` where `by = event.by =` the founding device's
uid, and `myRoles={[by]:icId}` keyed by device. `MyRoleSet` folds
`myRoles[event.by]` (orgReducer.ts:87-91) — device-keyed. So a signed-in member
on a DIFFERENT device than the op creator loses IC recognition and any position
they hold, because every recognition site reads the device, not the person.

## North star (identity model)
The **account is the person**. A single `self` and two pure predicates route
EVERY recognition site, so there are no stray device-uid reads (the completeness
trap):

- `self = { accountId: string|null, deviceUid: string, deviceUids: string[] }`
  - `accountId` = `identity.accountId` when member, else `null` (guest).
  - `deviceUid` = this device (`useDeviceUidValue`).
  - `deviceUids` = `[deviceUid, ...devices bound to my account]` (from the binding).
- `isSelf(ref, self)` — STRICT recognition ("is this holder me?"):
  - `account` → `ref.value === self.accountId`
  - `device`  → `self.deviceUids.includes(ref.value)`
  - `individual`/`apparatus` → `false` (a typed name / rig is never provably me)
- `commandsIC(ic, self, ownerOf)` — the IC-EDIT authority gate (permissive
  pre-auth, ADR-021), expressed via isSelf:
  - `!ic` → true
  - `ic.ref==='account'` → `ic.value===self.accountId`
  - `ic.ref==='device'` → `isSelf(ic,self)` **OR** (`ownerOf(ic.value)==null` AND
    `self.accountId!=null`)  ← unresolvable legacy orphan → any member may adopt (Delta 4)
  - `individual`/`apparatus` → true (soft floor, unchanged)
- `resolveMyRole(myRoles, self)` — routes the 5 My-Role read sites:
  `(self.accountId ? myRoles[self.accountId] : undefined) ?? firstDefined(self.deviceUids.map(d => myRoles[d]))`.
  Guests → `myRoles[deviceUid]` (floor unchanged); members → account key, falling
  back to any of their device keys (covers legacy device-keyed entries).

The four downstream "mine" surfaces (Mine lens, checklists, audit gate, "this is
mine" highlight) already key off **My Role** or the **IC leader**. Make (a) the IC
seed account-native, (b) My Role account-keyed, (c) isSelf account-aware, and all
four inherit correctness by construction — one seam, not four patches.

## Schema (`src/core/schema/org.ts`, `event.ts`)
1. `OrgResourceRef.ref` enum gains `'account'` → 4th variant
   `{ref:'account', value:accountId, label:displayName}`. `sameResource`/`leaderOf`
   need no change (compare ref+value). **displayName rides `label` — no new PII.**
2. Nested optional `account:{id,label}` (NOT an OrgResourceRef) added to the three
   events that seed/gate self identity:
   - `OperationCreated.account?` → the founding IC becomes an account-ref at t=0.
   - `MyRoleSet.account?` → the reducer keys myRoles by account.
   - `CommandTransferAccepted.account?` → the reducer verifies an account target.
   All optional → every pre-existing event parses unchanged; RTDB `undefined` is
   spread conditionally at emit.
3. `CommandTransferInitiated.toResource` may now be an account-ref (the member
   target). `claimCode` becomes N/A for account targets (uid-verified, like device).

## Reducer (`orgReducer.ts`, `operation/reducer.ts`, `transfer.ts`) — pure
- `seedOrgState(opId, by, account?)`: seed IC leader = account-ref when `account`
  present, else the device-ref (guest floor). `operationReducer` OperationCreated
  passes `event.account`.
- `MyRoleSet`: key by `event.account?.id ?? event.by`; the `null` clear deletes the
  same principal key.
- `CommandTransferInitiated`: current soft check stays; add an account arm to the
  "only current IC may initiate" guard (`ic.ref==='account'` → require
  `event.account?.id === ic.value`, else fall through soft for non-account ICs).
- `canAccept(pending, by, account?)` gains the account arm:
  `account`-target → `account!=null && account.id===pending.toResource.value`;
  device/individual/apparatus unchanged. `CommandTransferAccepted` fold passes
  `event.account`.
- `isCommanderOf(positions, resolvedMyRole, opId, self)` — replace the `uid` param
  with `self`; the leader check becomes `isSelf(leaderOf(node), self)` (adds the
  account + my-devices arms); the `myRole===icId/opsId` check uses the resolved role.

## Device→account binding (the single seam)
- **Store:** `/orgs/{deptId}/deviceOwners/{deviceUid} = accountUid` (flat reverse
  map). Mirrors `/userDepts/{uid}` exactly.
- **Write:** on every AUTHENTICATED boot, a new `seedDeviceOwner()` alongside
  `seedUserDeptIndex()` (session.ts + authSession.ts:65) — needs `getDeviceUid()`
  (the device uid) + session `accountId`/`departmentId`. Fire-and-forget,
  idempotent, claim-once.
- **Rule** (add in `rules.ts buildV4OrgsRules`, then `npm run gen:rules`):
  ```
  deptNode['deviceOwners'] = { $deviceUid: {
    '.write': "auth != null && " + activeMemberRoot +
              " && newData.val() === auth.uid && (!data.exists() || data.val() === auth.uid)",
    '.validate': "newData.isString()" } };
  ```
  Read CASCADES from the dept `.read` (READ_MEMBER = active member) — no read rule
  needed. `newData.val()===auth.uid` = you may only claim a device FOR YOURSELF;
  claim-once prevents stealing an already-bound device.
- **Read at UI:** a `useDeviceOwners()` cold read (dept-keyed, like `readMembers`),
  refreshed on authenticated boot; feeds `useSelf()` → `deviceUids` (= keys whose
  value===my accountId, plus the current device) and `ownerOf(deviceUid)`.
  Guests → empty map → `deviceUids=[current]`, floor unchanged.

## Automatic legacy reclaim (Delta 2) — resolution policy
- **Pure READ-TIME resolution. No durable rewrite in v4.0.** New ops seed
  account-ref ICs, so device-refs only exist in already-archived ops + the
  transition window. Archived after-action records are preserved verbatim
  (audit integrity); active legacy ops are few and rewriting them adds
  event-emission + race surface for little gain. The reducer is pure and CANNOT
  read the binding — resolution lives entirely in `useSelf`/`isSelf`/`commandsIC`.
- **Same-device** legacy refs resolve with ZERO network (`deviceUids` always
  includes the current device).
- **Cross-device** reclaim is automatic once the owning device has recorded its
  binding under the new build (bootstrap gap — inherent; until then the ref is
  unresolvable and Delta-4 adoption applies).
- **Bootstrap gap + orphans (Delta 4):** `commandsIC` returns permissive (any
  member may adopt) when a device-ref IC has NO owner in `deviceOwners`. Adoption
  opens the gate; if the member wants to be RECORDED as IC they use Transfer
  Command (account target = self) — no forced rewrite, staying read-time.
- Deferred option (post-v4.0): an idempotent durable upgrade riding a dedicated
  event on ACTIVE ops only.

## Account-to-account handoff (Delta 3)
- **Target picker:** `TransferCommand` gains a "Department members" section from a
  light `useDeptMembers()` cold read (`readMembers` cascades from dept `.read`, so
  any active member — not just admins — can list). Picking a member mints
  `toResource = {ref:'account', value:memberUid, label:displayName}`; the existing
  org-individual/device picks + type-a-name stay.
- **Accept gate:** `canAccept` account arm verifies the ACCEPTING session's
  `accountId === toResource.value` — real uid identity across ANY of their devices.
  `CommandTransferAccepted` carries `account` so the reducer verifies off the event.
- **#425 code:** N/A for account targets (uid-verified). `mintClaimCode` only for
  individual/apparatus. `TransferCommand.transfer`:
  `claimCode = (ref==='device'||ref==='account') ? null : mintClaimCode()`.
- **Scope:** command transfer + founding-IC seed + My Role only. Assigning a MEMBER
  account to a NON-IC position via NodeSheet is a NEW affordance (new UI + emits an
  account-ref enum on the wire → mixed-version hazard) → **DEFER**. A user "holds" a
  position via self-declared My Role or by being IC; both are now account-native,
  which satisfies Delta 1 for the realistic paths.

## Commit layer (`useOrgCommit.ts`, StartOperationModal)
Attach `account:{id,label}` from `useSession().identity` (member only, conditional
spread) to: `OperationCreated` (StartOperationModal, uses `useCommit` directly),
`MyRoleSet`, `CommandTransferInitiated` (account target → `toResource`),
`CommandTransferAccepted`. Guests omit it → device floor.

## Cloud rules (verified deltas)
- Event log: `events/{opId}/{eventId}.validate` requires only `[id,opId,type,at,by]`,
  `type` is `isString()` (not an enum), NO `$other:false` (rules.ts:189-192).
  → nested `account` + `toResource.ref==='account'` PASS unchanged. **No event-rule
  change.** `by` stays the device uid — NOT bound to `auth.uid` (avoids v3.8.2-class
  PERMISSION_DENIED).
- Only ADD: the `deviceOwners` node above (via `rules.ts` + `gen:rules`; drift test
  `rules.test.ts` stays green). Reads cascade — no read rule.

## Back-compat / replay / mixed-version
- Optional nested `account` → old clients strip it (non-strict Zod `.object`); they
  keep device-ref IC seed + device-keyed My Role (today's behavior). No functional
  regression on old; improvement on new. IC gold-accent target differs cosmetically.
- The `'account'` ENUM ref reaches the wire ONLY via account-targeted
  `CommandTransferInitiated`. An OLD client's Zod enum rejects it → the event is
  DROPPED (safeParse-degrade) → that client misses the pending transfer (transient
  divergence during a handoff). MITIGATION: bump `config/minAppVersion` when
  account-targeted transfer ships; the beta auto-updates and the config gate blocks
  stragglers. Founding-IC seed + My Role do NOT use the enum, so they carry no such
  hazard.
- Replay: all folds remain deterministic no-ops on stale/illegal events; account
  keying + isSelf depend only on event fields + projection + the (selector-side)
  binding.

## Files touched
Schema: `core/schema/org.ts`, `core/schema/event.ts`.
Core: `core/org/orgReducer.ts`, `transfer.ts`, `resource.ts` (isSelf/commandsIC),
`index.ts`; `core/operation/reducer.ts`.
Data: `data/store/session.ts` (+`seedDeviceOwner`, deviceOwners read),
`data/auth/authSession.ts`; new `data/store/deviceOwners.ts` (or fold into session).
Rules: `core/schema/rules.ts` (+`rules.test.ts`), regenerate `database.rules.json`.
Hooks: new `useSelf.ts`, `useDeviceOwners.ts`, `useDeptMembers.ts`;
edit `useMyRoles.ts` (resolveMyRole), `useAuditAccess.ts`, `useChecklists.ts`,
`useOrgCommit.ts`, `hooks/index.ts`.
UI: `command/OrgChart.tsx`, `SitStat.tsx`, `CommandRail.tsx`, `MyRoleSheet.tsx`,
`TransferCommand.tsx`, `NodeSheet.tsx` (isSelf "you" marker), `OrgTree.tsx`;
`operations/OperationsBoard.tsx` (Mine lens), `StartOperationModal.tsx`.

## UI changes to mock up (mockup-first before build)
1. IC + any position label = the PERSON's name (account label) instead of "This
   device"; a subtle "You" marker (isSelf) on your own position node/rows.
2. Account vs device vs typed-name visual distinction on org rows / roster.
3. TransferCommand member-target picker (Department members section) + note that an
   account target needs no accept code.
4. NO manual "Assume command" button — reclaim is automatic; the only visible
   affordance for an unresolvable-orphan legacy op is the standard edit controls
   unlocking.

## Test plan (highlights)
- Pure: `isSelf`/`commandsIC`/`resolveMyRole` truth tables (account, device,
  my-devices, orphan, guest). `seedOrgState` account vs guest. `MyRoleSet`
  account-keyed + null-clear. `canAccept` account arm. `isCommanderOf` account arm.
  Cross-device: op created on device A (account X) recognized as IC on device B
  (account X) via resolveMyRole + isSelf. Legacy device-ref op reclaimed on a second
  device once bound; orphan → any-member adopt.
- Reducer replay: mixed old/new event streams converge; account-carrying events fold
  identically after re-fold.
- Rules (`test:rules` emulator): a member may write ONLY their own deviceOwners key;
  claim-once denies stealing; non-member denied; read cascades to members.
  `rules.test.ts` drift stays green after `gen:rules`.
- Mixed-version: an account-ref `CommandTransferInitiated` is safeParse-dropped on a
  simulated old-schema client (assert graceful, no crash); minAppVersion gate.
- Live (preview): device A + device B same account — transfer to member, accept on B;
  My Role on B recognized on A; audit gate for ex-IC on an archived op.

## Risks
- Account-ref enum → transient divergence on old beta clients during account-targeted
  transfer (gate via minAppVersion).
- Shared physical device: one deviceUid, claim-once binds it to the FIRST account —
  a second account's LEGACY device-refs on that device resolve to the first
  (transition-window edge; new work is account-ref, unaffected).
- Completeness: every device-uid recognition read must route through
  `self`/`isSelf`/`resolveMyRole` — audit for stray `useDeviceUidValue`-as-identity
  reads (grep gate).

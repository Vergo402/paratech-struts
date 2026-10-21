# Security hardening brief: DevOps / resilience review

**Reviewer:** devops-resilience agent · **Date:** 2026-10-11 · **Branch:** `v4-redesign` · **Mode:** read-only. This file is the only output.
**Input:** `DESIGN-BRIEF-draft.md` (same folder).
**Code read:** `src/core/schema/rules.ts`, `scripts/gen-rules.ts`, `database.rules.json` (non-orgs trees), `src/data/sync/{syncService,eventListener,subscribe,firebase,connectivity}.ts`, `src/data/auth/{authSession,firebase}.ts`, `src/data/dept/departmentService.ts` (invite mint/join/revoke/regenerate, deviceOwners read), `src/data/store/session.ts` (`seedDeviceOwner`), `src/core/clock.ts`, `src/core/schema/{event,org,department}.ts`, `src/ui/command/useOrgCommit.ts`, `src/ui/operations/StartOperationModal.tsx`, `src/app/main.tsx`, `functions/src/{index,guards}.ts`, `firebase.json`, `vite.config.ts` (Workbox), `vitest.rules.config.ts`, `tests/rules/{harness,orgs.rules.test}.ts`, `.github/workflows/deploy-v4-beta.yml`, and `.claude/audits/phase-j/262-ttx/REPORT.md` (harness section).

---

## 0. Verdict summary

| # | Change | Feasible in RTDB rules? | Verdict |
|---|---|---|---|
| 1 | Attribution (`uid`), type whitelist, caps, `at` clamp | Yes, all of it can be expressed | **GO, with changes.** (a) Stamp `uid` at the **wire** (`toWire`), not at commit and not as required Zod. (b) **Add an `account.id === auth.uid` binding.** Without it, change 1 does not stop command seizure. (c) Generate the whitelist and caps from Zod, or the queue can wedge. (d) **Drop the `at` clamp**: it can wedge for up to 24 h and does nothing for ordering after ADR-041. |
| 2 | deviceOwners owner-or-admin | Yes | **GO.** The admin branch must be gated on **the Admin role** (`actorIsAdmin`), not `manageUsers`; otherwise a custom role can repoint the IC's device (the same escalation shape J257-S4 closed). Do **not** gate the first backlog push on `seedDeviceOwner`, and do **not** reference deviceOwners from the event rule. |
| 3 | STATE clock clamp | Yes | **GO, with a poison escape hatch** (a cloud node already future-dated must stay overwritable) and a client self-heal. |
| 4 | Invite expiry | Yes | **GO, but rules ship FIRST for this one.** `inviteCodes/$code` has `$other:false`, so a client that writes `expiresAt` before the rules know the field is denied. Use a three-step order: R1 (field optional) → client → R2 (required + `> now`). Freeze `expiresAt` in REVOKE, bound it at create, and fix the join error message. **The 24 h default conflicts with ADR-022**, so Alex should decide it. |
| 5 | App Check | Yes | **GO, monitor-first.** Enforce on the callables first and on RTDB last, after the metrics are clean. **Blocker before enforcing:** the event listener has no cancel handler, so a denied listen is lost until reload. |
| 6 | Rollout | — | Client first, rules second is correct. Add: a wire-conformance test, rules tests in CI, a no-backlog check before deploy, a recorded rollback SHA, and #264 **after** the rules deploy. |
| — | Per-member write throttle in rules | Possible, but harmful | **Reject.** It conflicts with offline catch-up bursts. Use caps + App Check + revocation + a budget alert instead. |

**Blockers (must be resolved before the rules deploy):**
- **B1.** Stamp `uid` in `toWire`, or the rebuilt pre-upgrade backlog wedges permanently.
- **B2.** Bind `account.id`, or command seizure stays open.
- **B3.** Choose between "generated from Zod" and "quarantine" for whitelist/cap rejections (§2.3).
- **B4.** Add a cancel/re-subscribe handler in `firebaseSubscribe` before App Check is enforced on RTDB.
- **B5.** Sanitize any cloud STATE node that is already future-dated, or include the escape hatch.
- **B6.** Invite `expiresAt` must follow the order R1 → client → R2 (§1.5, §5). If the client ships first, regenerate fails with "old code retired, new code could not be issued" and the dept-create outbox denies the code publish.
- **B7.** The deviceOwners admin override must be gated on `actorIsAdmin`, not `permissionGate('manageUsers')`.

---

## 1. Rules: can each change be expressed? Draft expressions

### 1.0 RTDB rules gotchas that apply here
- **`.read` / `.write` cascade downward and cannot be narrowed lower down.** A grant at a parent cannot be revoked by a child rule. This is why the dept-root `READ_MEMBER` exposes the whole subtree (roster contacts included; the brief already defers this). It is also why every write gate here lives on the leaf (`$eventId`, `$deviceUid`, `$code`).
- **`.validate` does not cascade, and it is skipped when `newData` is null (a delete).** Immutability and anti-delete must therefore live in `.write`, which the code already follows. Every new constraint below that must hold on delete goes in `.write`.
- **`.validate` can read `auth`, `now`, `root`, `data` and `newData`.** The `uid` and `account` bindings can therefore live in validate.
- **`now` is one value per write operation.** A multi-path `update()` resolves every `{'.sv':'timestamp'}` to the same `now`, and every rule in that write sees that same `now` (the existing test "batch shares ONE server stamp" pins this). `now` comes from the server clock. In the emulator it is the host wall clock, and it cannot be faked in tests: seed time-relative fixtures with `Date.now() ± margin` under `withSecurityRulesDisabled`.
- **To see another path's post-write value inside one multi-path write**, use `newData.parent()...child(...)`. `root` is the pre-write state.
- **Nulls.** `.val()` on an absent child returns `null`. `null === null` is true, which `SELF_EDIT_RANK` already relies on. Comparing `null > now` evaluates false, but guard with `.isNumber()` so the intent is explicit.
- **`gen-rules.ts` brace ban.** Rule strings may contain **no literal `{` or `}`**, because the splice counts braces. That rules out regex quantifiers like `{2,40}`. Use `+` and an explicit `.val().length <= N`.
- **Size.** The whole rules file can be at most 256 KB. A 36-way regex alternation (~750 chars) is well within it. RTDB regex supports `^ $ ( | ) + * [ ]`. `/feedback` already uses `.matches(/^(bug|idea|other)$/)`, so the pattern is proven in this file.
- **Rules are project-wide.** There is no "beta channel" for rules. A `firebase deploy --only database` applies immediately to every client, including `npm run dev` on :5199, which talks to the real project.

### 1.1 Event envelope (change 1)

New `EVENT_ENVELOPE_VALIDATE`, shown unescaped for readability (in `rules.ts` it is a string concatenation):

```
newData.hasChildren(['id','opId','type','at','by','uid'])
&& newData.child('id').isString()    && newData.child('id').val().length <= 64
&& newData.child('opId').isString()  && newData.child('opId').val().length <= 64
&& newData.child('opId').val() === $opId                       // NEW: path/body agree
&& newData.child('id').val() === $eventId                      // NEW: path/body agree
&& newData.child('by').isString()    && newData.child('by').val().length <= 64
&& newData.child('at').isNumber()
&& newData.child('uid').val() === auth.uid                     // NEW: uploader binding
&& newData.child('type').isString()
&& newData.child('type').val().matches(/^(OperationCreated|OperationEdited|...|BriefingEnded)$/)   // NEW, GENERATED
&& (!newData.child('account').exists()
    || newData.child('account').child('id').val() === auth.uid) // NEW: actor binding (see 1.2)
&& newData.child('receivedAt').val() == now
```

Check `id`/`opId` against the path before adding those two lines: the flush keys are `${opId}/${id}`, so they should already agree. That gives a cheap integrity win: a body whose `opId` differs from its path is currently accepted, and the client folds it under the body's op.

**Type whitelist: use a generated regex, not a hand-written `||` chain.** A chain of 36 `=== 'X' ||` clauses works but is noisy. The regex is a single, diffable line. Generate it from the source of truth:

```ts
const LEGACY_EVENT_TYPES = new Set(['StrutDeployed', 'StrutReturned']);
const LIVE_TYPES = FieldShoreEvent.options.map((o) => o.shape.type.value).filter((t) => !LEGACY_EVENT_TYPES.has(t));
const TYPE_RE = `/^(${LIVE_TYPES.join('|')})$/`;
```

Add a drift test asserting `LIVE_TYPES.length === 36` and that the regex is present in the committed JSON.

**A data-driven lookup** (`root.child('config/eventTypes').child(type).val() === true`) is possible, but it needs seeded data, and `/config` is public-read. Not recommended.

**Ordering trap (ongoing, not one-time).** Once types are whitelisted, **any release that adds an event type must deploy rules BEFORE the client that emits it.** That is the reverse of the client-first order for required fields. Otherwise the new client's first event of that type wedges its queue (§2.3). Record this in ADR-042 as a standing deploy rule:
- **Additive schema change:** rules first.
- **Narrowing or required schema change:** client first.

If Alex does not want that coupling, use the cheaper shape check, which still stops junk types: `newData.child('type').val().matches(/^[A-Z][A-Za-z]+$/) && newData.child('type').val().length <= 40`.

**Per-field caps.** Rules cannot see the discriminated union, so caps must sit on **named child paths under `$eventId`**, and they apply to *every* event type that uses that key. Several free-text fields are **nested**:

| Path under `$eventId` | Source |
|---|---|
| `name`, `location` | OperationCreated / OperationEdited (`location` nullable on Edited) |
| `title` | PositionRenamed |
| `hazard/notes`, `hazard/location` | HazardLogged → `Hazard` |
| `shorePoint/label` | ShorePointAdded → `ShorePoint` |
| `patch/label` | ShorePointEdited → `ShorePointPatch` (nullable) |
| `position/title` | PositionAdded → `OrgPosition` |
| `resource/label`, `toResource/label` | ResourceAssigned / ResourceCleared / CommandTransferInitiated → `OrgResourceRef.label` |
| `account/label` | the 4 account-tagged types → `accountTag.label` |

Use the **type-agnostic** leaf form, so a key that is a non-string in some other event type is not rejected:

```
"hazard": { "notes": { ".validate": "!newData.isString() || newData.val().length <= 500" } }
```

**Generate these paths by walking the Zod union.** Collect every `ZodString` leaf at its path and emit a cap at that path, so the rules and the Zod `.max()` come from one place (L-11).

**Be honest about what caps do.** There is **no `$other:false`** on events, and adding one would hit the same ordering trap for every new field. Unknown keys therefore still pass, at any size: an RTDB string can be up to 10 MB, and an SDK write up to 16 MB. **Caps on named fields protect display and readers. They do not bound flooding.** Flood control is App Check (which stops scripts), membership revocation (`active:false` cuts writes at once), and a budget alert (§4).

**`at <= now + 300000`: recommend DROPPING it.**
- After ADR-041 the canonical order is `(receivedAt, at, id)`, and `receivedAt` is server-stamped. `at` only breaks ties *within one write*, which always comes from one device, so a future-dated `at` cannot reorder anyone else's events.
- `createMonotonicClock` (`src/core/clock.ts`) ratchets `last = max(wall, last+1)` and only lets go of a forward-skewed floor once it is **more than 24 h ahead** (`CLOCK_SKEW_LIMIT_MS`). A device whose clock ran 6 min to 24 h fast, then corrected, therefore keeps stamping future `at` values. A 5-minute rule would **reject every event from that device for up to a day**, at the head of its queue (§2.3).
- If Alex wants display sanity, clamp at render time. If a rule bound is kept anyway, it must be `<= now + CLOCK_SKEW_LIMIT_MS` (86 400 000), not 300 000, so it can never contradict the clock's own clamp.
- There is no lower bound on `at`, and none is needed: an event queued for hours offline has an old `at` and a fresh `receivedAt`, and it passes (Q2).

### 1.2 Attribution: where `uid` goes, and the `account` gap

**`uid` must be added in `toWire`** (next to `receivedAt: SERVER_TIMESTAMP`):
```ts
function toWire(event, uploaderUid) { return { ...stripUndefined(event), uid: uploaderUid, receivedAt: SERVER_TIMESTAMP }; }
```
In Zod, `uid` is `z.string().optional()` on `base`. **It must NOT be required**, for two reasons:
1. `ingestRemote` `safeParse`s every cloud record, so a required `uid` would drop every historical event.
2. If `uid` were stamped at commit, the pre-upgrade Dexie backlog that `eventListener.firstMerge` rebuilds would have no `uid` and would be rejected forever (§2.2).

Keep `syncService` firebase-free at load: inject the uploader uid as a lazy dependency (`uploaderUid: () => Promise<string | null>`), the same way `set`/`get`/`update` are injected, and make the default lazily import auth. Unit tests then inject a fake. The default should get the uid after `await firebaseAuth.authStateReady()` and return early (no-op) if `currentUser` is null. Today `flush` can run off the persisted `departmentId` before Firebase Auth has restored the user.

**Semantics:** with a wire-time stamp, `uid` means **"the account that uploaded it"**. That differs from the author in exactly one edge case: account A commits offline, signs out, and B signs in on the same device (and in the same dept bucket) before A's backlog flushes. See the sign-out guard in §2.4.

**The `account` gap (B2, the most important correctness finding).**
- Reducers key the principal on `account?.id ?? by` (`orgReducer.ts:94,112,128`, per the brief).
- `account` is client-asserted on MyRoleSet, CommandTransferInitiated, CommandTransferAccepted and OperationCreated.
- All four emit sites (`useOrgCommit.ts:47-51`, `StartOperationModal.tsx:94`) set `account.id = identity.accountId`, the signed-in uid, so the binding `!account.exists() || account.id === auth.uid` is **always satisfied by honest clients**.
- Without that binding, a member can write `CommandTransferAccepted { account: { id: <IC's uid> } }` or `CommandTransferInitiated { account: <IC> }`. The reducers accept it as the IC, and the new `uid` field changes nothing because no reducer reads it.

**Residual to record in ADR-042 (not solvable with this approach):** `by` stays forgeable. A member can set `by` to another device's uid, which is visible in the log. Legacy **device-ref** positions (guests, and pre-account ICs) can therefore still be impersonated. Do **not** fix this by binding `by` to `deviceOwners` in the event rule:
- deviceOwners is first-claim, so a shared rig tablet used across shifts would have every event from its second account rejected (a permanent wedge).
- It would put a second network write (the seed) on the critical path of every flush.

The proper fix is reducer-side: principal = `account?.id ?? uid ?? by` for events that carry `uid`, which still leaves guests on `by`. Option B (the referee) covers the rest.

### 1.3 deviceOwners (change 2)

```
"deviceOwners": { "$deviceUid": {
  ".write": "auth != null && <activeMemberRoot> && (
       ( newData.val() === auth.uid && (!data.exists() || data.val() === auth.uid) )      // self: claim or refresh own
    || ( <actorIsAdmin>                      // ADMIN ROLE, not manageUsers: a custom manageUsers role could
         && (!newData.exists()                //   otherwise repoint the IC's legacy device to itself (J257-S4 shape)
             || root.child('orgs').child($deptId).child('members').child(newData.val()).exists()) ) // admin: repoint / clear
  )",
  ".validate": "newData.isString() && newData.val().length <= 128 && $deviceUid.length <= 64"
}}
```

**Why the admin branch matters:**
- Shared rig tablets: the second account's seed is now denied.
- Clearing a squat: a member who first-claims a not-yet-seeded device uid copied from the log.

`newData.val() === auth.uid` already blocks a self-delete, because `null !== uid`. Keep it.

**Client:**
- `seedDeviceOwner` stays fire-and-forget. **Do NOT await it before the first backlog push.** It is only needed if the event rule dereferences deviceOwners, which it should not (§1.2).
- An offline `set()` never rejects; it buffers. A denied seed (shared device) would therefore block uploads indefinitely if it were awaited.
- Change `.catch(() => {})` to log `device_owner_seed_denied` to diagnostics, so a shared-device denial is visible.

### 1.4 STATE clock clamp (change 3)

```
const CLOCK_SLACK = 300000;  // 5 min
const LWW_MONOTONIC =
  "(!data.exists()"
  + " || newData.child('lastWriteAt').val() >= data.child('lastWriteAt').val()"
  + " || data.child('lastWriteAt').val() > now + " + CLOCK_SLACK + ")";            // poison escape hatch
const STATE_CLAMP = "newData.child('lastWriteAt').val() <= now + " + CLOCK_SLACK;
stateWrite = STATE_MEMBER && permissionGate && LWW_MONOTONIC && STATE_CLAMP
```
Put `STATE_CLAMP` in `.write` (or `.validate`, since it has no delete path). Apply it to inventory rows and to all 5 blobs.

**Why the escape hatch:** without it, a node *already* carrying `lastWriteAt = 2099` stays frozen, because no honest write is `>=` that stamp. With it, a poisoned node can be overwritten by any legitimate gated write, and it heals on the next edit. Before deploying, also run a one-off read of `orgs/*/{inventory/*,apparatus,titles,checklists,apparatusTypes,deptPolicies}/lastWriteAt` and look for values `> Date.now()+5min` (B5).

**Client-side failure mode.**
- `lastWriteAt` is stamped from `Date.now()` at edit time.
- A device whose clock is more than 5 min fast has **every** STATE write rejected. `setState` swallows the error into a `state-write-failed` diagnostic.
- `stateListener` only pushes local up on the *first* snapshot, so the device silently shows different inventory from the cloud until a peer write overwrites it.

**Recommend:**
- (a) Clamp the stamp client-side to `min(Date.now(), lastSeenServerTime + slack)`. Use the `.info/serverTimeOffset` RTDB exposes: `Date.now() + offset` gives server-aligned stamps for free. This is the real fix, because it also makes LWW comparisons skew-proof.
- (b) Surface `state-write-failed` in the sync banner rather than only in diagnostics.

### 1.5 Invite codes (change 4)

**Zod:** `InviteCode.expiresAt: z.number().int().positive().optional()`. Make it optional so existing codes still parse and revoke cleanly.

**Deploy order is the REVERSE of change 1 (B6).** `codeNode = objectRules(InviteCode)` gives the deployed `inviteCodes/$code` a `$other: {.validate: false}` (verified in `database.rules.json`: its keys are deptId/deptName/createdBy/createdAt/active/$other). A client writing `expiresAt` is therefore **denied by the current rules**. Three steps:
1. **R1:** regenerate with `expiresAt` optional (a leaf `!exists || isNumber`), plus the REVOKE freeze. This is harmless to old clients.
2. **C:** ship the client that writes `expiresAt`.
3. **R2:** add required-on-create, the `> now` / `≤ 7 d` bounds, and the join check `expiresAt > now`. This can ride along with the change-1 rules deploy.

```
INVITE_CODE_CREATE += " && newData.child('expiresAt').isNumber()"
                    + " && newData.child('expiresAt').val() > now"
                    + " && newData.child('expiresAt').val() <= now + 604800000 + 300000"   // ≤ 7 d (+ client-clock slack)
INVITE_CODE_REVOKE += " && newData.child('expiresAt').val() === data.child('expiresAt').val()"  // freeze (null===null for legacy)
JOIN_SELF_WRITE    += " && root.child('orgs').child('inviteCodes').child(newData.child('viaCode').val())"
                    + ".child('expiresAt').val() > now"
```

**Consequences and gotchas:**
- **Existing codes without `expiresAt` stop admitting joins the moment the rules deploy** (`null > now` is false). Revoking them still works because of the freeze above. In beta, Alex just regenerates. If REVOKE did not freeze the field (or the validate made it required), legacy codes would also become **unrevocable**, because the `hasChildren` check would fail on the update.
- **Dept-create outbox (#419).** A `PENDING_DEPT_PUSH` row persisted before the upgrade carries a `codePayload` with no `expiresAt`. The create branch now denies it. `retryPendingDeptPush` already treats `invite_code_publish_denied` as definitive (it logs). Confirm it then re-mints rather than leaving the dept code-less with no UI hint. This is a low-probability edge case in beta.
- **Join message.**
  - Check `parsed.data.expiresAt <= Date.now()` client-side in `joinByCode` and return "That code has expired".
  - The `PERMISSION_DENIED` branch currently says "your access may have been revoked". That is wrong for an offline-queued join whose code expired while queued (`retryPendingJoin` → `joinByCode`). Re-read the code on denial and pick the right message.
  - Client clock skew makes the client check advisory only. The rule is authoritative.
- **Product conflict, which Alex must decide.** ADR-022 says codes are "multi-use · time-boxed · revocable · auto-expires at incident close". It retired the 24 h code because it "could not onboard a department". `department.ts` also says "NOT one-time / 24h". A **24 h default** reintroduces the three-shift onboarding problem (40 people across A/B/C shifts = 72 h). Suggest a **7 d default**, with 1 h / 24 h as shorter options.

### 1.6 Open trees found in passing (same deploy)
- `/userDepts/$uid` has `hasChildren(['deptId','deptName'])` but **no type checks, no length caps and no `$other:false`**. Any self-registered account can write arbitrarily large blobs there. Add the leaf validations and `$other: {.validate: false}`, **matching the real payload** (`session.ts:186`, `seedUserDeptIndex`): `{ deptId, deptName: departmentName ?? '', inviteCode: inviteCode ?? '' }`. That means `inviteCode` must be allowed, and **empty strings must pass** (no min length): `deptId` is a string ≤ 64, `deptName` is a string ≤ 100 (may be `''`), and `inviteCode` is a string ≤ 16 (may be `''`). The v3.8.2 lesson applies: a validate rule that misses a real field silently breaks cross-device dept recovery.
- `/feedback` and `/diagnostics` are capped per field but **unbounded in count**, and self-registration is open. Only App Check (RTDB enforced) stops a scripted flood. That is the strongest argument for actually *enforcing* App Check on RTDB eventually.

---

## 2. Offline behaviour

### 2.1 A queued event with an old `at`: confirmed fine
- `receivedAt == now` is satisfied by the `{'.sv':'timestamp'}` sentinel that `toWire` adds at upload time, whatever the event's age.
- No rule bounds `at` from below.
- An event queued 3 days offline uploads with `receivedAt` = upload time and folds at the tail of the canonical order. This is the intended ADR-041 behaviour.

### 2.2 Rules deploy while a device holds a pre-upgrade backlog
There are two populations to consider.

**(a) An old build is still running in an open tab.** Its in-memory queue builds wire objects with no `uid`. Every upload gets `PERMISSION_DENIED`:
- `settleLostAck` → false, then `flush-failed` is logged and `scheduleRetry` runs at 5 s → 15 s → 60 s, repeating every 60 s forever.
- The banner shows "couldn't sync, retrying".
- **Head-of-line blocking:** every later commit queues behind the head.
- **No data is lost:** everything is in Dexie, and nothing invalid reaches the cloud.
- **Recovery** is the PWA update plus a reload. On reload the queue is rebuilt from Dexie (`firstMerge`: local events with no `receivedAt` that are not in the cloud), and the **new** `toWire` adds `uid`, so it drains.
- Per the memory notes, an installed PWA can take **two cold starts** to pick up a new build. The wedge window is therefore "until the user relaunches the app twice", not "until refresh".

**(b) Events stored in Dexie before the upgrade (this is the permanent-wedge risk).** The new build re-uploads them **verbatim plus whatever `toWire` adds**. Any new rule that a stored event cannot satisfy, *and that `toWire` does not repair*, wedges that device **permanently, surviving any number of reloads**:

| New rule | Old stored event | Outcome |
|---|---|---|
| `uid` required, stamped at commit | no `uid` | **permanent wedge** |
| `uid` required, stamped in `toWire` | no `uid` | passes ✓ |
| type whitelist | an unsynced legacy `StrutDeployed` | **permanent wedge** |
| caps | `notes` over 500 chars from a pre-cap build | **permanent wedge** |
| `at` clamp | `at` from a fast clock | wedge until wall time catches up (≤ 24 h) |
| `account.id` binding | backlog from account A, flushed after B signs in | **wedge until A signs back in** |

ADR-041's "wedges until refresh" is true **only** when the refreshed client can turn every stored event into a passing wire form.

### 2.3 Design decision required (B3): generated-from-Zod vs quarantine
`flush` treats every rejection while online as retryable. An *offline* `update()` buffers rather than rejecting, so an online rejection is in fact a definite denial, yet the same head is retried forever. Pick one of:

- **(A, recommended) Generated from Zod, so a client can never commit what the rules reject.**
  - Generate the whitelist and caps from `FieldShoreEvent`, and add `.max()` to the Zod leaves.
  - `operationStore.doCommit` already `safeParse`s, so an over-length note fails at commit, in the UI, where the user can fix it.
  - For stored legacy data, `toWire` truncates strings to the cap (the cloud copy may then differ from a local over-long note; that is acceptable because reducers never read free text). Unsynced legacy types are a beta-only concern: just check queues are empty before deploying.
  - Add a **wire-conformance rules test** (§5) that pushes one fixture of every live type, plus a no-`uid` legacy fixture, through the real `toWire` into the emulator.
- **(B) Quarantine.** When an *isolated single-event head* is denied twice while `.info/connected` is true, move it to a `quarantine` table, log it, surface "1 change could not sync", and continue.
  - Trade-off: this breaks "upload order = commit order", and later events that depend on the quarantined one fold as no-effect on peers. The ADR-041 "had no effect" notice covers the local side, but the device diverges until the user acts.
  - Use this only as a last-resort safety valve layered on (A), not instead of it.

Recommendation: **A now. B as a follow-up issue** (it is also the right answer to "an unknown future rule bug wedges the field").

### 2.4 Smaller offline items
- **Sign-out with a non-empty queue.** Under the `account`/`uid` bindings, A's queued events cannot be uploaded by B. Either block sign-out while `pendingCount() > 0` (with a "sync first" message), or show "N unsynced changes will wait for <A>". This needs a mockup if it touches UI.
- **`flush` before Auth is restored.** `main.tsx` starts `eventListenerSync` immediately after `authSessionSync.start()`, so the `firstMerge` push can race Auth restoration. `await firebaseAuth.authStateReady()` in `flush` (needed anyway for the `uid` stamp) removes the race.
- **Suggestion: a `/config/minAppVersion` handshake.** The rule already exists, but v4 does not read it. Reading it on boot and on reconnect, and prompting a reload when the build is older, shrinks the two-cold-start wedge window after every client-first or rules-second deploy.

---

## 3. App Check plan (change 5)

> **Verify before relying on these:** several App Check facts below are from memory, not checked against current docs this session: the TTL range (30 min to 7 d), the reCAPTCHA Enterprise free tier (10 k/month), the 24 h client throttle after a 403, the 15 min propagation time, and that the RTDB/Auth emulators do not enforce App Check. Confirm them against firebase.google.com/docs/app-check before writing ADR-042. Skipping init under `USE_EMULATORS` is safe either way.

**Provider.** Use **`ReCaptchaEnterpriseProvider`**. Firebase now steers new integrations to reCAPTCHA Enterprise, and classic v3 keys are being migrated into Cloud projects anyway.
- Enterprise exposes a **configurable score threshold** in the App Check console. Set it low (about 0.1 to 0.3). App Check here exists to stop **scripts**, not to judge humans: membership remains the real gate, and a firefighter on a gloved, wet phone in an iOS standalone PWA (where ITP depresses scores) must never be scored out on scene.
- Free tier: 10 k assessments per month. Each token exchange is one assessment.
- **Token TTL: 12 to 24 h** (configurable from 30 min to 7 d; the default is 1 h). A longer TTL means far fewer assessments, and more importantly **a phone that comes back from a multi-hour outage usually still holds a valid token**, so reconnecting does not depend on reCAPTCHA being reachable. Replay risk is acceptable for this threat model.
- Allowlist the reCAPTCHA key domains: `fieldshore-database.web.app`, `fieldshore-database.firebaseapp.com`, and the beta channel host `fieldshore-database--beta-hwdkojxb.web.app`. **Do not allowlist `localhost` or `*.local`**; use debug tokens for those.
- A misconfigured domain causes the exchange to return 403, and **the App Check SDK then throttles that client for about 24 h**. Verify the allowlist on the beta *before* enforcing anything.

**Placement.** Put it in `src/data/auth/firebase.ts` right after `initializeApp`, before `getAuth`/`getDatabase` are used. Use the same run-once global guard pattern as `__fsEmu`, because `initializeAppCheck` throws on a second call during HMR:
```ts
if (!USE_EMULATORS && !g.__fsAppCheck) {
  g.__fsAppCheck = true;
  if (import.meta.env.DEV) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
```
- Hard-code `RECAPTCHA_SITE_KEY` the way `apiKey` is hard-coded (it is public). If it came from a CI secret instead, a missing secret would silently ship a build with no App Check, which bricks the beta once enforcement is on.
- **Add a build guard:** in `vite.config.ts`, throw if `mode === 'production' && env.VITE_APPCHECK_DEBUG_TOKEN`. A debug token in a deployed bundle would bypass App Check for everyone.

**Offline and cold-start behaviour (must be tested on device; not fully verifiable from docs):**
- The reCAPTCHA script (`www.google.com/recaptcha/...`) is **not precached**, and Workbox only intercepts `firebaseio.com` and `wss:`, so this is not a caching bug.
- A PWA **cold-started offline** (a basement, airplane mode) cannot load the script. App Check initialisation must never block boot, and it does not: it is async and token-on-demand. Whether the provider retries loading the script when the device comes back online, rather than needing a reload, is **unverified**. This is qa-driver scenario 2 below.
- With a 12 to 24 h TTL, a token minted before going offline usually survives the outage.

**RTDB enforcement on an open WebSocket.**
- The RTDB SDK sends the App Check token when it connects and refreshes it over the live connection.
- Console enforcement can take **up to about 15 min** to propagate.
- Whether an already-open, token-less connection is cut or keeps working until it reconnects is **unverified**. Test it on the beta: enforce, leave a device connected, watch it, then toggle airplane mode.

**B4: listener cancellation (must fix before enforcing on RTDB).** `firebaseSubscribe` calls `onValue(ref, cb)` **with no cancel callback**. If a listen is ever denied, the SDK cancels it **permanently and silently**. That can happen through App Check (no token at reconnect), a membership revoke, or Auth not yet restored. The device then stops receiving peer events until reload, while writes may keep working. In an IC context that is a stale-board hazard.
- Add the third `onValue` argument: log `listener_cancelled` and re-subscribe with backoff (5 s → 60 s cap, reset on success).
- Flip a `syncStatus` flag so the banner shows "not receiving updates".
- This applies to all three listeners (events, state, roles).

**Callables.** Change `onCall(handler)` to `onCall({ enforceAppCheck: true }, handler)` on `provisionAccount`, `adminUpdateAccount` and `deleteOwnAccount`. The client Functions SDK attaches the token automatically once App Check is initialised. Rolling back requires a redeploy. Skip `consumeAppCheckToken` (replay protection): it costs latency and does not address this threat model.

**Emulator and Playwright (TTX harness).**
- The RTDB and Auth emulators do not enforce App Check, and `npm run emulators` does not run the Functions emulator.
- So under `USE_EMULATORS` (`npm run dev:emu`): **skip `initializeAppCheck` entirely**. The 3-device Playwright harness then needs **no debug token** and is unchanged.
- Debug tokens are needed only for:
  - (a) `npm run dev` on :5199, including a phone at `<mac>.local:5199`. Register one debug token per developer browser in the console, kept in gitignored `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN`.
  - (b) Any Playwright run against the **real** beta. Headless Chrome scores low on reCAPTCHA, so a registered debug token is injected via `page.addInitScript(() => { self.FIREBASE_APPCHECK_DEBUG_TOKEN = '<token from env>' })`, and is never committed.
- **Enforcing RTDB without (a) configured breaks Alex's local dev and phone testing against the real project.**

**CI (`deploy-v4-beta.yml`).** No secret is needed for the site key (hard-coded). The build step must **not** receive `VITE_APPCHECK_DEBUG_TOKEN`; add the build guard above. Optionally add a step that greps `dist/` for `FIREBASE_APPCHECK_DEBUG_TOKEN` assignments and fails if found.

**Enforce or monitor?** **Monitor first.** It costs nothing, it is reversible, and the console shows verified versus unverified request percentages per service.
1. Ship the client with App Check, unenforced.
2. Watch the App Check metrics through #264 and Alex's phone runs, including the offline cold-start and long-outage scenarios.
3. Enforce on the **callables** first (low traffic, low risk).
4. Enforce on **RTDB last**, only once about 100% of requests are verified **and B4 has shipped**.

**Rollback** for RTDB is a console toggle (unenforce), which takes effect within about 15 min.

---

## 4. Rate limiting (change 4 of the question)

**Is it feasible?** Yes, using the known pattern:
- Each upload is a multi-path `update()` at `orgs/{dept}` that also writes `throttle/{uid} = {'.sv':'timestamp'}`.
- The throttle rule is `newData.val() == now && (!data.exists() || data.val() <= now - 1000)`.
- The event rule requires `newData.parent().parent().parent().child('throttle').child(auth.uid).val() == now`.

**Recommendation: reject it.**
- **It conflicts with offline catch-up.** `flush` sends 100-event chunks back-to-back. The second chunk inside the window is denied, which drops the pass to single-group fallback (`chunked = false`) and then to the 5/15/60 s backoff. A 1,000-event backlog after a long outage would take many minutes to drain, which is exactly when the IC needs the board current.
- Every upload would have to be re-rooted at `orgs/{dept}` instead of `/events`. That touches the ADR-041 chunk and lost-ack logic and its tests.
- A `members/$uid/lastEventAt` variant also needs a Member schema change and a `SELF_EDIT_RANK` carve-out. The `throttle/$uid` node is also contended across one member's devices.
- It still does not bound bytes per write, because there is no size function in RTDB rules.
- **The real flood actor is an authenticated member** (outsiders are already locked out). The proportionate controls are:
  1. App Check (enforced), which stops scripted clients and the open self-registration trees.
  2. Named-field caps.
  3. **Revocation**: `active:false` cuts that member's writes at the next write.
  4. A GCP budget alert. Note that it **alerts, it does not cap**. An optional Pub/Sub-triggered function could disable billing, but for RTDB on Blaze that means an outage, so alert only.
- Note: the events listener downloads the **whole department log** on every (re)connect. Junk volume multiplies across every member device, so cost growth shows up as download bandwidth first. Watch "Downloads" in the RTDB usage tab.

---

## 5. Rollout order and verification

**Order:**
0. **R1 rules deploy** (additive only): invite `expiresAt` optional + REVOKE freeze. Nothing else changes (B6).
1. **Client build** (pushed to `v4-redesign`, which auto-deploys the beta channel):
   - `toWire` adds `uid`; `flush` awaits `authStateReady`.
   - Zod `uid?`, `.max()` caps, and `InviteCode.expiresAt?`.
   - The invite UI with expiry (**mockup first**).
   - The join error-message fix.
   - The `firebaseSubscribe` cancel handler (B4).
   - State stamps using `serverTimeOffset`.
   - App Check init, unenforced.
   - The sign-out guard.
2. **Verify the beta client is live.** Read the Channel URL from the latest workflow run. Open the app on every device Alex uses, **cold-start each one twice** (PWA update), and confirm the sync banner shows **0 pending** on each. This is the "no pre-upgrade backlog" check.
3. **Pre-deploy data sweep.** Look for future-dated STATE `lastWriteAt` (B5) and for any unsynced legacy event types. Record the currently deployed rules commit SHA (`git log -1 --format=%H -- database.rules.json`) as the rollback point.
4. **Deploy the rules:** `firebase deploy --only database --project fieldshore-database`. Never `--only hosting`. Rules are project-wide: localhost dev is affected immediately.
5. **Post-deploy smoke on the beta** (qa-driver):
   - Create an op, log a hazard with a long note, transfer command, regenerate an invite and join with it.
   - Check `/diagnostics/sync` for new `flush-failed` or `state-write-failed` entries.
6. **Then Stage B #264** (fresh-start re-import), so the import is exercised against the hardened rules. Running #264 first would re-import data that the new rules then treat as legacy.
7. **App Check enforcement:** callables first, then RTDB, after the metrics window (§3).

**Rollback:**
- Rules: `git show <SHA>:database.rules.json > /tmp/r.json`, point a temporary `firebase.json` at it (or revert the commit), then `firebase deploy --only database`.
- App Check on RTDB: a console toggle.
- Callables: redeploy without `enforceAppCheck`.
- The **event** client changes are backward-compatible with the old rules: an extra `uid` passes the current envelope, which has no `$other:false`. The **invite** change is not: it needs R1 before the client (B6). New diagnostic payload keys must stay inside `/diagnostics/sync`'s allowed set (`ts, event, deptId, error, reason, path, id`; that tree is `$other:false`), or the log write is silently denied. Once R1 is in, the client never needs rolling back to undo the rules.

**Rules tests today** (`tests/rules/orgs.rules.test.ts`, about 40 cases):
- custom-role management
- the invite-code lifecycle (revoke, re-arm denied, field freeze, no delete, non-founder admin publish)
- join and anti-lockout
- #439 profile fields
- legacy-tree lockdown
- dept founding
- the ADR-041 event envelope (server-stamp `== now`, a literal stamp rejected, a missing stamp rejected, create-only, a batch sharing one stamp, the chunk shape at `/events`, an atomic batch with one bad event, and non-member/revoked/anon denied)

They are **local-only (they need Java) and not run in CI.**

**Add (TDD, red first):**
- **Events:**
  - `uid` match passes; `uid` mismatch or missing fails.
  - `account.id` equal to the writer passes; another uid fails; absent passes.
  - Every generated live type passes; `StrutDeployed`, an unknown type, and a 41-character type all fail.
  - Each cap path passes at 500 and fails at 501. A `null` `patch/label` and a nullable `location` pass. A non-string value at a capped key passes (the type-agnostic form).
  - `opId`/`id` body-path mismatch fails.
  - **Update the existing ADR-041 fixtures to include `uid`**, otherwise they all flip red.
- **Wire conformance (new and most valuable):** for each live event type, build a fixture through the real `toWire` and `assertSucceeds` it in the emulator. Add a **legacy Dexie fixture** (no `uid`, pre-ADR-041 shape plus `receivedAt`) through the new `toWire` that must pass. This closes the generator-to-rules drift for events, as the L-11 shape test does for departments.
- **deviceOwners:**
  - Self-claim of a new row passes; refreshing your own row passes.
  - Overwriting another member's row fails; a self-delete fails.
  - An admin repoints to a member uid; repointing to a non-member uid fails; an admin clear passes.
  - Revoked members and outsiders fail.
- **Invites:**
  - Create with `expiresAt` in range passes; missing, in the past, or more than 7 d fails.
  - Join with an unexpired code passes; an expired code (seeded with `Date.now()-60000`) fails; a legacy code with no `expiresAt` fails.
  - Revoking a legacy code passes; a revoke that changes `expiresAt` fails.
- **STATE:** `lastWriteAt = Date.now()+10min` fails; `now` passes; a poisoned node seeded at `Date.now()+1 year` can be overwritten by a gated write at `now`; the monotonic rule still rejects an older stamp on a healthy node.
- **`/userDepts`:** a long `deptName` and an extra field both fail.
- **ID caps:** the `≤ 64` caps on `id`, `opId` and `by` fit `newId()` (`crypto.randomUUID`, 36 characters). Before committing, confirm the #264 converter script and any v3-derived ids also fit.
- **#264 interaction:** #264 re-imports **inventory** (the STATE path via `upsertImport`), not events, so the event whitelist does not affect it. The STATE clamp does: the converter must stamp `lastWriteAt` at or below the current time. `StrutDeployed`/`StrutReturned` are read by reducers but emitted nowhere outside tests, so excluding them from the whitelist is safe.
- **CI:** add a `rules-test` job (`actions/setup-java@v4`, temurin 21, then `npx firebase emulators:exec --only database --project fieldshore-database "vitest run --config vitest.rules.config.ts"`). Make the deploy job `needs: rules-test`. The npm script's Homebrew `PATH` prefix is harmless on Ubuntu, but calling it directly is cleaner.

**Hand to `qa-driver` (offline-drop simulation on the beta, real devices):**
1. Commit 20 events offline, reload while still offline, reconnect: all drain with `uid` present and no wedge.
2. **Airplane-mode cold start**, work 15 min, reconnect: writes and *peer listens* resume without a reload (App Check script retry and B4).
3. Offline for longer than the App Check TTL (temporarily set TTL to 30 min), then reconnect.
4. iOS standalone PWA backgrounded for hours, then resumed.
5. Revoke a member while their device is connected: their writes are denied, and the listener cancel is surfaced rather than silently freezing the board.
6. A device clock set 10 min fast: events still sync (no `at` clamp), and STATE edits sync via `serverTimeOffset` stamps.

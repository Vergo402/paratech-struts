# Adversarial review: v4 Security Hardening design brief (draft 2026-10-11)

Reviewer: skeptical-senior-engineer (Opus). Reviewed against the code on `v4-redesign` at `6decde3`.
Scope: `.claude/audits/phase-j/security-hardening/DESIGN-BRIEF-draft.md`, plus the code it cites.

**Verdict: REWORK.** The brief's main claim is wrong. Change 1 is presented as closing threat #1 ("seizes command, ends the op"). It does not close either one, and it only records who did it. Two cheap rule changes that *would* close most of threat #1 are missing. Two parts of the plan (a required Zod field and Zod caps on the read schema) would also silently delete legacy history or permanently wedge a device's upload queue during a live op. App Check carries the highest risk of any item and does almost nothing against the threat Alex ranked first.

---

## Block: do not ship until resolved

### B1. After change 1, a Default member can still end, reopen or edit the op
- `EVENT_WRITE` (`src/core/schema/rules.ts:181`) only checks active membership. The only `manageOperations` gate is in the UI (`src/ui/command/EndOperationButton.tsx:15`, `src/ui/operations/OperationsBoard.tsx:397`). Default has `manageOperations: false` (`src/core/schema/department.ts:132`).
- A Default member who writes `OperationEnded` straight to RTDB gets it accepted, and every device folds it. A type whitelist doesn't help, because `OperationEnded` is on the whitelist. A `uid` field doesn't help either, because it only records who did it.
- The rules.ts comment claims rules "don't crack the discriminated union" (rules.ts:24-25, 167-169). That's wrong for back-office gating. `newData.child('type').val()` is readable, so this rule works:
  `(type not in {OperationCreated, OperationEdited, OperationEnded, OperationReopened}) || permissionGate('manageOperations')`
  It reuses the existing `permissionGate` and is one string.
- Also missing: no rule reads `runFieldWork`. A department-defined read-only custom role (runFieldWork=false) can write every event type today. The event stream should require `permissionGate('runFieldWork')`. ADR-017 already promises this capability, and the rules never enforce it.
- This does NOT contradict ADR-017's "fireground is ICS-position-gated" axis. These are the back-office permissions ADR-017 defines, and they are enforced server-side the same way #380 did for STATE.

### B2. After change 1, any member can still take command
- The reducers trust a client-asserted `account.id`. MyRoleSet is keyed on `account?.id ?? by` (`src/core/org/orgReducer.ts:94`), Initiate checks it (`:112`), and Accept checks it (`:128`). The brief's new `uid` field is never read by any reducer.
- The attack takes two events, and both pass the proposed rules. The IC's account id is readable from the member roster.
  1. `CommandTransferInitiated { account:{id:<IC uid>}, toResource:{ref:'account', value:<attacker uid>} }`. The fold check at orgReducer.ts:112 passes.
  2. `CommandTransferAccepted { account:{id:<attacker uid>}, transferId }`. `canAccept` passes.
- **Required rule:** `!newData.child('account').exists() || newData.child('account').child('id').val() === auth.uid`. Once that's in place, the reducers' existing account checks mean something. This change does more for threat #1 than the whole `uid` field.
- Residuals that the ADR must name:
  - A **device-ref IC** (a guest-founded op, legacy) is still spoofable by forging `by`. Device uids are readable in every event and in `deviceOwners`.
  - An **individual/apparatus-ref IC** can't be verified at all (orgReducer.ts:108-110, "the UI gates the button"). Any member can initiate against it.
  - Both stay open unless the rejected option (B, a server-side referee) is built. Say so plainly instead of implying threat #1 is closed.

### B3. A required `uid` and `.max()` caps in the Zod schema would silently delete existing history
- The event schema is the read gate. `loadEvents()` drops every Dexie row that fails the current schema on boot (`src/data/store/operationStore.ts:318`), and `ingestRemote` drops every cloud event that fails it (`:462`).
- A required `uid` in `base` would erase every pre-change event from every device's projection on its next boot, including `OperationCreated`, so whole operations disappear. It also erases every legacy cloud event on ingest.
- The `.max(500)` caps do the same thing to any legacy hazard, shore point or position whose text is over 500 characters. A hazard that disappears is a life-safety regression. The device that drops it also silently diverges from any device still on the old build, which breaks the ADR-041 convergence guarantee.
- **Fixes:**
  - Put `uid` on the WIRE only. Add it in `toWire` (`src/data/sync/syncService.ts:99-101`) from the current Firebase user at upload time. In the schema it must be `.optional()`.
  - Put the caps on the COMMIT path only (the emit-site schemas or a commit-only refinement), never on the parse schema used by `loadEvents` / `ingestRemote`.
  - Every capped field also needs `maxLength` and a visible counter in the input. Otherwise a crew member typing a hazard note gets an opaque "invalid event: …" commit failure mid-op.
- Stamping at upload means `uid` records the *uploader*, not necessarily the author. On a shared rig tablet, account B's sign-in uploads account A's unsynced backlog (same dept bucket, deviceUid kept across sign-out, `session.ts:61`). Document that. The other option is to stamp at commit, which permanently wedges those events. Both are wrong in some cases; choose one deliberately.

### B4. Every new rejection condition can wedge a device's sync for the rest of the op
- `flush()` uploads strictly from the head of the queue and stops at the first rejected write. The failed event and everything after it is kept and retried with backoff forever (`syncService.ts:367-370, 413-416`). There is no dead-letter path. `settleLostAck` only covers "already landed".
- The brief adds at least five new reasons a single event can be rejected:
  - missing or mismatched `uid`
  - a string over the cap
  - a type not on the whitelist
  - `at > now + 5 min`
  - a member demoted or revoked while offline, if B1 is adopted
- Any one of these stops ALL of that device's later work from syncing: shore-point statuses, hazards, accountability. The device keeps working locally, and everyone else stops seeing it. This is ADR-024's "staleness is life-safety" case, caused by our own rules.
- **Prerequisite for ANY tightening of the event rules:**
  - Classify `PERMISSION_DENIED` as permanent, distinct from offline or transient errors.
  - Move the rejected event to a quarantine.
  - Surface it on the losing device the same way ADR-041 surfaces "N of your changes had no effect".
  - Keep draining the queue. This changes the ADR-041 "upload order = commit order" invariant only for events the server will never accept, so it needs an ADR-041 amendment, not a quiet edit.
- The whitelist must be GENERATED from `FieldShoreEvent.options` in `rules.ts`, not hand-listed. Otherwise every new event type is a guaranteed wedge until someone remembers to update the rules. The generator pattern (L-11) exists exactly for this.

---

## Push back: needs justification

### P1. The 5-minute future clamp on `at` (change 1) is theater, and risky
- ADR-041 made `receivedAt` the order. `at` is audit-only, and reducers never read `receivedAt`. So a future `at` can no longer reorder anything. It only mislabels a timeline row.
- The cost is real. The device's monotonic clock deliberately tolerates a floor up to **24 h** ahead (`CLOCK_SKEW_LIMIT_MS`, `src/core/clock.ts:35`). Take a phone whose clock ran 10 minutes fast and was then corrected by NTP: it keeps stamping `last+1` for up to 24 h, and every event is rejected. With B4, that's a full sync wedge.
- Either drop the clamp, or set it to at least the 24 h limit and have the generator take it from the same constant.

### P2. Change 3 (clamp on STATE `lastWriteAt`)
- The threat needs a `manageInventory` or `manageSettings` holder acting maliciously. That's already a trusted back-office role.
- The honest-device failure is silent. Inventory stamps `Date.now()` directly (`src/data/store/inventoryStore.ts:139`), and `setState` swallows rejections into diagnostics (`syncService.ts:513-517`). So a phone whose clock is more than 5 minutes fast loses every inventory and settings edit, with no tell.
- If this stays: use a 24 h window, and add a visible "couldn't save to the cloud" state for STATE writes. Better: say why a write-once server stamp (`lastWriteAt == now` plus a separate client `editedAt` for LWW intent) was rejected. That would remove the clock problem entirely.

### P3. Change 2: the await on deviceOwners, and first-writer-wins
- **Why await at all?**
  - `deviceOwners` is read only by a UI resolver (`src/ui/hooks/useDeviceOwners.ts`). No event rule references it.
  - Awaiting it before the backlog push protects nothing unless a future event rule binds `by` to `deviceOwners`, and the brief doesn't propose one.
  - If that IS the intent: a single RTDB client applies its writes in order. Issue the `set()` before the first `update()` and don't await. No hang.
- **Hang and wedge risk if it IS awaited:**
  - Offline, RTDB `set()` doesn't resolve until reconnect. That's survivable, because the flush can't succeed offline anyway.
  - The dangerous case is a REJECTED seed. Under first-writer-wins, account B on a shared rig tablet is rejected. `seedDeviceOwner` currently swallows that (`src/data/store/session.ts:202`). If the gate treats "seed settled OK" as the precondition, that device's backlog never pushes.
  - Other cases: the seed only runs inside `onAuthStateChanged` with a member identity (`src/data/auth/authSession.ts:68`). If that callback runs into a null user or no department, the gate never opens.
  - The gate needs a timeout and must open on rejection.
- **Simpler fix:** gate the flush once on "first `onAuthStateChanged` fired with a user". The Firebase user restores from IndexedDB offline, with no network round trip. Change 1 needs that gate anyway: `toWire` needs `auth.uid`, and today the backlog push can start in the same tick, before auth restores (`src/app/main.tsx:42-48`). Then fire the seed without awaiting it.
- **First-writer-wins vs. ADR-024:** ADR-024 explicitly has one device UID shared by multiple accounts (provisioned members and guests ride one device UID). First-writer-wins means the first account to use a shared tablet owns it forever, and only an admin override could fix that. That's the brief's own open question, and it needs an answer before build, not after.
- Once `uid` and `account.id` are bound by rule (B2), new events no longer need `deviceOwners` for identity. It survives only for legacy device-ref positions. On a fresh-start department (#264) there are none. Is change 2 worth building at all for a beta re-founded from scratch?

### P4. Change 5: App Check (reCAPTCHA v3) is the riskiest item for the least gain
**What it buys.** Against threat #1 (insiders and ex-members), nothing: they run the real app. Against threat #2, nothing beyond what the membership `.read` already does. Against threat #3, it raises the cost of scripted abuse of the paths open to any signed-in user: `/feedback`, `/diagnostics`, dept create, code lookups. Those paths already have size caps and `$other:false` (`database.rules.json:7-38`). The brief's "size caps on feedback/diagnostics" item is **already shipped**, and its "current posture" line 22 undersells that. The real gap there is RATE limiting, which App Check does not provide either.

**What it risks:**
- **It fails closed by design.** Enforcement is project-wide for RTDB, not per path. You can't enforce on `/feedback` only.
- **Reconnecting from a poor-signal void.** A device back from a void needs several new round trips to Google hosts before RTDB will accept it: a reCAPTCHA execution (google.com), then a token exchange (firebaseappcheck.googleapis.com). That's on top of the RTDB socket. The default token TTL is short (about 1 h; configurable, verify the reCAPTCHA range in the console).
- **iOS standalone PWAs** run reCAPTCHA v3 with limited cookies and no mouse signal. A low score means the exchange is refused, which means a legitimate firefighter's device can't sync, with no in-app explanation.
- **reCAPTCHA script offline.** If the PWA cold-starts offline, the cross-origin reCAPTCHA script may not be in the Workbox cache. Whether App Check init recovers once the device is online needs testing.
- **Already-open realtime connections. VERIFY, don't assume.** The RTDB SDK has an "App Check token revoked/invalid" path that drops and re-establishes the connection. Whether an *expired* token on a long-lived socket gets dropped when refresh fails is not documented clearly enough to bet a live op on. Test it on the real project with a short TTL and refresh blocked.
- **Provider choice. VERIFY.** Firebase's docs steer new integrations to **reCAPTCHA Enterprise** rather than v3, and Google moved reCAPTCHA keys under Cloud billing with a free monthly assessment tier. Check current quota and pricing before choosing v3.

**Testing gap.** The emulators do not enforce App Check (verify, but that's the documented behavior). So the TTX harness can prove nothing about it. `fieldshore-database` is both the beta and the future production project, with no staging project. The first real enforcement test is effectively production.

**Harness and dev:**
- Do NOT initialize App Check at all in `--mode emulators`. Playwright probes deliberately go offline (`driver.mjs:335`), and reCAPTCHA init would be flaky noise.
- The TTX driver's REST writes use `Bearer owner` against the emulator, which App Check doesn't touch.
- `npm run dev` on :5199 and phone testing at `http://<mac>.local:5199` hit the REAL project. They'll need registered debug tokens. Those are bearer secrets that bypass App Check in production: never commit them, never put them in a `VITE_*` env baked into the beta build, and revoke them per device.
- The reCAPTCHA domain list must include the beta channel host exactly (`fieldshore-database--beta-hwdkojxb.web.app`), not `web.app`.

**Recommendation:**
- Enforce App Check on the **3 callables only**. They're online-only, low frequency, and enforced per function.
- Run RTDB App Check in **monitor-only (metrics)** mode for weeks of real use before any enforcement decision. The brief skips the monitor phase Firebase itself recommends.
- Handle feedback/diagnostics flooding with rules: a `now`-stamped timestamp plus a per-uid throttle node, or membership-gate `/diagnostics`.
- Keep the budget alert, but remember it doesn't cap spend.

### P5. Change 6: is "client first, rules second" actually safe?
- **No mechanism confirms the client update landed.** `config/minAppVersion` exists in the rules (`database.rules.json:39-45`), but **no v4 code reads it** (grep finds no reference in `src/`). Nothing forces or detects the update.
- **PWA updates take two cold starts** (project memory). A phone that stayed offline through a multi-day op comes back on the OLD build after the rules deploy. Its uploads are rejected, which with B4 means a full wedge. That clears only if the device eventually takes the new build and reloads, AND the new build can re-upload the old backlog. That only works if `uid` is added at `toWire` time (B3). If `uid` is a committed field, old-build events can never upload.
- **Old-build events over the cap can never upload under any build.** That needs either truncate-at-wire (it mutates history, so record it) or the B4 dead-letter.
- **Recommendation:**
  - Wire `minAppVersion` into the client. Block writes and show "update required" when the build is below it.
  - Bump `minAppVersion` with the client release.
  - Deploy the rules only after the beta device set has been confirmed on the new version.
- **Exposure today is LOW** (beta, Alex is the only tester, CLAUDE.md 2026-10-09). This is mainly about building the right mechanism before the Phase J cutover, not an emergency.

### P6. Change 4: invite expiry
- **The real justification isn't the one the brief gives.** 40-bit codes can't be enumerated: the parent has no `.read`, and guessing one active code at 1k req/s takes decades. The real reason is the ex-member re-join path. A member removed by DELETE (rather than `active:false`) can rejoin with any still-active code, because JOIN only checks `!data.exists()`. Expiry narrows that window. ADR-022 also promised time-boxing, so this is fulfilling an existing decision, which is fine.
- **24 h default.** USAR crews work 24/48 and multi-day deployments. A code given out at roll call can be dead before the B-shift member opens the app. Ask Alex, with the shift pattern in mind. The UI also needs a "this code expired — ask your Admin for a new one" path, separate from "invalid code". The current copy at `src/data/dept/departmentService.ts:436` already reuses "expired" for *revoked*.
- **Rule details:**
  - Add `expiresAt` to the REVOKE branch's frozen-field list.
  - Cap `expiresAt <= now + 7d` in the CREATE branch, if the picker's maximum is meant to be policy.
  - Legacy codes without `expiresAt` become **unrevocable**: the generated `hasChildren` fails the `update({active:false})` at departmentService.ts:816. That's harmless, since they also can't satisfy `expiresAt > now` for joins, but say so.
  - The client-side expiry check must be advisory only. A skewed device clock must not be the judge; server `now` is.
- **A join queued offline** (`queueJoin`) whose code expires before reconnect fails on retry. Decide what the user sees.

### P7. Timing: "before Stage B #264" is scope creep on the critical path
- #264 imports inventory STATE rows. It never touches the event log, codes or deviceOwners.
- The only hardening item that touches the import is change 3, and an honest Mac clock passes it trivially. The import is also redoable.
- Putting a six-part security program (one part needs a mockup) in front of #264 delays #265, #263 and Stage C for no gate-relevant reason.
- Note: #264's R0b rules-parity check compares the deployed rules to the committed file. Rules work in flight during #264 will make that check fail or go stale.

---

## What's missing that matters more than what's listed

1. **B1 (manageOperations / runFieldWork rule gates) and B2 (`account.id === auth.uid`).** These are cheap, server-side and enforceable, and they actually close most of threat #1. They're worth more than the whole `uid` field.
2. **Event path/body binding.** `EVENT_ENVELOPE_VALIDATE` never checks `id === $eventId` or `opId === $opId`. The listener flattens by VALUE and ignores keys (`src/data/sync/eventListener.ts:51-61`), and reconcile trusts the body `id` (`syncService.ts:447-448`).
   - A member can write at `/events/opX/<random>` a body whose `id` duplicates an existing event's id, with different content.
   - Devices that already hold the original ignore it. A freshly booted device may fold whichever copy it sees first. That splits devices: exactly the defect ADR-041 just closed, now reachable on purpose.
   - The fix is one line: `newData.child('id').val() === $eventId && newData.child('opId').val() === $opId`.
3. **The poison-event dead-letter (B4).** Without it, every rule in this brief is also a self-inflicted outage for any device that trips it.
4. **Wire caps that actually bound size.**
   - The brief caps 5 named fields. With no `$other:false` at the event level, a whitelisted type with an extra 10 MB `junk` field still passes.
   - Unbounded: BOM arrays and quantities, `claimCode`, checklist ids, and `role` strings.
   - If flooding is threat #3, the generator should emit `$other:false` from the union of all event keys, plus caps on the nested objects.
   - Also be honest that an authenticated insider can flood by COUNT, which rules can't rate-limit. The whole-dept `onValue` at `/events` makes every device re-fold O(N) on every change (ADR-041 already lists per-op `child_added` as a surfaced open question). The control against an insider flood is fast revocation. `active:false` takes effect on the next write evaluation, so that part is good.
5. **No remediation after attribution.** Even with `uid` bound, there's no way to discount or flag the events of a uid that has since been revoked. Attribution without a "show me everything ex-member X wrote in this op" view, or a way to mark it untrusted, is forensics nobody will ever run. Decide whether the Incident audit view filters by `uid`. If not, `uid` buys little in v4.0.
6. **Fail-safe vs fail-secure stance.** The brief never states that, for a life-safety tool, an authorization rule that wrongly rejects is worse than one that wrongly accepts and records who did it. That principle decides P1, P2, P4 and B4, and it belongs in ADR-042 explicitly.

## What's theater or YAGNI as specified

- **Event `at` future clamp (P1).** ADR-041 already removed `at` from ordering.
- **The type whitelist as a SECURITY control.** Every attack in B1/B2 uses a whitelisted type. The client Zod parse already drops unknown types on read. The whitelist's only real value is keeping junk out of storage, and only if it's generated (B4).
- **App Check on RTDB (P4).** It doesn't address the ranked threat, and it adds a fail-closed dependency on two extra Google endpoints at reconnect time.
- **The "size caps on feedback/diagnostics" line item.** Already shipped (`database.rules.json:11-35`).
- **Change 2's awaited seed (P3).** It protects a UI-only resolver that no rule consults.

## Contradictions with existing ADRs

- **ADR-024.** Its claim that "the seam makes Build C a transport variant, not an application mode" breaks under `uid === auth.uid`. A v5 command-post relay forwarding other devices' events would be the uploader for events it didn't author, and the rule rejects every one. Stamping `uid` at the wire (B3) makes `uid` the uploader by construction, which keeps Build C possible but weakens attribution. Record the trade in ADR-042 and amend ADR-024's Notes.
- **ADR-024 / ADR-022, one device UID for multiple accounts.** Change 2's first-writer-wins `deviceOwners` contradicts this (P3).
- **ADR-041, "upload order = commit order, the head is never skipped".** The dead-letter that B4 requires breaks this for permanently rejected events. It needs an explicit amendment, not a quiet edit.
- **ADR-041's rollout note.** "A stale service-worker build will fail to upload until it refreshes." ADR-041 accepted that once, for beta. The brief repeats the pattern without the `minAppVersion` mechanism that would make it safe at cutover (P5).
- **The rules.ts comment at :186-188** ("DO NOT bind `by` to auth.uid") stays correct, and the brief respects it by adding a separate `uid`. No conflict there.
- **ADR-017 enforcement.** B1 is what ADR-017 asks for. The current rules under-enforce it. This brief should fix that rather than defer it.

## Nits

- The brief cites `rules.ts:198-202` for the event rule. `EVENT_WRITE` is at :181; :198-202 is the envelope validate.
- "38 event types / 36 live": correct (`src/core/schema/event.ts:432-471`). `doCommit` already rejects the legacy Strut* literals, so the whitelist exclusion only matters for an ancient un-uploaded Dexie backlog. That's a wedge per B4, and negligible on a fresh-start dept.
- Change 2's "admin override may write another uid? — open". It can't stay open into build, because it decides whether shared tablets work (P3).
- Change 4's countdown UI needs the accepted-mockup gate (CLAUDE.md). The brief acknowledges this.

## What's actually good

- The threat ranking is honest, and rejecting E2E is right for exactly the reasons given (ADR-041 needs server stamps, ADR-018 needs plaintext). Not prioritizing lost or stolen phones is a defensible call for beta.
- Keeping `by` (device) separate from a new `uid` (account) respects the rules.ts:186-188 lesson instead of repeating the mistake that comment warns about.
- The deviceOwners finding is real. Today any member can rebind any device to themselves (rules.ts:404-409), and the brief caught it.
- The invite-expiry item honours an ADR-022 promise rather than inventing scope.
- TDD per gap on the emulator rules harness (`npm run test:rules`) is the right discipline. Keep it, and add a sync-level test that a rejected event does NOT stop later events uploading once the B4 dead-letter exists.

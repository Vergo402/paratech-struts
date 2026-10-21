# v4 Security Hardening — design brief v2 (post independent review, 2026-10-11)

Reviews: `REVIEW-skeptic.md` (verdict: rework) · `REVIEW-devops.md` (verdict: GO with changes, 7 blockers). Both converged on the same blockers; v2 incorporates all of them. v1 is in git history of this file.

## Threats Alex prioritised
1. Tampering: an outsider, ex-member, or low-role member edits shore points, inventory, org chart, or seizes command / ends the op during a live operation.
2. Snooping: lock out other departments and outsiders only. **Full E2E rejected** (breaks server validation, ADR-041 canonical order, ADR-018 after-action email).
3. Availability: flooding, quota burn, broken sync.
(Lost/stolen phone not prioritised.)

## Approach: "Lock the doors + name every actor" — rules + membership hardening. No client crypto, no server-side reducer, no signed events.

## What v1 got wrong (verified in code)
- Recording `uid` only ATTRIBUTES tampering; it does not prevent a Default member from ending/reopening/editing the op (`manageOperations` enforced only in UI, e.g. `EndOperationButton.tsx:15`; `rules.ts:181` checks membership only) or seizing command (reducers key on client-supplied `account.id`, `orgReducer.ts:94/112/128`; `uid` is never read).
- A REQUIRED `uid` or Zod `.max()` on parse would delete every pre-upgrade event on boot/peer-ingest (`operationStore.ts:318/374/413/462` drop rows that fail `safeParse`).
- Upload halts at the first rejected event and retries forever (`syncService.ts:367-370, 413-416`) — every new rule is a new way to wedge a device for the rest of the op.
- Event `id`/`opId` are not bound to the storage path (`eventListener.ts:flatten` ignores keys) — a member can plant a duplicate id with different content and re-split devices.
- 5-min clamp on event `at` is theater: `at` no longer orders (ADR-041) and the device clock tolerates 24h skew (`clock.ts:35`) → would block a device for up to a day.
- App Check on RTDB fails closed on reconnect from poor signal and the event listener has no cancel handler (a denied listen silently stops peer updates until reload).

## v2 changes

### Prerequisites (must land before any new rule deploys)
- **P1 Upload quarantine** (amends ADR-041): on a PERMISSION_DENIED (not network) rejection, move that event to a `quarantine` table, continue the queue, and tell the user "N of your changes were rejected" (reuse the ADR-041 "had no effect" surface). Add `account.id`/`uid` to the diagnostics record.
- **P2 Listener cancel handler**: `onValue` error callback on events/state/roles listeners → surface "sync paused: access denied" + retry; never silent.
- **P3 Rules tests in CI**: `npm run test:rules` runs in `.github/workflows/deploy-v4-beta.yml` before deploy; a new test drives EVERY event type through `toWire` against the rules (the whitelist/caps can't drift from the schema).

### R1 Prevent, not just record — event rules by type
- `account.id === auth.uid` whenever `account` is present (closes command seizure: `orgReducer.ts:110` already requires the initiator to be `currentIC`, so a bound `account.id` can't impersonate the IC).
- `OperationEnded | OperationReopened | OperationEdited` require role permission `manageOperations` (and `OperationCreated` if the UI gates it the same way — confirm).
- Type whitelist GENERATED from the `FieldShoreEvent` union by `scripts/gen-rules.ts` (regex, no braces — rules file can't contain `{}`); legacy `StrutDeployed/StrutReturned` excluded from new writes.
- `newData.child('id').val() === $eventId && newData.child('opId').val() === $opId` (path binding).
- Length caps on free-text fields (hazard `notes`/`location`, shore-point `label`, org `title`/`label`, ≤ 500) GENERATED from Zod `.max()` — Zod caps enforced at COMMIT only (`doCommit`), never on read/ingest.
- `uid` (= auth.uid) added at UPLOAD in `toWire`, optional in Zod, rule: `newData.child('uid').val() === auth.uid`. Pre-upgrade local backlog still uploads.
- DROPPED: 5-min clamp on event `at`.

### R2 deviceOwners
`.write`: `newData.val() === auth.uid && (!data.exists() || data.val() === auth.uid)` OR writer's role is **admin** (not merely manageUsers — B7). No await before upload; no deviceOwners check in the event rule (shared rig tablets, ADR-024).

### R3 STATE clock clamp (inventory/apparatus/titles/checklists/apparatusTypes/deptPolicies)
`newData.lastWriteAt <= now + 300000 && (!data.exists() || newData.lastWriteAt >= data.lastWriteAt || data.lastWriteAt > now + 300000)` — the last clause is the escape hatch so an already-future-stamped record can be repaired.

### R4 Invite-code expiry (ADR-022 model: multi-use · time-boxed · revocable)
- `inviteCodes/$code.expiresAt`; join rule adds `expiresAt > now`. Revocation (`active:false`) already exists — keep.
- Default + picker: **Alex to decide** (ADR-022 retired the 24h one-time code because 40 people / three shifts can't onboard in a day). Proposed: default 7 days; picker 24h / 7d / 30d; countdown + regenerate in Settings. UI change → mockup before build.
- Three-stage rollout (invite rules reject unknown fields today): rules with OPTIONAL `expiresAt` → client writes it → rules make it required.

### R5 App Check — monitor first
- reCAPTCHA Enterprise provider, low score threshold, 12–24h token TTL, auto-refresh on. Skipped under emulators (TTX harness unchanged).
- ENFORCE on the 3 callables (`provisionAccount`, `adminUpdateAccount`, `deleteOwnAccount`) now. RTDB in **monitor (unenforced) mode** for this issue; enforcing on RTDB is a separate later issue gated on P2 + a field test from a poor-signal reconnect.
- Feedback/diagnostics size caps already exist (`database.rules.json:11-35`) — no change. Alex sets a Firebase budget alert (manual).
- Per-member rate limiting: REJECTED (would choke the 100-event bursts after a long offline period).

### Rollout order
1. P1–P3 + client build (toWire `uid`, Zod commit caps, listener cancel, quarantine) → beta.
2. Rules deploy (R1–R3) after the beta build is live (ADR-041 order). `minAppVersion` exists in rules but no v4 code reads it — acceptable while beta-only; note in ADR.
3. R4 three stages. 4. R5 callables enforce; RTDB monitor.
- Record as **ADR-042 Threat model & tamper controls** (+ ADR-041 amendment for quarantine).
- Timing vs #264 (fresh-start re-import): reviewers split. Recommend: ship R1–R3 first, then #264 validates against the final rules (≈3 sessions delay). Alex to decide.

### Verification (qa-driver, real UI, emulator harness)
Default member tries End Operation / command transfer / reopen via a forged event → rejected + quarantined + user told; legit IC flow unaffected; offline 2h backlog of 100 events uploads clean; pre-upgrade device backlog uploads after rules deploy; future-dated inventory write rejected and a frozen record repairable; expired code rejected at join, countdown shown; every event type passes `toWire` rules test.

## Deferred (separate issues)
Roster contact privacy (per-child read refactor), 2FA (OQ #33), RTDB App Check enforcement, server-side position referee (B), signed events (C), lost-phone controls, `minAppVersion` client check.

## Estimate
P1–P3 + R1–R3 ≈ 2 sessions · R4 (incl. mockup) ≈ 1 session · R5 ≈ ½ session · ADR + evidence ≈ ½ session.

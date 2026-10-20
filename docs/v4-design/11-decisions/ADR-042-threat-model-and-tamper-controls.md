# ADR-042: Threat model and tamper controls — prevent-not-record rules, upload quarantine, invite expiry, App Check (monitor-first)

> Architecture Decision Record. Every committed design choice gets one. The number is the next sequential ID.

---

## Status

- [x] Proposed
- [ ] Accepted
- [ ] Superseded by ADR-XXXX
- [ ] Deprecated

**Date:** 2026-10-11
**Author:** Claude Fable 5.1 (brainstorming session with Alex; independent reviews by `skeptical-senior-engineer` and `devops-resilience` agents)
**Reviewer(s):** Alex approved the design 2026-10-11 (spec review pending). Review artefacts: `.claude/audits/phase-j/security-hardening/REVIEW-skeptic.md`, `REVIEW-devops.md`, `DESIGN-BRIEF-draft.md` (v2).
**Scheduling:** **Post-v4.0.** Alex ruled 2026-10-11 that this ships after the v4 cutover (v4.1 track), not inside Phase J. Tracked on the v4 board as the `[v4.1]` security-hardening issue. Nothing here blocks Stage B #264 / #265 / #263 or Stage C.

---

## Context

FieldShore v4 is an offline-first PWA whose department data lives in Firebase RTDB behind the `data/sync` seam (ADR-009), as an append-only event log folded in canonical cloud-receipt order (ADR-041). Alex asked for protection against bad actors interfering with a live operation. He prioritised three threats and ruled on scope:

| Threat | Priority | Scope ruling |
|---|---|---|
| **Tampering** — an outsider, ex-member, or low-role member edits shore points, inventory, or the org chart, ends the operation, or seizes command | Yes | Prevent where a rule can; attribute everywhere |
| **Snooping** — operation data visible outside the department | Yes | Lock out **other departments and outsiders only**. Google/Firebase may see plaintext. **Full end-to-end encryption rejected** (see Alternatives) |
| **Availability** — flooding, quota burn, broken sync | Yes | Abuse controls that cannot wedge a phone in the field |
| Lost / stolen unlocked phone | Not now | Deferred |

### Current posture (verified 2026-10-11 against `v4-redesign`)

- **Identity.** Email + password accounts (`src/data/auth/accountService.ts`); no 2FA (OQ #33); no App Check anywhere. Event `by` is a per-device UUID (`src/data/store/auth.ts:12-37`, ADR-024), not `auth.uid`. An optional `account:{id,label}` rides on `OperationCreated`, `MyRoleSet`, `CommandTransferInitiated`, `CommandTransferAccepted`; the org reducer keys positions on `account?.id ?? by` (`src/core/org/orgReducer.ts:94,112,128`).
- **Rules are generated.** `src/core/schema/rules.ts` → `npm run gen:rules` → `database.rules.json`. Rules tests: `npm run test:rules` (emulator + `@firebase/rules-unit-testing`); not yet in CI.
- **Event rule** (`rules.ts:181,198-202`): any active member may create; envelope-only validation (`id,opId,type,at,by`, `receivedAt == now`). No type whitelist, no binding of `account.id` or any uid to `auth.uid`, no length caps, no binding of `id`/`opId` to the storage path (`eventListener.ts` `flatten` ignores keys).
- **Role permissions are UI-only for events.** `manageOperations` gates End/Reopen in components (`src/ui/command/EndOperationButton.tsx:15`, `OperationsBoard.tsx`) but no event rule reads any permission.
- **deviceOwners** (`rules.ts:404-409`): any active member may overwrite any device's row with their own uid. Seeded fire-and-forget on auth boot (`authSession.ts:68`).
- **STATE nodes** (inventory/apparatus/titles/checklists/apparatusTypes/deptPolicies): last-write-wins on a client `lastWriteAt >= old` with no upper bound.
- **Join.** Any Firebase account + 8-char code (~40 bits) self-writes a `default` member row. Codes are revocable (`active:false`) but never expire; ADR-022 specifies *multi-use · time-boxed · revocable*.
- **Upload path.** `syncService.ts:367-370, 413-416` — a rejected write halts the queue at that event and retries forever. `operationStore.ts:318,374,413,462` — any stored or peer event failing `FieldShoreEvent.safeParse` is **dropped** on boot/ingest.
- **Listeners** attach per child path via `onValue` (`subscribe.ts:16`) with **no cancel/error callback**.
- `/feedback`, `/diagnostics` writable by any `auth != null`; size caps already present (`database.rules.json:11-35`).
- No dedicated threat model exists; ADR-021 §Threat model covers mis-taps, not adversaries.

### What the first draft got wrong (caught by independent review)

The v1 design proposed stamping each event with the signer's uid and trusting attribution. Review showed that **records** tampering but does not **prevent** a Default member from ending the operation or seizing command; that a *required* new field or `.max()` caps in the parse schema would delete every pre-upgrade event on boot; that every new rule is a new way to wedge a device's upload queue for the rest of the operation; and that App Check enforced on RTDB fails closed on a poor-signal reconnect with no error surface. All are addressed below.

---

## Decision

**Harden the cloud boundary with rules that prevent the high-stakes tampering a rule *can* decide, attribute everything else to the signed-in account, make a rejected write survivable on the device, time-box invite codes, and add App Check in monitor-first mode — with no client-side cryptography and no server-side reducer.** Ship post-v4.0.

---

## Specification

### Prerequisites (land before any new rule deploys)

**P1 — Upload quarantine (amends ADR-041).** In `syncService` a `PERMISSION_DENIED` rejection (not a network error) moves *that event* to a `quarantine` Dexie table and the queue continues. The user is told once per flush: "N of your changes were rejected by the department server" via the ADR-041 "Synced — N of your changes had no effect" surface, with a Quick View list. A `logSyncEvent('write_rejected')` diagnostic records `type`, `opId`, `uid`, rule reason. Quarantined events are never re-sent automatically; Settings → Sync shows them with "discard".

**P2 — Listener error surface.** Every `onValue` subscription (`events`, state blobs, `roles`) gets an error callback. On denial: a persistent "Sync paused — access denied, retrying" banner and exponential retry; never a silent stall.

**P3 — Rules tests in CI.** `npm run test:rules` runs in `.github/workflows/deploy-v4-beta.yml` ahead of deploy. New test: build one minimal valid event per `FieldShoreEvent` variant, pass it through `toWire`, assert the rules accept it (whitelist and caps cannot drift from the schema).

### R1 — Event rules that prevent, not just record

All expressed in `src/core/schema/rules.ts` (generated; the rules file may not contain `{}`; draft expressions in `REVIEW-devops.md`):

1. **Account binding.** If `account` is present, `newData.child('account').child('id').val() === auth.uid`. Closes command seizure: `orgReducer.ts:110` already requires the initiator to be `currentIC`, so a bound `account.id` cannot impersonate the IC, and an acceptance can only be written by the account it names.
2. **Permission-gated lifecycle events.** `OperationEnded`, `OperationReopened`, `OperationEdited` (and `OperationCreated` if the UI gates it identically — confirm at build) require the writer's role permission `manageOperations === true`.
3. **Type whitelist**, generated by `scripts/gen-rules.ts` from the `FieldShoreEvent` union as a regex (36 live types; legacy `StrutDeployed`/`StrutReturned` excluded from new writes).
4. **Path binding.** `newData.child('id').val() === $eventId && newData.child('opId').val() === $opId`.
5. **Length caps** on free-text fields (hazard `notes`/`location`, shore-point `label`, org `title`/`label`; ≤ 500 chars), generated from Zod `.max()`. Zod caps are enforced at **commit** (`operationStore.doCommit`) only — never on read or peer ingest.
6. **Signer stamp.** `uid` (= `auth.uid`) added at **upload** in `toWire`; optional in the Zod schema; rule `newData.child('uid').val() === auth.uid`. Pre-upgrade local backlogs still upload.
7. **Dropped:** any clamp on event `at` (no longer orders per ADR-041; device clock tolerates 24 h skew, `clock.ts:35`).

### R2 — deviceOwners

`.write`: `newData.val() === auth.uid && (!data.exists() || data.val() === auth.uid)`, OR the writer's role is **`admin`** (not merely `manageUsers`). No awaiting the seed before upload; no deviceOwners check inside the event rule (shared rig tablets, ADR-024).

### R3 — STATE clock clamp

For each LWW node: `newData.child('lastWriteAt').val() <= now + 300000 && (!data.exists() || newData.child('lastWriteAt').val() >= data.child('lastWriteAt').val() || data.child('lastWriteAt').val() > now + 300000)`. The last clause lets an already-future-stamped record be repaired.

### R4 — Invite-code expiry (ADR-022 model: multi-use · time-boxed · revocable)

- `inviteCodes/$code.expiresAt` (ms epoch). Join rule adds `expiresAt > now`. Revocation unchanged.
- **Default 7 days; picker 24 h / 7 d / 30 d** (Alex, 2026-10-11). Settings → Members shows the code, a countdown, **Regenerate**, and **Revoke**. This is a visible UI change: `show_widget` mockup + PNG before build (standing rule).
- Three-stage rollout because the invite rule rejects unknown fields today: (a) rules accept an *optional* `expiresAt` → (b) client writes it → (c) rules require it.

### R5 — App Check, monitor-first

- Provider: reCAPTCHA Enterprise (web), low score threshold, 12–24 h token TTL, auto-refresh on. Skipped under emulators (`npm run emulators`, Playwright TTX harness unchanged). Several provider details are flagged "verify" in `REVIEW-devops.md` and must be confirmed against current Firebase docs at build time.
- **Enforce** on the three callables (`provisionAccount`, `adminUpdateAccount`, `deleteOwnAccount`). **RTDB stays in monitor (unenforced) mode** in this ADR; enforcing it is a separate later issue gated on P2 plus a field test of a poor-signal reconnect.
- No per-member rate limiting (would choke the 100-event bursts after a long offline period). Feedback/diagnostics caps already exist. Alex sets a Firebase budget alert in the console (manual, one-time).

### Rollout order

1. P1–P3 + client build (toWire `uid`, Zod commit caps, listener error surface, quarantine) → beta; confirm two cold starts (PWA).
2. Deploy rules R1–R3 **after** the client build is live (ADR-041 order). `minAppVersion` exists in rules but no v4 code reads it — acceptable while beta-only; a client check is a deferred item.
3. R4 in three stages. 4. R5: callables enforced; RTDB monitor.

### Verification (qa-driver, real UI on the emulator harness, evidence to `.claude/audits/<issue>-shots/`)

- Default member forges End Operation / command transfer / Reopen → rejected, quarantined, user told; legit IC flow unaffected.
- Two-hour offline backlog of 100 events uploads clean; a pre-upgrade device's backlog uploads after the rules deploy.
- Future-dated inventory write rejected; a pre-frozen record is repairable.
- Expired code rejected at join; countdown and Regenerate work; revoked code rejected.
- Every event type passes the `toWire` rules test; rules tests green in CI.
- Denied listener shows the banner and recovers on re-grant.

---

## Rationale

- **Rules can decide these cases cheaply; a server referee cannot be justified yet.** Role permission and account binding are data already in the tree; a Cloud Function that replays the log to position-gate events (Alternative B) would make command transfer require connectivity and duplicate the reducer server-side.
- **Attribution still matters.** For everything a rule cannot decide (field-work events within a member's role), a bound `uid` makes tampering disownable-proof and an Admin deactivation stops it on the next write.
- **Survivability over strictness.** ADR-041 established "never drop, surface the loser"; P1 extends that to rejected writes. A rule that can strand a phone mid-op is a safety defect, hence the dropped `at` clamp and the STATE escape hatch.
- **Monitor-first App Check** gives abuse telemetry now without a fail-closed path in a collapse void.
- **Generated whitelist/caps** keep the schema the single source of truth (Principle: one gate, `operationStore.doCommit`).

---

## Alternatives Considered

- **Full end-to-end encryption.** Rejected by Alex (2026-10-11): hides data from Google but also from the server, breaking `receivedAt == now` canonical ordering (ADR-041), all rule validation, and the after-action email (ADR-018); a lost department key loses the operation history.
- **Field-level encryption of sensitive fields** (addresses, hazard notes, names). Rejected for now: the scope ruling is "outsiders only," which membership rules already deliver; revisit if a department requires zero-knowledge hosting.
- **B — Cloud Function referee for command/lifecycle events.** Rejected for now: ~5–7 sessions, requires connectivity to commit command transfer, duplicates the reducer. Reconsider if a department needs server-enforced ICS position gating.
- **C — Per-device signed events.** Rejected for now: ~6–8 sessions, key enrolment/recovery per device, and it adds no position checks.
- **Per-member write throttle in rules.** Rejected: chokes legitimate post-offline bursts.
- **Attribution-only (v1 of this design).** Rejected after independent review: records tampering without preventing it.

---

## Consequences

- **Positive:** a Default member can no longer end/reopen an operation or seize command via forged events; every event is tied to a signed-in account; planted duplicate ids are impossible; frozen inventory/settings become impossible and repairable; leaked codes die within the chosen window; abuse telemetry without a fail-closed path.
- **Negative:** the invite rollout needs three deploys; rules grow (generated, so maintainable); one more Dexie table (quarantine) and one more user-facing sync message; App Check adds a third-party script to the PWA.
- **Neutral:** `by` keeps its per-device meaning (ADR-024); the deviceOwners seed stays fire-and-forget; `database.rules.json` remains the deploy artefact of `rules.ts`.

---

## Related

- Principles: 6 (always-reversible status, via quarantine surfacing), 10 (radio rule unchanged), data-class principle (ADR-004).
- Other ADRs: builds on ADR-009 (RTDB behind the seam), ADR-017 (data-driven roles), ADR-022 (invite-code model), ADR-024 (device uid), ADR-025 (auth), **amends ADR-041** (rejected writes are quarantined, not retried forever).
- Open questions resolved: none. Surfaced: RTDB App Check enforcement; `minAppVersion` client check; roster contact privacy (per-child `.read` refactor); 2FA (existing OQ #33); lost-phone controls.

---

## Notes

- Deferred, each to its own board issue when this ADR is built: roster contact privacy, 2FA, RTDB App Check enforcement, server referee (B), signed events (C), lost-phone controls, `minAppVersion` client check.
- Estimate: P1–P3 + R1–R3 ≈ 2 sessions · R4 incl. mockup ≈ 1 · R5 ≈ ½ · ADR acceptance + evidence ≈ ½.
- Review provenance: skeptic verdict "rework" and devops "GO with 7 blockers" on v1; both converged on account binding, upload-time `uid`, generated whitelist, quarantine, listener error handler, path binding, dropping the `at` clamp, and App Check monitor-first. All blockers are incorporated above.

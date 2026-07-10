# ADR-021: Command transfer — a two-party handshake (outgoing retains command until the incoming accepts)

> Architecture Decision Record. Resolves the **command-transfer handshake** open question raised as the headline blocker (B1) of the Phase G gate review ([`09-workflows/_PHASE-G-GATE-REVIEW.md`](../09-workflows/_PHASE-G-GATE-REVIEW.md)). Feature surface: [`09-workflows/20-role-assignment-command-transfer.md`](../09-workflows/20-role-assignment-command-transfer.md) + [`08-information-architecture/30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase G gate B1 — Alex, 2026-06-09; Alex chose "requires the incoming IC to accept")*

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase G gate closeout)
**Reviewer(s):** Alex (decision — selected the **accept-required** model; the outgoing-retains-until-accept invariant is the engineering answer to its only failure mode)
**Relates to:** [Principle 10](../02-principles.md) (no push), [ADR-008](ADR-008-nims-org-structure.md) (NIMS positions), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (full-screen takeover), [ADR-010](ADR-010-status-commit-model.md) (reversibility, no timed undo).

---

## Context

Passing command on a fireground is a **closed-loop, spoken handshake** — "Chief, you have command,"
"I have command." The Phase G [command-transfer workflow](../09-workflows/20-role-assignment-command-transfer.md)
left **how the app records that handoff** as an open question: does command move the instant the **outgoing**
IC confirms (with the incoming IC merely seeing it on next sync), or does it require the **incoming** IC to
explicitly **accept**?

The gate review made this the **headline blocker (B1)** — three reviewers (two chiefs + the doctrine-aware
gate) independently called a *silent, sync-only* handoff a safety gap: it can leave an incident believing it
has **two ICs, or none**. The gate's most precise warning: if the design **requires** the incoming IC to
accept and that IC is **offline**, the incident has **no recognized IC in the app** — and because **End
Operation is IC-gated**, the operation literally cannot be closed.

Alex chose the **accept-required** model (the incoming IC must accept — a true closed loop). That choice
carries exactly the failure mode the gate named. This ADR records the decision **and** the invariant that
removes the failure mode.

---

## Decision

**Command transfer is a two-party handshake, and the outgoing IC retains command until the incoming IC
accepts.** There is therefore **always exactly one IC of record** — never zero, never two.

The flow:

1. **Initiate** — the outgoing IC opens the full-screen Transfer Command takeover ([ADR-016](ADR-016-modal-vs-sheet-rules.md)),
   selects the incoming commander, and confirms. State → **Transfer Pending**.
2. **Pending** — **the outgoing IC remains the IC of record** with full authority, **including End
   Operation.** The pending transfer is recorded (an append-only role-history event marks it initiated).
3. **Accept** — the incoming IC sees a prominent **pending-acceptance** state when they open the app (not a
   push — a state visible on their command surface, Principle 10) and taps **Accept**. Command moves; the
   role-history logs the **completed two-party handshake** (initiated-by → accepted-by, both timestamped);
   the gold accent underline follows the new IC.
4. **Escape paths** — before acceptance: the outgoing IC can **Cancel** the pending transfer or reassign to
   someone else; the incoming IC can **Decline** (command stays with the outgoing IC). Any of these returns
   to a single, valid IC of record.

**The verbal handshake stays on the radio.** The app **records** the transfer (both ends), it does not
**replace** the "you have command / I have command" exchange — initiate maps to "you have command," accept
maps to "I have command." The app is the durable record of a handshake that happens out loud, as doctrine
requires.

### The invariant that protects End Operation

Because the outgoing IC **retains** command until acceptance, the incident is **never** in a no-IC state.
The IC-gated [End Operation](../09-workflows/16-end-of-operation.md) is therefore **always reachable** — if
the incoming IC never accepts (offline, declines, leaves), the outgoing IC is still the valid IC and can
close the operation or reassign. This is the precise removal of the gate's B1 failure mode, and it matches
real-world doctrine: **you keep command until the other party acknowledges they have it.**

---

## Rationale

- **It is the literal fireground handshake.** Command does not pass on a unilateral announcement; it passes
  when the receiver acknowledges. "Requires accept" is doctrinally correct — and retaining command until
  acceptance is the other half of that same doctrine ("I still have it until you say you do").
- **It removes the only failure mode of the accept-required model.** A naive "accept required" design strands
  the incident if the incoming IC is offline. Outgoing-retains-until-accept guarantees one valid IC at every
  instant, so End Operation (and every IC-gated action) is always satisfiable.
- **It honors Principle 10.** No push. The incoming IC learns of the pending transfer the doctrinally-correct
  way — over the radio — and the app surfaces a **pending-acceptance** state when they look. The app never
  pages anyone; it records a handshake that happens on the radio.
- **It is fully auditable.** The role history captures initiated-by + accepted-by with timestamps — a real,
  defensible transfer-of-command record (the v3 gap, where command moved implicitly).

---

## Alternatives Considered

- **Move command on the outgoing IC's confirm; incoming IC notified on next sync (no accept required).**
  Not chosen (Alex selected accept-required). It guarantees one IC of record too, but it is **not** the
  spoken handshake — command would move before the receiver acknowledges, which is not how a fireground
  passes command. The accept-required model is more faithful.
- **Accept required, command leaves the outgoing IC immediately into a "pending" no-owner state.**
  **Rejected:** this is the gate's B1 failure mode — an offline incoming IC strands the incident with no IC
  of record and an un-closeable operation. The outgoing-retains invariant exists precisely to avoid this.
- **A timed auto-accept / auto-revert (transfer lapses after N minutes).** **Rejected:** introduces a timed
  mechanic ([ADR-010](ADR-010-status-commit-model.md) retired timed undo for the same reason) and a moment
  where ownership is ambiguous. Explicit accept / cancel / decline is unambiguous.
- **A push notification to the incoming IC.** **Rejected:** violates [Principle 10](../02-principles.md).
  The radio is the channel; the app shows a pending-acceptance state when the IC opens it.

---

## Consequences

**Positive:**
- Exactly one IC of record at every instant — no two-IC ambiguity, no no-IC stranding; End Operation always
  reachable.
- A real, auditable two-party transfer-of-command record (initiated-by + accepted-by, timestamped).
- Doctrinally faithful: the app records the radio handshake, it does not replace it.

**Negative:**
- A **Transfer Pending** state to design and render on both devices (a pending-acceptance banner on the
  incoming IC's command surface; a "pending — awaiting acceptance" state on the outgoing IC's). More states
  than a one-tap move.
- The handoff is not instantaneous in-app — it completes only when the incoming IC accepts (by design; the
  outgoing IC holds command meanwhile, so nothing is blocked).

**Neutral:**
- Cross-department (assisting-IC) command transfer rides the same handshake (relevant once mutual aid is
  in scope — see [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)).

---

## Related

- **Blocker resolved:** gate review B1 ([`_PHASE-G-GATE-REVIEW.md`](../09-workflows/_PHASE-G-GATE-REVIEW.md) §3).
- **Principles:** 10 (no push — pending-acceptance is a visible state, not an alert).
- **Other ADRs:** [ADR-016](ADR-016-modal-vs-sheet-rules.md) (full-screen takeover), [ADR-008](ADR-008-nims-org-structure.md)
  (spelled-out NIMS positions), [ADR-010](ADR-010-status-commit-model.md) (no timed mechanic), [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md)
  (cross-dept transfer rides this handshake).
- **Specs:** [`20-role-assignment-command-transfer.md`](../09-workflows/20-role-assignment-command-transfer.md)
  (the workflow), [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) (the screen),
  [`16-end-of-operation.md`](../09-workflows/16-end-of-operation.md) (the IC gate this invariant protects).
- **GitHub:** [#225](https://github.com/Vergo402/paratech-struts/issues/225) (command-transfer workflow),
  [#239](https://github.com/Vergo402/paratech-struts/issues/239) (Phase G gate).

---

## Notes

The "two ICs or none" problem is the classic distributed-handoff hazard. The resolution is not more
technology — it is the fireground rule encoded faithfully: **one party holds command until the other
acknowledges, and the acknowledgment happens on the radio.** The app's job is to record both ends and to
make the pending state impossible to miss when a commander looks — never to page them.

---

## Addendum — single-device completion for named-individual targets (2026-07-01, [#401](https://github.com/Vergo402/paratech-struts/issues/401))

**Problem.** The Level IV sim (finding O-2, [#399](https://github.com/Vergo402/paratech-struts/issues/399))
drove a real transfer on one shared command tablet and could not complete it: the initiator's pending view
suppressed the Accept (the pending-card ternary gave the outgoing view exclusive precedence), so the crew
fell back to clear/assign on the IC node — `ResourceCleared`/`ResourceAssigned` only, **no transfer
record**. That is the exact v3 no-handoff-record gap this ADR exists to close, resurfacing through a UI
reachability hole. A single shared device is a realistic Level IV/V posture (one command tablet; a chief
taking command on the same iPad the captain was using).

**Resolution.** For **named-individual (and apparatus) targets**, the outgoing IC's pending card also
offers the accept: heading "Accepting on this device?", sub-line "Give the briefing, then hand this device
to {name}.", gold "{name}: Accept command", footnote "Records the transfer — time, from, and to." This is
a **UI reachability fix, not a new auth model** — `canAccept` (the pre-auth soft claim, `core/org/transfer.ts`)
has always permitted any uid to accept on a named commander's behalf; the reducer and event schema are
untouched. **Device-ref targets keep the strict uid match** — only the named device sees Accept.

**Invariant unchanged.** The transfer is still a two-party handshake with exactly one IC of record:
command moves only on Accept, and the second party's acknowledgment is physical — the briefing happens
out loud and the incoming commander takes the tablet and taps. The tap records it.

**Recorded consequence.** On a shared device both `CommandTransferInitiated` and `CommandTransferAccepted`
carry the same device uid in `by`. The from/to/time record is derived from `Initiated.toResource` plus the
prior IC, so the audit trail (N-1: time, from, to) is complete even though the actor column repeats the
device.

---

## Addendum 2 — the 4-digit accept code for named targets (2026-07-10, [#425](https://github.com/Vergo402/paratech-struts/issues/425))

**Problem.** The pre-Phase-J audit flagged that an individually-targeted transfer showed the full
"⚑ You are being given command — Accept / Decline" banner on **every device on scene** — a direct
consequence of the Addendum-1 soft claim (`canAccept` returns true for any uid when the target carries
no uid to verify). The accept-from-anywhere capability was deliberate; the loud banner everywhere was
not: on a large incident, every member's Command tab shouted a decision that belonged to one person,
and any of them could fat-finger command.

**Resolution (Alex, mockup approved 2026-07-09).** Named-individual and apparatus targets now mint a
**4-digit accept code** on `CommandTransferInitiated` (`claimCode`, optional on the event schema):

- The **outgoing IC's device** displays the code ("Accept code — give to {name} with the briefing")
  — the code travels with the face-to-face/radio handoff, exactly where the ADR's verbal handshake
  already happens. The #401 hand-the-tablet accept stays codeless (same device already shows it).
- **Every other device** sees only the quiet "Transfer pending → {name} · Tap if this is you" line
  (56px tap floor). Tapping it asks for the code; the matching code reveals Accept / Decline.
- **Device-ref targets are unchanged** (strict uid match, loud banner on that one device, no code).
- **Legacy pendings** (pre-#425 events, no `claimCode`) keep the old loud-banner behavior.

**Scope of the check.** The code is a **fat-finger gate, not authentication**: `canAccept`'s soft
claim is untouched, the Accept event carries no code, and the event log is member-readable anyway
(a malicious member could read the code — the threat model here is mis-taps, not adversaries; real
per-person auth arrives with authenticated role claims post-v4.0). The check lives in the UI only
(`CommandRail`), which keeps the fold deterministic and replay-safe.

**Invariant unchanged.** Still a two-party handshake, exactly one IC of record, command moves only on
Accept, no push — the code just makes "the second party" mean the person who actually got the briefing.

# Workflow: End of operation / archive / after-action

> Phase G workflow spec — [#238](https://github.com/Vergo402/paratech-struts/issues/238). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) (SitStat — the End Operation action, IC gate, the six canonical datums); [`modal.md`](../03-primitives/modal.md) (destructive/terminal confirm); [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) (the event-log read projection + export-convergence packet + After-Action laptop surface); [`50-settings.md`](../08-information-architecture/50-settings.md) (the Department-policies after-action toggle); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (terminal action, no timed undo); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md) (End Operation = destructive confirm modal); [ADR-018](../11-decisions/ADR-018-after-action-auto-email.md) (after-action auto-email = a Principle-10 scope clarification).
> **Precondition:** an active operation exists (from workflow [#219 — Starting an operation](10-starting-an-operation.md)). Typically every shore point has reached Strut Equipment Returned (workflow [#224](15-secured-returned.md)), but the app does not require it.

---

## Purpose and goal

Close the incident. The Incident Commander ends the operation; the board is archived; the after-action
record is assembled and — unless the department has turned it off — emailed to the accountable commanders
for later reading.

**Goal:** IC taps End Operation, confirms the terminal modal, and the operation moves from active to
archived. The event log freezes as the incident record; the after-action packet is delivered per
[ADR-018](../11-decisions/ADR-018-after-action-auto-email.md).

This is the one terminal action in the operation lifecycle. Everything else is reversible by a Step-back
slide; **ending an operation is not.**

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Incident Commander** | Phone (floor) or tablet (CP) | The all-clear is given; the incident is complete |
| **Operations Section Chief** | — | Recipient of the after-action packet (if assigned); cannot end the op |
| Any connected device | — | Sees the active board disappear / move to archived on next sync |

**Role gate:** **Incident Commander only.** End Operation is gated on the live `myRole` = IC (faithful to
v3). No override — if command has not been claimed, the founding device holds IC by default
(see workflow [#225](20-role-assignment-command-transfer.md)).

Phone is the floor (Principle 2) — a solo IC running command phone-only can end the operation from the
SitStat below-fold action.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> ActiveOperation

    ActiveOperation --> EndConfirmModal : IC · tap End Operation → button (SitStat)
    EndConfirmModal --> ActiveOperation : IC · tap Cancel → modal (default-Cancel; no change)
    EndConfirmModal --> ArchivedOperation : IC · tap End Operation → modal (terminal; freezes event log)

    ArchivedOperation --> AfterActionDelivery : auto on incident-complete (ADR-018; if dept-enabled)
    AfterActionDelivery --> [*] : packet assembled + emailed to IC / Operations (records-only)
    ArchivedOperation --> [*] : terminal — operation is read-only history
```

`[ArchivedOperation]` is **terminal**. There is no Re-open transition in v4.0 (re-opening an archived
operation is an open question — see below). The after-action delivery is a one-way records side effect,
not a user step — it fires on the commit, never during the active op.

---

## Step-by-step

### Step 1 — Tap End Operation (SitStat)

```
┌─────────────────────────────────────┐
│  Cascade Building Fire  [sync ●]    │  ← persistent chrome (incident name, sync dot)
│  Incident Commander · Capt. Reyes   │  ← gold accent underline = who is in command
│─────────────────────────────────────│
│  SitStat                            │
│  Personnel 14 · OP 1 · 02:41 elapsed│
│  Returned 12 · Secured 0 · …        │  ← per-status shore-point counts
│  …                                  │
│  ──────────────────────────────────│
│  [ End Operation ]                  │  ← IC-only; destructive styling
└─────────────────────────────────────┘
```

**Element acted on:** the **End Operation** action on SitStat (below the fold on phone; a footer action
on the Command home). Cites [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md)
§Primary action — not redrawn.

Visible only when this device holds the **Incident Commander** role. On non-IC devices the action is not
rendered (hide-not-grey, per the Settings gating doctrine).

---

### Step 2 — Confirm the terminal modal

```
┌─────────────────────────────────────┐
│  End this operation?                │
│─────────────────────────────────────│
│  Cascade Building Fire will be       │
│  archived. The record is final and   │
│  cannot be re-opened.                │
│                                     │
│  12 shore points · 14 personnel      │  ← summary so the IC sees what's being closed
│                                     │
│  [ Cancel ]      [ End Operation ]  │  ← Cancel is the default (destructive-confirm pattern)
└─────────────────────────────────────┘
```

A **destructive/terminal confirm modal** per [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)
and [`modal.md`](../03-primitives/modal.md) §Destructive-confirm. Cancel is the default-focused button;
the destructive action sits on the trailing edge. **No timed undo** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) —
once confirmed, the operation is archived.

**Confirmed →** the operation archives; the event log freezes as the incident record.
**Cancelled →** no change; returns to the active SitStat.

⇩ commits → `[ArchivedOperation]` — terminal

---

### Step 3 — App response: operation archived

```
┌─────────────────────────────────────┐
│  Operations               [sync ●]  │
│─────────────────────────────────────│
│  No active operation                │  ← empty-state (cites empty-state.md)
│                                     │
│  [ Start Operation ]                │
│  ──────────────────────────────────│
│  Past operations                    │
│  ┌─────────────────────────────┐    │
│  │ Cascade Building Fire        │    │  ← the just-archived op, read-only
│  │ Ended 14:43 · 12 shore points│    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

On commit:
- The active board is replaced by the Operations empty-state (cites
  [`empty-state.md`](../03-primitives/empty-state.md) §first-run / all-clear).
- The operation drops into the **Past operations** list, read-only.
- The persistent chrome clears the incident name + IC underline; the sync dot returns to its idle state.
- All shore-point cards freeze in whatever state they held at close (no forced advance to Returned).

---

### Step 4 — After-action delivery (automatic, records-only)

This is **not a user step** — it is a side effect of the terminal commit, governed by
[ADR-018](../11-decisions/ADR-018-after-action-auto-email.md):

- **When:** on the End Operation commit. Never during an active op — so it never competes with the radio
  in a live/life-safety moment.
- **What:** the **export-convergence packet** that the Audit Log already assembles — ICS-201 / 203 / 207 /
  208 / 209 + the Accountability PAR snapshot + the Hazard Log ICS-208 + the raw event-log CSV. Never a
  freeform message, never tactical content.
- **Who:** the **Incident Commander + Operations Section Chief** as assigned at the moment of close. If
  Operations is unfilled → IC only. If neither has an account email → department **Admin(s)** as the
  governance backstop. A guest commander with no account gets no email — but the record still persists
  in-app on the Audit Log (the email is a sink, never the record itself).
- **How:** one-way. The app sends a record to be read after the fact. It does not thread, notify, push,
  or receive a reply — it is not a channel (Principle 10 holds; this is documentation, outside its scope).
- **Opt-out:** on by default, **department-disableable** via the Department-policies toggle in
  [`50-settings.md`](../08-information-architecture/50-settings.md) (#308). When off, no email fires; the
  record still lives on the Audit Log.

**Decision now, plumbing later:** the email transport (send mechanism, address sourcing) is Phase H
infrastructure ([`99-open-questions.md`](../99-open-questions.md) #35); the trigger wiring ships with the
after-action review feature (#32). This spec names the behavior, not the wire.

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| IC's **phone** or **tablet** | 1–3 | Drives the flow; commits the terminal modal |
| Operations Section Chief's **device** | — | On next sync: active board → empty-state; op appears in Past operations |
| Any connected device | — | On next sync: the operation is read-only history; no active board |
| IC / Operations **email inbox** | 4 | After-action packet arrives (records-only; if dept-enabled) — read later, not a notification |
| **Broadcast** | — | On next sync: the C-13 board clears to its idle/no-active-operation state |

No push (Principle 10). The board change propagates on the event log on next sync; the after-action email
is records delivery, not an operational alert.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Open End-Operation modal | Yes | Cancel (default-focused) → no change |
| End Operation (confirmed) | **No — terminal** | Modal states "final and cannot be re-opened" |
| After-action email | n/a | Records side effect; the record persists regardless |

No timed undo (ADR-010). End Operation is the lifecycle's single terminal commit — the destructive modal
is the deliberate friction.

---

## Composed screens and primitives

- [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) — SitStat hosts the
  End Operation action and the IC gate.
- [`modal.md`](../03-primitives/modal.md) — the destructive/terminal confirm.
- [`empty-state.md`](../03-primitives/empty-state.md) — the Operations empty-state the board reverts to.
- [`list.md`](../03-primitives/list.md) — the Past operations list.
- [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) — the frozen event log + export
  packet (the after-action surface).

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard and
[`modal.md`](../03-primitives/modal.md) for modal focus management.

Screen-reader behavior particular to this workflow:

- **End Operation button:** **"End operation. Cascade Building Fire. Incident Commander only."**
- **Confirm modal opens:** VoiceOver announces the title **"End this operation?"** with the warning body;
  focus traps in the modal, default focus on **Cancel** (the safe choice).
- **Confirm commit:** **"Operation ended. Cascade Building Fire archived."** (`aria-live="assertive"`).
- **Role gate (non-IC):** the action is not rendered; nothing to announce.
- **After-action email:** silent — a background records side effect, not an action the user confirms
  audibly.
- No new SR script row needed.

---

## Open questions

1. **Archived-operation storage and access:** where Past operations live, how they are listed/searched,
   and whether they are reachable from Operations or only from the Audit Log — not specified in Phase F.
   Phase H owns the archive surface.
2. **Re-open an archived operation:** v4.0 treats archive as terminal (no re-open). Whether a mis-ended
   operation can be re-opened (and by whom) is deferred — the safe v4.0 answer is "start a new operation."
3. **Shore points not yet Returned at close:** the app does not force every SP to Strut Equipment Returned
   before End Operation. Whether to warn the IC ("3 shore points still deployed — equipment not returned")
   in the confirm modal is a Phase H copy/UX question.
4. **After-action email transport + recipient sourcing:** the send mechanism and IC/Ops address lookup are
   Phase H infrastructure ([`99-open-questions.md`](../99-open-questions.md) #35); the trigger wiring ships
   with the after-action feature (#32).

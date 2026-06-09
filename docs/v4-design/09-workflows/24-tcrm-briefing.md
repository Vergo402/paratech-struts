# Workflow: TCRM briefing (Begin → walk → End, no countdown)

> Phase G workflow spec — [#229](https://github.com/Vergo402/paratech-struts/issues/229). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md) (the Rescue Group Supervisor's pre-task crew briefing — button-bar entry → full-screen surface, the TCRM four steps + five questions, Begin/End, not a safety-hold, auto-collapse OFF); [`nested-checklist.md`](../03-primitives/nested-checklist.md) (the shallow tree, signed checks, tap-to-attest, derived section state); [`button.md`](../03-primitives/button.md) (Begin / End briefing, add-note); [`modal.md`](../03-primitives/modal.md) (the full-screen-form briefing surface, per ADR-016); [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (tap-to-attest, reversible); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md) (briefing = full-screen form).
> **Precondition:** an active operation exists (workflow [#219](10-starting-an-operation.md)). The Rescue Group Supervisor is about to put a crew to work on a task.

---

## Purpose and goal

Record that the crew got briefed before they went in — without ever holding them up.

**Goal:** the Rescue Group Supervisor taps **Begin briefing**, walks the crew through the TCRM four steps
(Explain · List · Ask · Speak) and five crew questions, attesting each by tap, then taps **End briefing**.
The app timestamps the session and logs who was briefed. **It never blocks crew entry, deployment, or any
status advance** (Principle 10).

**Net-new in v4** — no v3 antecedent. **There is no countdown timer** (see below — this is a deliberate
design rule, not an omission).

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Rescue Group Supervisor** | Phone (floor) or tablet | Delivers the briefing at the point of work; attests each step |
| **Crew members** | — | The subjects of the five questions (not app actors) |
| **Safety Officer** | Any | Reads that briefings occurred (record, not a gate) |

**Role gate:** the **Rescue Group Supervisor** delivers and attests. Phone is the floor (Principle 2) — the
briefing happens at the point of work, gloved. Tablet is the Level II+ surface (full crew roster + five
questions per member without scrolling). Broadcast shows at most a read-only "briefing in progress /
complete" indicator — no toggles.

---

## Why no countdown timer

A countdown timer would turn a briefing into a **gate** — "you may not proceed for 90 seconds." That
violates Principle 10 (the app records, it does not block) and the no-safety-hold rule. TCRM is **doctrine
attestation**: the app captures that the supervisor walked the crew through the steps. The decision to
*stop* is a radio / face-to-face action (the "Speak" step names that authority — it does not implement a
software hold). So the session is bounded by **Begin** and **End**, not by a clock. Auto-collapse is **OFF**
so the four-step rhythm stays visible throughout.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> NoBriefing

    NoBriefing --> BriefingOpen : Rescue Group Supervisor · tap Begin briefing → button (full-screen form; stamps start time)
    BriefingOpen --> NoBriefing : supervisor · dismiss without End → modal (no session recorded)

    state BriefingOpen {
        [*] --> StepUnchecked
        StepUnchecked --> StepChecked : supervisor · tap a step / question row → nested-checklist (signs role + mono time)
        StepChecked --> StepUnchecked : supervisor · tap row → nested-checklist (un-check; reversible + audited)
        note right of StepChecked : four steps (Explain·List·Ask·Speak) + five crew questions; auto-collapse OFF
    }

    BriefingOpen --> BriefingComplete : supervisor · tap End briefing → button (stamps end time; records session)
    BriefingComplete --> [*] : session logged (briefing delivered; NEVER gates work)
```

The session is bounded by **Begin** (start timestamp) and **End** (end timestamp) — **never a timer**.
Attestation inside is reversible (tap / re-tap), audited. Ending records the session; it gates nothing.

---

## Step-by-step

### Step 1 — Begin briefing (button-bar entry)

```
┌─────────────────────────────────────┐
│  Operations · Cascade…    [sync ●]  │
│─────────────────────────────────────│
│  [ Begin briefing ]  [ Add hazard ] │  ← button-bar on the active-operation screen
└─────────────────────────────────────┘
```

The briefing is **not a navigated screen** — it is a **button-bar entry** on any active-operation screen
(Operations or SitStat). Tapping **Begin briefing** opens the briefing surface as a full-screen-form
**modal** (per [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)) and **stamps the start time**.
Cites [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md) — not redrawn.

---

### Step 2 — Walk the four steps + five questions (tap to attest)

```
┌─────────────────────────────────────┐
│  ✕         TCRM Briefing            │  ← full-screen-form surface
│─────────────────────────────────────│
│  ☐ Explain the task                 │  ← four steps (auto-collapse OFF — all visible)
│  ☐ List the hazards                 │
│  ☐ Ask for input                    │
│  ☐ Speak up authority confirmed     │
│  ─────────────────────────────────  │
│  Crew questions (5)                 │
│  ☐ Everyone knows the objective     │
│  ☐ Everyone knows their assignment  │
│  ☐ … (3 more)                       │
│  ─────────────────────────────────  │
│  [ + Add note ]                     │
│  [ End briefing ]                   │
└─────────────────────────────────────┘
```

A shallow 1–2-level tree composing [`nested-checklist.md`](../03-primitives/nested-checklist.md). The
supervisor **taps each row to attest** (whole 56pt row; reversible re-tap). Every check is **signed** —
role spelled out + mono time, visible + audited (D7.5). Section state is **derived** — no one-tap "complete
the briefing." **Auto-collapse OFF** keeps the four-step rhythm visible. An optional **Add note** captures
anything the supervisor wants on the record.

This is **tap-to-attest, never the safety slide** — consistent with the other checklists (ADR-010). And
it **never gates work**: the crew can be entering the structure while the supervisor attests.

**Step 2-R — Un-check:** re-tap a checked row; the check clears; the log records the un-check + actor +
time (D7.5). No confirm (Principle 6).

---

### Step 3 — End briefing

Tapping **End briefing** stamps the **end time** and records the session (start time, end time, who
delivered, which steps/questions were attested, any notes). The surface closes. The Safety Officer can see
on the record that a briefing occurred.

**Crucially:** nothing about ending — or *not* ending — the briefing blocks the operation. A crew can
deploy a strut (workflow [#221](12-deploying-a-strut.md)) whether or not a briefing session is open or
complete. The briefing is a record alongside the work, not a checkpoint in front of it.

⇩ commits → `[BriefingComplete]` — session logged

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| Rescue Group Supervisor's **phone** | 1–3 | Drives the briefing; attests each step; ends the session |
| Safety Officer's **device** | — | On next sync: sees that a briefing was delivered (record), with attribution + timestamps |
| Operations Section Chief's **tablet** | — | On next sync: briefing status visible alongside the operation; never a blocker |
| **Broadcast** | — | At most a read-only "briefing in progress / complete" indicator; no toggles |

No push (Principle 10). The briefing record propagates on sync; nobody is paged, and no surface gates work
on it.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Begin briefing | Yes | Dismiss without End → no session recorded |
| Attest a step / question | Yes | Re-tap to un-check (reversible + audited; no confirm) |
| Add note | Yes | Edit / remove the note |
| End briefing | Recorded (the session is a record) | The session log is append-only; re-begin a new briefing if needed |

No timed undo (ADR-010). No countdown anywhere. The session record is append-only (an end is a logged
event, not a destructive commit).

---

## Composed screens and primitives

- [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md) — the briefing surface, button-bar
  entry, the four steps + five questions, Begin/End, no-safety-hold rule.
- [`nested-checklist.md`](../03-primitives/nested-checklist.md) — the shallow tree (auto-collapse OFF),
  signed checks, tap-to-attest, derived section state.
- [`modal.md`](../03-primitives/modal.md) — the full-screen-form briefing surface (ADR-016).
- [`button.md`](../03-primitives/button.md) — Begin / End briefing, Add note.
- [`badge.md`](../03-primitives/badge.md) — progress count (not a bar).

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard,
[`nested-checklist.md`](../03-primitives/nested-checklist.md), and [`modal.md`](../03-primitives/modal.md).

Screen-reader behavior particular to this workflow:

- **Begin briefing:** **"Begin TCRM briefing."** On open: **"TCRM Briefing. Four steps and five crew
  questions. Briefing started."** Focus enters the surface.
- **Step / question row:** **"Explain the task. Unchecked. Double-tap to attest."**
- **Attest commit:** **"Explain the task checked. Rescue Group Supervisor, 09:14."** (`aria-live="polite"`).
- **Un-check:** **"Explain the task unchecked."** (audited; no confirm).
- **End briefing:** **"Briefing ended. Recorded."** (`aria-live="polite"`).
- No countdown means **no time-pressure announcement** — the SR never says "X seconds remaining."
- No new SR script row needed (nested-checklist + modal + button patterns already registered).

---

## Open questions

1. **Session record shape + crew binding** ([`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md)
   OQ): the exact stored session record (start/end timestamps, attested items, notes) and **what the
   briefing attaches to** — a task, a Group, or the operation — is resolved with the Phase G operations
   workflow + the Operations drilldown. Working assumption: scoped to the active operation / the
   supervisor's Group. Phase H.
2. **Numeric ORM / GAR score:** out of scope for v4.0 — the app records the *briefing*, not a numeric risk
   score (Principle 1 — not invented here). If doctrine review adds a scored worksheet, it composes the
   same primitive (or a new variant via gate escalation). [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md).
3. **TCRM content (the exact step/question wording):** sourced doctrine, **paraphrase-then-approved by Alex**
   (Principle 1, [`nested-checklist.md`](../03-primitives/nested-checklist.md) rule 6). v4.0 ships the
   surface + primitive + Begin/End affordance; the wording ships v4.1 behind a flag.
4. **Multiple concurrent briefings:** if more than one Group Supervisor briefs simultaneously, how sessions
   scope to "my crew" depends on the attach-target resolution (OQ1). Phase H.

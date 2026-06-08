# IA Spec: ORM / TCRM Briefing

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: [`03-primitives/nested-checklist.md`](../03-primitives/nested-checklist.md) — **the component is fully specified there; this spec composes it** — its "one primitive, three screens" table fixes this screen's depth (shallow, 1–2 levels) and primary role (Rescue Group Supervisor, phone). [`06-synthesis.md`](../06-synthesis.md) §1.10 + Q2 (**no safety-hold**), §3.5 (the checklist feature) + Open-Q5 (content deferral); [Principle 10](../02-principles.md); the [`00-ia-foundation.md`](00-ia-foundation.md) tab map ("a button-bar entry on any active-operation screen, **not a tree screen**") and modal-vs-sheet row ("**full-screen-form modal / pushed route**; Begin/End-briefing are buttons"); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md)/[016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#205](https://github.com/Vergo402/paratech-struts/issues/205). **Net-new — no v3 antecedent** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §v3 grounding).

---

## Purpose

The Rescue Group Supervisor's **pre-task crew risk briefing**: the TCRM four-step briefing — **Explain** the assignment · **List** the hazards · **Ask** for crew input · **Speak** (anyone can stop the operation) — plus the **five team-member questions**, delivered to the crew and *signed*, bracketed by a begin / end-briefing timestamp, so the briefing is given and recorded (Principle 7; D7.5). It records that the briefing happened; **it never blocks work** (below).

## Where it lives

- **Tab / parent:** **Operations** — but **not a navigated tab-home / tree screen.** Per the [tab map](00-ia-foundation.md) it is **"a button-bar entry on any active-operation screen"** ([ADR-014](../11-decisions/ADR-014-tab-structure.md)); the briefing itself opens as a surface (below).
- **How it is reached:** a **Begin Briefing** button in the action bar of an active-operation screen — [Operations](20-operations.md) or [SitStat](30-command-sitstat.md). The briefing surface is a **full-screen-form modal (or a pushed route — [`modal.md`](../03-primitives/modal.md) OQ2)**, per the [modal-vs-sheet row](00-ia-foundation.md) ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)). Cross-referenced from Command/Safety (the Safety Officer cares that briefings occur) but **owned by Operations**.
- **Issue:** [#205](https://github.com/Vergo402/paratech-struts/issues/205).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Rescue Group Supervisor** (delivers the briefing; attests). The crew it is delivered to are the five-question subjects; the **Safety Officer** reads that briefings occurred (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** — the briefing is given at the point of work. Tablet is the Level II+ briefing surface ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §What it backs).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** inside the briefing surface — the **four steps** (Explain · List · Ask · Speak) as a near-flat checklist, the next undone step highest; the **five team-member questions** beneath; the persistent chrome rides the shell behind it (Safety Officer + OP header — [`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome).
- **Below fold:** an optional note; **End Briefing**.

### Tablet (CP)
- **Above fold:** the same four steps with room for the **full crew roster** of the five questions per member without scrolling.

### Laptop (Toughbook)
- **Above fold:** keyboard-first (Space/Enter toggles the focused leaf); the briefing log for review.

### Broadcast TV (read-only projection)
- Minimal — at most a **"briefing in progress / complete"** indicator. A crew briefing is a face-to-face act, not a room board; it does **not** render the toggles, the questions, or any overlay.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **attest each briefing step / question** — a **tap on the leaf row** (the whole 56pt row); a tap, not a slide (a reversible attestation — [`nested-checklist.md`](../03-primitives/nested-checklist.md) Universal Rule 4).
- **Secondary actions:** **Begin Briefing / End Briefing** — buttons that bracket the session (the timestamp logging is the screen's **session wrapper**, owned by Phase G — [`nested-checklist.md`](../03-primitives/nested-checklist.md) §What it backs); an optional note.
- **Destructive / terminal:** **none.** Un-checking is reversible + audited (D7.5).

## Composed primitives

- [x] [nested-checklist](../03-primitives/nested-checklist.md) — **the spine.** The shallow 1–2-level tree (the four steps + the five questions); leaf-vs-section rule; every check signed; auto-collapse OFF (below).
- [x] [list](../03-primitives/list.md) — the near-flat step/question arrangement.
- [x] [badge](../03-primitives/badge.md) — the progress **count** + completion checkmark.
- [x] [button](../03-primitives/button.md) — **Begin Briefing / End Briefing** (the session brackets); add-note.
- [x] [modal](../03-primitives/modal.md) — the **full-screen-form briefing surface** the Begin-Briefing button raises (or a pushed route — [`modal.md`](../03-primitives/modal.md) OQ2); the [`00-ia-foundation.md`](00-ia-foundation.md) ORM/TCRM row.
- [x] [empty-state](../03-primitives/empty-state.md) — no briefing started → Begin Briefing (first-run); the content-deferral posture (below).
- [ ] picker · card · sheet · input · toggle · segmented · slider · toast · loading-state · warning-gate — not core.

> **A new primitive would be a gate escalation, not a spec decision.**

## NOT a gate — the load-bearing rule (Principle 10 / [`06-synthesis.md`](../06-synthesis.md) §1.10, Q2)

ORM/TCRM is a **doctrine attestation, never a `safety-hold`.** The app records that the briefing was delivered; it **does not block crew entry, deployment, or any status advance on it.** A safety stop is a radio / face-to-face action (the "Speak" step *names* that authority — it does not implement it in software). This is the same rule the [Hazard Log](32-hazard-log.md) honors: surface safety **visibly**, never make the app the control that halts work. There is no screen, badge, or status anywhere in v4 that gates work on whether this briefing is complete.

## Scope flag — the briefing, not a risk *score*

[`nested-checklist.md`](../03-primitives/nested-checklist.md) frames ORM/TCRM as the **briefing** (the four steps + five questions), **not** a GAR-style green/amber/red **numeric risk score**. A numeric ORM score is therefore **out of scope for v4.0 / an open question** — not invented here (Principle 1 — defer to doctrine, do not invent). If doctrine review adds a scored worksheet, it composes the same primitive (or a new variant via a gate escalation), decided then.

## What ships v4.0 vs. v4.1 (the content-deferral line)

Same line as its siblings ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ7, [`06-synthesis.md`](../06-synthesis.md) Open-Q5): the **briefing surface shell + the primitive + the begin/end-session affordance ship v4.0**; the **exact ORM criteria / TCRM script wording** ship **v4.1 behind a flag**, paraphrase-then-approved by Alex, never invented. Phase F fixes the IA; the words come later.

## Auto-collapse default (resolves [`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ2 for this screen)

**Auto-collapse = OFF** — the primitive's explicit hint for the shallow ORM. At 1–2 levels the whole briefing fits; collapsing finished steps would hide the four-step rhythm the supervisor reads aloud.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — the briefing is delivered and attested phone-only at the point of work.
- [x] **No safety-hold / no in-app comms / no push** (Principle 10) — **the** rule for this screen: visible, never blocking; "Speak" names the radio/face-to-face stop authority, it does not implement an app gate.
- [x] **NIMS terminology** — **Rescue Group Supervisor** spelled out; attribution role spelled out + mono time ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Every check is signed** (D7.5) — each step/question attested by who + when ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Attribution).
- [x] **Tap-to-attest, never slide** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md) / [`card.md`](../03-primitives/card.md)).
- [x] **No celebration on completion** (Principle 3/11).
- [x] **Tap geometry** — the whole 56pt row toggles; 8pt dead zones.
- [x] **Capacity demoted** — not a datum here.
- [x] **Modal-vs-sheet** — the ADR-016 ORM/TCRM row: a full-screen-form modal / pushed route; Begin/End-briefing are buttons ([`00-ia-foundation.md`](00-ia-foundation.md)).
- [x] **Persistent Safety Officer + OP header** (operation-facing).

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | full-screen briefing surface, single column | four steps + full crew-question roster | dense + keyboard + briefing log | "briefing in progress / complete" only |
| Above fold | four steps + next undone + Begin/End | steps + all members' questions | steps + log | the indicator |
| Primary-action affordance | tap the leaf row | tap the leaf row | Space/Enter on focused leaf | — (read-only) |
| Added density | — | full crew roster | review log | — |
| Does NOT render | — | — | — | toggles, questions, any overlay |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — no briefing started:** the first-run [`empty-state`](../03-primitives/empty-state.md) — set-glyph + a one-line reason + the **Begin Briefing** action; settle before empty.
- **Empty — content not yet seeded (v4.0):** the calm "the briefing arrives with its wording" posture, **never a safety-looking void** (Principle 7).
- **Error:** a failed check / log write **queues locally** (sync indicator); never `alert()`.
- **Loading:** local-first — the surface renders instantly; show nothing ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The **full-screen-form briefing surface is focus-trapped** with an inert background and a labeled Close/End equivalent ([`modal.md`](../03-primitives/modal.md) / [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard) — the "assistive tech cannot drag/slide" rule does not bite here (checks are taps).
- Each leaf is a `role="checkbox"` + `aria-checked`; the four steps + five questions read as labeled leaves; **attribution announced with state** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Accessibility; registry in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Keyboard parity:** Space/Enter toggles the focused leaf; Begin/End-briefing are standard buttons.
- Reduced motion loses nothing (fill → instant swap).

## Open questions (per-screen)

1. **Begin/End-briefing session logic** — the timestamp logging, who-briefed-which-crew, and the session record are the **Phase G** workflow ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §What it backs); this spec fixes the affordance + surface only.
2. **Numeric ORM / GAR score** — out of scope for v4.0 unless doctrine review adds a scored worksheet (Principle 1); see Scope flag above.
3. **Briefing attach-target** — whether the briefing binds to a task, a Group/resource under the [Org Chart](31-org-chart.md), or the operation as a whole (the same binding question the [Task Level Checklist](22-task-level-checklist.md) flags) — resolved with the Phase G operations workflow.
4. **Checklist content deferred to v4.1** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ7) — IA only here.
5. **Auto-collapse = OFF resolved here.**

# ADR-020: Department checklist authoring — a Principle 1 scope clarification (configurable SOPs vs. the shipped doctrine baseline)

> Architecture Decision Record. **Clarifies the scope of [Principle 1](../02-principles.md)** ("Defer to doctrine, not invention"), extending [ADR-002](ADR-002-principle-1-scope-clarification.md)'s doctrine-vs-configuration line to checklist *content*. **A department authoring its own checklist procedures is configuration of its own SOPs — not the app inventing doctrine.** FieldShore ships a generalized, paraphrase-approved **baseline** for each checklist (where Principle 1 binds); departments **fork and fully tailor** it. Principle 1 is **unchanged and fully in force**; this is **not** an exception. Following [ADR-002](ADR-002-principle-1-scope-clarification.md) / [ADR-018](ADR-018-after-action-auto-email.md), **this ADR is the record; the constitution text is not edited inline.** Feature surface: [`09-workflows/25-customizing-checklists.md`](../09-workflows/25-customizing-checklists.md) + [`03-primitives/nested-checklist.md`](../03-primitives/nested-checklist.md).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase G [#230](https://github.com/Vergo402/paratech-struts/issues/230) — Alex, 2026-06-09)*

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase G workflow #230)
**Reviewer(s):** Alex (decision, 2026-06-09 — *"100% they should be able to. We should provide a generalized flow, and departments need to be able to customize and tailor it to their needs."* + the three scope sub-decisions below)
**Clarifies:** [Principle 1](../02-principles.md) ("Defer to doctrine, not invention") — its **scope**. The principle is not changed; this records that it governs the app's shipped baseline, not a department's authoring of its own procedures.

---

## Context

[Principle 1](../02-principles.md) reads: *"When NIMS / ICS / USACE specifies a term or a structure, the app uses it verbatim. Rejected: clever rebranding for marketability."* [ADR-002](ADR-002-principle-1-scope-clarification.md) already clarified its scope once: Principle 1 governs **universal safety doctrine** (load tables, USACE shore types, NIMS General Staff structure — physics and federal doctrine, not configurable) but **not departmental terminology** (apparatus names, role labels — which NIMS does not standardize at the department level, so they ship as NIMS defaults and are configurable).

The three checklist screens — [IC Command Checklist](../08-information-architecture/33-ic-command-checklist.md) (#227), [Task Level Checklist](../08-information-architecture/22-task-level-checklist.md) (#228), and the [TCRM briefing](../08-information-architecture/23-orm-tcrm.md) (#229) — are doctrine attestation trees. [`nested-checklist.md`](../03-primitives/nested-checklist.md) rule 6 reads: *"Doctrine content is sourced, never invented (Principle 1) — paraphrase-then-approved before it ships."*

Writing the checklist-customization workflow ([#230](https://github.com/Vergo402/paratech-struts/issues/230), titled "v4 dept editor") forced the question: **does a department get to author its own checklist content?** The first-pass spec read rule 6 conservatively and answered *no* — v4.0 would only let a department *curate* (enable/disable + pick approved presets), because a free-text editor that let an Admin type their own "doctrine" seemed to violate Principle 1.

At the Phase G gate review, Alex decided the opposite, unambiguously: **yes — departments must be able to fully customize and tailor checklists to their own needs.** FieldShore provides a **generalized flow** as the starting point; each department tailors it.

This forces the same kind of scope clarification ADR-002 made: **a department authoring its own standard operating procedures is not the app inventing doctrine.** It is the department exercising authority over procedures it already owns and is accountable for — exactly like a department naming its own apparatus. Principle 1 binds **what FieldShore asserts as doctrine** — its shipped baseline. It does not bind a department's own SOPs.

---

## Decision

**Principle 1 governs FieldShore's shipped checklist baseline, not a department's authoring of its own checklist procedures.** With that scope established:

> FieldShore ships a **generalized, paraphrase-approved baseline** for each checklist (IC Command, Task Level, TCRM). A department can **fork that baseline and fully author its own version** — add, edit, remove, and reorder steps and sections — tailoring it to the department's SOPs.

The three sub-decisions Alex made (2026-06-09) bound the model:

1. **The department owns its content outright — no FieldShore review/approval.** An Admin edits and it is live for the department. FieldShore never reviews, gates, or approves department-authored content. (FieldShore guarantees only its own baseline.)
2. **Admin-only authoring.** Only the built-in **Admin** role ([ADR-017](ADR-017-custom-department-roles.md)) can edit checklist templates. No new permission toggle in v4.0 — template authoring is an Admin back-office capability, **orthogonal to fireground ICS positions** (a crew attesting an instance is gated by ICS position; an Admin editing the template is gated by the back-office role — the two-axes rule of ADR-017 / ADR-008).
3. **Full authoring + a reset escape hatch.** Add/edit/remove/reorder steps and sections freely, plus **reset to the FieldShore baseline** to recover the shipped version at any time.

### The guardrail that keeps Principle 1 intact — provenance

Because a department can now author content, the app must never let a crew **mistake a department-tailored step for FieldShore-asserted doctrine.** The boundary is held by **provenance**, not by restricting authoring:

- The app **distinguishes the FieldShore baseline from department-authored content** — a department's customized checklist is visibly *theirs* (e.g., a "customized by \<department\>" / "edited from baseline" marker), and the unedited baseline is visibly FieldShore's.
- FieldShore **only asserts its own baseline as doctrine.** Everything a department adds or changes is, by construction, the department's own SOP — surfaced as such, never presented by the app as authoritative external doctrine.
- This is the same split ADR-002 drew: the doctrine half (FieldShore's baseline) is sourced and paraphrase-approved; the configuration half (the department's tailoring) is the department's own, like its apparatus names.

### What still binds FieldShore (Principle 1, unchanged)

- **FieldShore's shipped baseline** for each checklist is sourced doctrine, **paraphrase-then-approved by Alex** before it ships ([`nested-checklist.md`](../03-primitives/nested-checklist.md) rule 6 — unchanged for the baseline).
- The **universal safety doctrine** ADR-002 fixed — load tables, shore types, NIMS structure, the strut math — is **not** a checklist template and is **not** department-editable. Authoring applies to procedure/attestation checklists, never to the safety engine.

### Edits are audited

Template edits are **logged in the event log** (who changed what, when — [ADR-009](ADR-009-database-firebase-rtdb.md); the D7.5 attribution discipline that already governs every signed attestation). A department's checklist is accountable the same way its incidents are.

### Ship split

- **The decision is locked now** (departments author; Admin-only; full authoring; dept owns outright; provenance guardrail).
- **FieldShore's baseline checklist content** ships when the paraphrase-approved doctrine content lands — **v4.1**, the same deferral the three checklist screens already carry (structure v4.0 / content v4.1).
- **The authoring/editor UI** composes only existing primitives ([`list`](../03-primitives/list.md), [`input`](../03-primitives/input.md) text/text-area, [`sheet`](../03-primitives/sheet.md), [`modal`](../03-primitives/modal.md) for destructive remove/reset, drag-reorder per the [`accessibility.md`](../07-design-system/accessibility.md) *assistive-tech-cannot-drag* contract). It needs a baseline to fork from, so it ships **with or after** the baseline content — exact sequencing is a Phase H decision ([`99-open-questions.md`](../99-open-questions.md) #32, the checklist-UI ship-version question this rides). **Decision now; build later.**

---

## Rationale

- **It is the department's own procedure, not the app's invention.** A department's run cards / SOPs are theirs to write — they own them and are accountable for them. The app providing a tailorable starting point is a tool serving the department's doctrine, which is exactly what Principle 1's "defer to doctrine" intends — not "lock every department to one script."
- **ADR-002 already drew this line.** Apparatus names and role labels are configurable because NIMS does not standardize them at the department level; the app ships NIMS defaults and lets departments relabel. Checklist *procedure* content is the same shape: there is a doctrine-aligned default (FieldShore's baseline) and a department-configurable overlay (their tailoring). This ADR applies ADR-002's reasoning to a new surface.
- **Provenance is the real safeguard, and it is stronger than prohibition.** The failure Principle 1 guards against is the *app* asserting invented doctrine. Marking what is FieldShore-baseline vs. department-authored prevents exactly that — a crew always knows whose procedure a step is — without crippling the customization every real department needs.
- **Real departments have their own checklists today.** A product that ships one fixed checklist and refuses to map onto a department's actual run cards locks those departments out — the same exclusion ADR-002's terminology argument rejected. The positioning analysis credits configurability as a feature, not a weakness.
- **Admin-only + audited keeps it controlled.** Authoring is a back-office act by the one mandated role, logged like everything else. The department's accountability structure (ADR-017) governs who shapes its procedures; the fireground stays ICS-position-gated and untouched.

---

## Alternatives Considered

- **Curate-only — enable/disable + approved presets, no authoring** (the first-pass #230 spec). **Rejected (Alex, 2026-06-09):** too conservative; departments need to tailor checklists to their own SOPs, not just toggle a fixed set. Reading `nested-checklist` rule 6 as barring *department* authoring conflated the app's baseline (Principle 1 binds) with the department's own procedures (it does not).
- **Author freely but route every edit through a FieldShore review/approval queue.** **Rejected (Alex):** the department owns its content outright. FieldShore reviewing a department's run cards is neither wanted nor scalable; provenance + audit are the right guardrails, not a gate.
- **Frame it as a Principle-1 exception / carve-out.** **Rejected:** following [ADR-002](ADR-002-principle-1-scope-clarification.md) and [ADR-018](ADR-018-after-action-auto-email.md), this is a **scope clarification** — department SOP authoring was never within Principle 1's reach (which governs what the app asserts as doctrine). Calling it an exception would wrongly imply the principle was weakened.
- **Extend-and-toggle only — departments add steps and toggle baseline steps on/off, but cannot edit/delete baseline wording.** **Rejected (Alex):** full authoring, including a reset-to-baseline escape hatch. A department that needs to reword or drop a baseline step for its own procedure must be able to; provenance still marks the result as theirs.
- **A new "Edit checklists" permission toggle for custom roles.** **Rejected (Alex, for v4.0):** Admin-only is simpler and sufficient; a dedicated toggle can be added later if departments ask for delegated checklist authors (a forward hook, not v4.0).
- **Make checklist content editable but route it through the safety engine's no-edit rule.** **Rejected:** category error — the safety engine (load tables, shore types, strut math) is fixed doctrine per ADR-002 and is **not** a checklist template. Authoring applies to procedure/attestation checklists only; the safety engine is never department-editable.
- **Edit Principle 1's text in [`02-principles.md`](../02-principles.md).** **Rejected:** house precedent — ADR-002 and ADR-018 record scope clarifications in the ADR registry without editing the constitution. The constitution stays short and stable.

---

## Consequences

**Positive:**
- Departments tailor checklists to their actual run cards / SOPs — the customization real departments need; the product maps onto local procedure instead of imposing one script.
- **Principle 1 is unchanged and fully in force** — the boundary (FieldShore's asserted baseline vs. a department's own authored SOPs) is now explicit, and provenance enforces it visibly.
- Consistent with the house model: doctrine default + configurable overlay (ADR-002), Admin-gated back-office capability orthogonal to fireground positions (ADR-017), audited like every other change (ADR-009 / D7.5).

**Negative:**
- The app gains a **content-authoring surface** it did not have — an editor UI (deferred with the baseline content, Phase H/v4.1) and a **provenance model** (baseline vs. department-authored, surfaced on the attestation screens too, so a crew sees whose step it is).
- A **boundary to honor going forward**: FieldShore asserts only its own paraphrase-approved baseline as doctrine; everything a department authors is the department's, marked as such. Every future "can the app present X as authoritative?" is judged against that line.
- The baseline-vs-customized state adds complexity to the checklist data model (a department fork that can diverge from, and reset to, the shipped baseline) — Phase H schema work.

**Neutral:**
- The three checklist *attestation* workflows (#227 / #228 / #229) are unchanged in mechanics — they consume whichever template is active (baseline or department-tailored); only the provenance marker is added to what they render.
- FieldShore's baseline content ships v4.1 regardless; this ADR adds the authoring layer on top of that same timeline.

---

## Related

- **Clarifies:** [Principle 1](../02-principles.md) ("Defer to doctrine, not invention") — its **scope**: it governs FieldShore's shipped baseline, not a department's authoring of its own procedures. The principle is **unchanged**.
- **Principles:** 1 (scope clarified), 5 (doubt-free defaults — the generalized baseline ships as the safe default; departments tailor from there), 7 (visible safety — provenance keeps whose-doctrine visible), 8 (local-first — a department's authored checklist is its own record).
- **Other ADRs:** [ADR-002](ADR-002-principle-1-scope-clarification.md) (the precedent — doctrine vs. department configuration; this ADR extends it to checklist content), [ADR-018](ADR-018-after-action-auto-email.md) (sibling scope-clarification pattern — ADR is the record, constitution not edited inline), [ADR-017](ADR-017-custom-department-roles.md) (Admin = the mandated authoring role; two-axes rule — back-office authoring vs. fireground attestation), [ADR-009](ADR-009-database-firebase-rtdb.md) (event log — template edits are audited).
- **Feature surface:** [`09-workflows/25-customizing-checklists.md`](../09-workflows/25-customizing-checklists.md) (rewritten from curate-only to full authoring per this ADR) · [`03-primitives/nested-checklist.md`](../03-primitives/nested-checklist.md) (rule 6 — Principle 1 binds the baseline; departments author the overlay) · the three checklist screens [#227](https://github.com/Vergo402/paratech-struts/issues/227) / [#228](https://github.com/Vergo402/paratech-struts/issues/228) / [#229](https://github.com/Vergo402/paratech-struts/issues/229) (consume the active template + render provenance).
- **Open questions:** resolves the central OQ of [`25-customizing-checklists.md`](../09-workflows/25-customizing-checklists.md) ("do departments author their own steps?" → yes). Surfaces the editor-UI ship-version under [`99-open-questions.md`](../99-open-questions.md) #32 and the baseline-vs-fork data model for Phase H.
- **GitHub:** [#230](https://github.com/Vergo402/paratech-struts/issues/230) (this work) · [#239](https://github.com/Vergo402/paratech-struts/issues/239) (the Phase G gate).

---

## Notes

The line is clean and mirrors ADR-002: **FieldShore's shipped baseline is doctrine** (sourced, paraphrase-approved, Principle 1 binds) — **a department's tailoring of it is the department's own SOP** (configurable, owned by the department, marked as theirs by provenance). The safety engine — load tables, shore types, strut math — is never a checklist template and never department-editable; authoring applies to procedure/attestation checklists only. The decision locks now; the editor and the baseline content ship together on the v4.1 checklist-content timeline.

# ADR-034: First-run onboarding — a Principle 11 scope clarification (the *working path* stays quiet) with a narrow, skippable new-member welcome carve-out

> Architecture Decision Record. **Clarifies the scope of [Principle 11](../02-principles.md)** ("The app earns its place quietly") *and* records a bounded carve-out within it. Principle 11's concern is the **working path** — the IC reaching the shore-point list, the guest reaching the calculator — and that path stays untouched, with **no overlay, ever, for a guest cold-open** ([ADR-015](ADR-015-navigation-pattern.md)). Within that scope, this ADR carves out **one narrow case** the principle's literal "no tutorials" wording does not anticipate: a person who has just **deliberately created an account** may be offered a **skippable, opt-in, practice-only welcome**. This is **not a pure scope clarification** — it genuinely bends the literal "no tutorials" line and introduces a tightly scoped practice space in territory the dropped demo mode ([`99-open-questions.md`](../99-open-questions.md) #18) left unaddressed. Following [ADR-018](ADR-018-after-action-auto-email.md) (the scope-clarification precedent) and [ADR-010](ADR-010-status-commit-model.md) (the amend-via-ADR precedent), **this ADR is the record; [`02-principles.md`](../02-principles.md) is not edited inline.**

---

## Status

- [x] Proposed
- [ ] Accepted

**Date:** 2026-06-17
**Author:** Claude Opus 4.8 (onboarding implementation session — "build now, formalize later")
**Reviewer(s):** Alex (directed the build and the build-now/formalize-later sequencing; ratification of this scope clarification + carve-out pending)
**Clarifies:** [Principle 11](../02-principles.md) ("The app earns its place quietly") — its **scope** is the *working path* (the guest/operator reaching the work). **Carves out:** a narrow, account-creation-gated, skippable new-member welcome that the principle's literal "no tutorials" wording would otherwise forbid.

---

## Context

[Principle 11](../02-principles.md) reads, in full: *"The app earns its place quietly. No splash screens longer than 400 ms. No marketing in the product. No 'tip of the day.' No 'tutorials' between the user and the work."* Its rejected alternative is explicit: *"onboarding flows that delay the IC reaching the shore-point list."* The [voice-and-tone](../07-design-system/voice-and-tone.md) anti-patterns echo it — *"no 'tip of the day,' no onboarding copy between the user and the work (Principle 11)."* [ADR-015](ADR-015-navigation-pattern.md) operationalized it as the **guest-first cold-open**: the app boots into guest mode on Quick Find with **no auth wall**, and authentication is reached *forward* from a dismissible "Sign in to sync" banner or Settings — never a gate. And the dropped demo-mode decision ([`99-open-questions.md`](../99-open-questions.md) #18, Synthesis §3.3 / Q4, Alex 2026-05-31) went further: *"Dropped entirely — no sandbox, no scripted seed, no marketing-tour embed; the cold-open is a plain first-run guest state."*

This session built, at Alex's off-the-cuff request, a **first-run onboarding experience** (`src/ui/onboarding/*`, a `useOnboarding` hook, an `onboardingStore` persisted to Dexie meta): a stepped Welcome modal (3 field-anchored slides) → a checklist hub ("Run your first Quick Find," "Set up your department," with Operations/Inventory/Command marked coming-soon) → guided coachmark tips anchored to the live Quick Find controls, re-runnable from Settings → Help & Learning. It auto-launches **only after a deliberate account creation** (the create-account path calls `onboarding.start()`), is **always skippable** (Skip on the welcome dismisses the whole tour), and **never touches the guest cold-open** (a guest lands on the working screen with no overlay; `start()` is gated to a clean `unseen` slate). Nothing it does creates real records — the Quick Find lesson is inherently record-free because Quick Find is a calculator.

**The tension is real and must be stated honestly.** A skippable, opt-in, post-account-creation welcome with a practice tour **bends the literal text of Principle 11** ("no 'tutorials'," "no 'tip of the day'") and **introduces a narrowly scoped practice space** in territory the demo-mode drop left open — without the sandbox, scripted seed, or marketing-tour embed that #18 actually excluded. It is **not** a pure scope clarification of the kind that sits cleanly outside the rule. What it does *not* do is touch what Principle 11 actually protects: **the working path.** The rejected alternative names the harm precisely — *onboarding flows that delay the IC reaching the shore-point list* — and that harm requires a flow standing **between the operator and the work**. A guest cold-open here has **no overlay at all**; the welcome appears **only** when someone has just chosen to set up a department membership — a moment that is, by definition, not the IC racing to the shore-point list on a fireground. So the honest framing is two moves at once: **clarify** that Principle 11's scope is the working/guest path (untouched), and **carve out** the narrow new-member case with explicit bounds — the same spirit in which [ADR-018](ADR-018-after-action-auto-email.md) clarified Principle 10's scope, but unlike ADR-018 (which sat entirely *outside* the radio rule), named plainly as a bounded carve-out that bends the letter rather than a pure scope clarification.

This ADR records that decision after the fact. The implementation shipped ahead of ratification under Alex's "build now, formalize later" call; there is **no GitHub tracking issue** (an off-the-cuff ask), which this ADR also records.

---

## Decision

**Principle 11's scope is the working path; within it, a narrow new-member welcome is permitted.** Two parts:

> **(a) Scope.** Principle 11 governs the **working path** — the operator or guest reaching the work (the shore-point list, the calculator). On that path the app stays quiet: **no guest ever sees an onboarding overlay at cold-open** ([ADR-015](ADR-015-navigation-pattern.md) guest-first), and nothing delays the IC reaching the shore-point list.
>
> **(b) Carve-out.** A person who has just **deliberately created an account** may be offered a **skippable, opt-in, practice-only first-run welcome**. This is a bounded exception to the principle's literal "no tutorials" text, not a no-op.

The carve-out is bounded on every axis, and the bounds are the decision:

- **Trigger — deliberate account creation only.** The welcome auto-launches **only** from the create-account path (`onboarding.start()`), and only against a clean `unseen` slate. It **never** auto-runs for a guest, for an existing-account sign-in, or on plain app boot.
- **Escape — always skippable.** Skip on the welcome dismisses the **whole** tour; every step is dismissible at any time, with no "Are you sure?" confirmation ([Principle 6](../02-principles.md), [ADR-016](ADR-016-modal-vs-sheet-rules.md)). The dismiss is the doubt-free escape.
- **No unprompted launch during an active operation.** The welcome **never auto-launches** while an operation is active — it is a setup-moment experience, not a fireground one. This holds **by construction**: the only auto-launch trigger is account creation, and a just-created account has no operation (`start()` fires only from a clean `unseen` slate). The Settings → Help & Learning **replay** path (`replayTour` / `startLesson`) is **deliberately exempt** — a member who taps replay is making a choice (auth and setup are likewise reached *forward* by choice, [ADR-015](ADR-015-navigation-pattern.md)), and every step is instantly skippable. Principle 11/10 guard against the app **intruding unprompted** on the working path, not against a member opting into orientation in a lull; the unprompted path is the bound, and it is enforced.
- **Practice-only — creates no real records.** The guided lesson runs in a safe practice space; nothing it does writes a real record. This holds **today** because the only lesson that exists is Quick Find, which is inherently record-free (a calculator). It is **not** an enforced sandbox: any **future** lesson on a record-writing screen (the coming-soon Operations / Inventory / Command rows in the checklist hub) must run against a discardable practice scope, or it breaches this ADR. This is the *only* practice space the app has — it is **not** a return of demo mode (no sandbox department, no scripted seed, no marketing-tour embed; [`99-open-questions.md`](../99-open-questions.md) #18).
- **Passive, never a push.** The welcome is visible state the new member can act on or dismiss — never an in-app notification, alert, or push ([Principle 10](../02-principles.md), [ADR-018](ADR-018-after-action-auto-email.md)).
- **Re-runnable, never re-imposed.** It is replayable on demand from **Settings → Help & Learning** (replay tour, replay lesson, ICS-role focus, link to the user guide), but never re-launches itself after the first `unseen` slate is consumed.
- **Voice.** Professional, terse, present-tense, sentence case — no badges, no confetti, no exclamation marks, no emoji, never cute or celebratory ([voice-and-tone](../07-design-system/voice-and-tone.md)). No "Welcome! 👋 You're all set!"

**Principle 11 remains the governing rule everywhere else** — no splash > 400 ms, no marketing, no tip-of-the-day, and **no tutorial between any user and the work**. This carve-out reaches exactly one moment (a just-created account, off the working path) and no further.

---

## Rationale

- **It honors the principle's purpose while bending its letter.** Principle 11's rejected alternative is *onboarding flows that delay the IC reaching the shore-point list* — a harm that lives on the working path. The carve-out is fenced off that path entirely (guest cold-open untouched, never during an op). The *spirit* — the operator always reaches the work unobstructed — is fully preserved; the *letter* ("no tutorials") is what bends, narrowly, and this ADR says so plainly rather than pretending otherwise.
- **The triggering moment is the opposite of the feared one.** Deliberately creating a department account is a deskbound setup act, not a firefighter racing to the shore-point list. Offering orientation there is consistent with [ADR-015](ADR-015-navigation-pattern.md)'s logic that auth and department setup are reached *forward* by deliberate choice, never as a wall.
- **Skippable + practice-only keeps it from becoming a gate or a record risk.** A whole-tour Skip and an always-available dismiss make it a doubt-free companion ([Principle 6](../02-principles.md)), closer to the dismissible "Sign in to sync" banner pattern than to a tutorial flow. Nothing writes a real record, so the practice space carries none of the data-integrity or clutter risk that motivated dropping demo mode.
- **Recording it now prevents scope creep.** Without a recorded boundary, "the app already has onboarding" becomes a foothold for tip-of-the-day, marketing interstitials, or a guest-facing tour — exactly what Principle 11 forbids. Naming the carve-out and its fences is what keeps the rule strong.
- **Precedent for the form.** [ADR-018](ADR-018-after-action-auto-email.md) recorded a Principle 10 scope clarification in an ADR without editing the constitution; [ADR-010](ADR-010-status-commit-model.md) amended a principle's mechanism the same way; [ADR-002](ADR-002-principle-1-scope-clarification.md) clarified Principle 1's scope. This follows that chain.

---

## Alternatives Considered

- **Frame it as a pure scope clarification — "a welcome was never within Principle 11's reach."** **Rejected (honesty):** unlike [ADR-018](ADR-018-after-action-auto-email.md), this does *not* sit cleanly outside the rule's reach. Principle 11 literally says "no 'tutorials'"; a stepped welcome with a guided practice tour is a tutorial by any plain reading. Treating it as a pure scope clarification (outside the rule entirely) would understate the tension and hide the actual decision. The honest record is a scope clarification of the *working path* **plus** a named, bounded carve-out for the literal-text conflict.
- **Frame it as an amendment to Principle 11's text** (rewrite the principle to allow onboarding). **Rejected:** house precedent ([ADR-002](ADR-002-principle-1-scope-clarification.md), [ADR-010](ADR-010-status-commit-model.md), [ADR-018](ADR-018-after-action-auto-email.md)) keeps [`02-principles.md`](../02-principles.md) as append-only history; the constitution is *immutable after approval* and changes are recorded in an ADR, not inline (the "not inline" discipline is the ADR-002/010/018 house convention). At most Principle 11's text gains a pointer to this ADR at a gate.
- **Build no onboarding at all — honor Principle 11 literally.** **Rejected (Alex, this session — "build now"):** a brand-new member with no peer to show them the app benefits from a one-time, skippable orientation at the setup moment. The principle's harm (delaying the working path) does not occur here; refusing all orientation over-reads the rule.
- **A guest-facing tour, or auto-run on every boot / on sign-in.** **Rejected:** this is exactly the working-path intrusion Principle 11 forbids and [ADR-015](ADR-015-navigation-pattern.md)'s guest-first cold-open rules out. The trigger is fenced to deliberate account creation precisely to avoid it.
- **Revive demo mode** (a sandbox department / scripted seed) to host the practice. **Rejected:** demo mode was dropped entirely ([`99-open-questions.md`](../99-open-questions.md) #18). The practice here creates **no records** and needs no sandbox — the Quick Find lesson is record-free because it is a calculator. This is a record-free lesson, not a demo department.
- **A blocking welcome with no Skip ("see the tour, then continue").** **Rejected:** that is a gate, the very thing Principle 11 and [ADR-015](ADR-015-navigation-pattern.md) reject; it also violates [Principle 6](../02-principles.md)'s doubt-free escape. The whole-tour Skip is non-negotiable.

---

## Consequences

**What this permits:**
- A one-time, **skippable**, **opt-in** welcome (3-slide modal → checklist hub → live coachmark tips) that auto-launches **only** after a deliberate account creation, against a clean `unseen` slate.
- A **practice-only** guided Quick Find lesson that writes **no real records**, plus re-runnable orientation from **Settings → Help & Learning**.

**What this still forbids (the fences, going forward):**
- **No overlay for a guest cold-open — ever.** The guest reaches the working screen with nothing in the way ([ADR-015](ADR-015-navigation-pattern.md)). This is the hard line.
- **No unprompted launch during an active operation** (auto-launch is account-creation-gated; deliberate Settings replay is exempt), **never on plain boot, never on existing-account sign-in.**
- **No tip-of-the-day, no marketing, no splash > 400 ms, no tutorial on the working path** — Principle 11 governs everywhere outside this one carve-out.
- **No record creation** from the practice space; **no demo department / sandbox / scripted seed** ([`99-open-questions.md`](../99-open-questions.md) #18).
- **No non-skippable step, no "Are you sure?" to leave, no push/notification, no cute/celebratory voice.**

**Positive:**
- A new member gets orientation at the one moment it helps, without ever obstructing the working path.
- The boundary is now explicit, so "the app has onboarding" cannot be stretched into the guest-facing or working-path territory Principle 11 protects.

**Negative:**
- This is a **named carve-out, not a no-op** — the app now carries an onboarding surface that bends Principle 11's literal text. That is a maintenance and review obligation: every future onboarding-shaped request is judged against *these fences*, not extended from the fact that onboarding now exists.
- The implementation shipped **ahead of ratification** (Status: Proposed). Until accepted at a gate, the bounds above are the contract the code must satisfy; any drift is a bug against this ADR.
- **One bound is a forward requirement, not yet enforced in code:** *creates no real records* holds today only because Quick Find is the only lesson and is a calculator — it is **not** an enforced sandbox. Any future lesson on a record-writing screen (the coming-soon Operations / Inventory / Command rows) must add a discardable practice scope, or it breaches this ADR. (The *no-unprompted-launch-during-an-op* bound, by contrast, **is** enforced by construction — see Decision — and deliberate Settings replay is intentionally exempt, not a gap.)

**Neutral:**
- One new persisted slate (`onboardingStore` in Dexie meta) and a Settings → Help & Learning entry point.
- No tracking issue exists (off-the-cuff ask); if the board wants one for traceability — including the future record-writing-lesson sandbox named above — it would be created retroactively and linked here.

---

## Related

- **Clarifies:** [Principle 11](../02-principles.md) ("The app earns its place quietly") — its **scope** is the working/guest path, which stays quiet (no guest-cold-open overlay).
- **Carves out:** [Principle 11](../02-principles.md)'s literal "no 'tutorials' / no 'tip of the day'" wording — a narrow, account-creation-gated, skippable, practice-only welcome. Named plainly as a bounded exception, not a no-op.
- **Principles:** 11 (scope clarified + narrow carve-out), 6 (doubt-free escape — whole-tour Skip, always-dismissible, no "Are you sure?"), 10 (respect the radio — passive visible state, never a push/notification), 4 (one canonical action — the tips point at the single live control, they do not add a second path), 3 (calm in chaos — no badges/confetti/celebration), 5 (doubt-free defaults — guest stays on the working screen by default).
- **Other ADRs:** [ADR-018](ADR-018-after-action-auto-email.md) (precedent — a principle scope clarification recorded in an ADR, constitution not edited inline), [ADR-010](ADR-010-status-commit-model.md) (precedent — amend a principle's mechanism via ADR, principles file treated as append-only history), [ADR-002](ADR-002-principle-1-scope-clarification.md) (precedent — Principle 1 scope clarification), [ADR-015](ADR-015-navigation-pattern.md) (guest-first cold-open, no auth wall — the working-path guarantee this carve-out must never touch).
- **Demo-mode decision honored:** [`99-open-questions.md`](../99-open-questions.md) #18 (demo mode dropped entirely; this practice space creates no records and is not a sandbox/seed/marketing-tour revival; Synthesis §3.3 / Q4, Alex 2026-05-31).
- **Voice:** [`07-design-system/voice-and-tone.md`](../07-design-system/voice-and-tone.md) (professional, terse, present-tense, sentence case; no exclamation marks, no emoji, never cute — the onboarding copy inherits this on every surface).
- **Files (shipped this session):** `src/ui/onboarding/*` (Welcome modal, checklist hub, coachmark tips), `src/ui/hooks/useOnboarding.ts`, `src/data/store/onboardingStore.ts` (Dexie meta), the create-account path calling `onboarding.start()`, and the Settings → Help & Learning re-run entry point (`src/app/routes/settings.tsx`).
- **GitHub:** **none** — off-the-cuff ask, no tracking issue; recorded here under "build now, formalize later."
- **Open questions surfaced:** whether to retroactively open a tracking issue (including the future record-writing-lesson sandbox), and whether Principle 11's text in `02-principles.md` should gain a pointer to this ADR at a gate.

---

## Notes

This ADR does **not** soften Principle 11; it draws the line exactly. The principle's purpose — the operator reaching the work without an app standing in the way — is preserved completely, because the carve-out is fenced off the working path (no guest-cold-open overlay, never during an op). What bends is the principle's *literal* "no tutorials" wording, and only for one moment: a person who just deliberately created an account, who can skip the whole thing, in a space that writes no record. Calling that a "narrow carve-out" rather than a "no-op clarification" is deliberate — the honest record names the tension instead of hiding it.

This is **not** a foothold. The fences (account-creation-gated · always skippable · never during an op · practice-only · passive, never a push · no guest cold-open) are the decision, and every future onboarding-shaped request is judged against them on its own merits, not extended from the existence of this feature.

The implementation shipped ahead of this record under Alex's "build now, formalize later" sequencing, with **no GitHub tracking issue** (off-the-cuff ask). Status is therefore **Proposed**: the code already exists and must satisfy the bounds above. One of those bounds is a forward requirement not yet enforced — a discardable practice scope for any future record-writing lesson; the no-unprompted-launch-during-an-op bound is already enforced by construction, and deliberate Settings replay is intentionally exempt. Ratification — and any pointer added to Principle 11's text — happens at the next v4 design gate, consistent with how [ADR-002](ADR-002-principle-1-scope-clarification.md) / [ADR-010](ADR-010-status-commit-model.md) / [ADR-018](ADR-018-after-action-auto-email.md) handled the constitution as append-only history.

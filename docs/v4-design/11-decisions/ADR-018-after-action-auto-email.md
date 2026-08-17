# ADR-018: After-action auto-email — a Principle 10 scope clarification (records delivery, not communication)

> Architecture Decision Record. **Clarifies the scope of [Principle 10](../02-principles.md)** ("Respect the radio"): the radio rule governs **during-incident, life-safety, and tactical communication**. **Delivering the assembled after-action record for later reading — after the incident has closed — is outside that scope.** Principle 10 is **unchanged and fully in force**; this is **not** an exception, amendment, or carve-out. Following [ADR-002](ADR-002-principle-1-scope-clarification.md) (which clarified Principle 1's scope the same way), **this ADR is the record; the constitution text is not edited inline.** The feature surface is [`08-information-architecture/53-audit-log.md`](../08-information-architecture/53-audit-log.md) §After-action auto-email.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate follow-up [#305](https://github.com/Vergo402/paratech-struts/issues/305) — Alex, 2026-06-09)*
- [x] **Policy toggle ships v4.0; email transport deferred past v4.0** — tracked in [#495](https://github.com/Vergo402/paratech-struts/issues/495) (ruled 2026-08-17)

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase F gate follow-up #305)
**Reviewer(s):** Alex (#305 — approved 2026-06-09; **directed the scope-clarification framing** — the after-action email does not break the radio rule and is not an exception to it)
**Clarifies:** [Principle 10](../02-principles.md) ("Respect the radio") — its **scope**. The principle is not changed; this records that it does not reach after-action records delivery.

**Amended 2026-08-17:** The department policy **toggle ships in v4.0 Settings**, but there is **no send mechanism in v4.0**. Email transport deferred to #495 (past v4.0).

---

## Context

[Principle 10](../02-principles.md) is a hard contract: *"FieldShore never carries life-safety communication… The app supports radio comms; it does not replace them. Status changes are silent and asynchronous. No push notifications during active operations. The app must never become the channel for PAR checks, evacuation orders, mayday, or any other life safety signal. Those are radio, always."* Its concern is **communication during an incident — especially anything life-safety or tactical** — the moments a firefighter must be able to trust the radio and never a screen. Its rejected alternatives are chat, in-app messaging, push-notification alarms, and "Evac Now" buttons. v3 honors this by sending nothing outbound.

At the Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate (2026-06-08), reviewing the [Audit Log](../08-information-architecture/53-audit-log.md) — the after-action / export-convergence point — Alex decided: when an incident has **closed**, the assembled after-action record should reach the people accountable for it, the **Incident Commander and Operations Section Chief**, automatically by email.

Because this is the **first outbound thing the app would ever do**, it has to be checked against Principle 10. **The check passes — and not narrowly: it is simply outside what the radio rule governs.** It has **nothing to do with during-incident notifications or life-safety messages.** It fires only **after the incident closes**, carries a **record that is read later**, and is **documentation, not communication.** Alex's direction (2026-06-09): *"this doesn't break the radio rule… it has nothing to do with during-incident notifications or life-safety messages… it's an email that is read later."* This ADR records that scope clarification — the same move as [ADR-002](ADR-002-principle-1-scope-clarification.md), which clarified that Principle 1 does not reach departmental terminology.

---

## Decision

**Principle 10 does not govern after-action records delivery.** Delivering a closed incident's record for later reading is a documentation / records function — not the during-incident, life-safety, or tactical communication the radio rule is about. With that scope established, the feature is specified as:

> When an incident is **closed** (End Operation), FieldShore **emails the assembled after-action record to the Incident Commander and Operations Section Chief.**

The specifics — and the reason it stays plainly **records, not communication** — are bounded on every axis:

- **What — records only.** The export-convergence packet that already resolves on the Audit Log: **ICS-201 / 203 / 207 / 208 / 209 + PAR snapshot + Hazard Log ICS-208 + raw CSV** of the event log ([ADR-009](ADR-009-database-firebase-rtdb.md); [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) §export convergence). Never a freeform message, never tactical content.
- **When — after the incident closes only.** Fires on **End Operation** (the terminal action that closes the op). **Never during an active operation** — so it never competes with the radio in a live, life-safety, or tactical moment.
- **Who — IC / Operations Section Chief only.** The two accountable commanders, consistent with the [#217](https://github.com/Vergo402/paratech-struts/issues/217) CH-8 decision that gates Audit Log read/export to the same positions. (Recipient resolution + edge cases below.)
- **How — one-way, read later.** The app sends a record to be read after the fact; it does not receive, thread, raise an in-app notification, or push. **It is not a channel.**

**Principle 10 remains exactly as written and fully in force** — no chat, no in-app messaging, no push notifications, no tactical alerts, and above all **no PAR / evac / mayday or any life-safety signal during an incident**. This clarification takes **nothing** out of that contract; it only records that an after-action record read later was never within the rule's reach.

### Recipient resolution & edge cases

- **Recipients** = the **IC + Operations Section Chief as assigned at the moment of close**. If Operations is unfilled → **IC only**. If **neither** is filled → fall back to the department **Admin(s)** (the governance backstop — an incident record must not vanish for lack of an assigned commander).
- **Addresses** come from the recipient's authenticated **account/profile** email ([ADR-017](ADR-017-custom-department-roles.md) member identity; [`70-login-register.md`](../08-information-architecture/70-login-register.md)).
- A **guest** (no account) commander has no address → **no email is sent to them**, but the record is unaffected: it persists in-app on the [Audit Log](../08-information-architecture/53-audit-log.md) laptop surface, the **system of record**. Email is a convenience **sink, never the record itself** ([Principle 8](../02-principles.md), local-first).
- **Mutual-aid** incidents (host vs. assisting IC, merged logs) → deferred to the Phase G mutual-aid workflow ([`52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md) OQ5 / [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) OQ6).

### Opt-out

**On by default, department-disableable.** The safe default ([Principle 5](../02-principles.md)) is that the accountable commanders receive the record; a department with its own records/PII handling policy can switch it off. **This ADR locks the policy** (departments may disable it); the **toggle's placement ships with the Settings pass** ([#308](https://github.com/Vergo402/paratech-struts/issues/308) / [`50-settings.md`](../08-information-architecture/50-settings.md)), not in this ADR.

### Ship split

- The **scope clarification + the feature decision** are **locked now**.
- The **email transport** — the send mechanism + IC/Ops address sourcing — is **deferred past v4.0** ([#495](https://github.com/Vergo402/paratech-struts/issues/495); ruled 2026-08-17). v4.0 ships the **policy toggle only** (Settings).
- The **trigger wiring** (End Operation → assemble the packet → send) ships with the **after-action review feature**, which rides the existing v4.0-vs-v4.1 UI-deferral question ([`99-open-questions.md`](../99-open-questions.md) #32). **Decision now; plumbing later.**

---

## Rationale

- **It is documentation, not communication.** The after-action packet is the closed incident's record; getting it to the accountable commanders is **records discipline**. v3's Surfside TTX-2 left no audit trail across five IC transitions ([`06-synthesis.md`](../06-synthesis.md) §1.2) — the real failure mode is records reaching **no one**.
- **It never touches the radio rule's actual concern.** Principle 10 protects **during-incident, life-safety, and tactical communication**. This fires only **after** the incident closes, carries only a **record**, and is **read later** — none of those protected moments are in play. Calling it an "exception" would wrongly imply the rule was bent; it wasn't.
- **One owner for the record.** Restricting recipients to IC/Operations mirrors the [#217](https://github.com/Vergo402/paratech-struts/issues/217) CH-8 Audit Log access gate — the same two positions that can read/export the log receive it. One consistent answer to "who owns this record."
- **On-by-default-with-opt-out follows [Principle 5](../02-principles.md):** the safe default delivers the record; departments with stricter policy keep control. Same decision-now / UI-later shape as [ADR-017](ADR-017-custom-department-roles.md).

---

## Alternatives Considered

- **Frame it as a "narrow exception" / "carve-out" of Principle 10.** **Rejected (Alex, 2026-06-09):** it does not break the radio rule and has nothing to do with during-incident or life-safety messaging; framing it as an exception overstates the tension and implies the principle was weakened. It is a **scope clarification** — an after-action record read later is outside the rule — not an exception.
- **No delivery — manual export only** (the record stays in-app; a commander downloads it). **Rejected (Alex):** the record reaching the accountable commanders is the point; a manual step is how records get lost (the v3 gap). The in-app record remains regardless — this **adds delivery, it does not replace the record**.
- **A broader notifications / comms capability** (status pushes, during-op alerts). **Rejected:** *that* would be squarely **inside** Principle 10 and is forbidden. The line is exact — during-incident / tactical communication (governed, prohibited) vs. after-incident records read later (outside the scope, allowed).
- **No opt-out (always send, no department control).** **Rejected (Alex):** the packet carries PAR / PII; a department must be able to align with its own records policy. On-by-default preserves the discipline; the opt-out preserves control.
- **Send to all roles / the whole department.** **Rejected:** the record is command-sensitive (the same reasoning as CH-8 restricting Audit Log read to IC/Ops). Recipients are the two accountable commanders, with an Admin fallback **only** when neither is assigned.
- **Edit Principle 10's text in [`02-principles.md`](../02-principles.md).** **Rejected:** house precedent — [ADR-002](ADR-002-principle-1-scope-clarification.md) clarified Principle 1's scope without an inline edit. The ADR registry is where scope clarifications live; the constitution stays short and stable.

---

## Consequences

**Positive:**
- The after-action record reliably reaches the accountable commanders; one consistent owner for the record (IC/Ops, matching CH-8).
- **Principle 10 is unchanged and fully in force** — the radio rule is not weakened, bent, or excepted; the boundary (during-incident/tactical vs. after-incident records) is now explicit.
- The in-app record remains the system of record (email is a sink); a guest commander or a missing address never costs the record.

**Negative:**
- The app gains an **outbound capability it never had** — a new infrastructure surface (email transport, address sourcing, deliverability, bounce handling) deferred to Phase H ([`99-open-questions.md`](../99-open-questions.md) #35).
- A **boundary to honor going forward**: the line is **during-incident / life-safety / tactical communication** (governed by Principle 10, prohibited in the app) vs. **an after-incident record read later** (outside that scope). Every future "can the app send X?" is judged against that line — not extended from this feature.

**Neutral:**
- The opt-out adds one department setting (deferred to [#308](https://github.com/Vergo402/paratech-struts/issues/308)).
- A guest commander simply does not receive the email; the record is unaffected.

---

## Related

- **Clarifies:** [Principle 10](../02-principles.md) (no in-app comms / no push) — its **scope**: it does not govern after-action records delivery. The principle is **unchanged**.
- **Principles:** 10 (scope clarified), 5 (doubt-free defaults — on-by-default), 8 (local-first — email is a sink, not the record), 7 (visible safety — unaffected; safety lives on the operational screens and the radio).
- **Other ADRs:** [ADR-002](ADR-002-principle-1-scope-clarification.md) (precedent — a principle **scope clarification** recorded in an ADR, constitution not edited inline), [ADR-009](ADR-009-database-firebase-rtdb.md) (event-sourced log — the payload source), [ADR-017](ADR-017-custom-department-roles.md) (sibling #217 follow-up; same decision-now / UI-later shape).
- **Screen specs:** [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) (§After-action auto-email — the feature surface) · [`50-settings.md`](../08-information-architecture/50-settings.md) (the opt-out toggle, #308).
- **Reconciles with #217 CH-8:** recipients = the same IC / Operations gate as Audit Log read/export.
- **GitHub:** [#305](https://github.com/Vergo402/paratech-struts/issues/305) (this work) · [#217](https://github.com/Vergo402/paratech-struts/issues/217) (the gate) · [#211](https://github.com/Vergo402/paratech-struts/issues/211) (Audit Log) · [#308](https://github.com/Vergo402/paratech-struts/issues/308) (Settings — the opt-out toggle). Transport infra: [`99-open-questions.md`](../99-open-questions.md) #35. Feature ship-version: [`99-open-questions.md`](../99-open-questions.md) #32.

---

## Notes

The boundary is clean: **during-incident / life-safety / tactical communication** is what Principle 10 governs — and prohibits in the app; **an after-action record read later** is documentation outside that scope. This feature is the latter, fully. It is **not** a foothold for the former — any future outbound request is judged against that same line, on its own merits.

The exact email mechanism (a transactional email service vs. a backend function vs. a platform integration) and address verification are Phase H ([`99-open-questions.md`](../99-open-questions.md) #35), behind the `data/sync` seam ([ADR-009](ADR-009-database-firebase-rtdb.md)).

---

## Addendum — email transport decided (2026-07-02, resolves OQ #35)

**Decision (Alex, transport-decision batch S2): automatic send via a transactional email service, triggered by a backend function.**

- **Mechanism.** On **End Operation**, a **server-side function on the existing Firebase project** (`fieldshore-database`) assembles the after-action packet from the event log and hands it to a **transactional email provider** (e.g. Resend / SendGrid / SES — the specific vendor is an implementation detail chosen at build time, swappable behind the send interface). This is the app's **first server-side code**; it lives behind the `data/sync` seam ([ADR-009](ADR-009-database-firebase-rtdb.md)) and touches no client flow.
- **Automatic, not user-initiated.** The record sends on its own when the incident closes — no "open your mail app / hit send" step. A client-side `mailto:`/share-sheet path was **rejected**: it is not automatic, can't reliably carry a generated packet, and depends on each commander remembering to send.
- **Addresses** come from the IC's and Operations Section Chief's **authenticated account/profile email** ([ADR-017](ADR-017-custom-department-roles.md) member identity), as already specified above. A guest commander with no account gets no email; the in-app [Audit Log](../08-information-architecture/53-audit-log.md) record is unaffected (email is a **sink**, never the record — Principle 8).
- **Decision now, plumbing later.** The transport is settled; the function + provider wiring ships with the after-action review feature ([#305](https://github.com/Vergo402/paratech-struts/issues/305) / the UI-ship question #32), not before. Deliverability/bounce handling is the provider's job; a bounce never costs the record.

Resolves [`99-open-questions.md`](../99-open-questions.md) #35. GitHub: [#406](https://github.com/Vergo402/paratech-struts/issues/406).

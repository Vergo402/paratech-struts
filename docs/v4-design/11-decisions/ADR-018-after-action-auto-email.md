# ADR-018: After-action auto-email — the one narrow exception to Principle 10

> Architecture Decision Record. **Amends [Principle 10](../02-principles.md)** (no in-app comms / no push) with a single, bounded carve-out. Per the [`02-principles.md`](../02-principles.md) invocation rule ("changes require an ADR explaining what changed and why"), **this ADR is the amendment of record**; following the [ADR-002](ADR-002-principle-1-scope-clarification.md) precedent, the constitution text is **not** edited inline. The feature surface is [`08-information-architecture/53-audit-log.md`](../08-information-architecture/53-audit-log.md) §After-action auto-email.

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate follow-up [#305](https://github.com/Vergo402/paratech-struts/issues/305) — Alex, 2026-06-09)*

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase F gate follow-up #305)
**Reviewer(s):** Alex (#305 — approved 2026-06-09)
**Amends:** [Principle 10](../02-principles.md) ("Respect the radio") — adds one bounded exception; the rest of the principle stays absolute.

---

## Context

[Principle 10](../02-principles.md) is a hard contract: *"FieldShore never carries life-safety communication… Status changes are silent and asynchronous. No push notifications during active operations. The app must never become the channel for PAR checks, evacuation orders, mayday, or any other life safety signal. Those are radio, always."* Its rejected alternatives are chat, in-app messaging, push-notification alarms, and "Evac Now" buttons. v3 honors this by sending **nothing** outbound (Anonymous Auth, no email, export is a manual download).

At the Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate (2026-06-08), reviewing the [Audit Log](../08-information-architecture/53-audit-log.md) — the after-action / export-convergence point — Alex decided: when an incident is **completed**, the assembled after-action record should automatically reach the people accountable for it, the **Incident Commander and Operations Section Chief**, by email.

That is an **outbound message** — the first the app would ever send — so it touches Principle 10. But it is categorically different from what Principle 10 forbids: it is **post-incident, records-only, to the two accountable commanders, one-way**. It is not tactical, not during an operation, not a life-safety signal, and not an in-app comms channel. Principle 10's own invocation rule requires an ADR for any change to a principle. This is that ADR.

---

## Decision

Add **exactly one** bounded exception to Principle 10:

> When an incident is **completed** (End Operation), FieldShore **automatically emails the assembled after-action record to the Incident Commander and Operations Section Chief.**

Bounded on every axis Principle 10 cares about:

- **What — records only.** The export-convergence packet that already resolves on the Audit Log: **ICS-201 / 203 / 207 / 208 / 209 + PAR snapshot + Hazard Log ICS-208 + raw CSV** of the event log ([ADR-009](ADR-009-database-firebase-rtdb.md); [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) §export convergence). Never a freeform message, never tactical content.
- **When — incident-complete only.** Fires on **End Operation** (the terminal action that closes the op). **Never during an active operation.**
- **Who — IC / Operations Section Chief only.** The two accountable commanders, consistent with the [#217](https://github.com/Vergo402/paratech-struts/issues/217) CH-8 decision that gates Audit Log read/export to the same positions. (Recipient resolution + edge cases below.)
- **How — a one-way sink.** The app sends; it does not receive, thread, or raise an in-app notification off it. **No push.**

**Everything else in Principle 10 stays absolute:** no chat, no in-app messaging, no push notifications, no tactical alerts, and above all **no PAR / evac / mayday or any life-safety signal** — those are the radio, always. This is the **only** carve-out, and it is not a foothold for others.

### Recipient resolution & edge cases

- **Recipients** = the **IC + Operations Section Chief as assigned at the moment of close**. If Operations is unfilled → **IC only**. If **neither** is filled → fall back to the department **Admin(s)** (the governance backstop — an incident record must not vanish for lack of an assigned commander).
- **Addresses** come from the recipient's authenticated **account/profile** email ([ADR-017](ADR-017-custom-department-roles.md) member identity; [`70-login-register.md`](../08-information-architecture/70-login-register.md)).
- A **guest** (no account) commander has no address → **no email is sent to them**, but the record is unaffected: it persists in-app on the [Audit Log](../08-information-architecture/53-audit-log.md) laptop surface, the **system of record**. Email is a convenience **sink, never the record itself** ([Principle 8](../02-principles.md), local-first).
- **Mutual-aid** incidents (host vs. assisting IC, merged logs) → deferred to the Phase G mutual-aid workflow ([`52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md) OQ5 / [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) OQ6).

### Opt-out

**On by default, department-disableable.** The safe default ([Principle 5](../02-principles.md)) is that the accountable commanders receive the record; a department with its own records/PII handling policy can switch it off. **This ADR locks the policy** (departments may disable it); the **toggle's placement ships with the Settings pass** ([#308](https://github.com/Vergo402/paratech-struts/issues/308) / [`50-settings.md`](../08-information-architecture/50-settings.md)), not in this ADR.

### Ship split

- The **carve-out (this governance decision)** is **locked now**.
- The **email transport** — the send mechanism + IC/Ops address sourcing — is **Phase H infrastructure** ([`99-open-questions.md`](../99-open-questions.md) #35), like other platform-infra deferrals.
- The **trigger wiring** (End Operation → assemble the packet → send) ships with the **after-action review feature**, which rides the existing v4.0-vs-v4.1 UI-deferral question ([`99-open-questions.md`](../99-open-questions.md) #32). **Decision now; plumbing later.**

---

## Rationale

- **The record exists for these people.** The after-action packet is assembled precisely for the commanders accountable for the incident; delivering it to them automatically is **after-action discipline, not communication**. v3's Surfside TTX-2 left no audit trail across five IC transitions ([`06-synthesis.md`](../06-synthesis.md) §1.2) — the real failure mode is records reaching **no one**, not too much messaging.
- **It is defensible because it is bounded on every axis Principle 10 cares about:** post-incident (not during), records (not tactical), to commanders (not broadcast), one-way (not a channel). **None** of Principle 10's rejected alternatives — chat, push alarms, evac buttons — are enabled by it.
- **One owner for the record.** Restricting recipients to IC/Operations mirrors the [#217](https://github.com/Vergo402/paratech-struts/issues/217) CH-8 Audit Log access gate — the same two positions that can read/export the log receive it. One consistent answer to "who owns this record."
- **On-by-default-with-opt-out follows [Principle 5](../02-principles.md):** the safe default delivers the record; departments with stricter policy keep control. Same decision-now / UI-later shape as [ADR-017](ADR-017-custom-department-roles.md).

---

## Alternatives Considered

- **No exception — manual export only** (the record stays in-app; a commander downloads it). **Rejected (Alex):** the record reaching the accountable commanders is the point; a manual step is how records get lost (the v3 gap). The in-app record remains regardless — this **adds delivery, it does not replace the record**.
- **A broader notifications / comms capability** (status pushes, during-op alerts). **Rejected:** that is exactly what Principle 10 forbids and would erode the hard contract the firefighter depends on. The carve-out is records-after-incident, full stop.
- **No opt-out (always send, no department control).** **Rejected (Alex):** the packet carries PAR / PII; a department must be able to align with its own records policy. On-by-default preserves the discipline; the opt-out preserves control.
- **Send to all roles / the whole department.** **Rejected:** the record is command-sensitive (the same reasoning as CH-8 restricting Audit Log read to IC/Ops). Recipients are the two accountable commanders, with an Admin fallback **only** when neither is assigned.
- **Edit Principle 10's text in [`02-principles.md`](../02-principles.md).** **Rejected:** house precedent — [ADR-002](ADR-002-principle-1-scope-clarification.md) amended Principle 1 without an inline edit. The ADR registry is the amendment layer; the constitution stays short and stable.

---

## Consequences

**Positive:**
- The after-action record reliably reaches the accountable commanders; one consistent owner for the record (IC/Ops, matching CH-8).
- Principle 10's hard contract stays **intact everywhere else** — the carve-out is exhaustively bounded.
- The in-app record remains the system of record (email is a sink); a guest commander or a missing address never costs the record.

**Negative:**
- The app gains an **outbound capability it never had** — a new infrastructure surface (email transport, address sourcing, deliverability, bounce handling) deferred to Phase H ([`99-open-questions.md`](../99-open-questions.md) #35).
- A standing **review burden**: every future "can the app just send…" must be checked against this ADR's bounds. The carve-out is **exhaustive, not a precedent to extend**.

**Neutral:**
- The opt-out adds one department setting (deferred to [#308](https://github.com/Vergo402/paratech-struts/issues/308)).
- A guest commander simply does not receive the email; the record is unaffected.

---

## Related

- **Amends:** [Principle 10](../02-principles.md) (no in-app comms / no push) — the single bounded carve-out.
- **Principles:** 10 (the subject), 5 (doubt-free defaults — on-by-default), 8 (local-first — email is a sink, not the record), 7 (visible safety — unaffected; safety lives on the operational screens and the radio).
- **Other ADRs:** [ADR-002](ADR-002-principle-1-scope-clarification.md) (precedent — amend a principle via ADR, not inline), [ADR-009](ADR-009-database-firebase-rtdb.md) (event-sourced log — the payload source), [ADR-017](ADR-017-custom-department-roles.md) (sibling #217 follow-up; same decision-now / UI-later shape).
- **Screen specs:** [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) (§After-action auto-email — the feature surface) · [`50-settings.md`](../08-information-architecture/50-settings.md) (the opt-out toggle, #308).
- **Reconciles with #217 CH-8:** recipients = the same IC / Operations gate as Audit Log read/export.
- **GitHub:** [#305](https://github.com/Vergo402/paratech-struts/issues/305) (this work) · [#217](https://github.com/Vergo402/paratech-struts/issues/217) (the gate) · [#211](https://github.com/Vergo402/paratech-struts/issues/211) (Audit Log) · [#308](https://github.com/Vergo402/paratech-struts/issues/308) (Settings — the opt-out toggle). Transport infra: [`99-open-questions.md`](../99-open-questions.md) #35. Feature ship-version: [`99-open-questions.md`](../99-open-questions.md) #32.

---

## Notes

The carve-out is **exhaustively bounded** — records / incident-complete / IC-Ops / one-way. It is **not** a foothold for general notifications; any future outbound request is a **new** decision against Principle 10, not an extension of this one.

The exact email mechanism (a transactional email service vs. a backend function vs. a platform integration) and address verification are Phase H ([`99-open-questions.md`](../99-open-questions.md) #35), behind the `data/sync` seam ([ADR-009](ADR-009-database-firebase-rtdb.md)).

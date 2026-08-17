# ADR-022: Mutual aid ships in v4.0 — QR-everywhere join + guest incident participation

> Architecture Decision Record. **Supersedes the v4.5 deferral** of cross-department incident sharing (which lived in [`52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md) §Where it lives and the master-plan D7.4, framed by [ADR-003](ADR-003-scope-everyday-expandable.md)). Three coupled decisions: mutual aid is **v4.0**; the join mechanism is **QR-primary + code-fallback** everywhere; and an **un-provisioned department can participate as a guest** for the incident's duration. Feature surfaces: [`09-workflows/32-mutual-aid-invite-accept.md`](../09-workflows/32-mutual-aid-invite-accept.md) + [`08-information-architecture/52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase G gate discussion — Alex, 2026-06-09: "full mutual aid into v4.0," "QR everywhere in v4.0," and "an arriving department with no account / no apparatus should still be able to use the app for the duration of the incident")*
- [x] **Implementation deferred past v4.0** — design decisions locked; v4.0 ships zero code; tracked in [#493](https://github.com/Vergo402/paratech-struts/issues/493) (ruled 2026-08-17)

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (Phase G gate closeout)
**Reviewer(s):** Alex (decision — three explicit calls: mutual aid → v4.0; QR everywhere v4.0; walk-up guests are a typed unit tag with v3 external-equipment handling, no on-the-fly deployable inventory)
**Supersedes:** the **v4.5 timing** of cross-dept incident sharing. **Does not** supersede [ADR-003](ADR-003-scope-everyday-expandable.md)'s *scope* (local 2–5 departments; federal/IST still out) — only its deferral.

**Amended 2026-08-17:** Design decisions accepted; implementation and code carry to #493 (past v4.0).

---

## Context

[ADR-003](ADR-003-scope-everyday-expandable.md) scoped FieldShore to the everyday incident, expandable to local mutual aid (2–5 neighboring departments), explicitly **not** federal/IST scale. The cross-department *incident-sharing* capability (a host invites assisting departments to work one incident) was specified in Phase F ([`52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md), [#210](https://github.com/Vergo402/paratech-struts/issues/210)) and in the Phase G workflow ([`32-mutual-aid-invite-accept.md`](../09-workflows/32-mutual-aid-invite-accept.md), [#235](https://github.com/Vergo402/paratech-struts/issues/235)) but **deferred to v4.5, shown-but-disabled in v4.0.**

The Phase G gate review surfaced this from two directions: the MCI deputy chief (gate B3 / M12) flagged that the unified multi-agency record — the whole reason a large department adopts the tool — does not exist at v4.0; and the training chief (gate B4) flagged that a **one-time, 24-hour invite code cannot onboard a department** (40 people, three shifts). In gate discussion Alex resolved both by **pulling mutual aid forward and reworking the join mechanism**, and added a requirement that walk-up departments with **no account and no inventory** must still be able to work the incident — the real mutual-aid case, since the company that rolls up to help is almost never already a FieldShore customer.

---

## Decision

### 1. Cross-department incident sharing ships in **v4.0** (no longer shown-but-disabled)
A host department can invite assisting departments to work **one specific incident** — scoped to that incident, local 2–5 departments ([ADR-003](ADR-003-scope-everyday-expandable.md) scope unchanged; federal/IST still out). The **merged multi-agency audit roll-up** (the unified, defensible after-action record across contributing units) is part of v4.0, not v4.5 (resolves gate B3 / M12).

### 2. Join mechanism = **QR primary + human-readable code fallback** — QR everywhere in v4.0
- **One code admits many,** and it is **multi-use · time-boxed · revocable · auto-expires at incident close** (the one-time 24-hour code is retired — it could not onboard a department; resolves gate B4).
- The host **displays the QR in a sheet** and may **cast it to the C-13 broadcast board** — a rendered image, fully compatible with the "no interactive primitive on broadcast" rule ([ADR-016](ADR-016-modal-vs-sheet-rules.md)); the tap happens on the **joiner's** phone, never the wall.
- The **human-readable code** is printed beneath the QR as the **radio / remote / no-camera fallback**, in **unambiguous glyphs** (no `0`/`O`, `1`/`l`) so it survives being read over the radio and typed with gloves.
- **QR is used both for department onboarding and for incident join** ("QR everywhere in v4.0"). The same dual mechanism applies to the dept-level invite ([`08-joining-by-invite-code.md`](../09-workflows/08-joining-by-invite-code.md)) and the department-setup first code ([`07-department-setup.md`](../09-workflows/07-department-setup.md)).

### 3. **Guest incident participation** — an un-provisioned department can work the incident
A device with **no account and no department** can scan/enter the incident code and participate for the incident's duration:
- It joins as a **guest** on a **per-device anonymous UID** (already in v4 via Anonymous Auth, [ADR-009](ADR-009-database-firebase-rtdb.md)) — **no account required**, consistent with guest-first ([ADR-015](ADR-015-navigation-pattern.md)).
- The guest enters a **typed unit tag** for attribution — e.g. "Engine 7, Westfield FD." The audit log attributes their actions as **"Guest · \<unit tag\>"** until/unless they claim an account.
- The guest can **work the incident** — advance shore points, take an org position — under the host's incident.
- **Equipment they bring is tracked the v3 external-equipment way** (return-tracked against the source unit), **NOT** as a deployable apparatus inventory. **There is no on-the-fly inventory build** (Alex's call — keeps the guest path light; a walk-up crew does not stop to provision an apparatus). Deploying *from* a guest's own registered stock is out of v4.0 scope; their struts are external equipment for return.
- On **incident close**, the guest retains a **read-only record** of what their unit worked, **claimable later** by creating an account (the guest-claim path, [`06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md)).

### Not a comms channel (Principle 10)
Generating/scanning a code is a **permission grant, not a message.** No push when a department or guest joins; the join surfaces **visibly** (the joined-units list + the [Audit Log](../08-information-architecture/53-audit-log.md) event) on next sync.

### Ship split
The **scope + mechanism decisions are locked now.** The **camera scanner implementation** (permission flow, native scan) is Phase H slice work ([`99-open-questions.md`](../99-open-questions.md)); the specs define the QR flow, not the native scanner. The **merged multi-agency audit export format** rides the same export-convergence work as the after-action packet.

---

## Rationale

- **Mutual aid is the case the assisting crew is *not* a customer.** If a walk-up company must create an account and build an apparatus inventory before marking one shore point, the tool is useless on the call where help matters most. Guest participation makes the help usable in seconds — a direct extension of guest-first ([ADR-015](ADR-015-navigation-pattern.md)).
- **QR is the right mechanism when several units converge on the CP at once.** A typed code read over the radio is serial and congests the net; one displayed/cast QR lets every arriving officer self-serve in seconds. The human-readable fallback keeps the remote/no-camera/radio path working — so the mechanism degrades gracefully.
- **The one-time 24-hour code was a real defect for onboarding** (gate B4). Multi-use + revocable + auto-expire fixes both department rollout and incident join with one model.
- **The unified multi-agency record is the MCI adoption driver** (gate B3 / M12). Pulling it into v4.0 makes the deputy-chief lens a v4.0 user, not a v4.5 prospect.
- **Guest equipment as external-equipment (not deployable stock)** keeps the pull-forward affordable: no new on-the-fly inventory subsystem; it reuses the v3 external-equipment return path the app already understands.

---

## Alternatives Considered

- **Keep the v4.5 deferral; ship only the department-onboarding QR in v4.0.** **Rejected (Alex):** the requirement is that outside departments can work the incident now; that *is* incident sharing, so the line moves.
- **Human-readable code only (no QR).** **Rejected (Alex, "QR everywhere in v4.0"):** serial typing bottlenecks when several units arrive together; QR removes the host bottleneck. The code stays as the fallback, not the primary.
- **QR only (no human-readable code).** **Rejected:** strands remote/radio/no-camera joiners; no graceful degradation.
- **Guests quick-add a deployable apparatus inventory on the fly.** **Rejected (Alex):** walk-up crews travel light — a typed unit tag + v3 external-equipment handling is enough and avoids building an ephemeral-inventory subsystem in v4.0.
- **Notify the host (push) when a unit joins.** **Rejected:** [Principle 10](../02-principles.md). The join surfaces visibly on sync; no push.
- **Edit [ADR-003](ADR-003-scope-everyday-expandable.md) or the constitution inline.** **Rejected:** house style — this ADR records the supersession of the *deferral*; ADR-003's local-scope decision stands and is not rewritten.

---

## Consequences

**Positive:**
- A walk-up mutual-aid company is useful on the incident in seconds, no account, no inventory build.
- One join model (QR + code, multi-use, revocable) fixes both department onboarding and incident join.
- The unified multi-agency after-action record exists at v4.0 — the MCI adoption driver.

**Negative — the v4.0 slice expands:**
- **Cross-dept incident sharing, the QR display/scan mechanism, guest identity + claim, and the merged multi-agency audit roll-up all move into the v4.0 build.** The Phase H vertical slice and the master-plan v4.0 scope must absorb this (flagged, not silently grown).
- A **camera-scanner** surface (permission, native scan, deep-link/install path for a brand-new device) is new platform work for Phase H.
- Guest data lifecycle (scoped participation, read-only-on-close, claim-later) and **scoped security rules** for an outside device on one incident are new data-layer work ([ADR-009](ADR-009-database-firebase-rtdb.md)).

**Neutral:**
- Local scope unchanged (2–5 departments; not federal/IST — [ADR-003](ADR-003-scope-everyday-expandable.md)).
- The command-transfer handshake ([ADR-021](ADR-021-command-transfer-handshake.md)) now also covers an out-of-department incoming IC; the model is the same.

---

## Related

- **Supersedes:** the **v4.5 deferral** of cross-dept incident sharing (`52-cross-dept-invite.md` §Where it lives; master-plan D7.4). Resolves gate review **B3 / M12** (multi-agency) and **B4** (bulk onboarding).
- **Principles:** 10 (permission grant, not a message — no push), 11 / [ADR-015](ADR-015-navigation-pattern.md) (guest-first), 8 (local-first — the in-app record is authoritative; a guest's record persists for claim).
- **Other ADRs:** [ADR-003](ADR-003-scope-everyday-expandable.md) (scope kept; deferral superseded), [ADR-009](ADR-009-database-firebase-rtdb.md) (per-device UID + scoped rules + event log + external-equipment), [ADR-017](ADR-017-custom-department-roles.md) (scoped roles for assisting members), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (sheet for generate/enter; QR is a rendered image, broadcast-safe), [ADR-021](ADR-021-command-transfer-handshake.md) (cross-dept command transfer rides the same handshake).
- **Specs:** [`32-mutual-aid-invite-accept.md`](../09-workflows/32-mutual-aid-invite-accept.md) (workflow → v4.0), [`52-cross-dept-invite.md`](../08-information-architecture/52-cross-dept-invite.md) (screen → v4.0), [`06-signing-in-and-out.md`](../09-workflows/06-signing-in-and-out.md) (guest + claim), [`07-department-setup.md`](../09-workflows/07-department-setup.md) / [`08-joining-by-invite-code.md`](../09-workflows/08-joining-by-invite-code.md) (multi-use + QR codes), [`31-audit-log-review.md`](../09-workflows/31-audit-log-review.md) / [`53-audit-log.md`](../08-information-architecture/53-audit-log.md) (merged multi-agency roll-up), [`41-accountability.md`](../08-information-architecture/41-accountability.md) (guest external equipment + return-to-source).
- **GitHub:** [#235](https://github.com/Vergo402/paratech-struts/issues/235) + [#210](https://github.com/Vergo402/paratech-struts/issues/210) (both reopen for the v4.0 rework), [#239](https://github.com/Vergo402/paratech-struts/issues/239) (gate).

---

## Notes

The line ADR-003 drew on *scale* (local, not federal) is untouched. What changed is *timing* (v4.0 not v4.5) and *mechanism* (QR + guest). The guest path is the same guest-first philosophy the app already runs on, pointed at the one moment it matters most — the company that rolled up to help and has never seen the app. The camera scanner is the only genuinely new platform surface; everything else reuses anonymous auth, external-equipment handling, scoped rules, and the event log the app already has.

---

## Addendum — join transport decided (2026-07-02, resolves OQ #42)

**Decision (Alex, transport-decision batch S2): the join QR is a plain web link, scanned with the phone's own camera; NO app install.**

- **No install gate.** The QR encodes a **web URL** to the incident-join page. The arriving officer scans it with the **phone's built-in camera / scanner** (the OS QR affordance every modern phone has) and **lands straight in the join page in the mobile browser** — no "add to home screen," no PWA install, no app-store step. A walk-up crew is in **within seconds**, in whatever browser they already have. This refines the earlier "camera scanner + deep-link/install path" framing: the guest path is **pure web**, install is explicitly **not** a precondition.
- **Scanning.** The phone's native camera scanner is the primary path; an **in-app camera scanner** (a small `BarcodeDetector`-with-JS-fallback surface) is offered for the case where a member is already inside FieldShore and wants to scan without leaving it — but it is a convenience, never the requirement, since the OS scanner + a plain URL already gets a stranger in.
- **The join page must stand alone in a cold browser tab.** Because there is no install and the joiner may never have opened FieldShore, the join URL renders and functions in a first-time mobile browser session (guest identity = a typed unit tag, per the body above) with no prior app state.
- **Fallbacks unchanged.** The **human-readable code** printed beneath the QR stays the radio / no-camera path (body §above); typing it opens the same join URL.

Resolves [`99-open-questions.md`](../99-open-questions.md) #42. GitHub: [#407](https://github.com/Vergo402/paratech-struts/issues/407).

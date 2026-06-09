# IA Spec: Cross-Dept Invite

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: the master plan **D7.4** (cross-department incident sharing — local mutual aid; **v4.5, not v4.0**): the host IC/Admin generates a one-time **per-incident** code that scopes another department's access to *only* that incident; assisting-dept users join as **Member** on that incident, cannot administer the host dept, and retain a read-only record on close. [ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md) (local 2–5 depts, **not** federal/IST), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID + scoped rules + event log), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md). **Net-new** — v3's only cross-dept notion is unscoped "external equipment from Dept N" (it leaves equipment; the source dept cannot see the incident). GitHub [#210](https://github.com/Vergo402/paratech-struts/issues/210).

---

## Purpose

Local **mutual-aid incident sharing**: let a host department invite 2–5 neighboring departments to collaborate on **one specific incident** — the assisting depts see and work that incident (add their apparatus, deploy struts, advance shore points, set their own org positions) with access **scoped to that incident only**. The cross-dept counterpart to the dept-level [Invite Code Entry](72-invite-code.md).

## Where it lives

- **Tab / parent:** **Settings** — a role-gated admin screen nested under Settings (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)); also reachable as an "Invite assisting department" action from the incident menu on [Command](30-command-sitstat.md) (the host IC's natural entry — Phase G workflow).
- **How it is reached:** the **Administration gateway in [Settings](50-settings.md)** (host: Admin / IC) to **generate**; and the dept-registration area to **enter** a received code. **Shown but disabled in v4.0** ("Coming in a later release"), the same visible-but-disabled roadmap pattern as the Build C toggle — it **ships v4.5**.
- **Issue:** [#210](https://github.com/Vergo402/paratech-struts/issues/210).

## Primary role(s) and surface(s)

- **Primary role(s):** **host IC / Admin** generates the per-incident code; **any user of an assisting dept** enters it and gains **scoped access** (a Default-equivalent role limited to that one incident) (the host IC may grant a specific assisting user elevated rights — Phase G). Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor**; a **non-operational surface → 48pt targets**. Tablet/laptop add density + paste. **Broadcast does not render this.**

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold (host):** **Generate incident invite** → a [`sheet`](../03-primitives/sheet.md) showing the one-time code (copy affordance) + which incident it scopes.
- **Above fold (assisting):** **Enter incident code** → a [`sheet`](../03-primitives/sheet.md) with the code [`input`](../03-primitives/input.md) (+ paste).
- **Below fold:** the list of departments currently joined to this incident + their scoped role.

### Tablet / laptop
- **Above fold:** the same, denser; laptop keyboard + paste.

### Broadcast TV
- **Not rendered.**

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **generate / enter a per-incident code** — a [`sheet`](../03-primitives/sheet.md) (the ADR-016 Cross-Dept Invite row); both directions are non-destructive (reversible by revoking access), so no modal.
- **Secondary actions:** copy / paste the code; view joined departments; (host) revoke an assisting dept's access (Phase G).
- **Destructive / terminal:** none in the common path (revocation detail is a Phase G workflow).

## Composed primitives

- [x] [sheet](../03-primitives/sheet.md) — **generate** (show the code) and **enter** (the code form).
- [x] [input](../03-primitives/input.md) — the incident-code field (the same constrained code entry as [Invite Code Entry](72-invite-code.md)); inline calm errors for invalid/expired/used.
- [x] [button](../03-primitives/button.md) — Generate / Copy / Paste / Enter / Join.
- [x] [badge](../03-primitives/badge.md) — an assisting dept's **scoped role** (Member-on-this-incident); a "v4.5 / coming soon" disabled indicator in v4.0.
- [x] [list](../03-primitives/list.md) — the departments joined to this incident.
- [ ] picker · card · modal · toggle · segmented · slider · toast · loading-state · empty-state · warning-gate · nested-checklist — not core.

> **A new primitive would be a gate escalation, not a spec decision.**

## Three things that keep this distinct (don't conflate)

1. **Cross-Dept *incident* invite (#210, this screen) ≠ dept-level [Invite Code Entry](72-invite-code.md) (#208).** #208 joins a person to a *department* (→ the dept's Default role, v4.0). #210 grants an *assisting department* scoped access to *one incident* (v4.5). Different code, different scope, different ship.
2. **≠ v3 "external equipment from Dept N."** v3 only tags borrowed equipment with a source dept for return ([Accountability](41-accountability.md) owns that accountability); it grants **no** access to the incident. #210 is real-time scoped read/write — a major expansion.
3. **Local, not federal.** Scope is 2–5 neighboring departments at one incident ([ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md)) — **not** a state-wide unified-command structure, IST workflow, or FEMA mutual-aid agreement. The interface must not break at federal scale, but the everyday case is small and local.

## Not a comms channel (Principle 10)

Generating/entering a code is a **permission grant**, not a message: the host is **not** notified by an in-app alert when an assisting dept joins, and the app sends no push. The join surfaces **visibly** (the joined-departments list, the [Audit Log](53-audit-log.md) event), never as a notification.

## Locked cross-cutting rules this screen honors

- [x] **v4.5, shown-but-disabled in v4.0** — honest roadmap (Principle 11 / [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)), the Build-C pattern.
- [x] **Incident-scoped, local mutual aid** ([ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md)) — assisting users can work the incident + set their own org positions, but cannot administer the host dept.
- [x] **Distinct from the dept-level invite (#208)** and from v3 external equipment.
- [x] **No comms / no push** (Principle 10) — a permission grant, surfaced visibly, never messaged.
- [x] **Modal-vs-sheet** per the ADR-016 Cross-Dept Invite row: generate / enter = sheet (no destructive overlay in the common path).
- [x] **NIMS / roles spelled out** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **No broadcast render.**
- [x] **Audited** — the join + any host-granted elevation write events to the [Audit Log](53-audit-log.md) (which dept joined, when, scope).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | generate / enter sheets + joined list | denser | denser + keyboard/paste | **not rendered** |
| Above fold | Generate or Enter code | same | same | — |
| Primary-action affordance | tap → code sheet (48pt) | tap → sheet | keyboard + paste | — |
| Added density | — | joined-dept list | joined-dept + scope columns | — |
| Does NOT render | — | — | — | **the whole screen** |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Disabled (v4.0):** the gateway is visible but disabled with the reason "Coming in a later release (v4.5)" — announced, not just greyed (Principle 9).
- **Empty — no assisting depts:** a calm zero-state on the joined-departments list ("No assisting departments on this incident").
- **Error:** invalid / expired / already-used code → inline [`input.md`](../03-primitives/input.md) `aria-invalid` + a specific, calm message; never `alert()`.
- **Loading:** the generate/join write → a busy control ([`loading-state.md`](../03-primitives/loading-state.md)); local-first otherwise.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The generate/enter [`sheet`](../03-primitives/sheet.md)s are focus-trapped; the generated code reads as discrete characters with a labeled Copy; the code [`input`](../03-primitives/input.md) announces its expected format and errors via `aria-invalid`; the disabled-in-v4.0 gateway announces its disabled state + reason ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard / §Screen-reader scripts).

## Open questions (per-screen)

1. **Code revocation / expiry** — whether either side can revoke incident access before the incident closes, and the expiry window; Phase G mutual-aid workflow.
2. **Host-granted role escalation** — how the host IC grants a specific assisting-dept user elevated rights on the incident (master plan D7.4); Phase G.
3. **Read-only-on-close retention** — exactly what the assisting dept retains after the incident closes (data + duration); Phase G/J policy.
4. **Code format** — shared with the dept-level [Invite Code Entry](72-invite-code.md) generator + the [Department Setup](71-dept-setup.md) first code; affordance for Phase G/H.
5. **Multi-incident roll-up in the audit** — how a mutual-aid incident's merged event log reads in the [Audit Log](53-audit-log.md); resolved there + the Phase G workflow.

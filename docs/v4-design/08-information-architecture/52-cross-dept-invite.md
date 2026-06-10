# IA Spec: Cross-Dept Invite (mutual-aid incident sharing)

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: the master plan **D7.4** (cross-department incident sharing — local mutual aid). **Ships v4.0** per [ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md) (pulled forward from the earlier v4.5 deferral; QR-everywhere join; guest participation). The host IC/Admin generates a **multi-use, revocable, per-incident** code (a **QR + human-readable fallback**) that scopes another unit's access to *only* that incident; assisting-dept users join as **scoped Member**, and **walk-up guests with no account** join as an incident-scoped **Guest** (typed unit tag, v3 external-equipment handling). [ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md) (local 2–5 depts, **not** federal/IST — scope unchanged), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (per-device UID + scoped rules + event log + external equipment), [ADR-015](../11-decisions/ADR-015-navigation-pattern.md) (guest-first), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md). **Net-new** — v3's only cross-dept notion is unscoped "external equipment from Dept N" (it leaves equipment; the source dept cannot see the incident). GitHub [#210](https://github.com/Vergo402/paratech-struts/issues/210). Workflow: [`32-mutual-aid-invite-accept.md`](../09-workflows/32-mutual-aid-invite-accept.md).

---

## Purpose

Local **mutual-aid incident sharing**: let a host department invite 2–5 neighboring units to collaborate on
**one specific incident** — they see and work that incident (add their apparatus, deploy struts, advance
shore points, set their own org positions) with access **scoped to that incident only**. Critically, this
includes the **walk-up company that has never used FieldShore** — they join as a guest, no account, no
inventory build, and are useful in seconds. The cross-dept counterpart to the dept-level
[Invite Code Entry](72-invite-code.md).

## Where it lives

- **Tab / parent:** **Settings** — a role-gated admin screen nested under Settings (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)); also reachable as an "Invite assisting unit" action from the incident menu on [Command](30-command-sitstat.md) (the host IC's natural entry).
- **How it is reached:** the **Administration gateway in [Settings](50-settings.md)** (host: Admin / IC) to **generate**; and the dept-registration / join area to **enter or scan** a received code. **Ships v4.0** ([ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)).
- **Issue:** [#210](https://github.com/Vergo402/paratech-struts/issues/210).

## Primary role(s) and surface(s)

- **Primary role(s):** **host IC / Admin** generates the per-incident **QR + code**; **any user of an assisting dept** scans/enters it and gains **scoped Member** access; a **walk-up guest** (no account) scans/enters it, supplies a **typed unit tag**, and gains **scoped Guest** access. The host IC may grant a specific assisting user elevated rights on the incident. Roles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** (the host can run it phone-only; arriving officers scan with their phones); a **non-operational surface → 48pt targets**. Tablet/laptop add density + paste. The **join QR is castable to the C-13 broadcast board** (a rendered image; the tap is on the joiner's phone). **Broadcast renders only the QR image**, never the interactive screen.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold (host):** **Invite assisting unit** → a [`sheet`](../03-primitives/sheet.md) showing the **QR** (primary) + **human-readable code** (fallback) with **Copy** and **Cast to board**, scoping which incident.
- **Above fold (assisting):** **Scan QR** (primary) / **Enter code** (fallback) → a [`sheet`](../03-primitives/sheet.md); a no-account device gets the **guest unit-tag** field.
- **Below fold:** the list of units currently joined to this incident + their scoped role (Member / Guest).

### Tablet / laptop
- **Above fold:** the same, denser; laptop keyboard + paste.

### Broadcast TV
- **The join QR only** (a rendered image, when cast). The interactive screen does not render.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **generate the QR + code** (host) / **scan or enter** it (joiner) — a [`sheet`](../03-primitives/sheet.md) (the ADR-016 Cross-Dept Invite row); both directions are non-destructive (reversible by revoking access), so no modal.
- **Secondary actions:** copy the code; **cast the QR to the board**; paste / scan; view joined units; (host) **revoke** an assisting unit's access (destructive modal).
- **Destructive / terminal:** host **revoke access** = a confirm [`modal`](../03-primitives/modal.md). The grant itself is non-destructive.

## Composed primitives

- [x] [sheet](../03-primitives/sheet.md) — **generate** (QR + code, Copy, Cast) and **enter** (scan / code form, guest unit-tag).
- [x] [input](../03-primitives/input.md) — the incident-code field (same constrained entry as [Invite Code Entry](72-invite-code.md)), the **QR-scan affordance** (camera), the **guest unit-tag** field; inline calm errors for invalid/expired/used.
- [x] [button](../03-primitives/button.md) — Generate / Copy / Cast / Scan / Paste / Enter / Join / Revoke.
- [x] [badge](../03-primitives/badge.md) — an assisting unit's **scoped role** (Member-on-this-incident) and the **Guest** badge.
- [x] [list](../03-primitives/list.md) — the units joined to this incident.
- [x] [modal](../03-primitives/modal.md) — the host's **revoke access** destructive confirm.
- [ ] picker · card · toggle · segmented · slider · toast · loading-state · empty-state · warning-gate · nested-checklist — not core.

> **The QR display + scan compose existing primitives (sheet+image; input camera affordance) — NOT a 16th primitive.** A genuinely new primitive would be a gate escalation, not a spec decision.

## Three things that keep this distinct (don't conflate)

1. **Cross-Dept *incident* invite (#210, this screen) ≠ dept-level [Invite Code Entry](72-invite-code.md) (#208).** #208 joins a *person* to a *department* (→ the dept's Default role). #210 grants an *assisting unit* scoped access to *one incident* (Member or Guest). Different code, different scope. Both ship v4.0.
2. **≠ v3 "external equipment from Dept N."** v3 only tags borrowed equipment with a source dept for return ([Accountability](41-accountability.md) owns that); it grants **no** access to the incident. #210 is real-time scoped read/write — a major expansion. (A **guest's** equipment is still handled the v3 external-equipment way, but the guest *also* gets scoped incident access.)
3. **Local, not federal.** Scope is 2–5 neighboring units at one incident ([ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md)) — **not** a state-wide unified-command structure, IST workflow, or FEMA mutual-aid agreement. The interface must not break at federal scale, but the everyday case is small and local.

## Guest participation (the walk-up company)

A device with **no account and no department** can scan/enter the incident code and **work the incident as a
guest** ([ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)): a **per-device anonymous UID** (no
sign-up — guest-first, [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)), a **typed unit tag** for
attribution ("Engine 7, Westfield FD"), the ability to advance shore points and take an org position, and
**read-only-on-close, claimable later**. **Equipment a guest brings is tracked the v3 external-equipment way**
(return against the unit tag) — **not** a deployable apparatus inventory; **no on-the-fly inventory build.**
Audit attribution: **"Guest · \<unit tag\>"** until claimed.

## Not a comms channel (Principle 10)

Generating/scanning a code is a **permission grant**, not a message: the host is **not** notified by an in-app
alert when a unit joins, and the app sends no push. The join surfaces **visibly** (the joined-units list, the
[Audit Log](53-audit-log.md) event), never as a notification.

## Locked cross-cutting rules this screen honors

- [x] **Ships v4.0** ([ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)) — pulled forward from the earlier v4.5 deferral.
- [x] **QR primary + human-readable code fallback**, **multi-use · time-boxed · revocable · auto-expires at incident close**; unambiguous-glyph code; QR castable to the board.
- [x] **Guest participation** for un-provisioned units (typed unit tag, external-equipment handling, claimable record).
- [x] **Incident-scoped, local mutual aid** ([ADR-003](../11-decisions/ADR-003-scope-everyday-expandable.md)) — assisting units work the incident + set their own org positions, but cannot administer the host dept.
- [x] **Distinct from the dept-level invite (#208)** and from v3 external equipment.
- [x] **No comms / no push** (Principle 10) — a permission grant, surfaced visibly, never messaged.
- [x] **Modal-vs-sheet** per the ADR-016 Cross-Dept Invite row: generate / enter = sheet; **revoke = destructive modal**.
- [x] **NIMS / roles spelled out** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Phone is the floor**; **48pt non-operational targets**.
- [x] **Broadcast renders only the cast QR image** — never the interactive screen.
- [x] **Audited** — the join (Member or Guest), any host-granted elevation, and revocation write events to the [Audit Log](53-audit-log.md); the **merged multi-agency record** is v4.0.

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | generate (QR+code) / scan-or-enter sheets + joined list | denser | denser + keyboard/paste | **the cast QR image only** |
| Above fold | Invite / Scan-or-Enter | same | same | the QR |
| Primary-action affordance | tap → QR+code sheet · scan (48pt) | tap → sheet | keyboard + paste | — (scan happens on a phone) |
| Added density | — | joined-units list | joined-units + scope columns | — |
| Does NOT render | — | — | — | **the interactive screen** (QR image only) |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — no assisting units:** a calm zero-state on the joined-units list ("No assisting units on this incident").
- **Error:** invalid / expired / already-used / revoked code → inline [`input.md`](../03-primitives/input.md) `aria-invalid` + a specific, calm message; never `alert()`.
- **Loading:** the generate/join write → a busy control ([`loading-state.md`](../03-primitives/loading-state.md)); local-first otherwise. A guest join queues offline and completes on reconnect.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The generate/enter [`sheet`](../03-primitives/sheet.md)s are focus-trapped; the **QR always carries the human-readable code as its accessible fallback** (a sighted-only QR is never the sole path); the generated code reads as discrete characters with a labeled Copy + Cast; the code [`input`](../03-primitives/input.md) and the guest unit-tag field announce expected format + errors via `aria-invalid`; the **Scan** affordance announces the camera ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard / §Screen-reader scripts).

## Open questions (per-screen)

1. **QR brand-new-device path** — the deep-link / install path when a walk-up device does not yet have the app installed (scan → install → join). Phase H slice (the native scanner + install flow).
2. **Host-granted role escalation** — how the host IC grants a specific assisting user elevated rights on the incident (master plan D7.4); rides the [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) role model scoped to the incident.
3. **Read-only-on-close retention** — what each unit (and a guest) retains after the incident closes (data + duration); build/J policy.
4. **Code / QR format** — unambiguous-glyph code format decided; shared with the dept-level [Invite Code Entry](72-invite-code.md) + the [Department Setup](71-dept-setup.md) first code.
5. **Merged multi-agency audit roll-up** (now **v4.0**, [ADR-022](../11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)) — how a mutual-aid incident's merged event log reads + exports in the [Audit Log](53-audit-log.md); the IA is set, the export format rides the shared export-convergence work.

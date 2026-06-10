# Context: Why v4 Exists

> Copied from Section "Context" of `v4-master-plan.md`. This file is the elevator pitch for every agent and every future session.

---

FieldShore v3.19.1 is a fully functional structural collapse operations tool. It has solid bones: an audited safety critical load engine, a working offline architecture, NIMS aware org chart, deduction math that matches Paratech and USACE doctrine. **The bones are not the problem.**

The problem is that it looks and feels like what it is. A single HTML page, single CSS file, single 8,800 line JS file, no build system, system fonts, default browser controls, generic gray cards, a "P" in a square as the only brand mark. It reads as "MVP with field feedback," not as professional emergency services software next to the apps the industry actually uses.

The Round 2 audit, Hartsdale field feedback, and Surfside TTX 2 all point at the same wall: **the app has graduated from prototype but is still wearing its prototype skin.** The next phase is not another patch. It is a deliberate, slow, ground up redesign of every primitive, every workflow, every screen, every word of copy.

Alex's constraint is strict but freeing: **nothing about v4 ships to `main` for the foreseeable future.** v3 keeps the field. v4 has all the time it needs.

This folder is the execution layer of `v4-master-plan.md`, which is the constitution. The plan is intentionally long because the work is intentionally large.

---

## Scope (locked by the 2026-05-17 local-first pivot, reframed by ADR-003)

- **Level IV and V as the everyday case.** Car into residence, residential or light commercial partial collapse. About 99% of structural collapse runs. Drives defaults, onboarding, and first impressions.
- **On demand expansion through Level III, II, and I.** The interface contracts and expands alongside ICS itself. Single team officer with two shore points is the starting state; the design must not break at Surfside scale (250 shore points, federal task force).
- **Local fire departments** working with one another at a single incident (mutual aid, two to five neighboring depts; originally scoped v4.5 — **moved into v4.0 by [ADR-022](11-decisions/ADR-022-mutual-aid-v40-qr-guest.md)** at the Phase G gate, 2026-06-09; local scope unchanged).
- **NIMS doctrine** as the terminology backbone.
- **Federal IST workflows and state mutual aid auth deferred to v5.** The design ceiling is raised; the implementation timeline is not. We don't have a single dept's buy in yet.

## Constraints

- v3.19.x stays on `main` indefinitely. v3.20.x+ patches continue shipping.
- v4 work lives on the `v4-redesign` branch.
- v3 patches cherry-pick or rebase into v4 as needed (~5 min cost per patch).
- No timeline pressure. The work takes as long as it takes.
- Conservative estimate: v4.0 roughly 8 to 11 months from Phase A to Phase J. v4.5 (local mutual aid) roughly 3 more months. *(Note: local mutual aid has since moved into v4.0 — [ADR-022](11-decisions/ADR-022-mutual-aid-v40-qr-guest.md), Phase G gate; this estimate pre-dates that move and the v4.0 figure now absorbs it.)*

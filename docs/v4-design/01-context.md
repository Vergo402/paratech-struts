# Context — Why v4 Exists

> Copied from Section "Context" of `keen-whistling-pancake.md`. This file is the elevator pitch for every agent and every future session.

---

FieldShore v3.19.1 is a fully functional structural-collapse operations tool. It has solid bones: an audited safety-critical load engine, a working offline architecture, NIMS-aware org chart, deduction math that matches Paratech and USACE doctrine. **The bones are not the problem.**

The problem is that it looks and feels like what it is — a single HTML page, single CSS file, single 8,800-line JS file, no build system, system fonts, default browser controls, generic gray cards, a "P" in a square as the only brand mark. It reads as "MVP with field feedback," not as professional emergency-services software next to the apps the industry actually uses.

The Round-2 audit, Hartsdale field feedback, and Surfside TTX-2 all point at the same wall: **the app has graduated from prototype but is still wearing its prototype skin.** The next phase isn't another patch — it's a deliberate, slow, ground-up redesign of every primitive, every workflow, every screen, every word of copy. Apple-grade.

Alex's constraint is hard but liberating: **nothing about v4 ships to `main` for the foreseeable future.** v3 keeps the field. v4 has all the time it needs.

This folder is the execution layer of `keen-whistling-pancake.md`, which is the constitution. The plan is intentionally long because the work is intentionally large.

---

## Scope (locked by the 2026-05-17 local-first pivot, expanded by D7)

- **Type IV–V structural collapse incidents** — car into residence, residential/light commercial partial collapse, small-scale shoring.
- **Local fire departments** working with one another at a single incident (mutual aid 2–5 neighboring depts at v4.5).
- **NIMS doctrine** as the terminology backbone.
- **NOT** state, IST, or federal scale. We don't have a single dept's buy-in yet — federal-scale planning is putting the cart before the horse. Revisit if/when several local depts use v4 in real incidents.

## Constraints

- v3.19.x stays on `main` indefinitely. v3.20.x+ patches continue shipping.
- v4 work lives on the `v4-redesign` branch.
- v3 patches cherry-pick or rebase into v4 as needed (~5 min cost per patch).
- No timeline pressure. Apple-grade takes as long as Apple-grade takes.
- Conservative estimate: v4.0 ≈ 8–11 months from Phase A to Phase J. v4.5 (local mutual aid) ≈ +3 months.

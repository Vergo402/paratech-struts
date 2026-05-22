# ADR-002: Principle 1 scope clarification — doctrine vs. terminology

## Status

- [x] Accepted

**Date:** 2026-05-21
**Author:** Alex (decision) + Claude Opus 4.6 (analysis, drafting)
**Reviewer(s):** Alex (final call)

---

## Context

Principle 1 in `02-principles.md` reads: *"When NIMS / ICS / USACE specifies a term or a structure, the app uses it verbatim."* The rejected alternative is *"clever rebranding for marketability."*

During the Phase B gate review, the principle was being read as applying to all terminology in the app — including departmental labels like apparatus names, role titles, and unit types. That reading is too broad. It would force every department to use NIMS vocabulary for things that NIMS itself does not standardize at the department level, locking out agencies that use their own conventions.

The positioning analysis (`04-references/positioning.md`) draws the line clearly in the Tablet Command teardown. Vocabulary varies department to department. One agency's "rescue" is another's ambulance and another's heavy equipment truck, and a product that refuses to map onto local language locks those departments out. Letting a department rename "Group" to "Squad" is a feature, not a weakness, because vocabulary is a configuration surface by nature.

What Tablet Command does not ship is the other half: the universal safety doctrine that is the same in every department, every incident, every time. Shore type taxonomy, manufacturer load tables, the math behind a strut at a given length under a given load, NIMS org structure. These are not configurable inputs. They are physics and federal doctrine.

FieldShore needs both halves. The doctrine side ships verbatim and is not configurable (Principle 1). The terminology side ships with NIMS defaults and is configurable per department.

---

## Decision

Principle 1 ("defer to doctrine, not invention") applies to universal safety doctrine — manufacturer load tables, USACE shore types, NIMS General Staff structure. It does not apply to departmental terminology — apparatus names, role labels, unit types — which must remain configurable per department.

---

## Rationale

- Shore type taxonomy, strut load math, and ICS General Staff structure are physics and federal doctrine. They do not change from one department to the next. When the app surfaces a T-Shore or a load capacity or a Section Chief, the term is drawn from USACE, Paratech, or NIMS verbatim. No configuration. No rebranding.

- Apparatus names and role labels are not standardized at the department level by NIMS. What one department calls a rescue, another calls a squad, a third calls a heavy equipment truck. A product that forces a single vocabulary for these terms excludes departments that use their own. Tablet Command got this right; the positioning analysis credits it explicitly.

- Principle 5 (doubt free defaults) covers the transition: the app ships NIMS defaults for all configurable terms. A department that uses NIMS verbatim changes nothing. A department with its own conventions can relabel without touching the safety doctrine underneath.

- The gate review surfaced this conflation because agents were treating configurable terms as violations of Principle 1. Without a recorded clarification, that interpretation will recur in Phase C essays and Phase E implementation.

---

## Alternatives Considered

- **Apply Principle 1 to all terminology, including departmental labels.** Rejected: it would force NIMS vocabulary on departments that use different conventions for apparatus, roles, and unit types. NIMS does not itself standardize these terms at the department level, so enforcing them is not deference to doctrine — it is invention.

- **Make everything configurable, including doctrine.** Rejected: safety doctrine is not a department preference. A load table is not a label. Shore types are not terminology. Principle 5 exists precisely to prevent this: the safety call is never hidden behind a per-department template.

---

## Consequences

**Positive:**
- Departments keep their own vocabulary for apparatus, roles, and unit types. The app does not impose a terminology ceiling that NIMS itself does not impose.
- Phase C essays and Phase E design work have a clear rule for when to hardcode a term (doctrine) and when to make it configurable (departmental terminology).
- The v3 `assignedResource` rename (v4.0.0) gains a framing: the field was misnamed because the old name conflated a NIMS Group (fixed doctrine) with an apparatus assignment (configurable terminology). The fix is a doctrine correction, not a terminology preference.

**Negative:**
- Two tiers of terms to maintain: fixed doctrine (load tables, shore types, NIMS General Staff) and configurable labels (apparatus names, role titles, unit types). Every new term added to the app requires a judgment call about which tier it belongs to.
- The line between "universal doctrine" and "departmental terminology" is not always obvious. NIMS Group is a General Staff structure (fixed). A department calling its ladder truck a "tower" is local vocabulary (configurable). But what about Division vs. Sector? Both are NIMS terms, and some departments use one where others use the other. The rule here: if NIMS specifies it in ICS doctrine, it is fixed. If departments routinely use a different word for the same concept without violating NIMS, it is configurable.

**Neutral:**
- Existing NIMS defaults remain the defaults. Departments that follow NIMS terminology exactly change nothing in Settings. The configurability exists for those that need it, invisible to those that do not.

---

## Related

- Principles invoked: Principle 1 (the subject of this clarification), Principle 5 (doubt free defaults — NIMS defaults ship, departments can override for non-doctrine terms only).
- Other ADRs: ADR-001 (precedent for clarifying rules that were applied too broadly; same evidence-first, cost-driven reasoning pattern).
- Open questions resolved: none directly, but this clarification prevents a class of future open questions ("Is X a Principle 1 violation or a department preference?").
- Open questions surfaced: none.

---

## Notes

The v3 codebase already has this tension visible in two places:

1. `APPARATUS_TYPES_DEFAULT[]` in `app.js` ships NIMS defaults (Chief, Engine, Ladder, Rescue, Squad, Task Force, Other) but departments can add custom types via `customApparatusTypes`. This is the correct pattern: doctrine default, configurable overlay.

2. `ICS_ROLES_DEFAULT[]` ships NIMS roles (IC, Safety, Operations, Entry, Rescue, Shoring, Runner, Cutting, Wood) and departments can add custom roles. Also correct.

3. The `group` field on shore points stores apparatus IDs but uses the word "Group," which is a NIMS term for a functional command unit. This is a doctrine violation — the v4.0.0 rename to `assignedResource` is a fix under Principle 1, not under this ADR. The confusion between "which apparatus is assigned" (configurable) and "which NIMS Group is this" (doctrine) is exactly the kind of conflation this ADR prevents going forward.

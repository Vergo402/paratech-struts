# ADR-008: NIMS-correct org-chart structure for v4

## Status

- [x] Accepted

**Date:** 2026-05-31
**Author:** Alex (operational doctrine + 7 question answers) + Claude Opus 4.8 (research, ADR drafting)
**Reviewer(s):** Alex (final call)

---

## Context

The v3 org chart is doctrinally loose: `Operations` names a Section, not a position; `Cutting Table` is a workstation, not a role; `Entry`, `Rescue`, `Initial Shoring`, `Wood Shoring`, `Runner` are not NIMS positions; `Task Force` is a resource configuration, not an apparatus type; and the shore-point `group` field stores an apparatus assignment, which collides with the NIMS meaning of "Group" (a functional command unit). Phase C essays from seven lenses flagged at least one of these; the Phase D synthesis named it convergent theme §1.4 and held the specific structure for research.

A NIMS org-structure reference was produced at `docs/v4-design/04-references/nims-org-structure.md` (FEMA NIMS 2017 + SM-0322 + FEMA US&R MANUAL 12-001), with a proposed v3→NIMS mapping and seven open questions. Alex answered all seven on 2026-05-31. This ADR records the resulting structure.

---

## Decision

v4 adopts a NIMS-correct command structure:

1. **Positions are NIMS positions.** Command (Incident Commander; Command Staff: Safety Officer, PIO, Liaison) and General Staff (Operations / Planning / Logistics / Finance-Administration **Section Chiefs**). Within Operations: **Group Supervisors** (functional) and **Division Supervisors** (geographic). Titles use the doctrine noun — Section = Chief, Branch = Director, Division/Group = Supervisor, Strike Team/Task Force = Leader, Unit = Leader.

2. **Two functional Groups are the structural-collapse default:** **Rescue Group Supervisor** and **Shoring Group Supervisor**. **Search Group** and **Medical Group** Supervisors are **add-ons** that auto-appear at Level III and above (not in the Level IV default) — at a one-Engine/one-Rescue collapse the Rescue Group does both search and rescue (Q4, Q5).

3. **Functional tasks are tracked beneath positions, not as org nodes.** `Entry` and `Wood`/`Initial Shoring` are work the Rescue/Shoring Groups perform. **Runner** is a go-fer resource — a person hauling materials from staging to the interior work point — tracked as a simple "Runner dispatched" shore-point affordance (Q3, option a), not an org node. **Cutting Station** is a named workstation under Operations, rendered as a distinct **workstation card** (like Staging), not a command/Supervisor box (Q2).

4. **Divisions and Sides are separate locators (Q1).** Divisions are **numbered by floor** (Division 1, 2; Sub-Division below grade). Building **sides** are A/B/C/D, with the **IC designating the A side** (typically the front / main entrance), B–D clockwise. They combine ("Division 2, C side"). Not "Division Alpha."

5. **Staging Area Manager reports to the Operations Section Chief** (Q6).

6. **Display labels are locked to doctrine in v4.0** (Q7). FieldShore shows "Shoring Group Supervisor"; department display-aliases are not a v4.0 config surface.

7. **Constant/field renames (settled, Phase H1 schema work):** `Operations` → "Operations Section Chief" (spelled out — **no acronyms** in the UI); `Cutting Table` → "Cutting Station" (under Operations); remove `Entry/Rescue/Initial Shoring/Wood Shoring/Runner` as positions; remove `Task Force` from `APPARATUS_TYPES_DEFAULT`; `ICS_ROLES_DEFAULT` → `ICS_POSITIONS_DEFAULT`; `customRoles` → `positions` (keyed object); `strutplaced` → `strutset` (display "Strut Set"); finish `group` → `assignedResource`. UI must accommodate the longer position names (character count + spacing).

8. **Level presets are deferred** ("plan, don't build now," Alex). The level-specific default charts in the reference doc are design notes for the deferred preset spec, not v4.0 build work. Span-of-control soft warnings (6/8/9) and the position vocabulary still ship.

---

## Rationale

- Principle 1 (defer to doctrine, not invention): when NIMS specifies a term or structure, the app uses it verbatim. The v3 labels fail this directly.
- Keeping Entry/Wood/Cutting/Runner *tracked as tasks/resources* (not removing the capability) reconciles "these still need to be tracked" with "label positions per NIMS" — the org chart shows command positions; the granular functions live beneath them.
- Two Groups as the default matches the realistic small-incident span (one Engine, one Rescue) while the Search/Medical add-ons scale the chart up at Level III+ without forcing empty slots at Level IV–V.
- Locking display to doctrine removes a config surface from v4.0; aliasing can be added later if a real department needs it.

---

## Alternatives Considered

- **Three Groups (Search + Rescue + Shoring) as the Level IV default.** Rejected per Q4 — unrealistic at one-Engine/one-Rescue scale; Search becomes an add-on at Level III+.
- **Keep v3 flat labels + append "Supervisor."** Rejected — NIMS-loose (Runner and Entry are not Supervisor-level positions).
- **Building faces as "Division Alpha/Bravo."** Rejected per Q1 — conflates the floor-numbered Division scheme with the separate A–D side-addressing convention.
- **Department display-aliases in v4.0.** Deferred per Q7 — one less config surface; revisit on real demand.

---

## Consequences

**Positive:**
- The org chart reads as NIMS-correct to any IC; ICS-203/207 generation becomes straightforward.
- Granular field functions stay fully tracked beneath doctrine positions — no loss of visibility.
- Schema renames close the `group`/Group terminology collision permanently.

**Negative:**
- Phase H1 schema work + a one-time migration (`group` → `assignedResource`, position-constant renames).
- Longer position names require UI character-count + spacing accommodation.

**Neutral:**
- Level presets are deferred; the default charts are documented but not built in v4.0.

---

## Related

- Reference: `docs/v4-design/04-references/nims-org-structure.md` (full doctrine + mapping; 7 questions resolved in §15).
- Synthesis: convergent theme §1.4 and the §4 NIMS direction.
- Matrix: E-1–E-5, E-12, E-13, E-14, E-22 (renames, two-Group structure, Search add-on); E-6–E-11 + C-14 deferred (level presets).
- Principles: Principle 1 (defer to doctrine).
- Open questions resolved: the 7 NIMS questions (2026-05-31).

---

## Notes

ADR-005 (single-package v4.0), ADR-006 (schema reservations), and ADR-007 (build system + TypeScript strict) remain reserved for the Phase H decisions named in the synthesis; this ADR took the next free number (008). The companion database decision is ADR-009.

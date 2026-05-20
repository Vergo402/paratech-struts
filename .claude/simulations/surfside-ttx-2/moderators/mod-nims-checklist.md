# `mod-nims` Observation Checklist — NIMS / ICS Doctrine

> Reference: FEMA ICSSCI SM-0322 (memory `reference_fema_ics_collapse.md`); ICS Form Descriptions (plan.md Appendix A); MASTER-PLAN Phases 3B.4, 3C.1, 3C.2, 3C.3, 3C.5, 3C.7.
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-nims-notes.jsonl`.

## Checklist (12 items)

### Item 1 — Single-IC discipline in OP1
- **Observe:** Through OP1 (E+0:00 → E+4:00), does the app permit only one IC at a time? Command transfer between IC #1 → IC #2 → IC #3 should leave the prior IC role cleared.
- **Surface:** Command tab — IC role assignment
- **v4.0.0 Phase:** 3C.5 (role history — assignments currently overwrite without history)

### Item 2 — UC introduction only at OP2+
- **Observe:** Unified Command (UC) appears at E+6:00 with Sheriff Garza. Before E+6:00 only one IC. After, the app should accommodate the dual-IC structure.
- **Surface:** Command tab — multiple IC slots
- **v4.0.0 Phase:** 3B.4 (Unified Command — replace singular `ic` with `IC` collection)

### Item 3 — Safety always reports to IC after reparent
- **Observe:** Any attempt to reparent the Safety Officer role away from IC should either be blocked or warned. Safety NEVER under Operations.
- **Surface:** Command tab — long-press or drag-and-drop reparent
- **v4.0.0 Phase:** 3C.2 (role typing + reparent enforcement)

### Item 4 — Branch-level emergence when span > 7
- **Observe:** When any Section Chief has > 7 direct reports (FEMA optimal = 5, max = 7), does the app surface a span warning AND offer a "Convert to Branches" workflow?
- **Surface:** Command tab — span indicator (currently 3-tier per v3.6.0 N9)
- **v4.0.0 Phase:** 3C.2 (Branch-level role typing currently absent)

### Item 5 — Type II/III preset adequacy
- **Observe:** At Op Start, does the app offer NIMS Type I–V presets, OR does the default tree (9 default roles) require extensive customization to reach a Type II/III structure?
- **Surface:** Start Operation modal
- **v4.0.0 Phase:** 3C.1 (role-tree presets — currently single default)

### Item 6 — OP boundary visual markers
- **Observe:** At E+4:00, E+16:00, E+28:00 (OP boundaries), does the app show "Now entering OP 2/3/4" or a visual transition? Or does the app treat the whole 36-hr op as continuous?
- **Surface:** Command tab header; Operations tab header
- **v4.0.0 Phase:** 3C.3 (operational periods — currently no concept)

### Item 7 — Role history on transfers
- **Observe:** When IC #3 (Park) hands off to IC #4 (Whitaker) at E+9:00, does the app preserve a history of "Park was IC E+0:45–E+9:00, Whitaker is IC E+9:00–E+21:00"?
- **Surface:** Command tab — role history view (if any)
- **v4.0.0 Phase:** 3C.5 (role history append-only)

### Item 8 — "Group" field semantic correctness
- **Observe:** The SP `group` field (renamed plan: `assignedResource` in v4.0.0). Currently overloads with apparatus assignment, which is NIMS-doctrine-incorrect (Group = functional, not resource). Does participant usage of the field reveal the confusion?
- **Surface:** Add SP modal — Group dropdown
- **v4.0.0 Phase:** 3C.7 (rename + separate `nimsGroup` functional field)

### Item 9 — Staging area concept presence
- **Observe:** Does the app represent a "Staging" area for resources awaiting assignment (per FEMA org chart in plan.md Appendix A: Staging reports directly to OSC)? Engines 4, 5, 6, 7 are assigned to Staging at arrival.
- **Surface:** Command tab — would-be Staging element
- **v4.0.0 Phase:** **NEW** (not in current MASTER-PLAN; flag as new requirement)

### Item 10 — Per-write attribution visible
- **Observe:** When a participant makes any change (status update, role assignment, deploy), can a reader see `by uid` and `agency` on the resulting Firebase record (developer tools or admin view)?
- **Surface:** Firebase RTDB inspector (preview_eval to read raw paths)
- **v4.0.0 Phase:** 3A.2 (per-write attribution + 3B.1 agency tagging)

### Item 11 — Strike Team vs Task Force representability
- **Observe:** TF-State and TF-Fed-Alpha are Task Forces (mixed kinds). Squad 1 + Squad 2 + USAR-Alpha could be a Strike Team (same kind). Does the app's Apparatus Group modal represent these doctrinally?
- **Surface:** Apparatus Groups modal
- **v4.0.0 Phase:** 3C.1 / **NEW** (resource typing absent)

### Item 12 — Demobilized apparatus retention
- **Observe:** When TF-State enters discussion-only demob at E+30:00 (no actual release this OP), does the app retain history of every assignment that apparatus held? Or would future-state release require deleting the apparatus?
- **Surface:** Apparatus chip — Demobilize button (if exists) vs Remove
- **v4.0.0 Phase:** 3C.4 (apparatus check-in / demob with timestamps)

---

## Calibration anchors (consult during observation)

- ICS optimal span = 5; range 3–7; >7 = exceeded
- Command Staff (PIO, SO, LNO) do NOT count toward IC's span
- Geographic = Division; Functional = Group; never confuse the two
- TF = mixed kinds; ST = same kind; both have common comms + designated leader
- Operational period default = 12 hr for USAR; this sim uses variable (4/12/12/8)

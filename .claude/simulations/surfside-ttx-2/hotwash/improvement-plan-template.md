# FEMA Improvement Plan — Surfside TTX-2 (TEMPLATE)

> **Synthesized at hotwash Phase 2** by merging all participant AARs + all moderator AARs + all rolling moderator notes. One IP-# row per actionable finding. Sort: severity desc, then phase, then IP-#.
>
> **Phase 3** produces `v4.0.0-gap-analysis.md` from this table by tagging each IP-# `covered | partial | gap | new-idea` against MASTER-PLAN.md Release 3 (lines 862–1180).

## Table

| IP-# | Finding | Source | OP | App Surface | Severity | FEMA-IP-Capability | v4.0.0 Phase | v4.0.0 Coverage | Recommended Action | Owner | Target Release | AAR Question | Linked Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IP-001 | [one-sentence problem] | mod-X, mod-Y, participant-Z | 1\|2\|3\|4\|all | [tab/modal] | critical\|high\|med\|low | Planning\|Operations\|Logistics\|Intel/Investigation\|Communications\|Public Info\|Safety\|Resource Mgmt | 3A-Auth\|3B-Multi-tenancy\|3C-NIMS\|3D-ICS-forms\|3E-Strut-algo\|3F-Hardening\|NONE\|NEW | covered\|partial\|gap\|new-idea | [short imperative] | app-eng\|doctrine-review\|alex-decision | v4.0.0\|v4.1.0\|v4.x backlog\|drop | Q1\|Q2\|Q3\|Q4 | [file:line] |
| IP-002 | … | … | … | … | … | … | … | … | … | … | … | … | … |
| IP-### | … | … | … | … | … | … | … | … | … | … | … | … | … |

## Column reference

| Column | Allowed values / notes |
|---|---|
| `IP-#` | Sequential. Reset per simulation. Format: `IP-001` zero-padded. |
| `Finding` | One sentence, problem statement (NOT recommendation). Past tense for "was observed". |
| `Source` | Comma-list of moderator IDs (`mod-nims`, `mod-struct`, `mod-ux`, `mod-data`, `mod-comms`, `mod-ist`) + `participant-hotwash` for participant-authored findings + `participant-<role>` when individual participant cited |
| `OP` | `1`, `2`, `3`, `4`, or `all` if observed throughout |
| `App Surface` | Specific tab/modal/component (e.g., `Operations tab — Add SP modal`, `Command tab — org chart reparent`) |
| `Severity` | `critical` = safety/data-loss; `high` = significant friction; `medium` = notable but workable; `low` = polish |
| `FEMA-IP-Capability` | One of: `Planning`, `Operations`, `Logistics`, `Intelligence/Investigation`, `Communications`, `Public Information`, `Safety`, `Resource Management` |
| `v4.0.0 Phase` | `3A-Auth`, `3B-Multi-tenancy`, `3C-NIMS`, `3D-ICS-forms`, `3E-Strut-algo`, `3F-Hardening`, `NONE` (already shipped or out of scope), `NEW` (post-v4.0.0 gap) |
| `v4.0.0 Coverage` | `covered` (current v4.0.0 plan addresses it), `partial` (plan touches it but doesn't fully solve), `gap` (within v4.0.0 scope but not in current plan), `new-idea` (beyond v4.0.0 scope — add to v4.x backlog or drop) |
| `Recommended Action` | Short imperative. Concrete enough to translate into a backlog item. E.g., "Add staging area concept to Command tab" or "Auto-expand parent section when section-action button clicked" |
| `Owner` | `app-eng` (code change), `doctrine-review` (NIMS / SOP), `alex-decision` (product call needed) |
| `Target Release` | `v4.0.0`, `v4.1.0`, `v4.x backlog`, `drop` |
| `AAR Question` | Which AAR question this came from: `Q1-intended`, `Q2-actual`, `Q3-sustain` (Q3 reveals what worked), `Q4-improve` |
| `Linked Note` | File + line ref (e.g., `notes/moderator-mod-nims-notes.jsonl:42`) |

## Phase 3 — gap analysis output template

Phase 3 produces `v4.0.0-gap-analysis.md` with one row per IP-# tagged against MASTER-PLAN Release 3 phases:

| IP-# | v4.0.0 Phase mapping | MASTER-PLAN section ref | Coverage | Delta from MASTER-PLAN |
|---|---|---|---|---|
| IP-001 | 3C.5 | MASTER-PLAN.md line 1061–1068 (`activeOperation.roleHistory`) | `partial` | MASTER-PLAN covers append-only role history but doesn't address rendering UI for transfer audit; add UI design to scope |
| IP-### | … | … | … | … |

## Summary stats (Phase 3 also generates)

- Total IP-# entries: **N**
- By severity: critical N / high N / medium N / low N
- By v4.0.0 coverage: covered N / partial N / gap N / new-idea N
- New gaps to add to MASTER-PLAN.md v4.0.0: list
- New items to add to v4.x backlog: list
- Items to drop: list

## Final report inputs

`final-report.md` (Phase 4) uses the IP table to produce:

1. **Executive summary** (1 paragraph): peak personnel, peak SP count, total findings, breakdown by severity, top 3 critical findings, recommended MASTER-PLAN changes
2. **Headline findings** (5–10 bullets): the most consequential discoveries
3. **v4.0.0 backlog deltas** (table): every "gap" or "partial" item with its proposed addition to MASTER-PLAN.md
4. **Doctrine recommendations** (bullets): anything for `doctrine-review` owner
5. **Alex decision queue** (bullets): items requiring product calls

## Example populated row (for synthesis subagent reference)

```
| IP-007 | The app's "Group" field on shore points overloads with apparatus assignment, contradicting NIMS doctrine where Group is a functional command unit | mod-nims, mod-ist, participant-hotwash, osc-op2 | all | Operations tab — Add SP modal Group dropdown | high | Operations | 3C-NIMS | partial | Rename SP `group` to `assignedResource` AND add separate optional `nimsGroup` field for functional grouping (per MASTER-PLAN Phase 3C.7) | app-eng | v4.0.0 | Q4 | notes/moderator-mod-nims-notes.jsonl:18 |
```

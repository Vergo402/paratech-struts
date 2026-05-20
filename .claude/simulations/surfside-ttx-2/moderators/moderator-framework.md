# Moderator Framework — Surfside TTX-2

> ⚠️ **Training-only.** Six silent-observation moderator personas run the full E+0:00 → E+36:00 window without interrupting participants.

## Cohort

| ID | Persona | Reference doctrine | Checklist file |
|---|---|---|---|
| `mod-nims` | NIMS / ICS Doctrine | FEMA ICSSCI SM-0322 (in memory `reference_fema_ics_collapse.md`); ICS Form Descriptions (plan.md Appendix A) | [mod-nims-checklist.md](mod-nims-checklist.md) |
| `mod-struct` | Structural Collapse SME | Paratech O&M Manual + LongShore (load tables encoded in `app.js`, plan.md Appendix E); USACE shoring doctrine | [mod-struct-checklist.md](mod-struct-checklist.md) |
| `mod-ux` | Field UX / Mobile Ergonomics | WCAG 2.2 Quickref (plan.md Appendix F); F1–F10 baseline from `.claude/audits/interactive-findings.md` | [mod-ux-checklist.md](mod-ux-checklist.md) |
| `mod-data` | Data Integrity / Multi-Agency / After-Action | MASTER-PLAN Phase 3A, 3B, 3C, 3D; `database.rules.json` validate rules; `app.js` listener + pendingWrites architecture | [mod-data-checklist.md](mod-data-checklist.md) |
| `mod-comms` | Communications / Radio Traffic | ICS-205 / ICS-205A from plan.md Appendix A; standard fireground radio terminology | [mod-comms-checklist.md](mod-comms-checklist.md) |
| `mod-ist` | FEMA IST / Inter-Agency Plans Chief | FEMA US&R Operations Manual Sep 2012 (plan.md Appendix B/C/D); MASTER-PLAN Phase 3B + 3D | [mod-ist-checklist.md](mod-ist-checklist.md) |

## Operating constraints (all moderators)

1. **Pure silent observation.** Moderators DO NOT interrupt participants, ask questions of participants, drive the app, or react in any way participants can detect.
2. **Rolling notes only.** Each moderator emits append-only single-line JSON observations to its dedicated notes file. No batch writes; no delayed transcription.
3. **No moderator-to-moderator coordination during the event.** Moderators don't see each other's notes. Conflict resolution happens at hotwash synthesis.
4. **No event-clock control.** The conductor controls the clock; moderators react to it but never advance or pause it.
5. **No app modifications.** Moderators do NOT make Firebase writes, set Page elements, or call app functions. They use preview_snapshot / preview_eval (read-only inspection) and the visible event log only.

## Note line format

Every observation is a single JSON line appended to `notes/moderator-<id>-notes.jsonl`:

```json
{"ts":"E+HH:MM","wallclock":"YYYY-MM-DD HH:MM:SS","op":1|2|3|4,"participant":"<subagent-id|n/a>","surface":"<tab/modal/component>","obs":"<one-sentence observation>","severity":"low|med|high|critical","v4_phase":"3A|3B|3C|3D|3E|3F|none|new","linked_finding":"<F1-F10 or AUDIT-ID or null>"}
```

### Field guidance

- `ts` — event clock at observation time (E+HH:MM)
- `wallclock` — wall-clock time the moderator made the observation (YYYY-MM-DD HH:MM:SS)
- `op` — operational period (1–4) at observation time
- `participant` — the subagent ID that was driving when the observation occurred (or `n/a` if not participant-attributable)
- `surface` — specific UI surface (e.g., `Operations tab — Add SP modal`, `Command tab — org chart`, `Cut Table tab — card #5`)
- `obs` — one-sentence factual statement (NOT a recommendation or interpretation)
- `severity` — `critical | high | medium | low`
- `v4_phase` — which MASTER-PLAN Phase 3 sub-phase addresses this, OR `none` (already shipped) OR `new` (post-v4.0.0 gap)
- `linked_finding` — cross-reference to a prior audit finding ID if applicable

### Severity rubric

| Severity | Meaning |
|---|---|
| `critical` | Safety-affecting or data-loss; should block v4.0.0 ship until fixed |
| `high` | Significant friction or correctness gap; v4.0.0 backlog |
| `medium` | Notable but workable; v4.1+ backlog |
| `low` | Polish or aesthetic; v4.x backlog or drop |

## File initialization

Each moderator initializes its notes file at T-15 (per runbook) with a single header line documenting:
- Moderator ID
- Doctrine reference
- Checklist file reference
- Wall-clock of initialization

Example initialization line:

```json
{"ts":"E+0:00","wallclock":"YYYY-MM-DD HH:MM:SS","op":1,"participant":"n/a","surface":"init","obs":"mod-nims initialized — observing per NIMS doctrine (FEMA ICSSCI SM-0322); checklist mod-nims-checklist.md","severity":"low","v4_phase":"none","linked_finding":null}
```

## Hotwash output flow

After E+36:00:

1. **Phase 1** — Each moderator submits an Army AAR (`aar-moderator-<id>.md`) using the four questions in `hotwash/aar-question-template.md`. Moderators do NOT see each other's drafts.
2. **Phase 2** — A synthesis subagent merges all moderator AARs + all participant AARs + all rolling notes into `hotwash/improvement-plan.md` (FEMA IP table per plan.md Hotwash section).
3. **Phase 3** — Synthesis subagent maps every IP-# to a MASTER-PLAN.md Release 3 phase tagged `covered | partial | gap | new-idea` → `hotwash/v4.0.0-gap-analysis.md`.
4. **Final report** — `final-report.md` summarizes headline findings and concrete MASTER-PLAN.md deltas.

## Conflict resolution (between moderators on same observation)

When two moderators flag the same finding at different severities or with different framings:

- Both moderator IDs appear in the IP table `Source` column
- Both severities are retained side-by-side
- If severity gap exceeds 1 tier (e.g., one says `critical` and one says `medium`), the conductor flags for Alex to adjudicate at hotwash review

## Moderator coverage matrix

| App surface | mod-nims | mod-struct | mod-ux | mod-data | mod-comms | mod-ist |
|---|---|---|---|---|---|---|
| Quick Find | | ✓ | ✓ | | ✓ | |
| Operations tab — SP cards | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Operations tab — Add SP modal | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Operations tab — Sections (Apparatus, External, Individuals, My Role) | ✓ | | ✓ | ✓ | | ✓ |
| Cut Table tab | | ✓ | ✓ | ✓ | ✓ | |
| Command tab — Org chart | ✓ | | ✓ | ✓ | | ✓ |
| Command tab — Reparent / role assign | ✓ | | ✓ | ✓ | | ✓ |
| Command tab — Span warnings | ✓ | | | | | ✓ |
| Inventory tab | | ✓ | ✓ | ✓ | | ✓ |
| Inventory — Import / Export | | ✓ | | ✓ | | ✓ |
| Settings — Department connection | | | | ✓ | | |
| Drilldown (Building → Floor → Area → Group) | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Hazard log (if present) | ✓ | ✓ | | | | ✓ |
| Status pills / badges | | | ✓ | ✓ | ✓ | |
| Activity feed / event log | | | | ✓ | | ✓ |
| ICS forms export (when invoked) | ✓ | | | ✓ | | ✓ |

The matrix isn't exhaustive — moderators observe anything in their domain. The matrix highlights expected hotspots.

# Army AAR — Question Template

> **One file per participant** (`aar-participant-<role>.md`) and **one file per moderator** (`aar-moderator-<id>.md`). Each subagent fills the four standard Army After-Action Review questions in isolation — they do NOT see each other's drafts during hotwash Phase 1. The synthesis subagent merges all AARs in Phase 2 into the FEMA Improvement Plan table.

---

## Subject identification

- **Subject ID:** (e.g., `ic-op2`, `mod-nims`)
- **Role / Persona:** (e.g., "IC #4 — Chief Whitaker, day-shift OP2", or "Moderator — NIMS / ICS Doctrine")
- **Active window:** (e.g., E+4:00 → E+16:00)
- **Submission date / wall-clock:** [filled by subagent]

## Operational period(s) covered

(Which OPs this subject experienced — usually one for participants, all four for moderators.)

---

## Question 1 — What was supposed to happen?

> Describe the plan / expectation for your active window. What were the objectives, your responsibilities, your tools, and the resources available to you?
>
> For participants: reference your IAP objectives + the SP creation/cut budget + your role's mandate.
> For moderators: reference your observation framework + the v4.0.0 hypothesis you were testing.

[Subject fills 1–3 paragraphs]

---

## Question 2 — What actually happened?

> Describe what occurred. Cite specific event-clock moments (E+HH:MM), specific shore points or actions, specific app surfaces, specific moments of friction or unexpected outcomes.
>
> Reference your own notes (event log entries you authored, or moderator notes file lines).

[Subject fills 1–3 paragraphs with specific evidence]

---

## Question 3 — Why was there a difference?

> What caused the gap between intended and actual? Be specific:
>
> - Was it the app (specific surface, specific behavior)?
> - Was it the scenario (an injected event that surprised you)?
> - Was it the coordination model (silent moderators / shared token / handoffs)?
> - Was it the persona / your understanding of role?
> - Was it doctrine vs. reality?

[Subject fills 1–3 paragraphs with root-cause analysis]

---

## Question 4 — What can we learn from it / what should change?

> Translate observations into concrete actions for v4.0.0 or v4.x+:
>
> - List specific changes to the app (cite Phase 3A/3B/3C/3D/3E/3F or NEW)
> - List specific changes to doctrine / participant prompts / moderator framework
> - List specific changes to the scenario design
>
> Be specific enough that the synthesis subagent can transcribe directly into the FEMA Improvement Plan table.

[Subject fills 1–3 paragraphs with actionable recommendations]

---

## Cross-reference

- **Linked notes** (for moderators): list line numbers from your `notes/moderator-<id>-notes.jsonl` that ground this AAR
- **Linked SP IDs** (for participants): list SPs you created, advanced, or worked on
- **Linked IAP**: cite which IAPs you authored or referenced

---

## Synthesis tags (for the Phase 2 merge)

The subagent adds 3–5 tags that map their AAR to expected `Recommended Action` entries in the FEMA IP table. Format:

```
tag: <short-imperative-action> | phase: 3A|3B|3C|3D|3E|3F|none|new | severity: low|med|high|critical
```

Example tags:

```
tag: Add staging area concept to Command tab | phase: 3C | severity: high
tag: 44px touch targets on cut-table buttons | phase: NEW | severity: high
tag: Per-write agency attribution visible in apparatus chip | phase: 3B.1 | severity: med
```

These tags are the input to the synthesis subagent's Phase 2 IP-table assembly.

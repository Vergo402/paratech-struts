---
name: primitive
description: "Author a single v4 design-system primitive doc end-to-end for one GitHub issue, always in plan mode. Use when Alex says '/primitive <#>', 'start primitive #N', 'do the <name> primitive', or 'author the primitive for issue #N'. Narrower, plan-gated sibling of /v4-plan: one primitive, one issue. v4-redesign branch only."
---

# Primitive Doc Workflow — one primitive, one issue, plan-gated

> Narrow executor for the single most common unit of the v4 arc: author **one** primitive
> design doc for **one** GitHub issue, update the shared registries, commit, and close.
> `/v4-plan` orchestrates the whole multi-phase arc; this skill does the leaf task with a
> built-in plan gate. They coexist — don't run the full `/v4-plan` session-start ritual here.

**Repo:** `/Users/alex/Developer/paratech-struts/fieldshore` · **branch:** `v4-redesign` · **remote:** `Vergo402/paratech-struts`

The issue number arrives as the argument (`/primitive 280` → issue #280). If no number was given, ask which issue before doing anything.

**This skill ALWAYS runs in plan mode.** Stages 0–2 are research-only. Stage 3 is a hard stop for Alex's approval via `ExitPlanMode`. Nothing is written, committed, or closed before that approval. Stages 4–6 run only after it.

---

## Stage 0 — Guardrails (assert before anything)

1. **Branch check:** `git rev-parse --abbrev-ref HEAD` must be `v4-redesign`. If on `main` or anything else, **stop** and tell Alex — never author v4 work off-branch.
2. **Issue is real and in scope:** `gh issue view <#> --repo Vergo402/paratech-struts`. If the issue is not a primitive-doc issue (it's a gate, a screen/IA issue, a bug, an out-of-scope item), say so plainly and **stop**. Do **not** act on adjacent or related issues — only the one named (this is the #197-overstep failure mode the skill exists to prevent).

## Stage 1 — Load context fresh (read-only)

Read these before drafting anything:

- The **issue body** — its Goal / Function / How-to is the durable spec for this primitive.
- `docs/v4-design/00-INDEX.md` — current phase status + exactly how primitives are registered (status emoji, `(#N — role)`, dense bullet rulings, cross-refs).
- `docs/v4-design/03-primitives/picker.md` — the **canonical template and standard of detail** (its first lines declare this). Every primitive matches its structure and depth.
- `docs/v4-design/07-design-system/accessibility.md` — the VoiceOver/TalkBack screen-reader registry table (where this primitive's SR scripts will be added as rows).
- `docs/v4-design/07-design-system/voice-and-tone.md` — the doc voice. **Docs keep precise design-system vocabulary**; the plain-language rule is for chat only, never for the spec.
- One recently-completed sibling at full depth (e.g. `docs/v4-design/03-primitives/button.md`) as a worked example.

## Stage 2 — Draft the plan for THIS primitive

Decide and write down:

- The **slug** and file path: `docs/v4-design/03-primitives/<slug>.md`.
- The **section outline**, following picker.md: Purpose → The variants (table) → the **boundary rule** (what IS vs IS NOT this primitive; eviction list of v3 classes that wrongly wore its markup) → Anatomy (table, every measurable property) → States (table) → Special forms (if any) → Anti-patterns / key rulings → Open questions → bottom cross-ref links.
- **Tokens cited vs. flagged.** A primitive **cites** tokens from sibling docs (e.g. `--radius-button` from spacing, `--type-body-medium` from typography) — it does **not** copy values. If a new token is needed, **flag it** for the owning sibling to mint (precedent: button.md flagged `--on-accent` for color.md). List every flag in the plan.
- The exact **INDEX registry line** to add.
- The exact **accessibility.md table row(s)** to add.
- Any **ADR cross-refs** that govern this primitive's scope.

## Stage 3 — Approval gate

Call **`ExitPlanMode`** with the plan above. Stop. Author nothing until Alex approves.

## Stage 4 — Author + register (after approval only)

1. **Re-read `00-INDEX.md` and `accessibility.md` fresh right now** — concurrent sessions may have changed them since Stage 1. Editing a stale copy is the #1 source of clobbering here.
2. Write `docs/v4-design/03-primitives/<slug>.md` at picker.md depth, in the doc voice. Cite tokens; never copy values; flag new tokens for their owning sibling.
3. Update `00-INDEX.md` — add/flip the registry line (status emoji → 🟢, `(#N — role)`, bullet rulings, cross-refs).
4. Update `accessibility.md` — add the primitive's SR-script row(s), each linking back to `../03-primitives/<slug>.md`.

## Stage 5 — Commit + push (concurrency-safe)

- **Path-scoped staging only** — never `git add -A` (it would sweep foreign edits from parallel sessions):
  ```
  git add -- docs/v4-design/03-primitives/<slug>.md \
             docs/v4-design/00-INDEX.md \
             docs/v4-design/07-design-system/accessibility.md
  ```
- Commit message, house style:
  ```
  [#<N>] <slug>.md (#<N>) — <one-line essence; "mints no tokens" or which tokens flagged>

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
  **Never use `Closes #<N>`.** That keyword only fires on merge to `main`; `v4-redesign` won't merge for a long time, so it silently fails to close the issue.
- **Push to `v4-redesign` in the same step** (push-on-commit is a standing rule). Never push to `main`.
- If a shared-file edit or commit fails due to a concurrent modification, **re-read the file and retry** — do not force.

## Stage 6 — Close + board + memory

- **Set the board status.** Project **#2** (v4 Redesign Roadmap), project id `PVT_kwHODy7CN84BYV37`, status field `PVTSSF_lAHODy7CN84BYV37zhTcaGE`. "In Progress" option is `47fc9ee4`. Set In Progress when work starts if it isn't already; the board auto-moves to **Done** when the issue closes, so no manual Done edit is needed.
  ```
  gh project item-list 2 --owner Vergo402 --limit 400 --format json \
    | jq -r '.items[] | select(.content.number == <N>) | .id'
  gh project item-edit --id <item-id> --project-id PVT_kwHODy7CN84BYV37 \
    --field-id PVTSSF_lAHODy7CN84BYV37zhTcaGE --single-select-option-id 47fc9ee4
  ```
- **Close the issue manually:** `gh issue close <N> --repo Vergo402/paratech-struts`.
- **Memory:** if anything durable surfaced (a new convention, a recurring token gap, a ruling), record it in the project memory at `~/.claude/projects/-Users-alex-Developer-paratech-struts-fieldshore/memory/`.

---

## Anti-patterns (do not do these)

- Don't skip the plan gate — this skill never authors or commits before `ExitPlanMode` approval.
- Don't touch any issue other than the one named. If you spot a related stale/duplicate issue, list it and ask.
- Don't use `Closes #N`, and don't `git add -A`.
- Don't copy token values into the primitive doc — cite the owner, or flag a new token for it to mint.
- Don't dumb down the spec voice; plain-language is a chat rule, not a doc rule.
- Don't run the full `/v4-plan` session-start ritual (plan-constitution read, essay dispatch, gate protocol) — that's the orchestrator's job, not this leaf task's.

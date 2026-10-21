# Brief-drafter instructions (#251)

You are drafting a QA criteria brief for FieldShore v4 (repo /Users/alex/Developer/paratech-struts/fieldshore, branch v4-redesign). Read-only on code; you write exactly one file: `.claude/audits/phase-j/251-verify/<NN>/BRIEF.md` (create the folder). Sibling agents write other specs' briefs into sibling folders under `251-verify/` — touch only your folder.

The Phase G workflow specs were written June 2026. Since then decisions changed some behavior. Turn the spec into concrete criteria a QA agent can drive in the real app in a browser, reconciled against later decisions.

Reconcile against (grep for what's relevant):
- `docs/v4-design/09-workflows/_PHASE-G-GATE-REVIEW.md` §10 and `_PHASE-G-GATE-REVIEW-VERIFICATION.md` (accepted deferrals)
- `docs/v4-design/11-decisions/ADR-0*.md`, especially ADR-023 onward
- `.claude/rules/v4-phase-status.md` (what v4.0 ships)
- `.claude/audits/phase-j/step1-fixes/LEDGER.md` (Phase J rulings)
- `docs/v4-design/99-open-questions.md` and `98-design-docket.md` where the spec cites them
- Open deferral issues on the board: run `gh issue list --repo Vergo402/paratech-struts --state open --search "Backlog OR v4.1 OR deferred in:title" --limit 100` once and check every feature you expect to be NOT-BUILT against it (e.g. #495 after-action email send = deferred past v4.0, #493–#496, #525). A match → tag Deferred (#issue), not Testable.
- The source under `src/` — confirm the screen/flow exists, find its route and the visible labels so the QA agent knows where to tap. Do not judge correctness from code; only locate things.

Tag each criterion:
- **Testable** — in force for v4.0 and drivable in a browser (phone viewport 390x844 unless the criterion is about another surface).
- **Superseded (ADR-N / #issue)** — a later decision replaced it; state the replacing behavior as its own Testable criterion if drivable.
- **Deferred (where)** — explicitly pushed past v4.0.
- No later decision found but the build visibly lacks it → still Testable (QA records NOT-BUILT).

BRIEF.md format:
1. Header: spec, Phase G issue, one paragraph summary of the workflow in plain words.
2. Setup: the state the QA agent must build first (account, department, apparatus, operation, shore points, roles, second device if the spec has a cross-device story), via the app's own UI where possible. Name routes and button labels you verified in `src/`.
3. Criteria table: `| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |`. IDs like `<NN>-01`. One observable thing per criterion. Cover each state-diagram transition, each wireframe step's key controls and exact copy the spec fixes, reversibility, cross-device propagation claims, checkable accessibility claims (labels, focus, tap target ≥ 44px where stated), offline behavior if stated. Aim for 12–35 Testable criteria; merge trivial ones.
4. Superseded/Deferred list with the citing decision.
5. Risks for the QA agent (things likely to be mistaken for bugs).

No harness section — the QA agent reads `251-verify/HARNESS.md` separately.

Final message: under 150 words — counts per tag, the 3 most important superseded items, any spec section you could not map to the build. Nothing else.

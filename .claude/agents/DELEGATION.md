# Delegation Framework (v4 build)

Fable (main loop) is the architect and oversight for every substantive v4 build/coding task. Implementation is delegated to the cheapest model tier still good enough for the piece of work. Every plan lists its build pieces × model × effort × why (standing rule 2026-07-21) — this table is the routing reference that plan builds from. Fable reviews every delegated diff itself before accepting; an agent's self-report is never sufficient.

## Routing table

| Task type | Agent | Default model / effort | Fable reviews |
|---|---|---|---|
| Routine v4 wiring, UI assembly, straightforward features | fullstack-engineer | sonnet (per-call override) / medium | full diff vs plan + standards |
| Subtle logic, safety-adjacent code (load math, sync, status lifecycle) | fullstack-engineer | opus / high | full diff + targeted re-derivation of the logic |
| Mechanical sweeps (renames, doc sweeps, repetitive edits) | fullstack-engineer | haiku (per-call override) / low | spot-check + grep for missed sites |
| Preview verification / proof-gathering | qa-driver | sonnet / medium | Fable makes the accept call; mockup fidelity verified by Fable directly |
| Pre-release / post-refactor audits | code-auditor | opus / high | findings triaged by Fable |
| Firebase / sync / offline / rules | devops-resilience | opus / high | full diff + rules diff |
| Adversarial review of any substantive diff | skeptical-senior-engineer | opus / high | Fable adjudicates objections |
| Scale sims | scenario-conductor | sonnet / medium | hotwash reviewed by Fable |
| Doctrine checks (NIMS / structural) | nims-compliance, structural-collapse-sme | sonnet / medium | citations spot-checked |
| Persona reviews | battalion-chief, usar-task-force-leader, rescue-specialist | sonnet·haiku / low | advisory only |
| Delegated design studies | architect | opus / high | Fable decides; agent recommends |

## Never delegated

Architecture decisions · final verification & mockup-fidelity acceptance · diff review · credentials-adjacent work · gate runs (Fable runs gates bare via Bash, output to file, `echo EXIT:$?`).

## Oversight protocol

1. Plan lists the delegation table before work starts.
2. Agents report; Fable reads the actual diff, not the report. This includes "covered/fixed/done" claims from exploration agents — treat them as hypotheses and re-ground anything that gates scope in the artifact itself (code, running app, live board) before acting on it.
3. Gates run by Fable.
4. Visual work: Fable drives the preview/screenshot itself before calling it "done."

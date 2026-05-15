# FieldStruts Audit Index

**Last updated:** 2026-05-14
**Audit version covered:** v3.5.1 (production is now v3.7.0)
**Status:** Audit complete. Implementation plan drafted. No fixes applied yet.

---

## What's in this audit

Two-round comprehensive audit of FieldStruts under Surfside-scale incident simulation (12-story collapse, 41-200+ shore points, 21+ apparatus from 5 agencies, multi-day operation).

### Round 1 — Eight role-based reviewers + interactive stress test

| Reviewer | Lane | Findings |
|---|---|---|
| Battalion Chief (IC) | Command, ICS integrity, accountability | 4 CRIT, 4 HIGH, 4 MED, 3 LOW |
| Operations Section Chief | Tactical execution, equipment flow | 3 CRIT, 4 HIGH, 4 MED, 3 LOW |
| Rescue Captain (entry team) | Inside-structure, gloves, time-pressure | 3 CRIT, 5 HIGH, 5 MED, 2 LOW |
| USAR Task Force Leader | Multi-agency, federal mutual aid | 3 CRIT, 5 HIGH, 3 MED |
| Cutting Table Lead | Wood shop, runner workflow | 2 CRIT, 3 HIGH, 3 MED, 2 LOW |
| Safety Officer | NIMS, PAR, hazards | 3 CRIT, 4 HIGH, 3 MED |
| Shoring Team Member | Field use, dropped phone, wet screen | 3 CRIT, 5 HIGH, 3 MED, 2 LOW |
| Senior Full-Stack Engineer | Code-level, performance, security | 5 CRIT, 6 HIGH, 7 MED, 4 LOW |
| Interactive (me) | Driving the app at scale | F1-F10 |

### Round 2 — Seven specialty deep agents + workflow drive-through

Triggered because Round 1 was too shallow — reviewers had word caps, code claims weren't verified, several workflows (apparatus arrival, end op, Excel import) were never driven, and the strut algorithm correctness was never audited.

| Specialty | Focus | New findings |
|---|---|---|
| **Strut algorithm correctness** | Paratech O&M Manual verification | **3 CRITICAL safety bugs** + 6 HIGH + 12 MED/LOW |
| **XSS surface enumeration** | All 58 innerHTML sites + escape function correctness | 3 CRIT classes + 5 HIGH + 2 MED |
| **Race conditions** | 42 write sites + 7 listener types catalogued | 5 CRIT + 7 HIGH + 9 MED |
| **Accessibility** | WCAG 2.1 AA + real-world (gloves, sun, smoke) | 5 CRIT WCAG fails + many HIGH/MED |
| **Storage / quota / lifecycle** | localStorage, sessionStorage, time/date | 6 CRIT + 8 HIGH + 8 MED + 7 LOW |
| **NIMS doctrine** | Compliance scorecard vs ICS forms | 19% overall NIMS compliance |
| **Interactive Round 2** | Apparatus arrival end-to-end + edge cases | Confirmed F2 over-claim, S8 `confirmAddApparatus` bug, V1 orphan refs |

---

## Documents in this audit

| File | What it is |
|---|---|
| **`AUDIT-INDEX.md`** (this file) | Top-level entry point |
| `interactive-findings.md` | Round 1 live findings from driving the app at scale |
| `v3.5.1-comprehensive-audit.md` | Round 1 consolidated by theme (67 findings) — kept for record, see corrections below |
| `v3.5.1-deep-audit-round2.md` | Round 2 deep findings with Round 1 corrections |
| `findings-ledger.md` | **Single source of truth: every finding from both rounds, with status, file:line, fix approach, release target** |

Implementation plans:

| Plan | Releases | Status |
|---|---|---|
| `v3.6.0-comprehensive-audit-fixes.md` | Round 1 plan covering v3.5.2 → v3.6.0 → v4.0.0 | Superseded by MASTER-PLAN |
| `v3.5.2-safety-hotfix.md` | Round 2 hotfix: algorithm + data-integrity + brick + XSS + contrast | Active |
| **`MASTER-PLAN.md`** | **Comprehensive plan covering ALL findings across all releases** | Active |

---

## Headline numbers

| Severity | Count | Notable |
|---|---|---|
| 🚨 **CRITICAL — Safety** | 3 | Strut algorithm over-reports capacity at 11ft (17%), 2ft (8.75%); double-deduction in pending re-validation |
| 🔥 **CRITICAL — Data loss** | 7 | Listener wipes local data, online-only persistence loses offline work, endOperation localStorage not cleared, sessionStorage bricks app on corruption |
| ⚠️ **CRITICAL — UX silent failure** | 4 | `confirmAddApparatus` / `endOperation` / `updateShoreStatus` / `deployShorePoint` all do Firebase-only writes when online — no local state update |
| 🔒 **CRITICAL — Security** | 3 | No Firebase Auth (anonymous read/write to anyone), drilldown XSS exploitable without Firebase write, JSON import XSS |
| 🌐 **CRITICAL — Multi-device** | 5 | Stale-dept listeners, roles map race, Excel import race, transaction failures dropped, pendingWrites+SDK double-write |
| ♿ **CRITICAL — Accessibility** | 3 | 40+ non-semantic interactives (no keyboard nav), critical contrast failures, no status announcer |
| **CRITICAL total** | **25** | |
| HIGH | 35+ | |
| MEDIUM | 25+ | |
| LOW | 15+ | |
| **Verified unique total** | **~95-100** | |

---

## Risk categorization

### 🛑 SHOWSTOPPER — Cannot be in operational use until fixed
1. **Strut algorithm capacity over-reports at 11 ft** — direct safety risk to firefighters
2. **No Firebase Auth + hardcoded config in source** — anyone on the internet can read/write the database

### 🚨 BLOCK ON NEXT INCIDENT — Fix before any further field deployment
3. Strut algorithm bugs (S1, S3 — pending double-deduction, 2ft overstate)
4. Online-only persistence (S6) — IC loses work on every offline reload
5. Firebase listener wipes local on first connect (S7)
6. `endOperation` resurrects archived ops on reload (S5)
7. App-bricking sessionStorage bug (S4)
8. `confirmAddApparatus` / `endOperation` silent failures online (S8, S9)
9. F2 collapsed-section dead-end (interactive verified, only affects Apparatus button)
10. Drilldown XSS exploitable from normal Shore Point form (X1)
11. JSON import XSS (X2)

### ⚠️ FIX BEFORE TYPE I/II USAR DEPLOYMENT
- All multi-agency race conditions (R3-R6)
- All accessibility critical violations (A1, A4 — keyboard nav + status announcer)
- Operational period concept (N3)
- Per-apparatus agency tagging (N5)
- After-action / ICS form export (N4)
- Apparatus check-in/demob timestamps (C8)
- PAR mechanism (D1)
- Stop-work / hazard log (D2, D3)

### 📋 FIX IN NORMAL CADENCE
Everything else.

---

## What the team would say

| Role | Updated verdict after Round 2 |
|---|---|
| Battalion Chief | **Strut algorithm over-reporting capacity is a safety stop.** Pull the app from operational use until fixed. After that, the IC-tool features (op periods, ICS forms, AAR export) can wait. |
| Ops Section Chief | The "online mutations never write to localStorage" pattern is the reason IC's never trust the app as source of truth. Every refresh feels like a coin flip. |
| Rescue Captain | If the algorithm over-reports capacity, none of the other UX stuff matters. Fix that. |
| USAR Task Force Leader | **No Firebase Auth + hardcoded config is a regulatory blocker.** DHS won't approve this for federal mutual aid use. Auth is non-negotiable for v4. |
| Safety Officer | Beyond no PAR / stop-work / hazard log: **the algorithm inconsistency with the printed Paratech manual will erode rescuer trust in the tool.** That's a separate safety issue. |
| Shoring Team Member | The sessionStorage brick? That's me dropping the phone, app dies, I clear data to recover, my work is gone. One corrupt session storage entry = app gone. |
| Cutting Table Lead | Wrong cut length passing through two devices is wasted lumber and a dead rescuer. Race conditions matter to me. |
| Senior Engineer | I should have caught the algorithm bug in Round 1 — the manual is in the repo. Lesson: future audits read reference materials, not just code. |

---

## How to use this audit

1. **Browse `findings-ledger.md`** for the complete catalog of every issue.
2. **Read `MASTER-PLAN.md`** for the comprehensive multi-release implementation plan.
3. **Reference individual specialty audits** (in `v3.5.1-deep-audit-round2.md`) for deep technical analysis on a specific topic.

When in doubt: severity ratings drive priority, but **the strut algorithm fix is the only one with a direct line from "app says it's OK" to "rescuer dies."** That fix ships first, period.

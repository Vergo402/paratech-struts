---
name: v4-phase-j-plan
description: "Build a consolidated Phase J priority list by reading the pre-Phase-J audit report (8 High blocker findings), phase J gate tasks, doctrine deviations, and the live v4 GitHub board. Use whenever Alex says '/v4-phase-j-plan', 'phase J planning', 'consolidate the Phase J backlog', or wants a unified view of Phase J work before cutover. v4-redesign branch only."
---

# Phase J Consolidated Planning

One job: read the four living sources of Phase J work — the pre-Phase-J audit report (blocker findings), open questions, design docket (deviations + cosmetic), and the live v4 GitHub board — consolidate them into a single priority backlog, and surface the cutover sequence for Alex's Phase J session.

## If invoked

1. **Branch guard.** `git branch --show-current` must be `v4-redesign`. If not, stop — never run from another branch.

2. **Read all four sources** (in order):
   - **`.claude/audits/pre-phase-j-review-2026-07/REPORT.md`** — Extract the **8 High findings** and their **3 findings clusters** (false-SAFE load-share, dept/RBAC/sync governance, commitMany stock-guard). Map each High finding to its GitHub issue (#415–#429). This is the **PRIMARY blocker source** — all three clusters must be resolved before cutover.
   - **`docs/v4-design/99-open-questions.md`** — Extract any Phase J questions. Usually sparse (most Phase J decisions lock before Phase I begins). Flag if found.
   - **`docs/v4-design/98-design-docket.md`** — Extract two sections:
     - **"Doctrine deviation watch"** — 5 flagged deviations (Assign Equipment modal, floating panel, org-chart drag, card compaction, command-transfer handshake) for Phase J doctrine audit
     - **"Post-build polish (#341)"** — cosmetic / visual items explicitly deferred until after Phase I (desktop nav, modal redesign, empty-shell idiom)
   - **v4 GitHub board (Project 2)** — Live status of all Phase J issues:
     ```bash
     gh project item-list 2 --owner Vergo402 --limit 400 --format json \
       | jq -r '.items[] | select(.content.title | contains("[Phase J]")) | "\(.status)\t#\(.content.number)\t\(.content.title)"'
     ```
     Extract:
     - **13 explicit Phase J gate tasks** (#256–#268): parity, audits, field review, migration, rollback, merge, release
     - **Audit findings issues** (#415–#429): map these to the 8 High findings clusters from the report
     - This is the **live source of truth for issue status** (Todo / In Progress / Done)

3. **Consolidate into three priority buckets** (Phase J structure):
   - **🔴 Cutover Blockers:** The 8 High findings + 3 clusters from the pre-Phase-J audit report. All three clusters must be FIXED and re-verified before merge to main.
   - **🟡 Phase J Required Gates:** The 13 explicit gate tasks (#256–#268), organized into a recommended sequence (what runs in parallel, what's serial).
   - **🟢 Doctrine Audit + Cosmetic:** The 5 flagged doctrine deviations (Phase J audit) + the #341 post-build polish items (can defer to v4.0.1 patch if capacity is tight).

4. **For each item, note:**
   - Source (audit report, gate list, docket, board)
   - GitHub tracking — issue #NNN and its **board status** (Todo / In Progress / Done)
   - Effort (small / medium / large)
   - Dependencies / Sequence (what blocks it, what it blocks)
   - Severity for blockers (High / Medium / Low, per audit classification)

5. **Reconcile audit report ⇄ board.** Cross-walk the 8 High findings against issues #415–#429:
   - **Missing GitHub issues** — if a High finding in the report has no matching issue number, flag it (might need an issue created)
   - **Status mismatches** — if the report says a finding is "open" but the board shows the issue Done, flag it (trust the board for live status)
   - **Orphaned issues** — if a Phase J issue (#415–#429) was NOT mentioned in the audit report, investigate why

6. **Output format:**
   ```markdown
   # Phase J Consolidated Backlog

   ## 🔴 Cutover Blockers (must fix before merging v4-redesign → main)

   ### Audit Finding Clusters (Pre-Phase-J Review, PR #414, 2026-07-04)
   [Summary of the 3 clusters, point to the REPORT.md, note: NO-GO determination pending these fixes]

   | Cluster | High Issues | Blocker Reason | Effort | Dependencies |
   |---|---|---|---|---|
   | False-SAFE load-share | #415, #416 | Load math divides by planned groupTotal instead of deployed struts; over-capacity flag missing | large | Strut engine fix + UI flag + re-verify at scale |
   | Dept/RBAC/Sync governance | #418, #419, #420, #422 | Custom roles RBAC rule missing; dept create/join missing retry logic; org drag silently mis-assigns | large | Firebase rule deploy + offline-retry loop + edge-case fix |
   | commitMany stock-guard bypass | #421 | Grouped delete bypasses ShorePointDeleted guard; strands deployed inventory on mixed-status groups | large | Transactional guard fix + grouped-edit fan-out |

   ## 🟡 Phase J Required Gates (must pass before cutover)

   ### Gate Sequence (recommended order)

   | # | Gate Task | GitHub | Status | Effort | Sequence Notes |
   |---|---|---|---|---|---|
   | 1 | Verify feature parity with v3 + approved v4 improvements | #256 | Todo | large | Parallel with others; read the parity matrix |
   | 2 | XSS surface clean (code-auditor) | #257 | Todo | medium | Parallel audit |
   | 3 | WCAG 2.1 AA accessibility (mobile-ux) | #258 | Todo | medium | Parallel audit |
   | 4 | NIMS-compliance review (nims-compliance) | #259 | Todo | medium | Parallel audit |
   | 5 | Structural-collapse SME domain review | #260 | Todo | medium | Parallel audit |
   | 6 | battalion-chief field review approval | #261 | Todo | medium | Gate (waits on blockers + other audits) |
   | 7 | Two real incidents OR one TTX run end-to-end on v4 | #262 | Todo | large | Gate (waits on field review approval) |
   | 8 | Rewrite docs/USER-MANUAL.md for v4 | #263 | Todo | large | Parallel with field work |
   | 9 | Validate v3 → v4 data migration on prod fork | #264 | Todo | large | Parallel with field work |
   | 10 | Document rollback plan | #265 | Todo | medium | Parallel with field work |
   | 11 | Archive v3 at v3-legacy deploy URL (6mo minimum) | #266 | Todo | small | Final step (after merge) |
   | 12 | Merge v4-redesign → main | #267 | Todo | small | Gate (waits on all above) |
   | 13 | Tag v4.0.0 release | #268 | Todo | small | Gate (waits on merge) |

   ## 🟢 Doctrine Audit + Cosmetic

   ### Phase J Doctrine Audit (5 flagged deviations)
   | Deviation | Issue | Type | Impact | Notes |
   |---|---|---|---|---|
   | Assign Equipment modal (centered, not sheet) | #346 | ADR-016 deviation | Non-breaking; approved by Alex | Recorded in AssignEquipmentSheet.tsx doc-comment |
   | Floating draggable panel (16th primitive) | ADR-037 | New primitive, not locked 15 | Low risk; ops-board-dominant redesign | Spec'd in floating-panel.md |
   | Phone org-chart drag (additive) | #367 | Off-spec for Phase F | Low risk; AT/button floor unchanged | 31-org-chart.md amended |
   | ShorePointCard compaction (strut/source off face) | — | Interior-officer design polish | Cosmetic | card.md amended |
   | Single-device command-transfer accept | #401 | Hand-the-tablet affordance | Non-breaking; one-IC invariant intact | ADR-021 addendum |

   ### Post-Build Polish (#341, can defer to v4.0.1)
   | Item | GitHub | Effort | Notes |
   |---|---|---|---|
   | Desktop: bottom tab bar → side selector (left nav rail) | #386 | medium | Cosmetic, desktop-only |
   | Desktop: redesign Operations/Cutting Station selector | #387 | small | Cosmetic, bad UX to fix |
   | Formalize dashed empty-shell idiom | #388 | small | Reusable pattern |

   ## GitHub Tracking Status

   [Summary of audit-report / board reconciliation]
   - **All 8 High findings tracked:** #415–#429 have corresponding GitHub issues
   - **13 gate tasks tracked:** #256–#268 all on the board
   - **Doctrine deviations tracked:** 5 deviations recorded in docket + ADRs
   - **No orphaned findings:** All High findings map to board issues

   [Any status mismatches or newly discovered blockers]

   ## Recommended Phase J Sequence

   **Phase:** Fix blockers → Run gates → Doctrine audit + cosmetic (if capacity)

   ### Stage 1: Fix Cutover Blockers (serial, parallel where noted)
   1. **False-SAFE cluster (#415, #416):** Fix load-share math + re-verify engine at scale + fix UI flag + test at Surfside scale
   2. **Dept/RBAC/Sync cluster (#418, #419, #420, #422):** Deploy Firebase rules + add retry loops + fix org-drag assignment + test multi-device sync
   3. **commitMany cluster (#421):** Add transactional guard + fix grouped-edit fan-out + test grouped delete at scale
   4. **Verify all three clusters closed** and blocked items re-pass the code-auditor (code-review pass on fixes)

   ### Stage 2: Run Phase J Gate Tasks (mostly parallel)
   - **Parallel audits:** #257 (XSS), #258 (WCAG), #259 (NIMS), #260 (SME) — can run in parallel with blockers or after
   - **Field work:** #261 (battalion-chief review), #262 (TTX/real incidents), #263–#265 (docs + migration validation) — after blockers close
   - **Cutover:** #267 (merge), #268 (tag) — after all gates pass

   ### Stage 3: Doctrine Audit + Cosmetic (if capacity remains)
   - Walk the 5 deviations against the locked doctrine and sign off (should be brief — they're already flagged + spec'd)
   - Polish the #341 items only if spare cycles; otherwise defer to v4.0.1

   ---

7. **Do NOT commit.** This is a planning output, not a permanent file. Show Alex the consolidated list in the response. If Alex approves, he'll decide whether to sequence the work or adjust the plan.

## Never

- Never run from a branch other than `v4-redesign`.
- Never commit the output (it's analysis, not a new source of truth).
- Never drop findings from the audit report — the backlog is cumulative.
- Never write to the board or close issues from this skill — it reads board status, it does not change it.
- Never deprioritize the 8 High findings — they gate cutover. The audit's severity assessment is authoritative.

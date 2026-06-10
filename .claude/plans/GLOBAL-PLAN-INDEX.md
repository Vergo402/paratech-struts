# Global Plan-File Index (`~/.claude/plans/`)

> **What this is.** Claude Code plan-mode writes each plan to the **global** `~/.claude/plans/` directory (shared across *all* of Alex's projects) and auto-names it with random words (e.g. `keen-whistling-pancake.md`). On **2026-06-07** every FieldShore-related plan there was renamed to a descriptive scheme and all references were repointed. This file is the authoritative old→new map and the reversibility record.
>
> Not to be confused with the **in-repo** `.claude/plans/` (this folder — `MASTER-PLAN.md`, `CONSOLIDATED-STATUS.md`, `archive/…`), which was already descriptively named.

## Naming convention

- **Master plan / v4 constitution:** `v4-master-plan.md` (originally codenamed `keen-whistling-pancake`).
- `v4-phase-<a–j>-<topic>.md` — phase work
- `v4-issue-<NNN>-<topic>.md` / `v4-adr-<NNN>-<topic>.md` — issue/ADR plans
- `v4-<topic>.md` — other v4 (roadmap reviews, css, positioning, sims)
- `v3-release|audit|fix|verify|feedback-<ver>-<topic>.md` — v3 maintenance history
- `fieldshore-<topic>.md` — cross-cutting (executive briefing, repo audit, tooling)

## Going-forward rule (no harness setting exists for this)

At the **end of each FieldShore planning session**, rename the harness-created random-named plan file in `~/.claude/plans/` to the convention above, update any references, and append the old→new pair to this file. The `/v4-plan` skill carries this as a closing step. Plan-file naming is fixed harness behavior — there is no settings/hook toggle (verified 2026-06-07).

## Reversibility

Renames were plain `mv` in a non-git directory. To revert, run the table below right-to-left. Three content substitutions also ran (string-keyed, safe): `keen-whistling-pancake`→`v4-master-plan` (repo + memory + plans), `run-through-a-miami-snazzy-glade`→`v4-surfside-ttx-2-pre-event`, `begin-release-1-fluffy-duckling`→`v3-release-v3.11.2-blocker-hotfix`.

## Old → new map (67 files)

### Master
| old | new |
|---|---|
| keen-whistling-pancake | v4-master-plan |

### v4 — phases / design system
| old | new |
|---|---|
| begin-phase-c-graceful-whistle | v4-phase-c-begin-essays |
| review-phase-c-open-sequential-pie | v4-phase-c-triage-report |
| plan-279-purring-scone | v4-phase-b-gate-to-c-dispatch |
| gate-b-reactive-scroll | v4-phase-b-closeout-phase-c-prep |
| i-m-reviewing-positioning-md-first-gleaming-star | v4-phase-b-followup-issues |
| signing-off-on-the-buzzing-fox | v4-phase-d-review-comments-pr-282 |
| begin-phase-e-vivid-whale | v4-phase-e-design-system-begin |
| audit-phase-e-and-abundant-cookie | v4-phase-e-audit-findings |
| start-177-linear-stardust | v4-phase-e-spacing-grid |
| begin-178-floofy-hummingbird | v4-phase-e-motion |
| begin-179-luminous-wand | v4-phase-e-iconography |
| begin-179-sparkling-haven | v4-phase-e-logo-and-mark |
| start-181-immutable-lobster | v4-phase-e-voice-and-tone |
| start-182-structured-gizmo | v4-phase-e-accessibility |
| start-183-196-atomic-sparkle | v4-phase-e-primitive-sheet |
| start-184-misty-clarke | v4-phase-e-primitive-modal |
| start-186-wild-hearth | v4-phase-e-primitive-badge |
| begin-phase-f-glittery-sun | v4-phase-f-ia-foundation |
| begin-phase-g-cheerful-lynx | v4-phase-g-foundation |
| cheerful-strolling-treasure | v4-phase-h-foundation-adrs (2026-06-09) — random name then **reused** by the harness for two later plan-mode sessions: → v4-phase-h-scaffold-docs (2026-06-10); the interim toggle-removal plan shared the name and was overwritten (no separate file) |
| expressive-wandering-blanket | v4-phase-h-slice-build (2026-06-10) — the #246 vertical-slice build plan (Sessions 1–7); Session 1 (toolchain + core domain) shipped at commit 3e59954 |
| yes-luminous-rocket | v4-phase-h-s2-data-layer (2026-06-10) — the Session-2 execution plan (data/store + data/sync stub + ui/hooks + seed) derived from v4-phase-h-slice-build; shipped at commit 5825eb9 |
| jolly-cuddling-russell | v4-phase-h-s3-primitives-shell (2026-06-10) — the Session-3 execution plan (ui/primitives + ui/picker w/ L-9 verbatim + MeasurementInput/DeductionPicker + themed shell + /gallery) derived from v4-phase-h-slice-build |
| begin-lazy-koala | v4-phase-h-s4-start-operation (2026-06-10) — the Session-4 execution plan (OperationsBoard + StartOperationModal + useDeviceUid + operations.css + gallery demo) derived from v4-phase-h-slice-build |
| splendid-tinkering-honey | v4-phase-h-s5-add-shore-point (2026-06-10) — the Session-5 execution plan (AddShorePointModal + ShorePointCard + DeleteShorePointModal + DivisionPicker w/ v3 grow-the-building model + DivisionAdded event + commitMany + overlay parent→child stack fix) derived from v4-phase-h-slice-build |
| start-session-6-snappy-pebble | v4-phase-h-s6-deploy-strut (2026-06-10) — the Session-6 execution plan (RecommendationCard + AssignEquipmentSheet w/ single-flight deploy + StepBackConfirmModal + In-Process/Strut-Set slides + group advance gate + live pendingReason; over-capacity gate drives in /gallery — flag at the #248 gate) derived from v4-phase-h-slice-build |

### v4 — issue / ADR / positioning
| old | new |
|---|---|
| 273-peaceful-brook | v4-issue-273-data-model-foundation |
| start-270-tidy-quilt | v4-issue-270-positioning-toneover |
| start-271-idempotent-nygaard | v4-issue-271-first-due-positioning |
| start-276-radiant-torvalds | v4-issue-276-drr-rescue-ack |
| eager-booping-bachman | v4-issue-269-the-sentence-rewrite |
| plan-274-gleaming-platypus | v4-issue-274-positioning-rewrite |
| plan-275-unified-aurora | v4-issue-275-rapidsos-reclassify |
| plan-279-hashed-bear | v4-issue-279-corpus-cleanup |
| 277-staged-diffie | v4-adr-002-principle-scope |
| continue-you-re-following-this-glimmering-wreath | v4-adr-003-scope-expandable |
| soft-churning-meadow | v4-positioning-rewrite-voice |

### v4 — roadmap reviews / css / sims / misc
| old | new |
|---|---|
| create-a-markdown-file-misty-journal-agent-a06e211341d7db465 | v4-roadmap-review-reviewers-12-13 |
| create-a-markdown-file-misty-journal-agent-a2d6b21d05281544d | v4-roadmap-review-psc-ist |
| create-a-markdown-file-misty-journal-agent-a449e5d82dd4f22d7 | v4-roadmap-review-two-experts |
| create-a-markdown-file-misty-journal-agent-a97082e396ab1f815 | v4-roadmap-review-sme |
| create-a-markdown-file-misty-journal-agent-abb3730d928691c81 | v4-roadmap-review-devops |
| create-a-markdown-file-misty-journal-agent-adb46de672159c319 | v4-roadmap-review-dual-expert |
| create-a-markdown-file-misty-journal-agent-a67eecc9af3ce088d | v4-css-command-board-foundation |
| create-a-markdown-file-misty-journal-agent-a9275c0b8d6926071 | v4-css-hardcoded-color-replacement |
| create-a-markdown-file-misty-journal-agent-ab997b64b91f99344 | v4-css-design-tokens-density |
| run-through-a-miami-snazzy-glade | v4-surfside-ttx-2-pre-event |
| create-5-different-simulation-curried-hennessy | v4-create-5-fema-simulation-skills |
| tell-me-everything-you-zesty-fountain | fieldshore-executive-briefing |
| dreamy-petting-walrus | fieldshore-repo-audit-cleanup |
| goofy-swimming-feather | fieldshore-backfill-roadmap-boards |
| create-skill-plan-this-woolly-karp | fieldshore-create-plan-skill |

### v3 — release / audit / fix / verify / feedback
| old | new |
|---|---|
| plan-out-a-simple-iterative-globe | v3-release-train-v3.13.1-to-v4.0 |
| plan-woolly-clock | v3-release-v3.14.3-v3.15.0 |
| rosy-drifting-marshmallow | v3-release-v3.12.0-command-tab |
| swirling-drifting-gray | v3-release-v3.19.0-org-chart |
| plan-v3-20-0-soft-platypus | v3-release-v3.20.0-external-equipment |
| please-plan-v3-21-delegated-candy | v3-release-v3.21-fractional-measurements |
| begin-release-1-fluffy-duckling | v3-release-v3.11.2-blocker-hotfix |
| start-v3-8-3-patch-peppy-whale | v3-release-v3.8.3-audit-quick-wins |
| v3.0.1-feedback-fixes | v3-release-v3.0.1-feedback-fixes |
| review-the-recent-audit-stateless-ritchie | v3-implement-v3.11.2-audit |
| splendid-purring-walrus | v3-audit-v3.11.2-live-site |
| before-we-start-working-elegant-bengio | v3-audit-v3.9.0-v3.9.1-retroactive |
| crispy-squishing-alpaca | v3-audit-v3.8.2-full-app |
| reflective-prancing-goblet | v3-fix-inventory-atomicity-v3.17.4 |
| why-are-all-the-nifty-star | v3-fix-stacked-fractions |
| linear-coalescing-dongarra | v3-fix-v3.16.4-component-a-txn |
| linear-coalescing-dongarra-agent-af5b7c4a67ad307bf | v3-fix-v3.16.4-component-a-resync |
| no-what-is-the-partitioned-globe | v3-verify-v3.16.4-failure-injection |
| i-need-you-to-melodic-creek | v3-finish-v3.11.1-release |
| provide-an-updated-flow-humming-dusk | v3-all-open-items-to-v3 |
| humble-doodling-hamming | v3-feedback-review-may-17 |
| create-a-markdown-file-misty-journal | v3-issue-54-command-page-v2 |

## This migration's own plan file
- Renamed at session end (68th FieldShore file): `is-there-a-reason-dazzling-russell.md` → `fieldshore-plan-file-rename-migration.md`.

## Deliberately NOT renamed
- `~/.claude/plans/i-want-to-go-sorted-eagle.md` (File-Migration project) and `ok-after-the-taxonomy-curious-milner.md` (Cowork recovery) — not FieldShore.
- All other random-named files in `~/.claude/plans/` belong to other projects (promotion quizzes, Paperless, brew upgrades, etc.).

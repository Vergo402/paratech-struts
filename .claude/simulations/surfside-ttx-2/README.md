# Surfside TTX-2 — Pre-Event Package

> ⚠️ **Training-only.** All names, units, victims, agency designations, and the building described in this simulation are fictional. Any resemblance to actual persons, units, addresses, agencies, or events (including the Champlain Towers South collapse of 2021) is for instructional purposes only and does not reflect real operational details or any real person involved in any real event.

This directory holds the pre-event package for the **Surfside TTX-2** simulation — a 36-hour staffed live-stagger exercise that drives the FieldShore PWA at Surfside scale (≈250 shore points, multi-agency response, four operational periods), captures friction via six silent moderator personas, and produces a v4.0.0 gap analysis at the end via a two-layer Army AAR + FEMA Improvement Plan hotwash.

## Status

**EXECUTED 2026-05-17.** All 4 OPs complete (E+0:00 → E+36:00). All 4 hotwash phases complete.

### Headline numbers

- Peak personnel: **494** (OP4 close)
- Peak SP count: **66**
- IAPs filed: **4** (ICS-201 retrospective for OP1; ICS-202 for OP2–OP4)
- Command transfers: **5** (Reyes → McAllister → Park → Whitaker → Vasquez → Whitaker return)
- OSC rotations: **6**
- Live extractions: **12**; recoveries: **4**
- Custom roles total: **24** by OP4 close (vs. ~9 in ICS_ROLES_DEFAULT)
- Catalogued findings: **63** IP rows (**14 critical / 28 high / 17 medium / 4 low**)
- MASTER-PLAN deltas: **51** concrete edits proposed across Phase 3A–3F + 6 net-new sub-phases

### Top 3 critical findings

1. **IP-007** — Add-SP modal Save Changes button hidden in Add path; bypassed for 4 OPs running via programmatic injection
2. **IP-001** — Anonymous-auth multi-tenancy gap; all users have full r/w to all departments
3. **IP-006** — Role history not preserved across any role transition (5 IC + 6 OSC = 11+ confirmed losses)

### Where the findings live

- **`hotwash/final-report.md`** — 6-section executive report (start here)
- **`hotwash/improvement-plan.md`** — 63-row FEMA Improvement Plan table
- **`hotwash/v4.0.0-gap-analysis.md`** — IP-#-to-MASTER-PLAN mapping with deltas
- **`../../plans/MASTER-PLAN.md` Phase 3G** — simulation findings folded into Release 3 plan (2026-05-17)
- **`../../plans/v4.0-to-v5.0-roadmap.md` Phase 0** — pointers from strategic roadmap into the simulation findings

## Directory contents

| Path | Purpose |
|---|---|
| [`plan.md`](plan.md) | Canonical plan — mirror of `/Users/alex/.claude/plans/run-through-a-miami-snazzy-glade.md` |
| [`runbook.md`](runbook.md) | Step-by-step execution instructions (T-30 through hotwash phase 3) |
| [`scenario/`](scenario/) | Building profile, victim cluster mapping, master E+ timeline |
| [`roster/`](roster/) | Personnel roster (~71 unit rows + 30 named leaders), ICS leadership transfer chain, per-OP active participant cast |
| [`inventory-baseline/`](inventory-baseline/) | JSON bundles for sim-dept seeding — local apparatus, state TF, federal TF (×3), external equipment |
| [`iaps/`](iaps/) | ICS-202 templates per OP, filled in-character at execution |
| [`moderators/`](moderators/) | Observation framework + six per-moderator checklists |
| [`hotwash/`](hotwash/) | AAR question template + FEMA Improvement Plan column template |
| [`subagent-prompts/`](subagent-prompts/) | Base system prompts for participant / moderator / conductor + per-role persona overlays |

## Post-event artifacts (created during the live run)

| Path | Status | Purpose |
|---|---|---|
| `runtime/event-log.jsonl` | ✅ 85 KB | Append-only master timeline |
| `runtime/firebase-snapshots/` | ✅ 5 snaps | JSON dumps of sim dept at each OP boundary (T-20 + E+04h/16h/28h/36h) |
| `runtime/conductor-state.json` | ✅ | Final operational state + 30-item friction log |
| `runtime/op3-driver.py` | ✅ | OP3 batch driver script (note: writes not persisted; OP4 driver re-applied — flagged IP) |
| `notes/moderator-mod-*-notes.jsonl` | ✅ 6 files | Rolling moderator notes |
| `iaps/iap-op1.md` … `iap-op4.md` | ✅ 4 IAPs | ICS-201 retrospective (OP1); full ICS-202 (OP2-4) |
| `hotwash/aar-moderator-*.md` | ✅ 6 files | Moderator AARs (NIMS, Struct, UX, Data, Comms, IST) |
| `hotwash/aar-participant-cohort-*.md` | ✅ 6 files | Participant cohort AARs (OP1, OP2-Cmd, OP2-Spt, OP2-Tac, OP3-New, OP4-Cmd) |
| `hotwash/improvement-plan.md` | ✅ 63 rows | Synthesized FEMA IP table |
| `hotwash/v4.0.0-gap-analysis.md` | ✅ 51 edits | Mapping of every IP-# to MASTER-PLAN.md Release 3 phase + deltas |
| `hotwash/final-report.md` | ✅ 6 sections | Executive summary + v4.0.0 backlog deltas + Alex decision queue + coda |

## Open decisions for Alex

From the `final-report.md` decision queue:

1. **Multi-tenancy scope** — IP-001 says anon-auth grants full r/w to all departments. Is per-agency identity scope-in for v4.0.0 (3B) or v4.1.0?
2. **Demob lifecycle minimum** — IP-008 proposes full FEMA proposed→reviewed→approved→executing→released lifecycle. Minimum viable demob UI vs full ICS-220/221 form export — which ships in v4.0.0?
3. **Double-hat support** — IP-040 multi-role-per-individual at span <7. Feature flag or default-on?
4. **v3.11.2 hotfix** — Ship the 6 release-blocker bugs (Phase 3G.0) as PATCH before any v4.0.0 phase code begins? Includes safety-affecting default changes (ICS_ROLES_DEFAULT additions per IP-005, IP-022, IP-039) — confirmation needed per memory.
5. **Teardown** — Sim Firebase dept `sim-surfside-ttx-2` is intact. Snapshots preserve full state. Tear it down (`firebase.database().ref('departments/sim-surfside-ttx-2').remove()`) or leave for re-runs?
6. **IP-059** — Prior-audit consolidation finding from gap analysis; classification call.

## Reference materials

- [`../../audits/interactive-findings.md`](../../audits/interactive-findings.md) — prior Surfside-scale run; F1–F10 baseline
- [`../../plans/MASTER-PLAN.md`](../../plans/MASTER-PLAN.md) lines 862–1180 — v4.0.0 Release 3 scope
- FEMA ICS Form Descriptions (March 2018) — see [`plan.md`](plan.md) Appendix A
- FEMA US&R Operations Manual (Sep 2012) — see [`plan.md`](plan.md) Appendix B–D
- W3C WCAG 2.2 Quickref — see [`plan.md`](plan.md) Appendix F

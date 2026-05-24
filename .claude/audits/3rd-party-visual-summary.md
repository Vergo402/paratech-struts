# 3rd-Party Review — Visual Summary

**Companion to:** `3rd-party-comparison.md` (full prose synthesis)
**Date:** 2026-05-14
**Reviewers:** Adversarial Engineer · UX Designer (15yr) · Senior USAR Firefighter (20yr, FEMA TF-1)

---

## 📊 The Big Picture — One Screen

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PRIOR AUDIT vs INDEPENDENT REVIEW                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRIOR AUDIT FINDINGS:        ~100 unique issues catalogued              │
│  CONFIRMED BY 3RD-PARTY:       ~90% (90/100)         ████████████░ 90%   │
│  CORRECTIONS NEEDED:            5 findings           ██░░░░░░░░░░░  5%   │
│  FALSE POSITIVES:               1 finding (R6)       ▌░░░░░░░░░░░░  1%   │
│                                                                          │
│  NEW FINDINGS MISSED:          18 (NEW-1 → NEW-18)                       │
│   ├─ CRITICAL safety:           1  (LongShore unverified)                │
│   ├─ CRITICAL operational:      3  (220-card dupe, IA clutter, qty>4)    │
│   ├─ HIGH data integrity:       3  (Excel IDs, txn phantoms, isOnline)   │
│   ├─ HIGH plan bugs:            4  (in v3.5.2/v3.6.0 written plans)      │
│   └─ MED/UX additions:          7                                        │
│                                                                          │
│  PLAN IMPLEMENTATION BUGS:      4  (would break if shipped as-written)   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Three-Reviewer Verdict Matrix

| Question | Engineer | UX Designer | Firefighter | Consensus |
|---|:---:|:---:|:---:|:---:|
| Is the audit broadly correct? | ✅ Yes (22/23) | ✅ On fixes | ✅ On safety | ✅ **YES** |
| Are the algorithm fixes safety-critical? | ✅ | — | ✅ | ✅ **SHIP** |
| Should v3.5.2 ship as-written? | ❌ Add 6 items | ❌ Add SVG fix | ❌ Add LongShore | ❌ **NO** |
| Is the v3.6.0 plan correctly scoped? | ⚠️ 4 bugs | ❌ Wrong framing | ⚠️ Missing dedup | ❌ **REWRITE** |
| Is the Operations page IA broken? | ⚠️ Notes clutter | ❌ 53% viewport | ❌ Slower than radio | ❌ **YES** |
| Is the app field-ready at TF scale? | ⚠️ Race conds | ❌ IA breaks down | ❌ Slower than analog | ❌ **NO** |
| Is the app safe to use locally now? | ⚠️ With v3.5.2 | — | ⚠️ With v3.5.2 | ⚠️ **AFTER HOTFIX** |

**Legend:** ✅ Confirmed/Yes  ❌ Disagreed/No  ⚠️ Partial/Conditional  — Not in scope

---

## 🔍 Audit Accuracy Heat Map

### What the audit got RIGHT (✅ all three reviewers confirmed)

```
SAFETY (S-series)         ████████████████████  9/9   100%  ✅
SECURITY (X-series)       ████████████████████  4/4   100%  ✅
RACES (R-series)          ████████████████░░░░  5/6    83%  ⚠️ R6 false +
ACCESSIBILITY (A-series)  ████████████████████  4/4   100%  ✅
STORAGE (L-series)        ████████████████████  8/8   100%  ✅
NIMS DOCTRINE (N-series)  ████████████████████  17/17  100% ✅
UX/OPS (U/O/V-series)     ████████████████████  All    100% ✅
```

### What the audit got WRONG (5 corrections + 1 false positive)

| # | Finding | What audit said | Reality |
|---|---|---|---|
| 1 | **S4** sessionStorage corrupt | "White-screens the app" | App becomes INERT — looks fine, doesn't work |
| 2 | **S7** Firebase wipe | "Wipes operation too" | Operations listener uses different code path |
| 3 | **X1** Drilldown XSS | "Building field only" | Division, Area, Group ALSO vulnerable |
| 4 | **R6** Double-write | "Can double-write" | ❌ FALSE POSITIVE — RTDB hangs, doesn't reject |
| 5 | **Emoji glyphs** v3.6.0 | "Add ⏳ ✂ 🏃 to badges" | Use SVG — emojis wash in sun, screen-reader noise |

---

## 🆕 The 18 Things the Audit Missed

### CRITICAL — Field-readiness blockers (the headline misses)

```
┌────────────────────────────────────────────────────────────────────┐
│ NEW-1  SP RECOMMENDATION LIST 20× DUPLICATED                       │
│ ════════════════════════════════════════════════════════════════   │
│                                                                    │
│   20 apparatus  →   220 cards for 11 unique configs   = 88,000 px  │
│  100 apparatus  →  1,100 cards for 11 unique configs  = 440,000 px │
│                                                                    │
│  Field timing:                                                     │
│    Notepad + radio:   ~15-20 seconds  ▌▌▌▌                         │
│    FieldShore:       ~60-90 seconds  ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌           │
│                                                                    │
│  ⚠️  THE APP IS CURRENTLY SLOWER THAN ANALOG AT TF SCALE.          │
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│ NEW-2  LONGSHORE LOAD TABLE COMPLETELY UNVERIFIED                  │
│ ════════════════════════════════════════════════════════════════   │
│                                                                    │
│  Paratech O&M Manual in repo:   ACME + LockStroke ✅                │
│  LongShore (Gold):              NO MANUAL ❌                        │
│                                                                    │
│  App reports LongShore @ 132":   11,000 lb                         │
│  ACME @ same length:              3,932 lb (manual)                │
│  Ratio:                          2.8× — plausible but unverified   │
│                                                                    │
│  If LongShore has same non-linear cliff as ACME at 132"...         │
│  ...this is a THIRD safety bug as severe as S2.                    │
│                                                                    │
│  v3.5.2 plan addresses ACME. LongShore is COMPLETELY ABSENT.       │
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│ NEW-3  SILENT REJECTION AT qty > 4 RETURNS "NO RESULTS"            │
│ ════════════════════════════════════════════════════════════════   │
│                                                                    │
│  Input:  24" measurement, very high load                           │
│  Output: "No combinations found"   ← misleading                    │
│  Reality: Load exceeds 4-strut capacity at that length             │
│                                                                    │
│  Rescuer cannot tell whether the result is empty because           │
│  no struts fit OR because the load exceeded the qty limit.         │
│  They may re-enter smaller numbers to get a result —               │
│  false confidence.                                                 │
│                                                                    │
│  Fix: return sentinel + message:                                   │
│   "Load exceeds 4-strut capacity at 24" (max XX,XXX lb).           │
│    Verify load calculation before proceeding."                     │
└────────────────────────────────────────────────────────────────────┘
```

### CRITICAL — IA, not styling

```
┌────────────────────────────────────────────────────────────────────┐
│ NEW-4  OPERATIONS PAGE TOP CLUTTER (measured iPhone SE 375×667)    │
│ ════════════════════════════════════════════════════════════════   │
│                                                                    │
│  ┌─────────────────────────────────┐  ← Op card (name+ts) — 97 px  │
│  │                                 │                               │
│  ├─────────────────────────────────┤  ← Apparatus toggle  — 44 px  │
│  ├─────────────────────────────────┤  ← External toggle   — 44 px  │
│  ├─────────────────────────────────┤  ← Individuals       — 44 px  │
│  ├─────────────────────────────────┤  ← My Role           — 44 px  │
│  ├─────────────────────────────────┤  ← Role-suggest      — 81 px  │
│  ├─────────────────────────────────┤  ← View switcher     — 46 px  │
│  │═══════════════════════════════ │  ◀━━━━━━━━━━━━ 354 PX (53%)    │
│  ├─ Shore Points ─ Drilldown ─────┤  ← + ~76 px more                │
│  │                                 │  ◀━━━━━━━━━━━━ 430-470 PX     │
│  │                                 │                               │
│  │   ZERO CARDS ABOVE FOLD ❌      │  ← Only 197-237 px left (30%) │
│  │                                 │                               │
│  └─────────────────────────────────┘                               │
│                                                                    │
│  Root fix: move Apparatus/External/Individuals/My-Role → ROSTER TAB│
│  Reclaim: 258 px = 39% of viewport = 3+ cards above-fold ✅         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Plan Bugs — Would Break If Shipped As-Written

| # | Plan | Bug | Impact |
|---|---|---|---|
| **NEW-11** | v3.5.2 drilldown XSS fix | References `getElementById('drilldownContainer')` — element doesn't exist | `null.addEventListener` → throws |
| **NEW-12** | v3.5.2 ACME table | Off-by-2 math in derived 2:1 column (7866 vs 7864) | Cosmetic but undermines claimed precision |
| **NEW-13** | v3.6.0 customConfirm | Async fan-out not enumerated — every caller chain breaks | Render mid-await sees stale state |
| **NEW-14** | v3.6.0 transaction re-queue | Closures can't be JSON-serialized | Unimplementable as written |

---

## 📐 Algorithm Bugs — Full ACME Discrepancy Table

```
LENGTH    MANUAL (4:1)   APP NOW      DELTA       v3.5.2 PLAN     FIXED?
────────────────────────────────────────────────────────────────────────
 2 ft       20,000        21,750       +8.75%      20,000          ✅ S3
 3 ft       20,000        20,875       +4.4%       20,000          ✅
 5 ft       16,551        17,063       +3.1%       16,551          ✅ NEW-5
 9 ft        9,138         8,693       −4.9% ⚠️    9,138           ✅
11 ft        3,932         4,595      +16.9% 🚨    3,932           ✅ S2
12 ft        ~3,400        4,167      ~+22% 🚨     3,400           ✅

────────────────────────────────────────────────────────────────────────
LongShore   ???           11,000      UNKNOWN     NOT ADDRESSED    ❌ NEW-2
@ 132"
```

⚠️ Under-report at 9 ft: rescuers cross-checking will distrust the tool
🚨 Over-report at 11 ft and 12 ft: SAFETY-CRITICAL

---

## 🎨 UX Designer's Paradigm Shifts

The audit treated UX as a series of point fixes. UX designer says: rethink the paradigms.

| Topic | Audit's plan | UX designer's recommendation |
|---|---|---|
| **Operations top** | Auto-expand section toggles | Move sections to **Roster tab**; show tactical summary instead |
| **Status badges** | Add emoji glyphs ⏳ ✂ 🏃 | **SVG icons** (sun-readable, screen-reader-friendly) |
| **Confirm dialogs** | Convert all 10 `confirm()` to custom sheet | **Progressive vs Destructive**: progressive = no confirm + undo; destructive = sheet + 8s cooldown |
| **Org chart D&D** | Add keyboard support | **Replace drag with explicit "Move under…" menu** — accessible by default |
| **Plate picker** | Convert to ARIA listbox | **Inline 4-6 most common as chips** + "Other…" picker without modal stacking |
| **Shore-point card** | Improve hierarchy | **Compact mode (56 px) + Expanded (235 px)** — 4× scannable |
| **Architecture mode** | (Not in audit) | Explicit **Calculator / Operation / Command** modes — "app is three apps in a trenchcoat" |

---

## 📋 Where Each Reviewer Found Most Value

```
                   Engineer    UX Designer   Firefighter
                   ─────────   ───────────   ──────────────
Code bugs caught       ███████      ██            ██
Plan bugs caught       █████        █             █
IA/paradigm shifts     █            ███████       ██
Field-use blockers     ██           ████          ███████
Algorithm verification ██           —             ██████
Doctrine compliance    █            ██            ██████
Race conditions        ██████       —             █

Unique contribution:
  Engineer:    Root causes & impl-level bugs (R6 false pos, isOnline)
  UX Designer: 354 px clutter measurement, paradigm reframes
  Firefighter: TF-scale workflow timings, LongShore unverified
```

---

## 🚦 What Ships and What Waits — At-a-Glance

### v3.5.2 — Safety Hotfix (REVISED)

```
ORIGINAL PLAN                    │  REVISED PLAN (with reviewer additions)
─────────────────────────────────┼──────────────────────────────────────────
🚨 S1 Double-deduction           │  🚨 S1 Double-deduction
🚨 S2 ACME 11ft overstate        │  🚨 S2 ACME (11-row table)  ← NEW-12 fix
🚨 S3 ACME 2ft overstate         │  🚨 S3 ACME (in same table)
🔥 S4 sessionStorage brick       │  🔥 S4 sessionStorage      ← desc fix
🔥 S5 endOp localStorage         │  🔥 S5 endOp localStorage
🔥 S7 Firebase wipe              │  🔥 S7 Firebase wipe       ← scope fix
🔥 S8 confirmAddApparatus        │  🔥 S8 confirmAddApparatus
🔒 X1 Drilldown XSS              │  🔒 X1 Drilldown XSS       ← NEW-11 fix
🔒 X2-X4 other XSS               │  🔒 X2-X4 other XSS
♿ A2 Status contrast            │  ♿ A2 Status contrast
                                 │  ➕ NEW-2 LongShore verification
                                 │  ➕ NEW-3 qty>4 sentinel
                                 │  ➕ NEW-6 Excel ID preservation
                                 │  ➕ NEW-7 Inventory txn sanity
                                 │  ➕ NEW-8 isOnline write gating
                                 │  ➕ Firebase security rules (anon r/w)
                                 │  ➕ Release-note banner
```

### v3.6.0 — Quality Release (RESTRUCTURED)

```
ORIGINAL PLAN                    │  REVISED PLAN
─────────────────────────────────┼──────────────────────────────────────────
Section auto-expand              │  ❌ REMOVED → Roster tab IA refactor
Plate picker as listbox          │  ❌ REMOVED → inline plate chips
Drag-drop keyboard support       │  ❌ REMOVED → replace with "Move under…"
Emoji glyph badges               │  ❌ REMOVED → SVG icons
Blanket confirm() conversion     │  ❌ REMOVED → progressive vs destructive
Transaction re-queue (closures)  │  ❌ REMOVED → serializable txn intent
                                 │  ➕ NEW IA: Roster tab + 96px header
                                 │  ➕ SP recommendation dedup
                                 │  ➕ Compact shore-point card mode
                                 │  ➕ Outdoor theme (sun-readable)
                                 │  ➕ Big-thumb mode (64px targets)
                                 │  ➕ Voice-to-text on inputs
                                 │  ➕ Persistent undo footer
                                 │  ➕ Activity feed as state-truth
```

### v4.0.0 — Major Restructure (NOTED ADDITIONS)

```
Already planned:           Add per reviewer:
─────────────────────      ────────────────────────────────────
Firebase Auth              ➕ Missing shore types (Raker, Sloped, Window/Door)
Per-device UID             ➕ Calculator/Operation/Command modes
NIMS overhaul              ➕ Operation phase mental model
ICS form exports           ➕ AAR debrief flow
                           ➕ Print view
                           ➕ First-run experience
                           ➕ Star/Watch for priority SPs
```

---

## ✅ Final Bottom Line (one sentence each)

| Reviewer | Bottom line |
|---|---|
| **Engineer** | Audit 22/23 right; add 6 items + fix 4 plan bugs in v3.5.2; rewrite v3.6.0 to avoid the unimplementable parts. |
| **UX Designer** | Right fixes, wrong framing — Operations IA is 53% broken; restructure v3.6.0 around paradigms (progressive vs destructive, inline chips, Roster tab) not point-fixes. |
| **Firefighter** | Algorithm fixes are safety stops — ship them; but the field-readiness stop is the 220-card dedup — app currently slower than notepad + radio at TF scale. |

```
                ┌────────────────────────────────────────┐
                │   CONSENSUS:                           │
                │   1. Ship v3.5.2 (with 6 additions)    │
                │   2. Restructure v3.6.0                │
                │   3. Acquire LongShore manual first    │
                │   4. Don't claim field-ready until     │
                │      the 220-card issue is fixed       │
                └────────────────────────────────────────┘
```

---

## 📁 Documents in this audit cycle

| File | Purpose |
|---|---|
| `AUDIT-INDEX.md` | Top-level entry point (both rounds + 3rd party) |
| `interactive-findings.md` | Round 1 live-driving findings |
| `v3.5.1-comprehensive-audit.md` | Round 1 consolidated (8 reviewers) |
| `v3.5.1-deep-audit-round2.md` | Round 2 deep findings (7 specialty agents) |
| `findings-ledger.md` | Single source of truth — every finding catalogued |
| `ARCHITECTURE.md` | Conventions, data flow, anti-patterns |
| `3rd-party-comparison.md` | Full prose synthesis of 3rd-party review |
| **`3rd-party-visual-summary.md`** | **(this) Visual companion — tables + ASCII** |

Plans:

| Plan | Status |
|---|---|
| `v3.5.2-safety-hotfix.md` | ⚠️ Needs 6 additions + 2 fixes per this review |
| `MASTER-PLAN.md` | ⚠️ v3.6.0 phases need restructure per this review |

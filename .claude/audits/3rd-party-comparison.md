# 3rd-Party Independent Review — Comparison Report

**Date:** 2026-05-14
**Three independent reviewers:** Adversarial Senior Staff Engineer, Alternative-Perspective Senior UX Designer (15yr, ICS dashboards), Senior USAR Firefighter (20yr, FEMA TF-1)

Each read the full audit + plan, then independently drove the app at Surfside scale and produced their own report. This document is the synthesis.

---

## TL;DR for Alex

**The prior audit was mostly right but minimized three things:**

1. **The SP recommendation list is unusably duplicated at multi-agency scale.** At 20 apparatus = 220 cards for 11 unique configs. At 100 apparatus = 1,100 cards. **The app is currently SLOWER than notepad + radio at TF scale.** Both the firefighter and the UX designer flagged variants of this independently.

2. **LongShore (Gold) load table is unverified.** All three reviewers noted this: the Paratech O&M Manual in the repo covers AcmeThread/LockStroke only. LongShore at 132" reports 11,000 lb — 2.8× the ACME rating at the same length. Plausible but unverified. **Same risk class as S2/S3 (the safety bug being shipped in v3.5.2) but completely unaddressed by the v3.5.2 plan.**

3. **Operations page top-clutter is an IA problem, not a styling problem.** UX designer measured live: **354 px above view switcher (53% of iPhone SE viewport), 430-470 px before first SP card (65-70% of viewport), ZERO cards above-fold on iPhone SE.** The v3.4.1 collapsed-section fix treats the symptom. Root fix: move the four sections OFF the Operations page entirely to a new Roster tab.

**Plus 4 implementation bugs in the v3.5.2 plan** caught by reviewers (off-by-2 math, non-existent element ID, unimplementable transaction re-queue, missing "set up once" guard in delegated listener).

**Bottom line:** Ship v3.5.2 hotfix but ADD several items the prior plan missed (detailed below). Do NOT ship the v3.6.0 plan as currently written — several disagreements between my proposed fixes and what the reviewers recommend.

---

## Section 1: Audit verification — all three reviewers AGREE

These prior-audit findings were confirmed by ALL THREE independent reviewers (highest confidence):

| Finding | Verdict | Notes |
|---|---|---|
| **S1** Double-deduction in pending re-validation | ✅ CONFIRMED | Firefighter measured the impact: "strut recommended 7" too short for actual opening — physically won't reach the upper sole plate" |
| **S2** ACME over-reports 17% at 11ft (132") | ✅ CONFIRMED | Firefighter independently verified against the manual: 3,932 (manual) vs 4,595 (app) |
| **S3** ACME over-reports 8.75% at 2ft (24") | ✅ CONFIRMED | Firefighter independently verified |
| **S5** endOperation doesn't clear localStorage | ✅ CONFIRMED | Engineer + Firefighter both reproduced |
| **S6** Online-only persistence | ✅ CONFIRMED | Engineer traced every call site; pattern is "if online firebaseSave else localStorage" — never both |
| **S7** Firebase listener wipes local on empty data | ✅ CONFIRMED | Engineer confirmed code path; raised that ops listener has DIFFERENT semantics than inv/apparatus listener |
| **S8** `confirmAddApparatus` silent failure online | ✅ CONFIRMED | Firefighter: "tap +Add, type name, tap Save → nothing happens. They'll tap again. Now there are 2 push() refs in pendingWrites." |
| **S9** `endOperation` same class of bug | ✅ CONFIRMED | Same pattern |
| **X1** Drilldown XSS exploitable without Firebase | ✅ CONFIRMED | Engineer reproduced live with `<img src=x onerror=...>` |
| **X2** Inventory model XSS via JSON import | ✅ CONFIRMED | |
| **X3** Command Layout onclick XSS | ✅ CONFIRMED | |
| **X4** `escapeHtml` misused in `value="..."` | ✅ CONFIRMED | |
| **R1** Zero `.off()` calls | ✅ CONFIRMED | grep verified |
| **R2** activeOperation full-replace | ✅ CONFIRMED | |
| **R3** orgSwapRoles full map write | ✅ CONFIRMED | |
| **R5** Excel import set on /inventory root | ✅ CONFIRMED | |
| **A1** 40+ `<div onclick>` patterns | ✅ CONFIRMED | UX measured 40+ instances |
| **A2** Cutting/Runner contrast failures | ✅ CONFIRMED | All three measured 2.9:1 and 3.2:1 |
| **A4** No status announcer | ✅ CONFIRMED | |
| **U1-U11, O1-O8, V1, D1-D6** field-use claims | ✅ CONFIRMED | Firefighter walked through each |
| **N1-N17 NIMS doctrine gaps** | ✅ CONFIRMED | Firefighter agrees: not Type I/II ready; Type III local incident is OK |
| **L1-L8 storage/lifecycle** | ✅ CONFIRMED | Engineer + Firefighter both confirmed |

**Bottom line:** **Roughly 90% of the prior audit's findings are correct.** That's a good batting average for a comprehensive audit.

---

## Section 2: Audit corrections needed

The reviewers caught specific imprecisions and one false positive.

### 2.1 — S4 description is misleading (Engineer caught this)

**My audit said:** "Top-level `JSON.parse` at line 415 — corrupt sessionStorage white-screens the app."

**Engineer's correction:** The app does NOT white-screen. Function declarations are hoisted, so functions remain callable. But every `const`/`let` declaration AFTER line 415 is missing, `init()` never runs, no listeners attach. User sees the static connect-screen HTML but the app is functionally INERT.

**Severity stays CRITICAL** — but the failure mode is "looks fine, doesn't work" not "white screen." Update the audit and release-notes language.

### 2.2 — R6 is a FALSE POSITIVE (Engineer caught this)

**My audit said:** "pendingWrites + Firebase SDK can double-write on reconnect"

**Engineer's correction:** This is wrong. Firebase RTDB compat SDK without `enablePersistence()` doesn't REJECT promises on offline writes — it HANGS them. So the `.catch` block in `firebaseSave` (line 575) rarely fires. **pendingWrites is effectively dead code for offline scenarios.** The real bug is worse: when user takes a screen action while offline, `firebaseSave` is called, Firebase promise hangs, pendingWrites is not populated (no rejection), localStorage is not written (S6), action completes "successfully" from UX POV but is **NOT persisted anywhere**. On reload, the action is GONE.

**This changes the v3.6.0 plan significantly.** Phase 2A.5 ("pendingWrites improvements") in MASTER-PLAN is treating symptoms. The real fix:
- Add `firebase.database().enablePersistence()` (or its equivalent — note: RTDB compat doesn't have a direct equivalent; it's Firestore that has this. For RTDB, the answer is `db.goOffline()`/`goOnline()` plus reliance on optimistic-local-writes)
- Change write routing to use `isOnline` (the `.info/connected` value) NOT `db && deptId` as the audit's S6 fix proposes

### 2.3 — S7 partial correction (Engineer caught this)

**My audit said:** Firebase listener wipes local data including operation.

**Engineer's correction:** The OPERATIONS listener (line 1001-1015) does NOT write to `fieldshore_operation` localStorage — only updates `activeOperation` in memory. So localStorage stays intact for operations. The inventory + apparatus + customApparatusTypes listeners DO wipe localStorage. My audit conflated these.

**Severity stays CRITICAL** for inventory/apparatus. For operations: the localStorage stays stale (from S6), in-memory wipes — same operational impact, different mechanism.

### 2.4 — X1 XSS scope wider than described (Engineer caught this)

**My audit said:** Drilldown XSS via building field; building only renders if multiBuilding=true.

**Engineer's correction:** The SAME XSS exists for Division, Area, and Group fields too (rendered in single-building operations as well). My audit understated the surface — it's broader, not narrower.

### 2.5 — emoji glyph fix is wrong (UX designer caught this)

**My v3.6.0 plan proposes** adding emoji glyphs to status badges:
```css
.status-badge.pending::before { content: '⏳'; }
```

**UX designer's correction:** Emojis are platform-dependent vector fonts. On Android Material 3 ⏳ looks different from iOS. They wash out under sunlight. Screen readers translate as "hourglass not done" — meaningless. **Use SVG icons (inlined via CSS background or `<svg>` masks).** Replace the entire `::before` emoji section of the plan.

---

## Section 3: NEW high-impact findings (from independent reviewers)

These were NOT in the prior audit. Listed by severity.

### CRITICAL — Operational

**🆕 NEW-1 (Firefighter): SP recommendation list duplicates 20× by apparatus**

`findStrutCombinations(inventory=opInv)` returns one result per (model, apparatus) pair. At 20 apparatus with similar inventory = **220 cards for 11 unique configurations**. At 100 apparatus (real Surfside scale) = **1,100 cards**. Each is ~80 px tall = 88,000 px of scrolling. Operator scrolls through 19 identical "LS 610 / Equipment from: MDFR R1" / "Equipment from: MDFR R2" / "Equipment from: Hialeah R1" / etc. cards before the next unique config appears.

**This is the single biggest field-speed killer in the app.** Firefighter measured: deploy a shore point = 22 taps, 60-90 seconds with gloves. **Slower than notepad + radio (~15-20s).** That alone fails the field-readiness bar.

**Fix:** Dedupe by `(model, extensions)`. Show available apparatus as a summary line under the strut model ("Available on: MDFR R1, FL-TF1 R2, PA-TF1 R1 — 12 total"). Or restructure to top-3 strut models with all apparatus listed inline.

**Both Firefighter and UX Designer caught variants of this.** UX designer's framing: "Quick Find result cards look identical regardless of agency — no agency badge — and the same model shows 21 times." Firefighter's framing: "1,100 cards at Surfside scale; app slower than analog."

### CRITICAL — Safety

**🆕 NEW-2 (Firefighter + Engineer): LongShore load table completely unverified**

All three reviewers independently flagged this. The Paratech O&M Manual PDF in the repo covers AcmeThread, LockStroke, and Low Clearance only. The LongShore (Gold) capacity table at `app.js:41-48` has **6 rows over 168 inches** (24, 84, 96, 120, 144, 192) with linear interpolation between. Firefighter checked: at 132", LongShore reports 11,000 lb — **2.8× the ACME rating at the same length**. Plausible (LongShore is heavier-duty) but **no source manual exists in the repo to verify any of these values.**

If LongShore has the same kind of non-linear cliff that ACME has at 132", and the app's linear interpolation produces a similar over-report, that's a third safety bug as severe as S2. **The v3.5.2 plan addresses ACME but doesn't address LongShore at all.**

**Action:** Acquire the LongShore O&M data sheet from Paratech (or the supplier's published table). Cross-check `LONGSHORE_LOAD_TABLE` values. If discrepancies exist, add to v3.5.2. If none exist, document the verification source.

### CRITICAL — Operational

**🆕 NEW-3 (Firefighter): Silent rejection at recommendedQty > 4 returns "no combinations found"**

`findStrutCombinations` line 192-193 filters out any result where `recommendedQty > 4`. A 24" measurement with a very high load returns ZERO results. The rescuer sees "No combinations found" with NO indication that the load exceeded the 4-strut limit vs no struts physically fitting. **They may re-enter smaller load numbers to "make it work" — false confidence.**

The audit rated this S-H3 HIGH (planned for v3.6.0). **Firefighter says elevate to CRITICAL and ship in v3.5.2.** The fix is small: instead of `continue`, return a sentinel "exceeds-4-struts" result type with a message like "Load exceeds 4-strut capacity at 24" (max XX,XXX lb). Verify load calculation before proceeding."

### CRITICAL — Information Architecture (UX)

**🆕 NEW-4 (UX Designer): Operations page top-clutter is IA-level, not styling**

UX designer measured live on iPhone SE (375×667):

| Element | Height (px) |
|---|---|
| Op card (name + timestamp) | 97 |
| Apparatus section toggle | 44 |
| External section toggle | 44 |
| Individuals section toggle | 44 |
| My Role section toggle | 44 |
| Role-suggest banner | 81 |
| View switcher | 46 |
| Total above view switcher | **354 px (53% of viewport)** |
| + Shore Points header + drilldown | + ~76 px |
| Total above first card | **430-470 px (65-70% of viewport)** |
| **Visible content area for SHORE POINT CARDS** | **197-237 px (30-35%)** |

**Zero shore-point cards above-fold on iPhone SE.** Alex's instinct is correct.

The v3.4.1 collapsed-section fix saves zero vertical space (the section toggles themselves are still 44 px each). The real fix:

**Move Apparatus / External / Individuals / My Role to a new "Roster" tab** alongside Operations/Command/Cut Table. Replace the current 354 px of section toggles with a 96 px header:

```
┌───────────────────────────────────┐  ← 32 px
│  Surfside Collapse · Day 3 OP4    │
├───────────────────────────────────┤  ← 36 px
│  ⏳12 ▶6 ▭3 ✂6 🏃3 ✓20 ↩2         │  (tactical summary, tappable filters)
├───────────────────────────────────┤  ← 28 px
│  [Ops] [Command] [Cut] [Roster]   │
└───────────────────────────────────┘
```

Net reclaim: **258 px = 39% of iPhone SE viewport.** 3+ shore-point cards now visible above-fold.

**This proposal supersedes the v3.6.0 plan's "section action button auto-expand" approach.** UX designer: "Treats the symptom — root cause is bad IA."

### CRITICAL — Algorithm completeness (Firefighter caught additional values)

**🆕 NEW-5 (Firefighter): ACME table has more discrepancies than the audit caught**

Firefighter cross-checked every length 2-12 ft against the Paratech manual. Beyond S2 (11ft) and S3 (2ft), found:

| Length | Manual (4:1) | App now | Audit's planned v3.5.2 fix | Missing? |
|---|---|---|---|---|
| 3 ft (36") | 20,000 | 20,875 (+4.4%) | 20,000 (because 24" row added) | Will fix if 24" row is exactly correct |
| 5 ft (60") | 16,551 | 17,063 (+3.1%) | 16,551 (audit plan adds 60" row) | ✅ Fixed |
| 9 ft (108") | 9,138 | 8,693 (**-4.9% UNDER**) | 9,138 (audit plan adds 108" row) | ✅ Fixed |

**Importantly:** the planned 11-row table in v3.5.2 fixes all of these. Firefighter confirmed the audit's planned values match the manual exactly. **Ship the full 11-row ACME table, not a partial fix.**

Note: 9 ft over-reports zero capacity in some directions but UNDER-reports here. Under-reporting causes valid combos to be rejected — not safety-critical but rescuers cross-checking will distrust the tool.

### HIGH — Missed by audit

**🆕 NEW-6 (Engineer): Excel round-trip orphans all deployed equipment**

`exportInventory` (line 4309) doesn't include the `id` field. `applyImportData` (line 4462-4470) generates a new `id` via `inventoryRef.push().key` for every imported item. **Every Excel round-trip generates fresh IDs.** All `deployedStrut.inventoryId` references in active shore points become orphaned. Returning equipment hits a non-existent item, triggering phantom-inventory creation (NEW-7 below).

**Single-user impact:** Export → modify in Excel → re-import → all deployed equipment is orphaned. Inventory math goes to hell.

**Audit didn't catch this.** Should be in v3.5.2. The fix: include `id` in export, preserve `id` on import.

**🆕 NEW-7 (Engineer): Inventory transaction creates phantom items**

`returnInventoryItems` uses transactions with no existence check or upper clamp:
```javascript
firebaseSave(inventoryRef.child(id).child('available'), 'transaction', v => (v || 0) + 1)
```

If the inventory item was deleted (e.g., apparatus removed) but a deployed SP still references its `inventoryId`, the return creates a phantom node `{available: 1}` with no `model`/`system`/`type`/`apparatus` fields. **Inventory tree becomes corrupted.**

Local-only branch correctly handles this; online branch does not. Add to v3.5.2 — wrap transactions with existence checks.

**🆕 NEW-8 (Engineer): Wrong routing decision — `db && deptId` instead of `isOnline`**

The pattern `if (db && deptId) firebaseSave(...) else safeSetItem(...)` is in 50+ call sites. **`db && deptId` is truthy whenever the user has CONFIGURED a department, regardless of whether the network is connected.** The `isOnline` flag (from `.info/connected` listener line 943) is used only for the UI status indicator — never for write routing.

**This is the deeper root cause of S6.** The fix isn't just "also write localStorage" — it's "use `isOnline` to gate Firebase writes." A half-day change. Should be in v3.5.2 (Engineer says); Firefighter agrees.

**🆕 NEW-9 (Firefighter): Only 3 shore types defined — missing Raker / Sloped Floor / Window Door**

USAR shoring per FEMA SH&SO and BIPS-08 includes Raker (Class 1/2/3), Sloped Floor Shore, Window/Door Shore, Spot Shore, Cribbing-only. App offers T-Shore, Double-T, 3-Post only. **Sufficient for trench, inadequate for building collapse.** This belongs in v4.0.0 (major scope) but should be acknowledged in MASTER-PLAN.

**🆕 NEW-10 (UX Designer + Firefighter): Three modes — "app is three apps in a trenchcoat"**

UX designer's proposal: explicit mode selection (Calculator / Operation / Command). Calculator is standalone (Quick Find + inventory browse). Operation is the punchlist. Command is the IC tool. Currently blurred together. v5.0.0 IA — note for future.

### HIGH — Plan implementation bugs (all from Engineer)

**🆕 NEW-11: Drilldown XSS fix in plan references non-existent element**

Plan Fix 7 in v3.5.2 hotfix: `document.getElementById('drilldownContainer').addEventListener(...)` — **this element does NOT exist in `index.html`.** The actual container is `shorePointsList` or `opsView`. Plan code throws `null.addEventListener` if implemented literally.

Also: "Outside the loop, set up once" mentioned but no guard. If `renderOperations` is called repeatedly, the listener gets re-attached each time = duplicate firing + memory leak.

**Fix the plan:** attach delegated listener ONCE during `init()`, target the correct element ID, guard with `if (!container._delegatedClickAttached)`.

**🆕 NEW-12: Plan Fix 1 has off-by-2 math**

Plan claims to derive 3:1 and 2:1 columns via ×4/3 and ×2. Check at 132": new 2:1 = 7866 (should be 3932×2 = 7864). Off by 2. Trivial but the plan claims math precision it doesn't deliver. **Fix the plan:** show derivation; recompute all rows.

**🆕 NEW-13: customConfirm refactor missing fan-out enumeration**

The v3.6.0 plan converts 10 `confirm()` callers to `await customConfirm()`. Each callsite function becomes async. **EVERY caller in the chain must also `await` or `.then`.** Plan doesn't enumerate this fan-out. Several callers are deep in render flows (`removeApparatusGroup`, `deleteShorePoint`) — converting them to async may have unexpected side effects (e.g., a render mid-await sees stale state).

**🆕 NEW-14: Transaction re-queue is unimplementable**

Plan Phase 2A.5 says "for transaction failures: re-queue with same transaction handler." Transaction handlers are CLOSURES that capture state at write time. Re-queueing means storing the closure — **impossible with JSON serialization.** Plan is unimplementable as written.

**Fix:** Either serialize the transaction's INTENT (e.g., "decrement available by 1, clamp at 0") not the closure, OR drop the manual retry and rely on Firebase SDK's offline persistence (currently disabled).

### HIGH — UX-specific fix disagreements

**🆕 NEW-15: Progressive vs destructive confirmation paradigm** (UX Designer)

My v3.6.0 plan converts all 10 `confirm()` calls to custom confirm sheets uniformly. UX designer disagrees: **progressive actions (Send to Runner, advance status) should have NO confirm + undo toast. Only destructive actions get the custom sheet** — with a 8-second cooldown timer before the destructive button enables. Medical device pattern. This means re-categorizing the 10 sites:

| Confirm site | Type | UX recommendation |
|---|---|---|
| Reparent confirm | Progressive | Drop confirm, keep undo |
| Move role confirm | Progressive | Drop confirm, keep undo |
| Remove apparatus type | Destructive (cascade) | Custom sheet + cooldown |
| Remove apparatus | Destructive (cascade) | Custom sheet + cooldown |
| Remove external equipment | Destructive | Custom sheet |
| Delete archived op | Destructive | Custom sheet + cooldown |
| Delete shore point | Destructive | Custom sheet |
| End operation | Destructive (cascade) | Custom sheet + cooldown |
| Log out | Destructive (local data clear) | Custom sheet + cooldown |
| Remove individual | Destructive (cascade) | Custom sheet |

**🆕 NEW-16: Org chart drag-drop — REPLACE not enhance** (UX Designer)

My v3.6.0 plan adds keyboard support to drag-drop (A5). UX designer: **replace drag-drop with explicit "Move under..." menu** instead. On a node: tap → role sheet; long-press or ⋯ menu → "Move under…", "Add sub-role", "Rename", "Delete". "Move under…" → flat searchable list of valid parent candidates with NIMS hierarchy constraints applied (N8).

- More accessible (keyboard-free).
- More discoverable (action visible in menu, not behind a touch gesture).
- No drag-drop water-droplet bug (U5).
- The keyboard support fix becomes free.

**🆕 NEW-17: Plate picker — INLINE, not listbox** (UX Designer)

My v3.6.0 plan converts plate picker to ARIA listbox (A10). UX designer: **don't make it a listbox at all.** Inline the 4-6 most-common plates as horizontal tappable chips on the form. Add "Other…" for the picker (which itself REPLACES the modal, not stacks on it). Eliminates stacking-context bug, fixes scroll for free, gloved hands hit 60px+ chips easily.

**🆕 NEW-18: Compact shore point card** (UX Designer)

The current shore point card is 235 px. UX designer proposes: **two visual modes:**
1. Compact (default, ~56 px): SP-number, label, location segment ("F1/A"), length, status pill, primary action chip
2. Expanded (235 px, on tap): full detail + extended actions

Makes the lane truly scannable. A Pending lane with 12 SPs is one screen of compact rows vs 4 screens of expanded cards.

### MEDIUM — UX additions not in audit

UX designer surfaced ~20 new UX gaps the audit missed. Summarized:

- No operation-phase mental model (size-up / assessment / tactical ops / recovery / demob)
- No relative time displays ("Started 2d 4h ago" vs wall-clock)
- No "Star/Watch" affordance for priority SPs
- Inconsistent modal close affordances (some have X, some don't; some respect Escape, some don't)
- Quick View FAB buried in bottom-right — should be sticky chip
- Settings is a junk drawer — needs sectioning
- Quick Find result cards don't display strut's current location
- Start Op flow asks too little (no type, no period policy, no agency)
- No way to switch between active operations
- 21 "Unknown" rows visible in role assignment modal (orphan apparatus at scale)
- No "what depends on this" warning before destructive cascades
- No first-run experience
- No AAR debrief moment at end of op
- No system to surface stale/at-risk SPs at top level
- No print view
- No "who's on this op right now" visibility
- "Group" overloaded — three different meanings in three contexts (audit N2 catches one)

These all belong somewhere in v3.6.0 to v4.0.0.

### What the reviewers AGREED is GOOD (positive findings)

All three reviewers credited the app for things the audit didn't emphasize:

- PWA + service worker + offline caching is rock solid **for read paths**
- Drilldown architecture (Building → Division → Area → Group → SP) is correct for navigating 200+ SP ops
- `escapeHtml` helper exists (a lot of field apps don't even try)
- Bottom tab nav is reachable one-handed
- `firebaseSave` wrapper centralizes write logic — good architectural decision even with bugs in implementation
- Group advancement (T-post pair) logic is well-implemented
- Reparent + undo + span warning code is well-structured
- Theme switching is instant and persists correctly

---

## Section 4: Adjustments to v3.5.2 plan

Recommended additions to the safety hotfix based on reviewer findings:

### MUST add to v3.5.2 (safety / data integrity)

1. **NEW-2: LongShore table verification** — acquire Paratech LongShore data sheet, cross-check `LONGSHORE_LOAD_TABLE`, fix discrepancies. Same risk class as S2/S3.
2. **NEW-6: Excel ID preservation** — include `id` column in export, preserve `id` on import. One-line fix that closes a CRITICAL data integrity hole.
3. **NEW-7: Inventory transaction sanity** — add existence check + upper clamp in `returnInventoryItems` transactions. Phantom inventory items will compound otherwise.
4. **NEW-8: `isOnline` gating** — change write routing from `db && deptId` to `isOnline`. Half-day change that fixes the root cause of S6.
5. **NEW-3 (firefighter): "Exceeds 4-strut" sentinel** — return a warning result instead of silent rejection when load needs >4 struts.
6. **Firebase security rules write-restricted to authenticated users** — Engineer noted this is a one-file deploy. Today, anyone on the internet with the database URL can read/write. CRITICAL even without full auth migration to v4.

### MUST update v3.5.2 plan documents

7. **Fix the drilldown XSS fix** (NEW-11) — wrong element ID, missing once-only guard.
8. **Fix the ACME table math** (NEW-12) — off-by-2 in derived columns.
9. **Update S4 description** — "app becomes inert" not "white-screens."
10. **Remove R6 from audit** — false positive. Replace with the real bug (pendingWrites is dead code in offline mode).
11. **Update S7 description** — operations listener has different semantics than inv/apparatus listeners.

### CAN add (low-effort, high-value)

12. **L4 (pendingWrites paths after dept switch)** — one-line `pendingWrites = []` in `connectDepartment`. Firefighter flagged for v3.5.2.
13. **Release-note banner** on welcome screen first launch after v3.5.2 update: "Strut capacities corrected per Paratech O&M Manual Table 2-7. Configurations near 11 ft may now require additional struts."
14. **Add "view Paratech manual" link** on result cards (PDF already in repo).

### REMOVE from v3.5.2 plan

15. **The emoji glyph status badge enhancement** (was in v3.6.0 but worth noting now) — use SVG icons, not emojis.
16. **The `confirm()` blanket conversion** (v3.6.0 plan) — split into progressive (no confirm, undo toast) vs destructive (custom sheet + cooldown).

---

## Section 5: Adjustments to v3.6.0 plan

### REMOVE from v3.6.0:

- **Section button auto-expand fix (Plan 2A.1)** — superseded by NEW-4 (move sections to Roster tab in v3.6.0 IA refactor)
- **Plate picker as listbox (Plan 2H.2)** — superseded by NEW-17 (inline plate chips)
- **Drag-drop keyboard support (Plan 2H.5)** — superseded by NEW-16 (replace drag with explicit menu)
- **Emoji glyph status badges (Plan 2D.4)** — replace with SVG icons
- **Blanket `confirm()` to customConfirm conversion** — re-categorize as progressive vs destructive
- **Transaction re-queue with handlers (Plan 2A.5)** — unimplementable; replace with serializable transaction intent

### ADD to v3.6.0:

- **IA refactor: Roster tab + 96-px Operations header** (NEW-4) — the biggest single UX win
- **SP recommendation list deduplication** (NEW-1) — the biggest single field-speed win
- **Compact shore-point card mode** (NEW-18)
- **Activity feed paradigm** (UX designer's reframing of V2)
- **Outdoor theme (3rd theme beyond light/dark)** — sun-readable preset
- **Big-thumb mode toggle** — 64-px targets opt-in
- **Voice-to-text** on text inputs (uses native Web Speech API)
- **Persistent "Last action: X · Undo" footer** above bottom nav
- **Progressive vs destructive confirmation paradigm** (re-categorize the 10 confirms)
- **SVG icons for status badges** (replace emoji proposal)
- **Activity feed replaces toasts as state-change source of truth** (UX paradigm shift)

### MODIFY in v3.6.0:

- **A5 fix:** Replace drag-drop with explicit menu, not "add keyboard support"
- **A10 fix:** Inline plate chips, not ARIA listbox
- **A22 fix:** SVG glyphs + color + filled/outlined treatment, not emojis
- **U6 fix:** Severity bump to CRITICAL (sun + glove conditions); use SVG glyphs

---

## Section 6: Final verdict — three reviewers, one bottom line

**Adversarial Engineer:** Audit is mostly right (22/23 critical claims confirmed). 5 new HIGH findings missed. 4 plan implementation bugs. Re-prioritize LongShore + Excel ID + isOnline + Firebase rules into v3.5.2.

**UX Designer:** Audit is RIGHT on individual fixes but WRONG on framing. Multiple fixes treat symptoms when the disease is IA. Operations top-clutter is 53% of viewport — fix is to move sections off the page entirely. App is "three apps in a trenchcoat" — Calculator / Operation / Command modes should be explicit. 2/10 partial, 6/10 violations on Nielsen heuristics. UX redesign needed at v3.6.0+ scale, not just polish.

**Senior USAR Firefighter:** Algorithm bugs are correctly identified safety stops — ship the fix. But the operational stop is the 220-card deduplication issue — **app is currently slower than notepad+radio at TF scale**. Also LongShore unverified, qty>4 silent rejection, plus 3 missed shore types. v3.5.2 needs the additions above; otherwise ship it.

### What they agree on:

1. **Ship v3.5.2 with the additions in Section 4.**
2. **The Operations page top is broken at the IA level.** Move sections to a Roster tab.
3. **LongShore table verification is non-negotiable** before claiming "all strut algorithms are correct."
4. **The 220-card deduplication is a field-readiness blocker** at TF scale.
5. **The pendingWrites system is a false-safety mechanism** — needs structural rethink not incremental fixes.

### What you (Alex) should do next

1. **Update v3.5.2 plan** with the 6 must-add items (LongShore, Excel ID, transaction sanity, isOnline, qty>4 sentinel, Firebase security rules). Fix the 4 plan implementation bugs.
2. **Don't ship v3.6.0 plan as currently written.** Re-write Phase 2D/2H sections with UX designer's alternative paradigms (progressive vs destructive, replace drag with menu, inline plate chips, SVG glyphs).
3. **Add a v3.6.0 IA refactor phase** for the Operations page Roster tab move and the SP recommendation dedup. These are the biggest field UX wins.
4. **Plan the LongShore manual acquisition** as a blocking dependency for v3.5.2 ship.

---

## Files in this review

| File | Reviewer | Size |
|---|---|---|
| `3rd-party-comparison.md` (this) | All synthesis | ~20 KB |

Individual reviewer outputs are in their respective agent transcripts. Key extracts integrated above.

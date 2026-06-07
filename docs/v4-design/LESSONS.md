# LESSONS — institutional memory of v3 audit-driven fixes

> Phase E deliverable (recs **L-3** + **L-23**). The curated record of what broke in v3 and the doctrine v4 must carry forward so it is not relearned the hard way. Each entry: **what failed → the fix → the v4 rule.** This is not the full findings ledger (that lives in `.claude/audits/`) — it is the load-bearing subset, the lessons with a safety or data-integrity cost. Extensible: append a lesson whenever a v3 fix encodes a rule v4 must keep.
>
> Written 2026-06-07 (the A–E traceability audit found this deliverable had never been authored). Sourced from the v3.5.2 → v3.17.2 audit history in `CLAUDE.md` and `.claude/audits/`.

---

## 1. Safety-critical numbers are never interpolated upward

**What failed.** v3 reported strut load capacity by **linear interpolation** between datasheet rows. Two whole classes of bug followed: the ACME load table over-reported at several lengths (132″/11 ft by **17%**, 24″ by 8.75% — an interpolation cliff), and the LongShore table over-reported 13 ft by 17.9%. Over-reporting a *safe load* on a shoring instrument is the most dangerous bug the app can have.

**The fix (v3.5.2, v3.7.2).** Every load-table row was reconciled against the Paratech O&M Manual verbatim. Interpolation was replaced with a **conservative-floor method**: when a measurement falls between two rows, use the **shorter (higher-capacity) row's neighbor that under-reports**, never the optimistic interpolated value. A liability disclaimer rides every result.

**The v4 rule.** Load tables are **frozen, PDF-sourced typed arrays** (`core/load/tables.ts`) with a snapshot test against a JSON fixture extracted from the manual (rec **L-4**). The engine (`core/load/engine.ts`) carries the conservative-floor doctrine with a property test (rec **L-5**). **A capacity figure is a planning aid, not a certification** — the disclaimer is non-dismissable (`warning-gate.md`). When in doubt, under-report. Never let a refactor "simplify" the floor back into an interpolation.

## 2. Deduct once, and round only the display — never the math

**What failed.** A shore point re-validated in `pending` was deducted **twice** — `findStrutCombinations` received `sp.effectiveLength` (already deducted) instead of `sp.requiredLength` (raw), compounding the deduction (finding S1). Separately, pre-rounding plate spec heights *inside the math* accumulated unsafe error.

**The fix (v3.5.2, ADR-012).** The strut search always receives the **raw** required length; deductions are applied once. Plate deductions **display** as the nearest ⅛″ fraction but the **exact spec (e.g. 3.4″) is used in the calculation**; a footnote marks the rows approximate. Effective length **floors down to ⅛″** (short is taken up by wedge + thread; long is unsafe).

**The v4 rule.** One deduction, raw input. Round for the eye, compute on the exact value. Measurement precision is ⅛″ floor-rounded (ADR-012) — exact-entry keypad, never a drag-slider that can "land close enough."

## 3. `escapeHtml` escapes `< > &` — not `"` or `'`

**What failed.** v3's `escapeHtml()` (set `textContent`, read `innerHTML`) is safe for **element text only**. Used inside an `attr="…"` interpolation it leaves quotes unescaped → attribute-breakout XSS. Multiple sites interpolated user-controlled fields into `onclick=` and attributes (findings X1/X2/X3, F-1C-19), including a peer-writable Firebase path (stored XSS).

**The fix (v3.5.2 → v3.9.0).** `escapeAttr()` for attribute contexts; data-attribute handlers instead of inline-JS construction; `escapeHtml()` on every peer-written field (`sp.deployedStrut.model`, etc.); `Number()` coercion on numeric peer fields.

**The v4 rule.** v4 **deletes** `escapeHtml`/`escapeAttr` entirely (rec **L-2**) — JSX default-escapes, and `react/no-danger` is a lint **error**. There is no `dangerouslySetInnerHTML` path, so there is no escaping discipline to get wrong. The lesson kept: untrusted strings include **peer-written Firebase data**, not just form input.

## 4. Every write is local-first, then conditionally synced — never an `if (db) {…} else {…}` fork

**What failed.** v3 forked **44 mutation sites** on `if (db) { firebase } else { localStorage }`. Offline writes and online writes took different code paths, so offline behavior silently diverged and bugs hid in the branch that wasn't being tested (findings S6/S8/NEW-8).

**The fix (v3.5.3).** Every mutation writes to **in-memory state + localStorage first** (`persistOperation()` / `persistInventory()`), then **conditionally** syncs to Firebase via one wrapper (`firebaseSave()`) that handles the online queue + offline fallback internally. 24 operation and 10 inventory copy-pasted `safeSetItem` calls collapsed into two functions.

**The v4 rule.** Local-first is the contract, not a branch. Stores commit locally (`operationStore.commit` / `inventoryStore.commit`, rec **L-8**); the sync seam (`syncService.enqueue`, rec **L-7**) is the *only* Firebase path, and **no UI component imports it directly** (lint-enforced). Every state mutation hits durable local storage **synchronously before the UI updates** so a dropped phone loses nothing (rec **G-14**).

## 5. A validation rule that silently rejects every write is worse than a crash

**What failed — the worst data-integrity bug in v3's history.** The Firebase `database.rules.json` validate rule required a `name` field, but inventory items carry `model`. **Every inventory write since v3.7.0 silently failed `PERMISSION_DENIED`** — for *months* — with no surfaced error. The data just didn't save, and no one saw it (finding fixed v3.8.2).

**The fix (v3.8.2).** Rule corrected and deployed; transaction failures now log to `/diagnostics/sync/` via `logSyncEvent('transaction_failed')`; pending writes from older app versions are filtered by `APP_VERSION`.

**The v4 rule (rec L-11, the permanent fix).** Generate `database.rules.json` from a **single TypeScript (Zod) schema**; the client validates against the *same* schema; **CI asserts the generated rules match the committed file.** A field-name drift becomes a build failure, not a silent months-long data loss. Rule failures surface to an Admin toast. This closes the silent-validation-failure class permanently.

## 6. Detach listeners before reattaching; never trust an empty first snapshot

**What failed.** v3 re-ran `setupListeners()` without detaching the old `.on()` handlers → a listener leak that multiplied callbacks (finding R1). Separately, a listener's **first** snapshot arriving empty would **wipe local data** before the real data loaded (finding S7).

**The fix (v3.6.0, v3.5.2).** `teardownListeners()` detaches all listeners (with stored query refs) before `setupListeners()` reattaches. The first-fire guard: an empty first snapshot **pushes local state up to Firebase** instead of wiping local. Listeners detach on background, reattach on foreground; ≤60s background sync interval (rec **G-12**).

**The v4 rule.** Subscriptions are `useEffect` cleanups with `react-hooks/exhaustive-deps` as a lint **error** (recs **A-24/L-15**) — the cleanup *is* the teardown, structurally. The empty-first-snapshot guard is doctrine: an empty remote read is **not** a delete instruction.

## 7. Status is monotonic-by-guard, and a group transition must not regress a group-mate

**What failed.** A grouped pre-cutting transition could **regress** a group member that had already advanced into cutting/runner (finding F-1C-1) — sliding the whole group "back" stepped on points that were ahead.

**The fix (v3.9.0).** `updateShoreStatus()` uses `STATUS_ORDER` to **skip group members already past the target**; pre-cutting transitions never regress a mate who has advanced. The phase-based group/individual split (v3.8.0/v3.9.0): pre-cutting transitions apply group-wide; the cutting workflow operates per-piece.

**The v4 rule.** `STATUS_ORDER` survives verbatim as a **discriminated-union reducer invariant** (`core/shorepoint/status.ts`, rec **L-6**) — generalized to state-machine doctrine for every monotonic field (rec **I-4**). Note: under ADR-010 status is now **bidirectional/always-reversible** (slide-to-advance + step-back), so the invariant is "no *accidental* regression," not "no regression" — the reducer enforces deliberate-only transitions. There is **no `safety-hold` status** (Q2 resolved no; the app carries no in-app comms).

## 8. Inventory transactions abort on missing nodes and clamp to bounds

**What failed.** Return transactions could **create phantom items** (writing against a missing node) and **over-increment** `available` past `quantity` (finding NEW-7).

**The fix (v3.5.2).** Transaction handlers **abort on a missing node** (no phantom creation) and **clamp `available` to `quantity`** (no over-increment). Excel round-trips preserve item `ID` so deployed-strut references aren't orphaned (rec NEW-6); imports carry extensions and plates with the fields the validate rule needs (v3.9.0).

**The v4 rule.** Atomic inventory mutations run server-side (`allocateAndCreate` Cloud Function, rec **I-11**) with a local-transaction + `offlineTouched` fallback when offline (rec **I-19**); bounds and existence are invariants, not hopes.

## 9. The plate picker's iOS reliability was paid for once — carry it verbatim

**What failed / was hardened.** The bottom-sheet plate picker had iOS scroll/tap failures, fixed in v3.5.1 with `touch-action: pan-y` + `transform: translateZ(0)` + a `visibility` (not `display`) toggle. It also must reparent to `document.body` to escape the `.modal-overlay` z-index-100 stacking context when opened from inside a modal.

**The v4 rule (recs F-23, L-29).** The plate/wood **VisualGridPicker** carries forward **verbatim** — behavior unchanged, visual polish only. In React the `document.body` move becomes `createPortal`; the iOS hardening stays. Do not "modernize" a hard-won iOS fix without re-proving it on a device.

## 10. Generate IDs that can't collide; pin third-party scripts

**What failed.** v3 minted IDs as `Date.now() + Math.random()` — same-millisecond collisions across devices were possible (hardened with a random suffix in v3.8.3/v3.9.0). CDN scripts (Firebase, SheetJS) ran without integrity checks until SRI pins were added (rec F-5A-6).

**The v4 rule.** `crypto.randomUUID()` at every ID site (rec **L-12**). Every remote `<script>` carries an `integrity` hash, enforced by a custom lint rule that **errors** on a bare `<script>` (recs **L-10/L-30**).

---

## How to use this file

- **Before a Phase H refactor that touches load math, deductions, sync, listeners, or status:** read the matching lesson first. Each one is a bug that already cost real work; the v4 rule is the cheaper path.
- **When a v3 audit fix is about to be "simplified" in v4:** the lesson is the argument for why it exists. If the simplification still satisfies the rule, fine; if it reopens the failure mode, it is a regression with a name.
- **Append, don't prune:** a new lesson is added whenever a fix encodes a rule. The cost of relearning these is measured in field-safety, not developer time.

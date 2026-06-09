# IA Spec: Quick Find

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.3 (cold-open), §1.6, §3.4 (capacity demoted); [`03-primitives/card.md`](../03-primitives/card.md) (the `RecommendationCard` is specified there — this screen hosts it, it does not re-spec it); recs F-24, K-4, K-5; [ADR-015](../11-decisions/ADR-015-navigation-pattern.md) (guest-first cold-open), [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#198](https://github.com/Vergo402/paratech-struts/issues/198). Grounded in v3 `runQuickSelect()` (app.js:418), `renderResults()` (438), the input flow (index.html:116–212), `getActiveSystemFilter()` (410), `openPlatePicker()` (8618), `initQuickStartFab()` (8432).

---

## Purpose

The standalone strut calculator: enter an opening measurement — **the single input that drives the result** — and get the struts that fit, ranked and field-ready. Deductions refine the effective length; **load is an optional secondary check, not a selector** (the span picks the strut). It is also **the app's cold-open landing** — the first screen a guest sees, usable with no operation and no sign-in.

## Where it lives

- **Tab / parent:** **Quick Find** — the first tab and the **default cold-open destination** (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md) / [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **How it is reached:** app boot lands here in guest mode (no auth wall); also the calculator any role opens mid-incident to check a reach. The same search engine backs the Add-Shore-Point flow on [Operations](20-operations.md) (`findForShorePoint()`), which renders the same `RecommendationCard` **with** a Deploy action; Quick Find renders it **without** (calculator mode).
- **Issue:** [#198](https://github.com/Vergo402/paratech-struts/issues/198).

## Primary role(s) and surface(s)

- **Primary role(s):** any role — the team officer or Shoring Group Supervisor sizing a strut; a guest evaluating the app. No role assignment required.
- **Primary surface(s):** **phone is the floor** (gloved, one-handed measurement entry). Tablet/laptop add density; broadcast does not render Quick Find (it's an input screen, not a board).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** persistent chrome + the dismissible "Sign in to sync" banner (foundation §Persistent chrome); the **measurement input** (the one thing to fill); the **Find Struts** primary action.
- **Below fold:** the deduction panel (collapsed by default), the optional load field, the system filter chips; then the **results** — the `RecommendationCard` stack.

### Tablet / laptop
- **Above fold:** input on the left/top, results in a second pane/column as they compute (no navigation away); laptop adds keyboard entry + the command-palette jump.

### Broadcast TV
- **Not rendered** — Quick Find is an input surface; broadcast is a read-only board projection ([`card.md`](../03-primitives/card.md) / [`picker.md`](../03-primitives/picker.md)).

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **Find Struts** — compute and render the `RecommendationCard` results.
- **Secondary actions:** open/close the deduction panel; set the system filter; **Start Operation** (promotes the current context into an operation) — a standard primary [`button`](../03-primitives/button.md) raising the Start-Operation full-screen-form [`modal`](../03-primitives/modal.md), **not** the v3 hold-to-start FAB (retired — see below).
- **Destructive:** none — Quick Find computes; it never mutates inventory or an operation (deploy lives in operation mode).

## Composed primitives

- [x] [input](../03-primitives/input.md) — the **measurement field** (56pt gloved keypad + 1/8″ stacked fractions, [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)); the numeric **load** field; the **system filter as multi-select filter chips** (the v3 `.system-toggle` is multi-select per `getActiveSystemFilter()`, so chips — not a [`segmented`](../03-primitives/segmented.md)).
- [x] [sheet](../03-primitives/sheet.md) — the deduction panel's **plate / wood selectors** are the preserved **visual-grid picker sheet** ([`picker.md`](../03-primitives/picker.md) §Explicit Preservation; iOS hardening carried forward).
- [x] [card](../03-primitives/card.md) — the **`RecommendationCard`** result (deduction ledger leads, capacity demoted, extension block, Deploy omitted in calculator mode).
- [x] [warning-gate](../03-primitives/warning-gate.md) — unrated-zone / over-capacity / the standing liability disclaimer, riding the result card (never auto-dismiss; the unrated zone gates Deploy in operation mode).
- [x] [empty-state](../03-primitives/empty-state.md) — "no matching struts" (filtered variant), with the would-fit informational escalation.
- [x] [button](../03-primitives/button.md) — Find Struts; Start Operation; the deduction-panel disclosure.
- [x] [badge](../03-primitives/badge.md) — the strut color/system identity on the card; "no extensions needed".
- [x] [list](../03-primitives/list.md) — the results stack (a card list).
- [ ] picker(standalone) · modal · toggle · slider · toast · loading-state · nested-checklist (not core; Start-Op modal is owned by Operations).

## The input flow

1. **Measurement** — feet / inches / eighth-inch fraction, entered through the [`input.md`](../03-primitives/input.md) measurement field; the working value shows as a 1/8″ digit-pair fraction (ADR-012). This is the one required input.
2. **Deductions** (disclosed, collapsed by default — faithful to v3's toggle): **Header · Footer · Top Plate · Sole Plate**. Wood (Header/Footer) and plates (Top/Sole) are chosen through the **visual-grid picker sheet** ([`sheet.md`](../03-primitives/sheet.md)); the panel shows the running **Opening → Effective** math. Order and "N/S when unselected" semantics are owned by the `RecommendationCard` deduction ledger ([`card.md`](../03-primitives/card.md)).
3. **Estimated Load** (optional, secondary) — **does not drive which struts fit** (the measurement / span does); it only feeds the demoted capacity / over-capacity check. Technically inconsequential to selection — present for the capacity read, never a required step.
4. **System filter** — multi-select chips for **Gold (LongShore) · Grey (AcmeThread) · LockStroke**; selecting narrows the search to those systems ([`input.md`](../03-primitives/input.md) multi-select filter).
5. **Find Struts** → the results.

## The results

The output is a stack of [`RecommendationCard`](../03-primitives/card.md)s — **specified in `card.md`; cited, not restated here**. What this screen fixes:
- **Calculator mode:** Quick Find renders the card **without** the Deploy action or apparatus-source line (those appear only in operation mode, where the same engine backs Add-Shore-Point). The **unrated-zone acknowledgment gate** still renders (it's a safety disclosure, not a deploy control).
- **Capacity demoted, deduction ledger leads** (§3.4) — the card never headlines rated capacity; the [`warning-gate`](../03-primitives/warning-gate.md) carries the unrated/over-capacity/disclaimer.
- **Ordering** is the engine's fit ranking (faithful to v3's result order); when results exceed the comfortable list span, search/scroll applies per [`list.md`](../03-primitives/list.md).

## The retired FAB

v3's **"Hold to start" FAB** (the arc speed-dial, `initQuickStartFab()`) is **retired** — [`button.md`](../03-primitives/button.md) retires the FAB / arc speed-dial (Principle 4: one canonical action, no hidden gesture-dial). Starting an operation from Quick Find is a **labeled primary [`button`](../03-primitives/button.md)** that raises the Start-Operation full-screen-form [`modal`](../03-primitives/modal.md) (the ADR-016 Operations row). The hold-gesture's accidental-trigger risk and discoverability cost go away.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — full calculate flow works phone-only, gloved.
- [x] **Guest-first cold-open** — no auth wall; the calculator runs as a guest ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md), Principle 11).
- [x] **Capacity demoted; deduction ledger leads** the `RecommendationCard` (§3.4); **measurement drives the fit — load is an optional input, not a selector** (it only feeds the demoted capacity read).
- [x] **Measurements** — 1/8″ floored, digit-pair fractions ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- [x] **Visible safety** — unrated-zone / over-capacity / disclaimer are the persistent [`warning-gate`](../03-primitives/warning-gate.md), never a toast, never buried (Principle 7).
- [x] **NIMS terminology** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)); the strut **color** (Gold/Grey) is a real Paratech field-ID attribute, kept.
- [x] **Tap geometry** — 56pt measurement keypad + actions; 8pt dead zones.
- [x] **Modal-vs-sheet** per the ADR-016 Quick Find row: pickers = sheet; Start Operation = modal; warnings = WarningGate (no overlay).
- [x] **No mystery meat** — the FAB's hidden hold-gesture is gone; actions are labeled buttons (Principle 9).

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single column: input → results | input pane + results pane | dense, 2-column, keyboard entry | **not rendered** |
| Above fold | measurement + Find Struts | measurement; results compute beside | measurement + palette jump | — |
| Primary-action affordance | Find Struts button | Find Struts button | button + Enter | — |
| Picker | visual-grid sheet | center popover sheet | floating panel, keyboard | — |
| Does NOT render | — | — | — | the whole screen |

## Empty / error / loading states

- **Empty — no matching struts:** the filtered [`empty-state`](../03-primitives/empty-state.md) variant with specific copy ("No struts fit [length] at this load") — and, when the engine finds models that *would* fit if stocked, it **escalates to the would-fit informational `RecommendationCard`** (v3's informational fallback), never a neutral blank (Principle 7, rec K-4/F-25).
- **Error — invalid measurement:** inline [`input.md`](../03-primitives/input.md) `aria-invalid` + a specific message (e.g. negative effective length), never `alert()`.
- **Loading:** the search is local + synchronous — show nothing ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- The measurement field, filter chips, and picker sheet announce per the registry ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts); Power Select gives the picker a native `<select>` fallback under VoiceOver/TalkBack-or-Settings.
- Results are a labeled list; each `RecommendationCard` announces color/system + model + range + the deduction summary; the WarningGate announces persistently (not announce-once) for unrated/over-capacity.
- Keyboard: Tab through input → Find Struts (Enter) → results; Esc closes the picker sheet ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).

## Open questions (per-screen)

1. **Filter-chip vs. result-list precedence on phone** — whether the system filter sits above the results or in a compact header row when results are long; affordance geometry, finalized in the Phase H slice.
2. **Measurement-field fraction sub-control** — inline strip vs. small picker-sheet for the eight ⅛″ values ([`input.md`](../03-primitives/input.md) OQ1 / [`99-open-questions.md`](../99-open-questions.md) #20); Phase H.
3. **Start-Operation entry placement** — button in the Quick Find header vs. a persistent shell affordance; resolved with the Operations start-operation workflow (Phase G).

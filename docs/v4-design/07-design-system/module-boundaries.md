# Module Boundaries — the seam-by-seam constitution

> Phase H pre-slice scaffold, design-system doc. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: essay [`05-essays/12-tech-debt.md`](../05-essays/12-tech-debt.md) §1 (seam decomposition, line budget, retire/keep lists, lint floor) and [`05-essays/01-architecture.md`](../05-essays/01-architecture.md) §8 (the migration map), **translated to the accepted Phase H ADRs — not transcribed**. Where the essays use monorepo paths or predate a decision, this doc follows the ADR. Resolves open question [#25](../99-open-questions.md), closes board [#310](https://github.com/Vergo402/paratech-struts/issues/310). The whole-system map is the companion [`architecture.md`](architecture.md); this doc is the constitution — one section per seam, what may and may not cross it, and the v3 lesson it carries.

---

## Purpose

[`architecture.md`](architecture.md) draws the map: the folder tree, the build, the data-flow story, the two guardrails. This doc enforces it. It is the **constitution of the eleven seams** — for each one: what it owns, what may and may not import across its boundary, the shape that flows in and out, the v3 [LESSON](../LESSONS.md) it carries forward, the v3 smell that violates it, and the governing ADRs. A future contributor about to import Firebase into a component, or "simplify" a load-table floor, reads the relevant section first.

**One framing rule governs every seam: the boundary is a lint/CI error, not a convention.** v4.0 is a single package, so the walls are not separate `packages/` — they are ESLint `no-restricted-imports` plus a CI boundary check ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md), [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)). A seam that depends on discipline alone is a seam that rots; every contract below has a check behind it. The mapping is ICS-clean: Operations going through one liaison instead of calling vendors directly — swap the vendor, Operations never knows. `ui/*` goes through the repo hooks; swap the backend, `ui/*` never knows.

**The three structural invariants, stated once and enforced everywhere:**

1. **Only `data/sync` and `data/store` import Firebase.** Nothing in `core/*`, `ui/*`, or `src/app/` ever sees a Firebase reference.
2. **`core/*` imports neither React nor Firebase.** Pure domain in, pure domain out — runnable in a Vitest unit test, a Cloud Function, or a future RN screen unchanged.
3. **`ui/*` reaches data only through repository hooks** (the TanStack Query boundary), never Firebase, never `syncService` directly.

---

## The eleven seams

The canonical list, byte-identical to [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) / [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md) and to [`architecture.md`](architecture.md):

`core/load` · `core/shorepoint` · `core/operation` · `data/sync` · `data/store` · `ui/quickfind` · `ui/operations` · `ui/inventory` · `ui/command` · `ui/settings` · `ui/checklists` — plus `ui/picker` primitives.

No file in any seam exceeds **800 lines** without an explicit seam decision ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)). Essay 12's finer breakdown (`core/doctrine`, `core/schema`, `core/id`, `core/workflow`) appears only as **sub-structure inside** these seams — it does not expand or rename the list.

---

### `core/load`

- **Purpose.** The strut load tables and the capacity engine. Owns `ACME_LOAD_TABLE`, `LONGSHORE_LOAD_TABLE` (frozen, PDF-sourced typed arrays) and the conservative-floor engine that reads them.
- **Import contract.** Pure. Imports nothing from `data/*`, `ui/*`, React, or Firebase. May import `core/` schema/util siblings only. Imported by `core/shorepoint`, `core/operation`, and (through those or directly) by `ui/quickfind`.
- **Exports / inputs.** In: a measurement, a load, inventory, deductions, a system filter. Out: a typed combinations array and a capacity figure. No DOM, no side effects.
- **The v3 LESSON it carries.** **[L-1 — safety-critical numbers are never interpolated upward](../LESSONS.md#1-safety-critical-numbers-are-never-interpolated-upward).** v3 over-reported capacity by linear interpolation (ACME 11 ft by 17%, LongShore 13 ft by 17.9%). The tables are frozen typed arrays with a **snapshot test against a JSON fixture from the manual** (any row drift fails CI); the engine carries the **conservative-floor** doctrine with a property test (any midpoint returns the shorter, higher-capacity row). A capacity figure is a planning aid, not a certification — the disclaimer is non-dismissable.
- **Anti-patterns.** "Smoothing the gaps" between table rows back into interpolation. Reading the optimistic interpolated value instead of the floor. Pre-rounding spec heights *inside* the math (round for the eye, compute on the exact value — that is `core/shorepoint`'s L-2, but the no-round-the-math rule starts here).
- **Governing ADRs.** [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md) (typed, snapshot-tested in CI). Doctrine source: [LESSONS L-1](../LESSONS.md), [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md) (⅛″ precision).

---

### `core/shorepoint`

- **Purpose.** The shore-point status state machine, the per-point reducer, and the deduction math for a single shore point.
- **Import contract.** Pure. No React, no Firebase, no `data/*`, no `ui/*`. May import `core/load` (for re-validation) and `core/` schema. Imported by `core/operation` and consumed (as data) by `ui/operations`.
- **Exports / inputs.** In: a current shore-point state + an event. Out: the next state, or a rejected transition. The seven statuses are a **discriminated union**; the legal transitions are a table.
- **The v3 LESSON it carries — two of them.** **[L-2 — deduct once, round only the display](../LESSONS.md#2-deduct-once-and-round-only-the-display--never-the-math):** the strut search always receives the **raw** required length; deductions apply once; effective length floors to ⅛″ ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)). v3 double-deducted by passing `effectiveLength` where `requiredLength` was needed (finding S1). **[L-7 — status is monotonic-by-guard; a group transition must not regress a group-mate](../LESSONS.md#7-status-is-monotonic-by-guard-and-a-group-transition-must-not-regress-a-group-mate):** `STATUS_ORDER` survives verbatim as a **reducer invariant** in `core/shorepoint/status.ts` — under [ADR-010](../11-decisions/ADR-010-status-commit-model.md) status is bidirectional/always-reversible, so the invariant is "no *accidental* regression," enforcing deliberate-only transitions. There is **no `safety-hold` status** (the app carries no in-app comms).
- **Anti-patterns.** Imperative `if (status === 'cutting' && ...)` chains instead of the reducer (the 300-line v3 pattern). Feeding the search a pre-deducted length. A group fan-out that steps a more-advanced mate backward.
- **Governing ADRs.** [ADR-010](../11-decisions/ADR-010-status-commit-model.md) (slide-to-advance + always-reversible), [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md) (⅛″ floor), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (`strutplaced` → `strutset`).

---

### `core/operation`

- **Purpose.** The operation model: shore points, apparatus assignments, position assignments, hazards, divisions. The operation-level reducer that fans out to `core/shorepoint` per member.
- **Import contract.** Pure. No React, no Firebase. Imports `core/shorepoint` (per-SP transitions) and `core/` schema. Consumed as data by `ui/operations` and `ui/command`.
- **Exports / inputs.** In: an operation state + an event. Out: the next operation state. The group fan-out lives here — it calls the per-shore-point reducer per member and applies the L-7 guard.
- **The v3 LESSON it carries.** **[L-7 — the group fan-out](../LESSONS.md#7-status-is-monotonic-by-guard-and-a-group-transition-must-not-regress-a-group-mate)** (the operation-reducer half): a grouped pre-cutting transition applies group-wide but **skips members already past the target** ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)'s positions, the v3.8.0/v3.9.0 phase split). The `ICS_ROLES_DEFAULT` → `ICS_POSITIONS_DEFAULT` rename and `customRoles` → `positions` (keyed object) land in this seam's schema; the SP `group` field → `assignedResource`.
- **Anti-patterns.** Reaching into a shore point's internals instead of dispatching through `core/shorepoint`. Treating `group` as a NIMS Group (it stores an apparatus assignment — hence the `assignedResource` rename). Mutating the operation in place rather than returning a next state.
- **Governing ADRs.** [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (NIMS structure, the renames), [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (`positions` keyed object).

---

### `data/sync`

- **Purpose.** The **one** backend path. Owns the Firebase service, the outgoing event queue, the flush, reconciliation, and the `/diagnostics/sync/` ledger. The repository seam [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) defines.
- **Import contract.** **The only seam (with `data/store`) that imports Firebase.** Imports `core/` (schema, reducers, event types) and `data/store`. **No UI component imports `syncService` directly** — `ui/*` reaches it only through the repository hooks. Lint-enforced (`no-restricted-imports`).
- **Exports / inputs.** In: `syncService.enqueue(event)` from the stores. Out: queued writes to RTDB (`events/{opId}/`), merged incoming peer events, and per-row sync state to the repo hooks. Reconciliation rides the **event-sourced append log**: each device appends locally; on reconnect the queue flushes and incoming events merge.
- **The v3 LESSON it carries — three of them.** **[L-4 — local-first, never an `if (db){…}else{…}` fork](../LESSONS.md#4-every-write-is-local-first-then-conditionally-synced--never-an-if-db--else--fork):** the sync service is the *only* Firebase path (`syncService.enqueue`, was `firebaseSave`); the v3.5.3 contract crosses verbatim. **[L-8 — transaction sanity](../LESSONS.md#8-inventory-transactions-abort-on-missing-nodes-and-clamp-to-bounds):** atomic mutations abort on a missing node (no phantom items) and clamp `available` to `quantity` (no over-increment); server-side `allocateAndCreate` with a local-transaction + `offlineTouched` fallback when offline. **[L-6 — listener teardown](../LESSONS.md#6-detach-listeners-before-reattaching-never-trust-an-empty-first-snapshot):** subscriptions are `useEffect` cleanups with `react-hooks/exhaustive-deps` as a lint **error** — the cleanup *is* the teardown; the empty-first-snapshot guard is doctrine (an empty remote read is **not** a delete instruction; push local up instead). Build A reconciliation: queue flush + merge by the log ([ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)); Build C is a v5 transport variant beneath this same seam.
- **Anti-patterns.** A UI component importing `syncService`. A second write path that forks on connectivity. A return transaction that writes against a missing node or over-increments. A first empty snapshot that wipes local. A `.on()` listener with no teardown. Per-row sync state collapsed to a single global dot on Accountability (staleness is life-safety).
- **Governing ADRs.** [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (RTDB behind the seam, event log), [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md) (Build A, per-row sync, IndexedDB), [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) (the `data/` boundary).

---

### `data/store`

- **Purpose.** The local-first persistence layer. Owns **IndexedDB (Dexie)**, the per-device append log, the boot read, and the commit-on-mutation. `operationStore.commit` / `inventoryStore.commit`.
- **Import contract.** Imports Firebase only via `data/sync` (it does not write to Firebase itself — it commits locally, then the sync path enqueues). Imports `core/` schema + reducers. **The only seam (with `data/sync`) permitted IndexedDB/storage access.** No `ui/*` or `core/*` reads storage directly.
- **Exports / inputs.** In: `store.commit(event)` from the repo layer. Out: durable local state + an appended event; reads on boot. **Every commit writes durable local storage *synchronously before the UI updates*** so a dropped phone loses nothing.
- **The v3 LESSON it carries.** **[L-4 — the store half of local-first](../LESSONS.md#4-every-write-is-local-first-then-conditionally-synced--never-an-if-db--else--fork):** stores commit locally first; the sync seam is downstream; the store is the only legal mutation entry. The 24 operation + 10 inventory `safeSetItem` copy-pastes collapse into the store's commit (v3.5.3). Storage moves `localStorage` → **IndexedDB** — the 5 MB cap is a real constraint at task-force scale ([ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)).
- **Anti-patterns.** A module reaching into `localStorage`/IndexedDB by string key (the v3 scatter — one parse site now, one fallback path). Updating the UI before the local write lands. Bypassing the store to mutate state.
- **Governing ADRs.** [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md) (IndexedDB/Dexie), [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) (event log, current state as projection), [ADR-005](../11-decisions/ADR-005-single-package-pwa.md).

---

### `ui/quickfind`

- **Purpose.** The Quick Find route — measurement + load in, matching struts out.
- **Import contract.** React + tokens + Radix-backed primitives. Reaches the load engine through `core/load` (pure call) and any persisted state through repo hooks. **No Firebase, no `syncService`.**
- **Exports / inputs.** In: route props + user input. Out: rendered combinations. The capacity figures come from `core/load`; this seam only renders them.
- **The v3 LESSON it carries.** **[L-1, render side](../LESSONS.md#1-safety-critical-numbers-are-never-interpolated-upward):** the non-dismissable capacity disclaimer rides every result; the empty-state ("No matching struts found" with guidance, v3.7.3) is a real component, not a blank screen.
- **Anti-patterns.** Re-implementing any load math in the component (it lives in `core/load`). Showing a capacity figure without the disclaimer.
- **Governing ADRs.** [ADR-023](../11-decisions/ADR-023-component-state-stack.md) (the stack), [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md) (the boundary).

---

### `ui/operations`

- **Purpose.** The Operations route — create operations, add shore points, deploy struts, run the cutting workflow.
- **Import contract.** React + primitives. Dispatches operation/shore-point events through repo hooks → stores → `core/operation` reducer. **No Firebase, no `syncService`.** Drilldown is URL state (TanStack Router segments), not a module-level array.
- **Exports / inputs.** In: the operation projection from repo hooks. Out: rendered shore-point cards, the slide-to-advance status control, the deploy/return flows.
- **The v3 LESSON it carries.** Renders the **L-7** status lifecycle (slide-to-advance, always-reversible — [ADR-010](../11-decisions/ADR-010-status-commit-model.md)); the grouped-shore phase split is presented here but the *guard* lives in `core/operation`. Peer-written fields (`sp.deployedStrut.model`) are rendered through JSX default-escaping — see L-3 below.
- **Anti-patterns.** A module-level `editingShorePointId` pointer (edit state lives in the modal's local state, discarded on close). String-concatenated card HTML with `onclick=` (JSX props + closures). A drilldown array in module scope (it is in the URL).
- **Governing ADRs.** [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-023](../11-decisions/ADR-023-component-state-stack.md).

---

### `ui/inventory`

- **Purpose.** The Inventory route — apparatus + strut inventory, Excel/CSV import-export.
- **Import contract.** React + primitives. Reaches inventory state through repo hooks; deploy/return decrements go through the store, not Firebase. **No Firebase, no `syncService`.**
- **Exports / inputs.** In: the inventory projection. Out: rendered inventory, the validated 4-step import, CSV/Excel export with **ID round-trip preservation** (so deployed-strut references aren't orphaned).
- **The v3 LESSON it carries.** **[L-8, render side](../LESSONS.md#8-inventory-transactions-abort-on-missing-nodes-and-clamp-to-bounds):** the bounds/existence invariants are enforced in `data/sync`; this seam must not let an import bypass them (extensions and plates carry the fields the schema needs; the 10-column schema + plate round-trip per [#307](https://github.com/Vergo402/paratech-struts/issues/307)).
- **Anti-patterns.** An import path that writes inventory directly instead of through the store/sync invariants. Dropping item IDs on round-trip (orphans deployed struts). Base64 plate thumbnails inline (they are `public/plates/*.jpg` now).
- **Governing ADRs.** [ADR-023](../11-decisions/ADR-023-component-state-stack.md) ([#36](../99-open-questions.md) column-mapper library is a slice call), [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md).

---

### `ui/command`

- **Purpose.** The Command route — the ICS/NIMS org chart, divisions, hazards, the CP deep view (Toughbook surface).
- **Import contract.** React + primitives. Reads the operation/position projection through repo hooks; assignment writes go through the store. **No Firebase, no `syncService`.** Drag-and-drop via `dnd-kit` (pointer/touch/keyboard in one API).
- **Exports / inputs.** In: the operation + positions projection. Out: the rendered org chart, the assignment flows, the audit-log view (a filtered projection of the event log, not a second path).
- **The v3 LESSON it carries.** The audit log **is** the event log filtered — it cannot drift from reality (the [L-8](../LESSONS.md#8-inventory-transactions-abort-on-missing-nodes-and-clamp-to-bounds)/[L-5](../LESSONS.md#5-a-validation-rule-that-silently-rejects-every-write-is-worse-than-a-crash) discipline of one source of truth). Position renames per [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (titles spelled out, no acronyms; longer names need spacing accommodation).
- **Anti-patterns.** A second audit-log persistence path. Hand-rolled three-mode drag handling (the v3 idiom — `dnd-kit` owns `touchcancel` cleanup). Full-subtree `set()` on assignment writes (granular `update()` only, per the v3.6.0 R3 fix).
- **Governing ADRs.** [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (RBAC two axes), [ADR-023](../11-decisions/ADR-023-component-state-stack.md).

---

### `ui/settings`

- **Purpose.** The Settings route — department connection, data management, appearance/theme, feedback, the Administration gating matrix.
- **Import contract.** React + primitives. Department/auth state through repo hooks; theme persisted via the store. **No Firebase, no `syncService`.**
- **Exports / inputs.** In: settings + auth projection. Out: rendered settings; the per-context (guest / member / Admin) gating; the after-action toggle (Admin-only Department-policies group). **No Build-choice control** — there is exactly one sync model in v4.0 ([ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md)).
- **The v3 LESSON it carries.** **[L-5, surface side](../LESSONS.md#5-a-validation-rule-that-silently-rejects-every-write-is-worse-than-a-crash):** rule/transaction failures surface to an **Admin toast** here (the diagnostics ledger gets an Admin-only read surface) — the v3.8.2 silent-failure is never silent again. Theme switching carries v3's flash-prevention init.
- **Anti-patterns.** A visible-but-disabled "Mode C / coming with mobile app" toggle — dropped by [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md) (in-product roadmap marketing, Principle 11). `confirm()`/`alert()` for destructive actions (Sheet/Toast instead). Off-role admin controls greyed instead of hidden (hide-not-grey; two orthogonal axes).
- **Governing ADRs.** [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md), [ADR-017](../11-decisions/ADR-017-custom-department-roles.md), [ADR-018](../11-decisions/ADR-018-after-action-auto-email.md) (after-action toggle).

---

### `ui/checklists`

- **Purpose.** The checklists route/surface — IC Command, Task-Level, ORM checklist content rendered through the nested-checklist + side-drawer primitives.
- **Import contract.** React + primitives. Checklist content + completion state through repo hooks; completion writes through the store. **No Firebase, no `syncService`.**
- **Exports / inputs.** In: checklist content + completion projection. Out: the rendered nested checklist; the edge-anchored **side-drawer** companion (the checklist side-tab — the 15th primitive, [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)).
- **The v3 LESSON it carries.** New D6 surface, so it inherits the cross-cutting disciplines rather than a single named lesson: local-first completion writes (**L-4**), JSX-escaped content (**L-3**), `useEffect`-clean subscriptions (**L-6**). The side-drawer uses the scrim only on phone; on tablet/laptop it is a companion beside a live canvas.
- **Anti-patterns.** A bottom-sheet substituted for the side-drawer (the sheet is an interrupt by doctrine; the drawer is a companion — [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)). Checklist content as an HTML string with inline handlers.
- **Governing ADRs.** [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md), [ADR-023](../11-decisions/ADR-023-component-state-stack.md).

---

### `ui/picker` (primitives)

- **Purpose.** The picker primitives — the four variants (`InlineSegmentedPicker`, `BottomSheetPicker`, `FullScreenListPicker`, `PowerSelectFallback`) plus the preserved `VisualGridPicker` (plate/wood connector picker).
- **Import contract.** React + Radix behavior + tokens. Pure presentation — takes typed props and an `onSelect`/`onApply` callback; **never** touches `core/`, `data/`, Firebase, or `syncService`. Consumed by every `ui/*` route.
- **Exports / inputs.** In: an options array + current value + a select/apply callback. Out: the rendered picker + the selection event. The 8-option boundary is encoded by *which component the caller picks*, not a runtime check.
- **The v3 LESSON it carries.** **[L-9 — the plate-picker iOS hardening, paid for once, carried verbatim](../LESSONS.md#9-the-plate-pickers-ios-reliability-was-paid-for-once--carry-it-verbatim):** `touch-action: pan-y` + `transform: translateZ(0)` + the `visibility` (not `display`) toggle stay; the `document.body` reparent becomes **`createPortal`** (the portal owns lifecycle — closes the v3 `_originalParent` stale-parent bug). Behavior unchanged, visual polish only — do not "modernize" the iOS fix without re-proving it on a device.
- **Anti-patterns.** A picker reaching into data directly (it is pure presentation). Re-deriving Radix's focus/dismiss behavior by hand (the accessibility-finding class). A fifth ad-hoc picker pattern for one screen (the whole reason the picker doctrine exists — the same action must not look different in five places).
- **Governing ADRs.** [ADR-023](../11-decisions/ADR-023-component-state-stack.md) (Radix behavior), [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md) (companion primitives). Doctrine: [`03-primitives/picker.md`](../03-primitives/picker.md).

---

### A note on L-3 — XSS is not a seam

**[L-3 — `escapeHtml` escapes `< > &`, not `"` or `'`](../LESSONS.md#3-escapehtml-escapes-----not--or-)** has no section above **on purpose.** In v3 it was a 160-site interpolation surface guarded by a two-function escape contract (`escapeHtml`/`escapeAttr`). v4 **deletes both functions and the surface.** XSS defense is therefore not a seam — it is two structural facts that span every `ui/*` seam: **JSX default-escapes** element text and attribute values, and **`react/no-danger` is a lint error** (no `dangerouslySetInnerHTML` path exists). The lesson kept: untrusted strings include **peer-written Firebase data** (`sp.deployedStrut.model`, etc.), not just form input — and JSX escapes those by default too. The escaping discipline is gone because the surface that needed it is gone.

---

## Retires from v3 (do not let these cross)

These v3 patterns are the root cause of the audit-finding classes. None survive the rebuild.

| v3 pattern | Why it retires | Replaced by | Enforced by |
|---|---|---|---|
| **`app.js` as a 8,800-line file** | A single mutable namespace can't be reasoned about — race conditions, listener leaks, stale state all reduce to this | The eleven seams; no file > 800 lines | 800-line ceiling + CI boundary check ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)) |
| **Inline HTML-string concat + `onclick=`** (~160 sites) | Two escape budgets per interpolation → X1/X2/X3 XSS | JSX components with typed props + closure handlers | `react/no-danger` error; JSX default escape (L-3) |
| **`if (db){firebase}else{localStorage}` fork** (44 sites) | Offline + online took different paths; bugs hid in the untested branch | One local-first write path: store commits → `syncService.enqueue` | "no UI imports `syncService`" lint; L-4 |
| **`confirm()` / `alert()`** (10 + 19) | Native blocking dialogs violate the doubt-free-escape principle | Sheet / Toast primitives | `no-alert` error |
| **Firebase compat SDK v9.23.0** | ~200 KB heavier than modular; predates v9 modular API | Modular v9 SDK, tree-shaken (inside `data/` only) | bundle budget; boundary check |
| **Dead code** (`capacityAll`, `debounce`, `currentValue` legacy) | Computed/defined, never consumed | Deleted | TS unused + review |
| **Base64 plate thumbnails in `app.js`** | Parse-as-code on every load, real bundle weight | `public/plates/*.jpg`, SW-precached | static assets ([ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md)) |

---

## Crosses verbatim (twenty patches paid for these)

These v3 patterns paid in production. They cross unchanged — the values, the tables, the algorithms, in some cases the literal data. A future contributor may not retire one in the name of cleanup; the LESSON is the argument for why it exists.

| v3 pattern | Crosses as | Lands in seam | LESSON |
|---|---|---|---|
| **Load tables + conservative floor** | Frozen typed arrays + snapshot test + property test | `core/load` | [L-1](../LESSONS.md#1-safety-critical-numbers-are-never-interpolated-upward) |
| **`STATUS_ORDER` progression guard** | Discriminated-union reducer invariant (no accidental regression) | `core/shorepoint` + `core/operation` | [L-7](../LESSONS.md#7-status-is-monotonic-by-guard-and-a-group-transition-must-not-regress-a-group-mate) |
| **Local-first write path** | `store.commit` → `syncService.enqueue`, the only path | `data/store` + `data/sync` | [L-4](../LESSONS.md#4-every-write-is-local-first-then-conditionally-synced--never-an-if-db--else--fork) |
| **`pendingWrites` flush + diagnostics ledger** | `appVersion` tag, retry, 24h stale drop, `/diagnostics/sync/` | `data/sync` | [L-5](../LESSONS.md#5-a-validation-rule-that-silently-rejects-every-write-is-worse-than-a-crash)/[L-8](../LESSONS.md#8-inventory-transactions-abort-on-missing-nodes-and-clamp-to-bounds) |
| **Plate-picker iOS hardening** | Verbatim CSS fix; `document.body` move → `createPortal` | `ui/picker` | [L-9](../LESSONS.md#9-the-plate-pickers-ios-reliability-was-paid-for-once--carry-it-verbatim) |
| **First-fire empty-snapshot guard** | An empty remote read is not a delete; push local up | `data/sync` | [L-6](../LESSONS.md#6-detach-listeners-before-reattaching-never-trust-an-empty-first-snapshot) |
| **SRI on remote scripts + `crypto.randomUUID()` IDs** | `integrity` on every `<script>`; UUID at every ID site | lint/config | [L-10](../LESSONS.md#10-generate-ids-that-cant-collide-pin-third-party-scripts) |
| **Single-schema validate rules** | One Zod schema → TS + form + generated rules; CI asserts match | `core/` schema → `data/sync` | [L-5](../LESSONS.md#5-a-validation-rule-that-silently-rejects-every-write-is-worse-than-a-crash) |
| **Audit-trail comments** | Every non-obvious branch names its finding ID / doctrine source | all seams | convention |

---

## Cite, don't restate

The seam *contracts* are this doc's value-add; the decisions behind them are cited, not re-derived:

- The single package / seam list / `data/` boundary / 800-line ceiling → [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) / [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md).
- The stack the `ui/*` seams are built on → [ADR-023](../11-decisions/ADR-023-component-state-stack.md).
- The event log + RTDB + `data/sync` repository seam → [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md). Build A + per-row sync → [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md).
- The NIMS renames the `core/operation` schema carries → [ADR-008](../11-decisions/ADR-008-nims-org-structure.md).
- Every v3 lesson, in full → [`LESSONS.md`](../LESSONS.md). The whole-system map → [`architecture.md`](architecture.md). The lint floor catalog → essay [12 §30](../05-essays/12-tech-debt.md).

---

## Anti-patterns (cross-cutting — beyond the per-seam lists)

- **Firebase imported into `core/*` or `ui/*`.** The single invariant the boundary check exists to fail. Only `data/sync` and `data/store` see Firebase.
- **React imported into `core/*`.** `core/*` must run in a Vitest test, a Cloud Function, and a future RN screen unchanged.
- **A `ui/*` component importing `syncService` or `store` internals.** UI reaches data only through repo hooks.
- **A monorepo path** (`packages/`, `apps/`) anywhere. Single package only ([ADR-005](../11-decisions/ADR-005-single-package-pwa.md)); v5.0 is the fork.
- **Hand-editing `database.rules.json`.** Generated from the Zod schema; a hand edit re-opens the v3.8.2 drift class (L-5).
- **Retiring a "Crosses verbatim" pattern as cleanup.** The LESSON is the standing objection; reopening the failure mode is a regression with a name.

---

## Open questions for the gate

None blocking. The eleven-seam vocabulary, the `data/` boundary, and the 800-line ceiling are locked by [ADR-005](../11-decisions/ADR-005-single-package-pwa.md) / [ADR-007](../11-decisions/ADR-007-build-system-typescript-strict.md); the stack by [ADR-023](../11-decisions/ADR-023-component-state-stack.md); the sync/data model by [ADR-009](../11-decisions/ADR-009-database-firebase-rtdb.md) / [ADR-024](../11-decisions/ADR-024-d5-multi-device-build-a.md); the NIMS renames by [ADR-008](../11-decisions/ADR-008-nims-org-structure.md). All ten [LESSONS](../LESSONS.md) are pinned to a seam (or, for L-3, to the JSX-escape + `react/no-danger` lint rule). If the vertical slice surfaces a genuine need to split or rename a seam, that opens an ADR — it is not resolved inline.

# Open Questions

> Rolling list. Each question is a row. When a question is decided, the row moves to the "Resolved" section at the bottom with a link to the ADR or commit that decided it. **Cleared at the end of each phase,** meaning every open question must be addressed (resolved, deferred, or rejected) before the phase gate is passed.

> **2026-06-07 — Phase E audit reconciliation.** The primitive cascade's per-doc "Open questions" had **not** been mirrored into this register, so the pending cascade-gate checklist was blind to them. Now reconciled: **#21–#23 resolved** (the `WarningGate` primitive, `--on-accent`, `--shadow-modal`), **#19–#20 carried to Phase H**. The remaining per-primitive items are *affordance geometry* (slide/sheet thresholds, pixel sizing) tracked in each `03-primitives/*.md` and rolling up to the vertical slice (Phase H) — they are an accepted deferral class, not open blockers.

> **2026-06-07 — A–E traceability audit.** A pass over the Phase-D decision matrix found a few accepted recs that had no execution trace and were tracked only in the matrix (which the gate doesn't read) — the same blind-spot class. Now surfaced into this live register: **#24–#26 carried forward** (two doc deliverables re-scoped Phase E → H, plus org-chart/dashboard/pocket-lock clarified as Phase F), **#27–#30 resolved** (LESSONS.md written, picker K-6 + E-20 fixed, the Lucide reversal recorded). Detail in `06-decision-tracking-matrix.md` (reconciled same day).

---

## Active Questions

| # | Question | Phase that decides | Notes |
|---|---|---|---|
| 4 | Checklist IA placement (D6). Recommendation: IC Command under Command tab; Task Level under Operations tab; ORM/TCRM as a button bar at the top of any active operation screen. | F | v3.20.0 ships with the recommendation unless Alex redirects. |
| 4b | D7.1 auth mechanism. | H | Recommendation: email + password as default, magic link as no password path. |
| 5 | AskUserQuestion as a collaboration tool. | Practice | Open question on whether the multi choice picker is the right tool for me to ask Alex questions during planning. Options: keep AskUserQuestion for genuinely exclusive choices; favor text questions for open ended thinking; never use it. |
| 6 | Notification mechanism for gates. | A | Currently specified as chat message + INDEX update + Project subtask + 24h ScheduleWakeup. Alex may want PushNotification, email, or just chat. |
| 7 | D5 multi device no comms: order of implementation between A (accept + reconcile) and C (CP hub). | D | Both will ship; question is which is the default and which is the upgrade path. |
| 8 | PWA vs React Native at v4. | H | Memory's roadmap says Phase 0 is PWA, then RN at Phase 1. Architecture essay revisits. |
| 11 | Build tooling: Vite, esbuild, or stay no build? | H | |
| 12 | TypeScript adoption? | H | |
| 13 | Component library strategy: fully custom, Radix headless, Shadcn, Tailwind? | H | |
| 14 | Beta deploy host: GitHub Pages subpath, Vercel, Netlify? | I | |
| 15 | Field test partners: Hartsdale only, or expand? | I | |
| 16 | Tracking session granularity: one long session per phase, or many short ones? | Practice during A | Recommendation: many short ones, each with one deliverable. |
| 19 | **`--motion-loop`** — the continuous-loop timing for a spinner / shimmer that [`loading-state.md`](03-primitives/loading-state.md) flagged ("mints no tokens … flagged for the slice"). **Not minted now:** [`motion.md`](07-design-system/motion.md) caps the system at six durations ("a seventh … extendable only by ADR"), and a perpetual-loop period is not a transition. | H | Decide: a behavior value (like the toast's ~3 s dwell, [`toast.md`](03-primitives/toast.md) OQ2) vs. an ADR-gated 7th token. Surfaced by the Phase E audit (2026-06-07). |
| 20 | **Measurement-field fraction sub-control form** — inline strip vs. a small picker-sheet for the eight ⅛″ values, which exceed [`picker.md`](03-primitives/picker.md)'s 7-option inline boundary ([`input.md`](03-primitives/input.md) OQ1). | H | Affordance geometry, finalized in the vertical slice. Surfaced by the Phase E audit (2026-06-07). |
| 24 | **`07-design-system/architecture.md`** (rec A-30) — document the *code* architecture at picker depth. **Re-scoped Phase E → H** (A–E audit): documents modules/build that don't exist until the build. | H | Write before Phase H code starts (essay 01 §30). |
| 25 | **`07-design-system/module-boundaries.md`** (rec L-1) — codify app.js's 11 module seams, no file > 800 lines. **Re-scoped Phase E → H.** | H | Write before the Phase H migration (essay 12 §1). |
| 26 | **Org chart / dashboard / pocket-lock** (recs K-3/K-12/K-13, K-9, G-13) — labeled "Phase E primitive" but they are screen-level compositions, not reusable primitives. | F | Carry into Phase F IA (org-card surface already in `card.md`); honor K-12's tablet-portrait constraint. Surfaced by the A–E audit (2026-06-07). |

---

## Resolved Questions

| # | Question | Resolution | Resolved by |
|---|---|---|---|
| 1 | Tracking infrastructure (D1). Confirm `v4-redesign` branch + `/docs/v4-design/` markdown structure. | **Confirmed.** Alex approved the branch + markdown structure. | Phase A gate approval (2026-05-20) |
| 2 | v4.0 backend split (Section V). Confirm Bucket 1 → v3.x, Bucket 2 → v4. | **Confirmed.** Bucket 1 ships to v3.x (per device UID, listener teardowns, customRoles migration, Surfside bugs, checklist v1, demo mode). Bucket 2 (renames only) defers to v4. | Phase A gate approval (2026-05-20) |
| 3 | Checklist content licensing (D6). | **Paraphrase.** Alex reviews drafts before commit. Original source credited in app. | Plan draft 3 annotation |
| 4a | D7 scope. | **Option (b).** v4.0 ships auth/identity/roles/dept ownership/audit. v4.5 ships local mutual aid (2 to 5 neighboring depts). State/IST/federal not on roadmap. | Plan draft 4 annotation |
| 17 | The mapping file (codename to real reference app), where does it live? | **Superseded by ADR-001 (2026-05-21).** Codename rule relaxed before Phase C; real names now used in teardowns under nominative fair use (the legal doctrine that lets you name a competitor's product when comparing truthfully). Mapping file no longer needed. | Phase A gate approval (2026-05-20), then superseded |
| 9 | Custom typeface or open source? | **Geist** (OFL variable, tabular numerals; Geist Mono for measurements). Inter = Phase-H fallback only; Söhne parked for Phase I. | Synthesis conflict 2.6 (2026-05-31); documented in [`07-design-system/typography.md`](07-design-system/typography.md) |
| 10 | Logo evolution: refresh "P" mark, or commission a new identity? | **New identity** — not a refresh. Overrides the synthesis "geometry-refresh, no rebrand" recommendation. Explored in `07-design-system/logo-and-mark.md` (Phase E session ~E13). New mark must live within the locked gold-on-slate color system (no competing brand color). | Alex, Phase E scope-in (2026-05-31) |
| 18 | Demo mode / demo department. | **Dropped entirely** — no sandbox, no scripted seed, no marketing-tour embed; the cold-open is a plain first-run guest state. | Synthesis §3.3 / Q4 (Alex, 2026-05-31) |
| 21 | **The `WarningGate` primitive** — distinct file, modal variant, or deferred? ([`toast.md`](03-primitives/toast.md) OQ4: "not one of the fifteen named files … needs its own file added to the cascade.") | **Written as [`warning-gate.md`](03-primitives/warning-gate.md)** — the cascade's 14th file (matrix K-11: one primitive, three uses — unrated zone, over-capacity, liability disclaimer; distinct from Modal and Toast). Destructive/terminal confirmations route to [`modal.md`](03-primitives/modal.md), not the gate. | Phase E audit (2026-06-07) |
| 22 | **`--on-accent`** — the per-theme filled-primary foreground [`button.md`](03-primitives/button.md) flagged for minting. | **Minted in [`color.md`](07-design-system/color.md)** §The filled-primary foreground (Light `#FFFFFF` 5.18 · Dark `#1C1F23` 6.96 · Sunlight `#FFFFFF` 7.47), `wcag-contrast.mjs`-verified; [ADR-011](11-decisions/ADR-011-color-token-system.md) §Addendum. | Phase E audit (2026-06-07) |
| 23 | **`--shadow-modal`** — the centered-modal cast shadow [`modal.md`](03-primitives/modal.md) flagged. | **Minted in [`color.md`](07-design-system/color.md)** §Strokes & elevation (centered downward cast, distinct from `--shadow-sheet`); [ADR-011](11-decisions/ADR-011-color-token-system.md) §Addendum. | Phase E audit (2026-06-07) |
| 27 | **`LESSONS.md`** (recs L-3 / L-23) — institutional memory of v3 audit-driven fixes. | **Done 2026-06-07** — [`LESSONS.md`](LESSONS.md) written (10 load-bearing lessons; extensible). | A–E audit (2026-06-07) |
| 28 | **Picker "apply to grouped siblings"** (rec K-6) — ask the T-Shore wood choice once for a group of 3. | **Done 2026-06-07** — added to [`picker.md`](03-primitives/picker.md) as Universal Rule 8. | A–E audit (2026-06-07) |
| 29 | **picker.md "Type" → "Level"** (rec E-20) — incident-complexity terminology. | **Done 2026-06-07** — `picker.md` now reads "incident level (NIMS Level I–V)." | A–E audit (2026-06-07) |
| 30 | **Lucide reversal** (recs J-9 / B-13 vs. `iconography.md`) — accepted "adopt Lucide" contradicted the shipped fully-custom set. | **Resolved 2026-06-07** — matrix marks J-9 / B-13 "accepted (revised)"; `iconography.md` records the supersession. Phase E is fully custom. | A–E audit (2026-06-07) |

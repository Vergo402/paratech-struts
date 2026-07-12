# Phase D Synthesis

> Synthesis of the 12 Phase C brainstorm essays against the 12 principles, the positioning doc, and ADRs 001–004. North star for Phases E–H. The companion file `06-decision-tracking-matrix.md` carries the per-recommendation disposition for all 247 recs.

---

## 1. Convergent Themes

Where six or more essays agreed, the design has to act. Each item below pins what Phases E, F, G, and H must do because every lens — architect, skeptic, domain expert, field user, NIMS — pointed at it.

### 1.1 Role history is an append-only log, not a slot

**Essays:** 01 (architecture), 03 (IC workflow), 04 (future scale), 05 (NIMS doctrine), 09 (data resilience), 11 (scenario stress), 12 (tech debt).

The IC pointer in v3 is a single field that gets overwritten on every transfer. Five IC transitions and six Operations Section Chief rotations across Surfside TTX-2 produced zero audit trail. Architecture sources it from the event log; IC workflow needs it for the ICS-201 brief at handoff; NIMS needs it for ICS-209 reconstruction; future-scale flags the v5 migration cost; scenario-stress drives Meadowville's two transfers through it; tech-debt names the v3 overwrite as a structural failure.

**Implication for E/F/G:** Every role assignment writes a new record under `/operations/{opId}/roleHistory/{pushId}` with `roleId`, `targetId`, `assignedAt`, `departedAt`, `byUid`, `agencyId`. Current org chart state is the projection where `departedAt` is null. The ICS-201 brief, the command-transfer handoff card, and the tap-the-chart-node history view are all reads against this log. No parallel persistence path.

### 1.2 The `app.js` monolith retires; modular seams along workflow lines

**Essays:** 01 (architecture), 08 (skeptical — partial dissent), 10 (implementation), 12 (tech debt).

8,890 lines in one file is the root cause of half the audit findings. The skeptic argues against premature monorepo + RN; everyone else converges on TypeScript strict, a build system, a real component library, and module seams that line up with the workflow surfaces (Quick Find, Operations, Inventory, Command, Settings) plus a pure load/domain core plus a single persistence service. Implementation and tech debt agree on the same boring stack (Vite + React + TS + Tailwind + TanStack Router/Query + Radix headless + Zod). Architecture wants pnpm + Turborepo + monorepo; implementation says one repo with two source folders.

**Implication for E/F/G:** One package, two entry points (`src/app/`, `src/site/`) under one Vite config. Defer the monorepo and React Native fork to v5. TypeScript strict from line one. Eleven modules with an 800-line file ceiling. No file in the codebase grows past 800 lines without an explicit seam decision.

### 1.3 Per-device UID auth, role-gated rules, guest mode at first run

**Essays:** 01, 04, 08, 09, 10, 11, 12.

Shared anonymous auth is the v3 ceiling. Owner/Admin/Member/Observer roles, per-device Firebase UIDs persisted in IndexedDB, security rules that gate on role membership, and a one-time migration from the v3 shared UID land in v4. The skeptic and the scenario-stress essay both insist that none of this can sit between Captain Torres and her first shore point: guest mode is the default first-run, and auth is a deferred prompt at the end-of-operation or first-sync moment. (No demo department — demo mode is dropped per Alex; the cold-open is a plain first-run guest state.)

**Implication for E/F/G:** No auth gate at app open. Guest mode persists locally; the "Sign in to sync" banner is dismissible. Settings owns dept registration. The first user to migrate from a v3 install claims Owner explicitly via a one-time banner. The full admin user manager (D7.3) is deferred per the skeptic; the rules + per-device UID + role storage are v4.0 work.

### 1.4 NIMS terminology overhaul — labels and structure both

**Essays:** 01, 03, 04, 05, 06, 11, 12.

The v3 org chart reads as if the developers had not read the manual. `Operations` is the section, not the position; `Cutting Table` is a workstation, not an ICS role; `Entry`, `Rescue`, `Initial Shoring`, `Wood Shoring`, `Runner` are not NIMS positions; `Task Force` is a resource configuration, not an apparatus type. The `group` field on shore points conflates a NIMS Group with an apparatus assignment. Every essay that touched doctrine flagged at least one of these.

**Implication for E/F/G:** **Settled now —** rename `Operations` → "Operations Section Chief" (titles spelled out as spoken, **no acronyms** in the UI); `Cutting Table` → "Cutting Station," kept under Operations; finish the `group` → `assignedResource` cutover; remove `Task Force` from `APPARATUS_TYPES_DEFAULT`; rename `ICS_ROLES_DEFAULT` → `ICS_POSITIONS_DEFAULT` and `customRoles` → `positions`; rename status `strutplaced` → `strutset` (display "Strut Set"); allow longer position names (character-count + spacing) in the UI. **Level presets (V/IV/III/II/I) are deferred — plan for them, don't build now.** **Resolved (ADR-008):** two functional Groups by default — Rescue Group Supervisor and Shoring Group Supervisor; Search and Medical Group Supervisors are add-ons at Level III+. Entry / Initial Shoring / Wood Shoring / Cutting / Runner are tracked as tasks/resources beneath the Groups (Runner = a go-fer resource, not a position; Cutting Station = a workstation card under Operations, like Staging). Divisions are numbered by floor; sides are A–D with the IC designating the A side. See `04-references/nims-org-structure.md` + ADR-008.

### 1.5 Field conditions drive the tap geometry and the status-commit model

**Essays:** 02, 06, 07, 11, plus implicit support in 03 and 09.

Structural-glove fingertips contact at 18–22 mm. The 44 pt Apple floor has a 30 % miss rate in gloves. The 5-second undo window doesn't survive the team officer's eyes being on the rubble. Sunlight at 100 000 lux beats dark mode at 2 000 nits. Wet screens fire ghost taps. None of these are aesthetic choices — they're physics.

**Implication for E/F/G:** 56 pt minimum tap target for primary actions, 60 pt for status transitions, in every theme (not just sunlight). 8 pt dead zone between adjacent targets. **Status advances via a deliberate slide gesture (not a tap), and status is always reversible from the card** — an authorized user can step a shore point back at any time, so a stray advance self-heals (no time-limited undo toast). Heavier confirmation is reserved only for destructive/terminal actions (End Operation, an inventory-decrementing return). A card that regresses *off* an active work queue (e.g., the Cutting Station list) shows a passive on-screen removed state — **a red diagonal slash across the whole card with "Removed from cut list" stated over the slash** — never silently vanishing (Principle 10: visible state, not a push). Three themes authored from scratch (light, dark, sunlight) plus broadcast TV; sunlight is not an override of dark. Medium-impact haptic on every state commit. Card left-edge status stripe doubles as a secondary tap zone for the card's primary action. Pocket lock via proximity sensor and manual button.

### 1.6 Deductions show inline; capacity is computed but not the headline

**Essays:** 02, 03, 06, 07, 11 — **revised per Alex's review.**

The deduction math (required vs. effective length, cut length) is core to structural shoring and v3 buries it inside a disclosure — that ledger belongs inline. Capacity is a different story: **Alex's correction is that rated capacity and safety factors were conceived as an on-scene tool for large-vehicle stabilization, not the structural-shoring core.** The essays that wanted capacity to lead every card overweighted it.

**Implication for E/F/G:** Deduction ledger displays inline as a stacked subtraction (Required, deduction rows in `--text-secondary`, Effective with thin top border); the conservative-floor footnote sits beneath. The cut-length formula uses the same ledger format but is visually separated from the search-result deduction (different inputs: plates vs. wedge). **Rated capacity is computed and available but demoted — not the dominant headline that drives the card hierarchy. This is a display-prominence change only: the load tables, conservative-floor `getLoadCapacity`, and strut-matching engine are unchanged.**

### 1.7 Local-first with sync realism; both Build A and Build C, but C ships later

**Essays:** 01, 04, 07, 08, 09, 11, 12.

The v3 local-first contract is the one thing every reference app gets wrong, and it must survive verbatim. The D5 dual-architecture decision (Build A accept-and-reconcile, Build C CP hub) is correct on paper but everyone except data-resilience agrees that v4.0 ships only Build A. The skeptic wants Build C deferred to v5 alongside federal scope; architecture aligns with v5 because PWAs can't host WebSocket relays without RN; data-resilience proposes WebRTC + QR fallback but acknowledges v4.5+ for the hub mode.

**Implication for E/F/G:** v4.0 ships Build A only. The Settings toggle for Build C is visible but disabled, labeled "Coming with mobile app." Architectural seams (event log, repository pattern, projections) are designed so Build C is a transport variant, not an application mode. Per-row sync state appears on the roster screen (the PAR test case) — global sync indicator is not enough where staleness matters.

### 1.8 Four surfaces, but progressive density across them — not parallel designs

**Essays:** 02, 03, 06, 07, 08 (dissent), 11.

The four-surface model (phone, tablet, laptop, broadcast TV) is the right framing, but only progressive density actually works. The skeptic argues to drop broadcast TV from first-class status; scenario-stress shows that one dashboard with progressive density across surfaces is the right answer (phone shows the next decision; tablet adds the resource board; laptop adds the audit + IAP; TV adds the SP map). The dashboard primitive is one component reading one event-log projection through four presentation adapters.

**Implication for E/F/G:** **The phone is the floor — every workflow must be fully usable phone-only, assuming the tablet is unavailable. The tablet, laptop, and TV are enhancements, never assumptions.** Phone and tablet are first-class with real screen-by-screen design. Laptop is the tablet at higher density with keyboard shortcuts (command palette). Broadcast TV is a read-only projection authored as a distinct theme but composed of the same primitives. No surface gets a unique IA; every workflow has a story across all four.

### 1.9 Doctrine constants and audit history cross verbatim, with hardened comment discipline

**Essays:** 01, 06, 09, 11, 12.

`ACME_LOAD_TABLE`, `LONGSHORE_LOAD_TABLE`, the conservative-floor `getLoadCapacity`, `STATUS_ORDER`, the v3.9.0 progression guard, the v3.5.3 local-first write architecture, the v3.6.0 listener teardown pair, the v3.8.2 inventory rule fix, the v3.9.0 SRI pinning, the v3.16.4 offlineTouched pipe, the per-device groupId entropy, the diagnostics ledger at `/diagnostics/sync/` — all cross verbatim. Every doctrine constant in v4 carries an audit-trail comment naming the finding ID, the release, and the rationale.

**Implication for E/F/G:** `docs/v4-design/LESSONS.md` records why each pattern crosses. A snapshot test against Paratech-manual JSON fixtures fails CI on any row drift. The Firebase rules are generated from the same Zod schema the client validates against — the v3.8.2 silent-failure class disappears permanently.

### 1.10 Hazard log + Safety Officer as first-class objects

**Essays:** 03, 04, 05, 06, 09, 11.

The Safety Officer is the person the IC calls when the building makes a noise. In v3, the Safety role is decorative. The hazard log doesn't exist at all. Seven standing hazards lived in the moderator's notes through Surfside.

**Implication for E/F/G:** Safety Officer name and status appear in the persistent header on every IC-facing screen (no nav required). Hazard log is one tap from the SitStat home screen, exportable to ICS-208, attribute-tagged with area + Safety Officer. Shore point cards display a hazard badge when their area has unmitigated hazards. **No `safety-hold` status** — the app carries no messages or communication between users (Principle 10). The Safety Officer surfaces hazards visibly but does not gate shore-point advancement through the app; safety holds are a radio/face-to-face action, not an app state. (Resolves §5 Q2.)

### 1.11 Schema reservations for v5 (agencyId, IC collection, op period tag, status enum on inventory, arrivedAt/demobbedAt, nets[], resourceType, linkedVictim, 24-hour timestamps)

**Essays:** 04, 05, 09.

v4 does not ship federal-scale features. But the design ceiling is Level I per ADR-003, and the data model has to not block that ceiling. Future-scale enumerates the reservations; data-resilience confirms them; NIMS doctrine corroborates each.

**Implication for E/F/G:** Reserve `agencyId` on every record (defaults to the dept's own ID, never enforced in v4). Replace the singular IC slot with an IC collection. Add `status` enum to inventory items (`staged`/`deployed`/`decon-required`/`decon-complete`/`released`). Add `arrivedAt`/`demobbedAt` to apparatus. Add `nets: []` to role records. Add `resourceType` (FEMA Type I–V) optional on apparatus. Reserve `linkedVictim` on shore points. Tag every write with `opNumber`. Replace all `toLocaleString()` with `{ hour12: false }` 24-hour formatters. Document each in ADR-005 at Phase H.

### 1.12 Picker doctrine survives; plate connector picker preserved verbatim; new variants required

**Essays:** 02, 06, 07, 10, 11, 12.

The visual grid picker (plates + wood sizes) crosses verbatim with `touch-action: pan-y` + `transform: translateZ(0)` + visibility-toggle iOS hardening. The four documented variants stay. Scenario-stress and domain-UX both add a new doctrine modifier: an "apply to grouped siblings" semantic when a picker is invoked in a grouped-shore creation context (the T-Shore wood choice asked once for a group of 3, not three times). Implementation adds a `WarningGate` primitive distinct from Toast and Modal for unrated-zone, qty>4, and disclaimer cases.

**Implication for E/F:** Phase E updates `03-primitives/picker.md` with the "apply to grouped siblings" inline note pattern. Five picker components: `InlineSegmentedPicker`, `BottomSheetPicker`, `FullScreenListPicker`, `VisualGridPicker`, plus a `PowerSelectFallback`. The `WarningGate` primitive joins the doctrine. Plate picker uses React `createPortal` instead of `document.body` move.

---

## 2. Productive Conflicts

These are where the synthesis cannot duck — the essays took genuinely different positions and Alex needs the call.

### 2.1 PWA-only at v4.0 vs. monorepo with RN-ready core (ADR-003 dissent #1)

**Position A:** Architecture essay (01) — pnpm + Turborepo + 4 apps + 7 packages including a shared `core` with zero React/Firebase. RN ships at v5.0 against the same core.

**Position B:** Implementation essay (10), supported by skeptic (08) — one repo, two source folders, one Vite config, no monorepo until Phase 1. RN deferred to v5; monorepo is the RN unlock, not a v4 prerequisite.

**Resolution:** Position B for v4.0. The monorepo tooling buys nothing for the web app today and costs a week of wiring plus ongoing complexity. The package-boundary discipline that the architecture essay wants (no React in `core`, no Firebase outside `data`) can be enforced by ESLint import rules and folder structure inside a single package. When v5.0 begins, the same folders extract cleanly into a Turborepo without losing history. This is consistent with ADR-003's "raise the ceiling, not the timeline."

**ADR needed:** Yes — ADR-005 (or whatever the next number is) "v4.0 ships as single package, two entry points; monorepo deferred to v5 RN fork."

### 2.2 Skeptic's dissent against ADR-003 ("everyday + expandable")

**Position A (ADR-003 standing):** Architecture, future-scale, IC workflow, NIMS, domain-UX, field-conditions, scenario-stress, data-resilience — design must hold from 2 SPs to 250. Schema reservations now; UI scales via progressive disclosure.

**Position B (skeptic, essay 08, recs H-1 through H-15):** Defer the dual D5 architecture, the broadcast TV surface, the cross-dept mutual aid, the admin user manager, the checklist feature, the demo mode, and the marketing site. Drop several primitives. Roll back to a v3.20.x design refresh on the existing screens.

**Resolution:** ADR-003 stands. The skeptic is right about *implementation cost* — many of those features have no validated user and should not ship in v4.0 — but the ADR-003 frame is about *design ceiling*, not implementation schedule. The synthesis splits the skeptic's recs:
- **Accept (cost-deferral / cut):** Defer Build C to v5; defer mutual aid to v5; contract admin user manager to "rules + per-device UID only"; downgrade broadcast TV to "progressive density adapter, not first-class authored surface"; **drop demo mode entirely** (Alex); **drop the marketing site entirely** (Alex — the skeptic's H-6 is now accepted, not rejected).
- **Reject (ceiling concern):** Refusing to design against the design ceiling, cutting the principles to 9, dropping NIMS terminology work, contracting the picker primitive set, rejecting TypeScript. The audit-driven structural work and the doctrine-driven NIMS work are not scope creep.

**ADR needed:** No — ADR-003 stands as written. The skeptic's accepted items are scope-deferral, not ceiling changes.

### 2.3 Skeptic's dissent against ADR-004 / Principle 12 (data class)

**Position A (Principle 12 standing):** Architecture (01), future-scale (04), domain-UX (06), data-resilience (09), scenario-stress (11), tech-debt (12) — structural collapse is a different data class. The grouped-shore phase split, multi-area simultaneous input, load-rated resources, and visible measurement math are what the operational model demands.

**Position B (skeptic, essay 08, rec H-14):** Principles 11 and 12 are positioning statements, not design rules. Cut to nine principles. Move Principle 12 to a sibling positioning doc.

**Resolution:** Principle 12 stands. The skeptic argues it doesn't adjudicate design calls; the other six essays show it adjudicating directly — the ShorePointCard primitive (vs. RecommendationCard), the per-phase group/individual split, the apply-to-grouped-siblings picker semantic, the cut-table queue as a tablet-primary screen, the schema reservations, all trace back to "this is a different data problem." Move it to a sibling doc and these decisions lose their anchor in Phase E and Phase F dispatch. The skeptic's point about Principle 11 ("earns its place quietly") is more defensible — it sits closer to a posture statement — but it's the rule that kills splash screens, marketing in product, and tutorials between user and work, which the other essays cite five times.

**ADR needed:** No — ADR-004 stands.

### 2.4 Schema reservations now vs. premature abstraction

**Position A (essays 04, 05, 09):** Reserve `agencyId`, IC collection, `nets[]`, `resourceType`, `linkedVictim`, `arrivedAt`/`demobbedAt`, status enum on inventory — costs nothing in v4, eliminates v5 migration.

**Position B (skeptic, essay 08):** Each schema reservation has no validated user. Don't add fields v4 doesn't read.

**Resolution:** Position A wins, with one qualifier. The cost of an unread schema field is roughly zero (the field sits at null and v4 ignores it). The cost of a v5 migration across every record every department has ever written is days of engineering and risks data integrity. The schema-reservation argument is asymmetric and Position A wins on every reservation that is enumerated. Document them in ADR-006 (Schema reservations for v5 federal/IST workflows) so a future contributor can see why the fields exist.

**ADR needed:** Yes — ADR-006 "Schema reservations for v5."

### 2.5 Command-transfer wizard vs. single-action with optional expansion

**Position A (essay 03 IC-workflow):** Two-device choreography, full-screen takeover on incoming device, briefing view derived from role history. The interaction is deliberate, not navigation.

**Position B (essay 11 scenario-stress):** Single drag-or-tap at all scales, optional "Capture the brief" expansion using the nested-checklist primitive. Verplanck never opens it (no transfer). Hamden may. Meadowville and Surfside open it every time.

**Resolution:** Both. They are compatible. The deliberate two-device choreography in 03 is the *flow* (commit-immediately, animated swap, aria-live, 5-second undo, full-screen takeover on incoming device). The "single-action with optional expansion" in 11 is the *entry point* — one drag from the org chart node OR one tap on the "Transfer Command" header button is the start of that flow. The briefing view (ICS-201 derived) is shown on the takeover by default at Level III+; auto-skipped at Level V (no IC change ever happens) and offered as optional at Level IV. Scale gating uses the same logic as the org-chart presets.

**ADR needed:** No.

### 2.6 Single-typeface (Geist) vs. licensed (Söhne) vs. system default (skeptic)

**Position A (essay 02):** Geist as v4.0 default, OFL, variable, tabular numerals. Söhne flagged for Phase E if budget opens.

**Position B (essay 10):** Inter Variable as default until Phase E says otherwise — don't block v4.0 on typography.

**Position C (essay 08 skeptic):** Type ramp matters; specific face doesn't. System default ships today.

**Resolution:** Position A wins on substance, Position B on schedule. Phase E adopts Geist (OFL, free, professional, tabular numerals exactly where they matter) as the v4.0 default. Inter is the fallback if Geist's variable-axis support or any subsetting issue surfaces during Phase H. Söhne stays parked as a Phase I budget question. The type tokens are face-agnostic; swapping at the root works.

**ADR needed:** No.

### 2.7 Predicted tears from scenario-stress essay (essay 11)

Scenario-stress was the only Phase C essay written knowing the others were running in parallel. Three of its predictions were against unread essays:

- **Predicted tear #1:** "Cards-per-recommendation IA produces 220 cards at TF scale." → Confirmed against essay 01's "typed component library" rec 13. Architecture rec 13 did not specify a `ShorePointCard` vs. `RecommendationCard` split. Synthesis resolves: Phase E ships both primitives. The Operations tab groups by shore point with alternatives nested.
- **Predicted tear #2:** "Wizard for command transfer is wrong at Hamden scale." → Confirmed against essay 03. Resolution above (2.5).
- **Predicted tear #3:** "One-size-fits-all dashboard breaks across the four surfaces." → Confirmed against essay 03's "SitStat home screen with six canonical datums." The dashboard primitive in Phase E uses progressive density: phone shows the next pending decision, tablet adds resource board, Toughbook adds IAP cover sheet + audit log, broadcast TV adds SP map + cutting queue. Same projection, four adapters.

All three corrections land in Phase E (primitive specs) and Phase F (IA spec). No ADRs needed; these are design-system rules.

### 2.8 Build vs. no-build (skeptic vs. everyone)

**Position A (essays 01, 09, 10, 12):** Vite + TypeScript + a real CI pipeline are non-negotiable. The audit history justifies the cost.

**Position B (essay 08 skeptic, rec H-12):** Preserve single-file architecture unless the architecture essay names a specific capability it blocks.

**Resolution:** Position A. The skeptic's argument ("tree shaking saves nothing because the whole file loads anyway, HMR is not a user feature") is technically true and operationally wrong. The audit ledger names ~100 findings against v3; ~30 % of them are exactly the class that TypeScript catches at compile time and that escapeHtml/escapeAttr discipline catches by hand. The 17-minute push-to-prod loop (vs. v3's 15-minute) is the cost of trading that hand-discipline for compile-time enforcement. The single-file architecture *did* serve the prototype phase. v4 is no longer the prototype phase. ADR-007 (or however numbered) records the call.

**ADR needed:** Yes — ADR-007 "Adopt build system + TypeScript strict for v4.0."

---

## 3. Surprises

Insights that appeared in essays without being explicitly briefed.

### 3.1 The card left-edge status stripe is a hidden tap zone (essay 07, field-conditions)

The visual-language essay specified a 4 pt status-color left border on shore point cards. Field-conditions noticed that border falls exactly in the right-thumb wrap zone when the phone is held one-handed — and proposed extending the tappable area of the stripe to the full card height, 16 pt wide. The IC reaches any card in the list without a grip shift. This is not a new pattern (it's the Apple Maps drag-handle-as-tap-target pattern) and it solves the thumb-reach problem on long lists without changing the card layout.

**Why it matters:** Phase E adopts this in the `ShorePointCard` primitive. It is the single most consequential mobile-UX call in the corpus.

### 3.2 Cutting queue is a tablet-primary screen, not a phone view (essay 11, scenario-stress)

The v3 model collapses the cutting-station lead onto the same shore-point card the team officer sees. At Meadowville the lead is managing 8–12 concurrent cuts with FIFO + priority overrides. Scenario-stress named this as a dedicated Cutting Station screen, surfaced when the operator is assigned to the Cutting Station. **It must be fully usable phone-only — assume the tablet is unavailable; the tablet is a larger-canvas enhancement, not a requirement.** The CuttingQueueRepo is a filtered projection over the same event log the ShorePointRepo reads.

**Why it matters:** Phase F IA spec must name a first-class Cutting Station screen that works on phone. A card whose status regresses off the cut list shows the red-slash "Removed from cut list" state rather than vanishing. Drag-handle priority reorder is an enhancement on larger canvases.

### 3.3 ~~Marketing site as a trust artifact~~ — DROPPED (Alex)

Two essays argued the marketing site should exist as a credibility document (how the data layer works — local-first, offline, Owner data control, audit retention) for the chiefs and program managers who decide on adoption. **Alex's call: drop the whole marketing flow.** No marketing site at v4.0 — not a funnel, not a trust artifact. Any "how sync works" credibility content lives in the user manual, not a separate site. The skeptic's H-6 ("drop marketing site") is accepted.

**Why it matters:** No Phase G marketing-site content brief. Removes a dependency on the (also-dropped) demo mode.

> **Addendum 2026-07-11 (Alex):** A single standalone **welcome page** is now in scope — its own URL (`/welcome.html`), built as a second Vite page entry beside the app (the J-21 pre-approved mechanism), issue #442. It is not a marketing *site*, not a funnel, and not a splash: the app's cold-open is untouched and nothing sits between the user and the work. Scope is one page — dulled public-domain USAR footage hero, five capability cards, one "Open FieldShore" button into the app.

### 3.4 ~~Capacity inversion~~ — OVERTURNED: capacity is a vehicle-stabilization tool (Alex)

Domain-UX framed v3's "capacity shows only when something is wrong" as a backward safety hierarchy and wanted rated capacity to lead every card. **Alex's correction:** rated capacity and safety factors were conceived as an on-scene tool for large-vehicle stabilization, not the structural-shoring core. Capacity stays computed and available, but it is not the headline that drives the result-card hierarchy.

**Why it matters:** Phase E's result-card primitive leads with the shore/strut selection and the inline deduction ledger (the math that matters for shoring — see §1.6); capacity is a secondary, available field. The load engine is unchanged — display prominence only.

### 3.5 The picker doctrine needs an "apply to grouped siblings" semantic (essay 11)

The grouped-shore wood-choice problem at Hamden surfaced a gap the picker doctrine doesn't have: when a picker is invoked inside a grouped-shore creation context, the picker writes its value to all group members at once, with an inline note ("Applies to all 3 members of this T-Shore group"). This is the only doctrine *addition* to the picker primitive in the entire essay corpus.

**Why it matters:** Phase E updates `03-primitives/picker.md` with this modifier. It is not a new picker variant — it is a context-aware behavior on the existing variants.

### 3.6 Audit log == event log; ICS-209 reconstruction is a query, not a parallel record

**(essays 01, 04, 09)** Three essays independently landed on the same architecture: the audit log feature (D7.5) is a filtered view of the same append-only event log that drives the rest of the persistence layer. ICS-209 reconstruction, command-transfer briefing, and operation export all become read projections, not parallel writes.

**Why it matters:** Phase H builds one persistence path. The post-incident export pipeline is filters and formatting, not data collection.

### 3.7 The skeptic surfaced a real retraining-gate gap (essay 08, rec H-13)

Even rejected, the skeptic raised one thing nobody else did: Hartsdale users have v3 muscle memory. v4 has to clear that bar without retraining ceremony. The plate picker is already preserved per explicit rule. The Quick Find tab, the shore-point card lifecycle, the org-chart drag-and-drop, and the cutting workflow should be on the same preservation list unless there's a specific doctrine reason to change them.

**Why it matters:** Phase J adds a retraining gate before any cutover to `main`. A Hartsdale drill must verify the team officer reaches the SP list, the IC reaches the org chart, and the cutting workflow runs end-to-end without explanation.

---

## 4. The Recommended Path

The 10–15 decisions that settle the design questions if Alex agrees. This is the north star.

### Architecture

**Direction:** Single-package v4.0 PWA on Vite + React 18 + TypeScript strict + Tailwind v4 + TanStack Router + TanStack Query + Zustand + Radix headless + Zod, deployed to GitHub Pages at `/v4/` via GitHub Actions. Migrate to a Turborepo monorepo at the v5.0 React Native fork, not before. Eleven module seams (`core/load`, `core/shorepoint`, `core/operation`, `data/sync`, `data/store`, `ui/quickfind`, `ui/operations`, `ui/inventory`, `ui/command`, `ui/settings`, `ui/checklists`, plus `ui/picker` primitives). 800-line file ceiling.

**Convergence:** Essays 01, 09, 10, 12 agreed on the stack with the monorepo as the only divergence; resolved as Position B (single package). **Dissent:** Essay 08 wanted to preserve v3's no-build. Rejected — see conflict 2.8 and ADR-007.

### Visual language

**Direction:** Geist (OFL variable, tabular numerals) at 14 pt body, minor-third scale. Three themes authored from scratch (light, dark, sunlight) plus broadcast TV. Dark surface `#1C1F23`, warm gold accent `#D4A017`. 4 pt base spacing, 12 pt card corner radius, 16 pt sheet top corners. 200 ms sheet open with `cubic-bezier(0.25, 0.1, 0.25, 1)`. Geometry-refresh the "P" mark, no rebrand. Custom 1.5 pt-stroke SVG icon set with USACE shore-type diagrams as the priority commission. **Measurement fractions render typographically — the fraction set smaller than the whole number but at the same total cap height, giving a true ½ appearance (not same-size slashed numerals).**

**Convergence:** Essay 02 specified; essays 06, 07 corroborated under field-conditions constraints (56 pt tap targets, deliberate slide-to-advance). **Dissent:** Essay 08 skeptic wanted system default + type ramp only. Rejected — the visual signal is the work.

### Data model

**Direction:** Event-sourced append-only log per operation under `/operations/{opId}/events/`. Current state is a projection. Repos (`DepartmentRepo`, `OperationRepo`, `ShorePointRepo`, `InventoryRepo`, `RoleRepo`, `ChecklistRepo`, `HazardRepo`, `AuditLogRepo`) own typed reads/writes. Schema reservations land in v4.0: `agencyId` on every record, IC as a collection, `roleHistory` log, inventory `status` enum, apparatus `arrivedAt`/`demobbedAt`/`resourceType`, role `nets: []`, shore-point `linkedVictim`, every write tagged with `opNumber`, all timestamps 24-hour via `{ hour12: false }`.

**Convergence:** Essays 01, 04, 05, 09, 11. **Dissent:** Essay 08 wanted no schema reservations. Rejected — see conflict 2.4 and ADR-006. **Database resolved (ADR-009): Firebase RTDB for v4.0**, behind a `data/sync` seam — so these persistence paths stand. The event-sourced model, repos, and schema reservations are backend-agnostic regardless. See `04-references/database-evaluation.md` + ADR-009.

### Offline / sync

**Direction:** v4.0 ships Build A (accept-and-reconcile) only. Per-device Firebase Anonymous UID persisted to IndexedDB at `fieldshore_auth_uid`, `LOCAL` Firebase persistence. The v3.5.3 local-first contract, the v3.9.0 status progression guard, the v3.16.4 offlineTouched pipe, the v3.8.1/v3.8.2 diagnostics ledger all cross verbatim. Storage moves from localStorage to IndexedDB via Dexie. Per-row sync state on the roster screen (PAR test case). Build C (CP hub) Settings toggle visible but disabled, labeled "Coming with mobile app." Build C ships at v5.0 with React Native because PWAs cannot host a local WebSocket relay.

**Convergence:** Essays 01, 09, 11, 12. **Dissent:** Essay 09 wanted Build C in v4.0 via WebRTC + QR fallback. Deferred — see conflict 2.2 trade-offs; the WebRTC path is real but the iOS Safari mDNS limitations and the QR-exchange UX are not v4.0 work. **Database resolved (ADR-009): Firebase RTDB for v4.0** — the only candidate scoring A/B on all seven hard constraints with zero migration cost; the event-sourced append-only log neutralizes RTDB's two weak spots (offline-queue reliance, path-level last-write-wins). Isolated behind a `data/sync` repository seam (no Firebase import outside `data/`) so any future swap is a transport change. Second choice if field-testing surfaces problems: Supabase + PowerSync. See `04-references/database-evaluation.md` + ADR-009.

### NIMS compliance

**Direction (settled):** Complete the `group` → `assignedResource` cutover (drop the fallback chain after migration). Rename `Operations` → "Operations Section Chief" (titles spelled out as spoken — **no acronyms** like "OSC" in the UI). `Cutting Table` → "Cutting Station," kept under Operations (a named workstation, not an ICS position). Rename `strutplaced` → `strutset` (display "Strut Set"). Remove `Task Force` from apparatus types (it's a resource configuration). Rename `ICS_ROLES_DEFAULT` → `ICS_POSITIONS_DEFAULT`, `customRoles` → `positions` (keyed object). Accommodate longer position names (character count + spacing). Span-of-control soft warning at 6 reports, harder at 8, Branch-promotion sheet at 9. ICS-201, ICS-203, ICS-214 ship in v4.0; everything else deferred to v5. **Level presets (V/IV/III/II/I) deferred — plan, don't build now.**

**Resolved (ADR-008; all 7 questions answered 2026-05-31):** two functional Groups by default — **Rescue Group Supervisor** and **Shoring Group Supervisor** under a Division Supervisor in the Operations Section; **Search** and **Medical** Group Supervisors are add-ons at Level III+ (not in the Level IV default). Entry / Initial Shoring / Wood Shoring / Runner are tracked as tasks/resources beneath the Groups (Runner = a go-fer resource, not an org node). Cutting Station = a workstation card under Operations (like Staging). Divisions numbered by floor; sides A–D with the IC designating the A side. Staging under Operations. Display labels locked to doctrine in v4.0. **Level presets deferred.** See `04-references/nims-org-structure.md` + ADR-008.

**Convergence:** Essays 03, 04, 05, 06. **Dissent:** None.

### Field UX

**Direction:** 56 pt primary tap target, 60 pt for status transitions, 8 pt dead zone between adjacent targets — in every theme. **Status advances via a deliberate slide gesture, not a tap; status is always reversible from the card (an authorized user can step it back anytime), so there is no time-limited undo toast.** Heavy confirmation only for destructive/terminal actions (End Operation, an inventory-decrementing return). A card regressed off an active work queue (the Cutting Station list) shows a red diagonal slash with "Removed from cut list" over it rather than vanishing. Card left-edge status stripe is a secondary tap zone for the card's primary action. Sunlight theme is separately authored (not an override) and auto-activates at 10 000 lux via AmbientLightSensor. Medium-impact haptic on state commit; light haptic on tap-start and toast-appear. Custom numeric keypad at 56 × 56 pt for measurement input. Pocket lock via proximity sensor (5-second covered trigger) plus manual button. Wake lock requested during active operations.

**Convergence:** Essays 02, 06, 07, 11. **Dissent:** None.

### IC workflow

**Direction:** IC home screen on iPad is a SitStat view with six canonical datums above the fold (incident name, IC with gold underline, Safety Officer in persistent header, personnel count, SP counts per status, OP indicator with elapsed time). Org chart is one tap away, not the default. Command transfer is a single drag-or-tap action on the persistent IC header; commits immediately with 200 ms animation, gold-underline pulse, aria-live announcement, 5-second outgoing undo, full-screen takeover on incoming device with 5-second self-confirming countdown. ICS-201 brief derived from role history log. Span-of-control warnings at supervisor nodes (amber at 7, red at 9, Branch-promotion sheet). Op period in persistent header as "OP 2 — 4h 22m". Safety Officer name in persistent header on every IC screen. Hazard log one tap from SitStat. NIMS Level preset selector at operation start.

**Convergence:** Essays 03, 04, 05, 11. **Dissent:** Essay 08 implicitly opposed the full SitStat scope. Accepted in part (the SitStat is the home; the wizard-style command-transfer flow becomes single-action-with-optional-expansion per conflict 2.5).

### Checklist feature

**Direction:** Nested-checklist primitive ships in Phase E (category → item → sub-item, with the spec already in essay 02). Used in three places: ICS-201 briefing view at command transfer (Level III+), IC Command Checklist as a first-class screen at Level III+, Task Level / ORM briefing as a tablet surface at Level II+. **Defer content licensing/paraphrase work to v4.1** behind a feature flag — the primitive ships, the doctrine-content seeding ships in a follow-up. The skeptic's H-4 concern (no validated user) is real for the content; the primitive itself is needed for the command-transfer briefing view, which has a validated need (ICS-201 doctrine, Surfside TTX-2 five transfers).

**Convergence:** Essays 02, 03, 11 (via the briefing-view tie-in). **Dissent:** Essay 08 wanted full deferral. Resolved: primitive ships, content seeding deferred.

### Auth / identity

**Direction:** Guest mode is the default first-run. App opens to Operations with no auth prompt; data persists locally. Dismissible "Sign in to sync across devices" banner is the only auth surface. Auth registration lives in Settings, not on startup. Per-device Firebase Anonymous UID + Firebase `LOCAL` persistence. v3 → v4 migration runs once on first launch (captures localStorage, signs in anonymously, registers as Member of existing dept, merges local snapshot with remote, idempotent via `_meta/v4MigratedAt`). Owner is claimed once via a one-time banner ("Claim department ownership" rule allows the write only if `/departments/{deptId}/owner` does not exist). Security rules gate writes by role membership lookup. Admin user manager UI (D7.3) deferred to v4.1 or later — v4.0 ships rules + per-device UID + role storage only. **On-scene QR sign-in (Alex's idea, §5 Q8):** a firefighter arriving on scene scans a code to sign in and pre-fill suggested info; feasibility depends on the backend choice (Step 2 database evaluation) and is not committed yet. **Backend resolved (ADR-009):** the Firebase Anonymous UID specifics stand — RTDB is confirmed for v4.0. The guest-mode-first, deferred-auth, role-storage commitments hold.

**Convergence:** Essays 04, 09, 10, 11. **Dissent:** Essay 09 also wanted the full Sync Health surface + audit log UI in v4.0; deferred to v4.1 — diagnostics path stays, surface ships later.

### Tech debt to clean

**Direction:** Retire entirely: 8,890-line `app.js`, `escapeHtml`/`escapeAttr` split (replaced by JSX defaults + `react/no-danger` lint), 94 inline `onclick=` interpolations, 10 `confirm()` + 19 `alert()` calls, `localStorage.getItem`/`safeParse` scatter (centralized in `data/store`), `selectApparatus('${app.id}')` string splicing, Firebase compat SDK (move to modular), `capacityAll` unused field, `debounce()` helper with no callers, the `assignedResource`/`group` dual-write fallback chain (after migration). Carry verbatim: load tables, conservative-floor `getLoadCapacity`, `STATUS_ORDER` (now a typed reducer), local-first write architecture, `pendingWrites` flush + diagnostics, SRI pins, per-device groupId entropy (replaced by `crypto.randomUUID()`), teardownListeners pair (now `useEffect` cleanups), first-fire guards, audit-trail comment discipline. Inline plate base64 thumbnails move to static assets under `public/plates/*.jpg`. Replace SheetJS with `papaparse` as primary, SheetJS as secondary behind "Advanced" toggle. Generate `database.rules.json` from a Zod schema; CI asserts generated rules match the committed file.

**Convergence:** Essays 01, 10, 12. **Dissent:** None.

---

## 5. Open Questions for Alex

Things the synthesis cannot resolve.

### Q1. Söhne typeface license at Phase E?

**What the essays said:** Essay 02 specified Geist (OFL) as default; Söhne flagged as a Phase E budget question. Essay 10 said Inter as fallback to not block v4.0.

**Recommended answer:** Ship Geist in v4.0. Do not commit budget for Söhne in v4.0. Reconsider at Phase I (whole-app build) if there's a specific Söhne-only signal needed for marketing/credibility. Tokens stay face-agnostic so the swap is one line at the root if revisited.

### Q2. Safety-Hold status — RESOLVED: no

**Alex's call:** No `safety-hold` status. The app carries no messages or communication between users (Principle 10). The Safety Officer surfaces hazards visibly (persistent header, hazard log, SP hazard badges) but does not gate shore-point advancement through the app. Safety holds are a radio / face-to-face action, not an app state.

### Q3. v4 / v3 dual-write window — 1 month, 3 months, or until cutover?

**What the essays said:** Essay 10 proposed 3 months of dual-write for the Bucket 2 renames. Essay 01 proposed v3 and v4 sharing the Firebase tree until Phase J cutover (could be 8–11 months).

**Recommended answer:** Tie the dual-write window to the field-test schedule, not a calendar. v4 writes both `assignedResource` and `group` until Hartsdale has run two consecutive drills on v4 with no read-side regression. v3 reads either. Once the gate passes, v4 stops writing `group`; v3 patches to read only `assignedResource`. This is roughly 2–3 months but is event-driven, not calendar-driven.

### Q4. Demo mode — RESOLVED: dropped

**Alex's call:** Drop demo mode entirely. No sandbox, no scripted seed, no marketing-tour embed. The first-run cold-open is a plain guest state.

### Q5. Checklist content seeding — v4.0, v4.1, or v5?

**What the essays said:** Essay 02 specified the nested-checklist primitive. Essay 11 said the primitive backs the optional command-transfer brief expansion. Essay 08 said no content licensing or paraphrase until a Hartsdale drill validates the digital form.

**Recommended answer:** Primitive ships in v4.0 (Phase E). Content seeding ships in v4.1 behind a feature flag, after the first Hartsdale drill on v4 validates that the IC actually engages with a digital checklist mid-incident. The command-transfer briefing view ships in v4.0 using a doctrine-derived field set (current objectives, resource summary, Safety Officer ID, hazard log) — that is *not* checklist content, it is a structured form built on the same primitive. The line between "ICS-201 fields" (v4.0) and "IC Command Checklist content" (v4.1) is whether the content is doctrine-derived structure or content-paraphrase.

### Q6. Marketing site — RESOLVED: dropped

**Alex's call:** Drop the whole marketing flow. No marketing site at v4.0 (not a funnel, not a trust artifact). Any "how sync works" credibility content lives in the user manual. The skeptic's H-6 is accepted.

### Q7. Cutting Station screen at v4.0 or v4.1?

**Recommended answer:** v4.0 — it is a dedicated screen for the cutting-station lead and Meadowville cannot run without it. **It must work phone-only** (the tablet is a larger-canvas enhancement, never an assumption). Phase F IA must name it. The CuttingQueueRepo is a filtered projection over the event log (no new persistence). A card whose status regresses off the cut list shows the red-slash "Removed from cut list" state rather than vanishing.

### Q8. On-scene QR sign-in (Alex's idea)

**What Alex said:** A firefighter arriving on scene scans a random QR code, which signs them in and lets them input suggested info. **Open:** does the QR encode a dept + incident join token? What info is pre-filled (name, role, agency)? Feasibility depends on the backend choice (the Step 2 database evaluation) — some backends make device-join-by-token trivial, others don't. Deferred to the auth workflow design (Phase G) once the database decision lands.

---

## Closing note

The corpus is internally consistent on what FieldShore v4 must be. **Alex's review (2026-05) resolved the scope disagreements:** demo mode and the marketing site are dropped entirely (not scoped down); capacity is demoted to a computed-but-not-headline field (a vehicle-stabilization tool, not the structural-shoring core); status uses slide-to-advance + always-reversible instead of a timed undo; the phone is the floor for every workflow; safety-hold is rejected (no in-app comms); level presets are deferred. The two held items are now resolved: the NIMS org structure (**ADR-008**) and the database choice (**ADR-009** — Firebase RTDB for v4.0).

Phase E starts when this synthesis is approved. The primitives are docketed; the workflows are docketed; the tech debt is docketed; **ADR-008** (NIMS org structure) and **ADR-009** (database: Firebase RTDB) are written; ADR-005 (single-package v4.0), ADR-006 (schema reservations), and ADR-007 (build system + TypeScript strict) remain to be written at Phase H.

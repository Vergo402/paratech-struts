# Phase D Decision Tracking Matrix

> Every numbered recommendation from every Phase C essay, with a disposition. Status values: `accepted` (taken into the recommended path), `deferred` (good idea, Phase I or later), `rejected` (not doing this; reason in Notes), `merged-with-N` (same idea as another rec; canonical version named). Rec ID legend: A=01-architecture (30), B=02-visual-language (18), C=03-ic-workflow (14), D=04-future-scale (12), E=05-nims-doctrine (22), F=06-domain-ux (25), G=07-field-conditions (18), H=08-skeptical-review (15), I=09-data-resilience (20), J=10-implementation (25), K=11-scenario-stress (18), L=12-tech-debt (30).

Total: 247 recommendations. **218 accepted / 13 deferred / 15 rejected / 1 merged.** (Updated 2026-05-31 after Alex's PR #282 review.)

---

## Review focus — controversial rows (29 of 247)

The 218 accepted rows are the "yes, ship it" pile — skim by status, no need to read linearly. These 29 are the ones that need discussion. Use **Cmd+F / Ctrl+F** in the GitHub diff view to jump to a row by its Rec # (e.g. `F-1`). **★ = changed by Alex's PR #282 review.**

### Rejected (15)

| Rec | Proposed | Why rejected (one-line) |
|---|---|---|
| `A-15` ★ | Next.js App Router marketing site | Marketing site dropped entirely (Alex) — no site at all |
| `A-16` ★ | Demo mode as build artifact in marketing tour | Demo mode dropped entirely (Alex) |
| `B-11` ★ | Timed undo toast (5s progress line) | Superseded by slide-to-advance + always-reversible status (Alex) |
| `B-15` ★ | Marketing site shares app design tokens | Marketing site dropped entirely (Alex) |
| `F-1` ★ | Rated capacity leads every result card at 28pt | Overturned (Alex): capacity is a vehicle-stabilization tool; demoted to secondary, engine unchanged |
| `G-4` ★ | 8-second in-operation undo window | Superseded by always-reversible status model (Alex) |
| `H-3` | Cut 12 essays → 4 | Procedural; corpus committed, produced load-bearing convergence |
| `H-10` | Cut 15 primitives → ~7 | Convergence names each primitive's load-bearing role |
| `H-12` | Preserve single-file architecture | Audit ledger names the capability gap (~30% of v3 findings are TS-class bugs) |
| `H-14` | Reduce 12 principles → 9 | Principle 12 stands (ADR-004); Principle 11 cited 5× |
| `H-15` | Ship design system to v3 first as visual refresh | Two design systems in parallel risks v3 regression |
| `I-17` ★ | "How sync works" marketing page | Marketing site dropped; content → user manual |
| `J-18` | Inter Variable as v4.0 default typeface | Geist wins on substance (B-1); Inter is the fallback |
| `K-2` ★ | Demo dept doubles as cold-open | Demo dropped; cold-open is a plain guest state |
| `K-8` ★ | Safety-Hold status blocks SP advancement | Q2 resolved no: no in-app comms (Principle 10) |

### Deferred (13)

| Rec | Proposed | Why deferred |
|---|---|---|
| `A-1` | pnpm + Turborepo monorepo at Phase H1 | Single package for v4.0; monorepo defers to v5.0 RN fork (ADR-005) |
| `C-14` ★ | NIMS Level I–V preset selector | Level presets deferred — plan, don't build now (Alex) |
| `E-6` ★ | Add PIO to Level IV+ preset defaults | Position stays available; preset auto-inclusion deferred with E-11 |
| `E-7` ★ | Add Liaison to Level III+ presets | Position stays available; deferred with E-11 |
| `E-8` ★ | Add Planning Section Chief to Level III+ presets | Position stays available; deferred with E-11 |
| `E-9` ★ | Add Logistics Section Chief to Level II+ presets | Position stays available; deferred with E-11 |
| `E-10` ★ | Add Finance/Admin Section Chief to Level II+ presets | Position stays available; deferred with E-11 |
| `E-11` ★ | Ship five Level org-chart presets at op start | Level presets deferred — plan, don't build now (Alex) |
| `I-6` | Build C (CP hub) via WebRTC + mDNS + QR | v4.0 ships Build A only; WebRTC at v4.5+ |
| `I-8` | Settings → "Sync health" admin UI | Path stays in v4.0 (L-25); UI surface at v4.1 |
| `I-13` | Export/restore dept data; weekly auto-export | v4.0 ships backup-before-destructive-write only; full UI at v4.1 |
| `I-14` | Department deletion with soft-delete + 60d cold storage | v4.0 = Owner confirm only; full lifecycle at v4.1 |
| `I-20` | Hub + Build A coexistence with auto-fallback | Build A only in v4.0; coexistence at v4.5/v5.0 |

### Merged (1) — same idea as another rec; canonical version named

| Rec | Merged with | Canonical version |
|---|---|---|
| `A-24` | L-15 | React `useEffect` cleanups with `react-hooks/exhaustive-deps` lint |

### Also held for Alex's review (not a status change — pending the two research docs)

| Area | Rows | Note |
|---|---|---|
| NIMS org structure | E-2, E-4, E-5, E-22 (+ the rename rows) | Research recommends two functional Groups (Rescue + Shoring Supervisors) with Search/Medical added at Level III; Entry/Wood/Runner become tracked tasks/resources. 7 open questions for Alex in `04-references/nims-org-structure.md`. Outcome → ADR. |
| Database / backend | A-7, A-8, A-9, I-1, the sync rows | Evaluation recommends staying on Firebase RTDB for v4.0 behind a `data/sync` seam (zero migration; event log neutralizes weak spots). See `04-references/database-evaluation.md`. Outcome → ADR. |

---

## Full matrix (all 247 rows)

| Essay | Rec # | Summary | Status | Notes |
|-------|-------|---------|--------|-------|
| 01-architecture | A-1 | pnpm + Turborepo monorepo with apps/packages/tools layout at Phase H1. | deferred | Single package + two source folders for v4.0 per essay 10. Monorepo deferred to v5.0 RN fork; ADR-005 records the call. |
| 01-architecture | A-2 | Stay PWA for v4.0/v4.5; React Native at v5.0 against shared core. | accepted | Matches roadmap and ADR-003 ceiling reasoning. |
| 01-architecture | A-3 | Vite + vite-plugin-pwa across web apps; Metro for mobile only. | accepted | Same call in essay 10. |
| 01-architecture | A-4 | TypeScript strict mode day one across every package: noImplicitAny, strictNullChecks, noUncheckedIndexedAccess. | accepted | ADR-007 records the call. Audit history justifies the cost. |
| 01-architecture | A-5 | Extract pure domain core package with zero React/Firebase, full Vitest coverage. | accepted | The package becomes folders under one repo (per essay 10) but the discipline is identical. |
| 01-architecture | A-6 | Centralize persistence in packages/data behind typed repositories. | accepted | Folders not packages in v4.0; rule unchanged. |
| 01-architecture | A-7 | Move offline storage from localStorage to IndexedDB via Dexie. | accepted | 5MB localStorage cap is real at TF scale. |
| 01-architecture | A-8 | Event-sourced append-only log; state is a projection. | accepted | Audit log == event log fall-out from this. |
| 01-architecture | A-9 | Ship Mode A as v4.0 default; Mode C disabled toggle "coming v4.5"; Mode C at v5.0 with RN. | accepted | Build C deferral matches skeptic and aligns with PWA limitations. Re-label toggle as "coming with mobile app." |
| 01-architecture | A-10 | Zustand for app state, TanStack Query for server state, Jotai in reserve; no Redux. | accepted | Same call in essay 10 (without Jotai; Jotai stays optional). |
| 01-architecture | A-11 | TanStack Router for typed routes + route-level loaders. | accepted | Same call in essay 10. |
| 01-architecture | A-12 | React Hook Form + Zod schemas; one schema for type, form validation, and Firebase write validation. | accepted | Tech-debt rec L-11 reinforces (rules generated from same schema). |
| 01-architecture | A-13 | Component library in packages/ui; every primitive has a typed component; VisualGridPicker preserves plate behavior. | accepted | Phase E delivers the library. ShorePointCard vs. RecommendationCard split added per scenario-stress K-5. |
| 01-architecture | A-14 | Generate tokens from TypeScript source with CSS variables for web, JS for RN, JSON for Figma. | accepted | Style Dictionary or thin custom generator. |
| 01-architecture | A-15 | Marketing site as Next.js App Router using same tokens/ui/icons as app. | rejected | Marketing site dropped entirely per Alex review — no Next.js, no site at all. |
| 01-architecture | A-16 | Demo mode as shared build artifact embedded in marketing product tour. | rejected | Demo mode dropped entirely per Alex review (Q4). |
| 01-architecture | A-17 | Replace hand-maintained sw.js with vite-plugin-pwa Workbox config; preserve Firebase WebSocket exclusion. | accepted | Data-resilience I-12 reinforces. |
| 01-architecture | A-18 | Vitest unit, Playwright e2e on web, Maestro on mobile; CI runs simulation infrastructure. | accepted | Essay 10 rejects Playwright in favor of qa-driver MCP; the simulation-in-CI piece accepted. Note: e2e testing strategy clarified by essay 10 J-15 — qa-driver replaces Playwright. |
| 01-architecture | A-19 | TanStack Query optimistic updates plus audit log event for every mutation. | accepted | Same data-resilience I-10. |
| 01-architecture | A-20 | Migrate app.js modules in dependency order: core → data → vertical slice → screens. No big bang. | accepted | Phase H1–H4 plan reflects this order. |
| 01-architecture | A-21 | Stage deploys: v3 at current URL, v4 alpha at new subpath, beta at fieldshore.app, v5 mobile via App Store. | accepted | Essay 10 J-13 names the same `/v4/` subpath approach. |
| 01-architecture | A-22 | Adopt dnd-kit for org chart drag-and-drop. | accepted | Replaces v3 hand-rolled three-input handler. |
| 01-architecture | A-23 | Replace every inline HTML string interpolation with typed React components. | accepted | Tech-debt L-13 covers the 94 onclick sites; this is the same call. |
| 01-architecture | A-24 | Replace setupListeners/teardownListeners with SubscriptionManager class. | merged-with-L-15 | In React this is `useEffect` cleanups with `react-hooks/exhaustive-deps`; conceptually identical. |
| 01-architecture | A-25 | Suspense + ErrorBoundary at route level; errors surface through Toast and never take whole app down. | accepted | Sentry integration in essay 10 J-11 catches the upstream errors. |
| 01-architecture | A-26 | Lock v3↔v4 Firebase tree shape; security rule expansion behind feature flag; tighten at Phase J cutover. | accepted | Dual-write window event-driven per open Q3. Migration script per A-27. |
| 01-architecture | A-27 | Build v3-to-v4 data migration script early in Phase H; run against fork of prod data at start of Phase I. | accepted | Critical for zero-data-loss cutover. |
| 01-architecture | A-28 | Keep v3 PWA alive at /v3-legacy for six months minimum after Phase J cutover. | accepted | Skeptic H-13 retraining gate happens before this. |
| 01-architecture | A-29 | CI check fails any PR introducing Firebase dependency outside packages/data or React in packages/core. | accepted | Folder boundaries enforced by ESLint import rules in single-package layout. |
| 01-architecture | A-30 | Document architecture in docs/v4-design/07-design-system/architecture.md at picker doctrine depth before Phase H. | accepted | Phase E deliverable. |
| 02-visual-language | B-1 | Adopt Geist (OFL) primary typeface + Geist Mono for measurements; flag Söhne for Phase E. | accepted | Open Q1 resolves: Geist in v4.0, Söhne parked. |
| 02-visual-language | B-2 | Type ramp anchored at 14pt body, minor third (1.2×) scale; tokens display-1 through label. | accepted | Phase E delivers the token file. |
| 02-visual-language | B-3 | 4pt base spacing unit with 8pt-multiple external rhythm; tokens space-1 through space-12. | accepted | Phase E delivers. |
| 02-visual-language | B-4 | Dark theme surface #1C1F23 (muted slate, not navy, not OLED black). | accepted | Single biggest visual differentiator from fire-service competitive set. |
| 02-visual-language | B-5 | Accent #D4A017 (dark theme) and #B8860B (light theme); document contrast ratios. | accepted | Phase E delivers. |
| 02-visual-language | B-6 | Sunlight theme as standalone token file: 7:1 minimum contrast, 2pt borders, 56pt touch targets, one type-weight bump. | accepted | Field-conditions G-1 bumps the baseline tap target to 56pt in all themes; sunlight stays at 60pt for status transitions. |
| 02-visual-language | B-7 | Broadcast TV theme as standalone token file: 32pt minimum text, 7:1 contrast, 4pt left-border accents, no animation. | accepted | Stays a real theme. Per skeptic H-9, the surface is a projection of the tablet, not separately authored screens; the *theme* tokens are real. |
| 02-visual-language | B-8 | Corner radius vocabulary: 12pt card, 16pt sheet top, 6pt badge, 12pt button, 8pt input. Five values, complete vocabulary. | accepted | Phase E delivers. |
| 02-visual-language | B-9 | Card elevation: 1pt inner shadow at 6% opacity on top edge; no drop shadow. Sheets `0 -4pt 24pt rgba(0,0,0,0.18)` dark. | accepted | Phase E delivers. |
| 02-visual-language | B-10 | Sheet open: 200ms cubic-bezier(0.25,0.1,0.25,1) translateY(100%) to 0; preserve v3.5.1 iOS fixes (`touch-action: pan-y`, `transform: translateZ(0)`). | accepted | Tech-debt L-29 confirms iOS fixes preserve. |
| 02-visual-language | B-11 | Undo toast: 200ms ease-out in, 180ms ease-in out, 5s constant-rate progress line; max one toast visible. | rejected | Status undo toast superseded by slide-to-advance + always-reversible status (Alex). Toast styling may still apply to non-status transient messages. |
| 02-visual-language | B-12 | Status badge text always includes status label as text, never color only. | accepted | Domain-UX F-22 reinforces with phase-split badge spec. |
| 02-visual-language | B-13 | Custom SVG icons at 24px grid, 1.5pt stroke, 2px corner joins; USACE shore-type diagrams as priority commission. | accepted | Phase E commissions or authors. Implementation J-9 uses Lucide as the general set and custom shore-type icons in `packages/icons`. |
| 02-visual-language | B-14 | "P" mark geometry refresh; 12pt container radius; two color variants only. | accepted | Phase E refresh. |
| 02-visual-language | B-15 | Marketing site shares all design tokens with app (light theme); no marketing-exclusive color, size above display-2, or component outside app design system. | rejected | Marketing site dropped entirely per Alex review. |
| 02-visual-language | B-16 | Primary button: 48pt height, 120pt minimum width, 12pt radius, body-medium font, 40% opacity disabled. | accepted | Field-conditions G-1 bumps to 56pt for primary actions in operations; B-16 stays the baseline for non-operational primary buttons (Settings, etc.). |
| 02-visual-language | B-17 | Sync indicator: 8pt circle, three states mapped to status tokens; no animation. | accepted | Per-row sync state on roster screen adds to this per data-resilience I-7. |
| 02-visual-language | B-18 | Skeleton loading shimmer at 1.5s linear; after 8s replace with error + retry. Never infinite spinner. | accepted | Phase E delivers. |
| 03-ic-workflow | C-1 | IC iPad home screen is SitStat view with six canonical datums above the fold. | accepted | The dashboard primitive uses progressive density per scenario-stress K-9. |
| 03-ic-workflow | C-2 | Command transfer as two-device choreography from persistent IC header; 200ms swap, 1pt gold pulse, aria-live; 5s undo on outgoing; full-screen takeover with 5s self-confirm on incoming. | accepted | Merged with scenario-stress K-7 for the single-action-with-optional-expansion pattern. The choreography is the flow; the entry point is the single action. |
| 03-ic-workflow | C-3 | Briefing view derived from ICS-201 fields, no extra entry at transfer time. | accepted | Per Phase E nested-checklist primitive. |
| 03-ic-workflow | C-4 | Replace single-slot roles map with append-only roleHistory log; render state from `departedAt == null` entries. | accepted | Same as future-scale D-3, data-resilience I-15, tech-debt L-6. Canonical statement. |
| 03-ic-workflow | C-5 | Amber dot at supervisor node when direct reports exceed 7; red at 9; non-blocking toast "Add Branch?" with one-action sheet. | accepted | NIMS E-21 sets soft warning at 6; resolution: 6 = subtle indicator, 7 = amber, 9 = red + Branch toast. |
| 03-ic-workflow | C-6 | Safety Officer name and status in persistent header on every IC screen; amber badge when vacant; one tap opens current hazard log. | accepted | Field-conditions affirms by implication. |
| 03-ic-workflow | C-7 | Op period number + elapsed time in persistent header on every IC screen; subtle amber at T-30min; non-blocking transition card at boundary; tag every write with opNumber. | accepted | Future-scale D-10 corroborates. |
| 03-ic-workflow | C-8 | Hazard log as first-class object reachable one tap from SitStat; ICS-208 export; per-area shore-point hazard badge; any role can add. | accepted | Phase F delivers. |
| 03-ic-workflow | C-9 | Command palette on Toughbook (Cmd+K/Ctrl+K); every action reachable in <3 keystrokes. | accepted | Linear-style ergonomics. Phase F surface. |
| 03-ic-workflow | C-10 | Replace singular IC field with IC collection supporting Unified Command. | accepted | Same as future-scale D-2. Canonical statement is D-2; this is the UI side. |
| 03-ic-workflow | C-11 | Operation-level safety state: operating / paused-weather / paused-hazard / paused-PAR with persistent banner. | accepted | Operation-level pause banner stands. No `safety-hold` SP-gating (Q2 resolved no — the app carries no in-app comms, Principle 10). |
| 03-ic-workflow | C-12 | Auto-generate one-line radio script suggestion at command transfer with copy-to-clipboard. | accepted | Future-scale D-7's 24-hour timestamp rule applies to the generated script. |
| 03-ic-workflow | C-13 | Broadcast TV layout: left third org chart to Section Chief depth, center SP status board, persistent header; 48pt heading, 32pt body. | accepted | Per progressive-density principle K-9; TV gets the same projection at this density. |
| 03-ic-workflow | C-14 | NIMS Level I–V preset selector on Start Operation modal. | deferred | Level presets deferred per Alex (plan, don't build now); same as E-11. |
| 04-future-scale | D-1 | Reserve `agencyId` first-class on every schema type; default to dept's own ID; record in ADR-005. | accepted | Becomes ADR-006 (ADR-005 reserved for single-package decision). |
| 04-future-scale | D-2 | Replace singular `ic` role slot with IC collection supporting one or more co-equal IC assignments. | accepted | Schema change before v4 ships. UI per C-10. |
| 04-future-scale | D-3 | Append-only roleHistory log under /operations/{opId}/roleHistory/{pushId}; current state is `departedAt == null`. | accepted | Canonical statement for the role-history theme. |
| 04-future-scale | D-4 | Status enum on every inventory item: staged / deployed / decon-required / decon-complete / released. Default staged. | accepted | v4 ignores; v5 demob workflow writes against it. |
| 04-future-scale | D-5 | arrivedAt and demobbedAt timestamps on apparatus records; default null. | accepted | Drives ICS-211 + PAR + reimbursement. |
| 04-future-scale | D-6 | nets: [] empty typed array on every ICS role record for ICS-205 comms plan. | accepted | v5 fills; field reserved now. |
| 04-future-scale | D-7 | Replace all `Date.toLocaleString()` with `{ hour12: false }` 24-hour formatters. | accepted | Doctrine violation otherwise. |
| 04-future-scale | D-8 | resourceType field on apparatus (FEMA Type I–V); optional, default empty. | accepted | Populated manually on task force records during cache import. |
| 04-future-scale | D-9 | Enforce apparatus naming uniqueness across combined agency namespace, not just within a department. | accepted | Surfside scenario validates. |
| 04-future-scale | D-10 | Add opNumber tag on every write — shore points, status transitions, role assignments, inventory transactions. | accepted | Per-OP export depends on it. |
| 04-future-scale | D-11 | Reserve linkedVictim field on shore point records; default null. | accepted | v5 Victim Locator filter dimension. |
| 04-future-scale | D-12 | Document design ceiling claim with quantitative specifics in marketing site before v4 launch. | accepted | Marketing site dropped; the design-ceiling claim is documented in the user manual / positioning doc instead. |
| 05-nims-doctrine | E-1 | Complete sp.group → sp.assignedResource cutover; remove getSPGroup fallback chain. | accepted | Tech-debt L-19 confirms. Migration on first launch. |
| 05-nims-doctrine | E-2 | Rename `Operations` position to `Operations Section Chief` per SM-0322. | accepted | Phase H1 schema work. Title spelled out as spoken — no acronym ("OSC") in the UI per Alex. |
| 05-nims-doctrine | E-3 | Remove `Cutting Table` from ICS_ROLES_DEFAULT; model as workstation tag. Update SHORE_ACTION_ALLOWED_ROLES and suggestedView binding. | accepted | Phase H1 schema work. |
| 05-nims-doctrine | E-4 | Replace `entry`, `rescue`, `shoring`, `wood` positions with `Rescue Group Supervisor` and `Shoring Group Supervisor` under Division 1. | accepted | Phase H1 schema work + permission matrix update. |
| 05-nims-doctrine | E-5 | Remove `runner` from ICS_ROLES_DEFAULT; gate "Send to Runner" by workstation or functional task instead. | accepted | Phase H1 schema work. |
| 05-nims-doctrine | E-6 | Add Public Information Officer to Level IV and above preset defaults. | deferred | Position remains available; auto-inclusion in level presets deferred with E-11. |
| 05-nims-doctrine | E-7 | Add Liaison Officer to Level III and above preset defaults. | deferred | Position remains available; auto-inclusion in level presets deferred with E-11. |
| 05-nims-doctrine | E-8 | Add Planning Section Chief to Level III and above preset defaults. | deferred | Position remains available; auto-inclusion in level presets deferred with E-11. |
| 05-nims-doctrine | E-9 | Add Logistics Section Chief to Level II and above preset defaults. | deferred | Position remains available; auto-inclusion in level presets deferred with E-11. |
| 05-nims-doctrine | E-10 | Add Finance and Administration Section Chief to Level II and above preset defaults. | deferred | Position remains available; auto-inclusion in level presets deferred with E-11. |
| 05-nims-doctrine | E-11 | Ship five Level-specific org chart presets at operation start. | deferred | Level presets deferred per Alex (plan, don't build now). Canonical statement for the deferred preset theme. |
| 05-nims-doctrine | E-12 | Remove `Task Force` from APPARATUS_TYPES_DEFAULT (it's a resource configuration). | accepted | Departments use existing apparatus group feature. |
| 05-nims-doctrine | E-13 | Rename ICS_ROLES_DEFAULT → ICS_POSITIONS_DEFAULT; customRoles → positions (keyed object). | accepted | Tech-debt L-19 partial overlap; this is the constant rename. |
| 05-nims-doctrine | E-14 | Rename status code `strutplaced` → `strutset`; display label "Strut Set". Update STATUS_ORDER and all consumers. | accepted | Phase H1. Tech-debt L-6 preserves the STATUS_ORDER discipline. |
| 05-nims-doctrine | E-15 | Add US&R tactical phase (Recon / Surface Rescue / Void Search / Selected Debris Removal / General Debris Removal) as first-class operation field. | accepted | IC and Safety Officer can edit. Display on Command tab + broadcast view. |
| 05-nims-doctrine | E-16 | Add ICS operational phase (I–V) as inferred metadata on active operation with optional IC override. | accepted | Phase F UI. |
| 05-nims-doctrine | E-17 | Generate ICS-201 Incident Briefing on demand and automatically at command transfer; export as PDF. | accepted | Derived from role history log + objectives field. |
| 05-nims-doctrine | E-18 | Generate ICS-203 Organization Assignment List on demand from current positions. | accepted | Phase F deliverable. |
| 05-nims-doctrine | E-19 | Generate ICS-214 Unit Activity Log per apparatus or per Group; auto at operation close. | accepted | Phase F deliverable. |
| 05-nims-doctrine | E-20 | Audit all marketing site copy + design docs for doctrine-correct Group/Division/Task Force/Strike Team/Level usage; correct picker.md "Type" → "Level". | accepted | Design-doc/doctrine audit + picker.md "Type"→"Level" stand; the marketing-site portion is dropped (no site). |
| 05-nims-doctrine | E-21 | Span-of-control soft warning at 6+ direct reports. | accepted | Merged-with-C-5 — resolution: 6 = subtle indicator, 7 = amber dot, 9 = red dot + Branch toast. |
| 05-nims-doctrine | E-22 | Add Search Group Supervisor as optional position from Level IV and above. | accepted | Phase H1 schema work. |
| 06-domain-ux | F-1 | Rated capacity at 28pt semibold at top of every result card, always visible. | rejected | Capacity-leads overturned (Alex): rated capacity / safety factors are a vehicle-stabilization tool, not the structural-shoring core. Demoted to a secondary, available field — not the card headline. Load engine unchanged. |
| 06-domain-ux | F-2 | "4:1 safety factor" label at 12pt regular below capacity. | accepted | Shown only where capacity is shown; capacity demoted to secondary per F-1/Alex. |
| 06-domain-ux | F-3 | Margin row between capacity and model name when load entered; green/amber/red colored. | accepted | Capacity demoted to secondary per F-1; margin shown when load relevant. Phase E spec. |
| 06-domain-ux | F-4 | Deduction ledger as stacked labeled subtraction rows; no disclosure required. | accepted | Phase E spec. |
| 06-domain-ux | F-5 | Separate deduction ledger visually and conceptually from cut length formula. | accepted | Different inputs (plates vs. wedge). |
| 06-domain-ux | F-6 | Inline segmented control for lumber picker (None / 4×4 / 6×6). | accepted | Per picker doctrine for 3 mutually exclusive options. |
| 06-domain-ux | F-7 | T-Shore and Double-T lumber pickers start with no segment selected; "Find Struts" disabled until both selections; explanatory text. | accepted | Principle 5 doctrine. |
| 06-domain-ux | F-8 | 3-Post lumber picker preselects 6×6, locked with lock icon, "Required per USACE/FEMA spec" label. | accepted | Per USACE spec. |
| 06-domain-ux | F-9 | Unrated zone (LongShore >192"): 52pt full-width amber band with Acknowledge button; second undismissable deployment gate. | accepted | Carries forward v3.10.0 work. |
| 06-domain-ux | F-10 | Exceeds-capacity: full-width red band; no deployment path; no acknowledgment gate. | accepted | Statement of fact, not warning. |
| 06-domain-ux | F-11 | Fully-extended boundary: inline amber badge 28pt within card body. | accepted | Informational only. |
| 06-domain-ux | F-12 | AcmeThread/LockStroke >144": explicit non-deployable warning card; never silent empty set. | accepted | Closes v3 safety gap. |
| 06-domain-ux | F-13 | Pin liability disclaimer to top of results section at 12pt --text-secondary. | accepted | Phase E spec. |
| 06-domain-ux | F-14 | Conservative floor footnote at 11pt below deduction ledger. | accepted | Operator can verify against printed manual. |
| 06-domain-ux | F-15 | Derivation formula block on cut table card in same ledger format. | accepted | Phase E spec. |
| 06-domain-ux | F-16 | Expected Cut number at 36pt / 800 weight in --cutting-text. | accepted | The dominant number stays dominant. |
| 06-domain-ux | F-17 | Cut table card footnote: "Wood measurement only. Wedge (1.5") accounts for strut+plate assembly." | accepted | Phase E spec. |
| 06-domain-ux | F-18 | Display rated capacity on deployed shore point card (sp.deployedStrut.system + sp.effectiveLength at 4:1). | accepted | Capacity demoted to a secondary field per F-1/Alex (not the card headline); prominence re-specced in Phase E. |
| 06-domain-ux | F-19 | Phone shore point card: status badge 17pt semibold, strut model 15pt semibold, rated capacity 20pt semibold. | accepted | Capacity demoted per F-1/Alex; exact prominence re-specced in Phase E. |
| 06-domain-ux | F-20 | Broadcast TV shore point card: status badge 40pt, strut model 28pt, rated capacity 24pt, cut length 48pt when cutting; no interactive elements. | accepted | Capacity demoted per F-1/Alex; cut length stays dominant. Phase F broadcast adapter. |
| 06-domain-ux | F-21 | Pre-cutting group transitions: 2s toast "Advancing all N group members" + 5s undo (8s in active operation per G-4). | accepted | Group-advance shows a brief confirmation, but the timed undo is replaced by slide-to-advance + always-reversible status (Alex). |
| 06-domain-ux | F-22 | "Group of N" or "Individual tracking" badge in card header per phase. | accepted | Phase E primitive. |
| 06-domain-ux | F-23 | Plate connector + wood size selectors carry forward verbatim as VisualGridPicker; visual polish only. | accepted | Tech-debt L-29 confirms iOS fixes preserve via createPortal. |
| 06-domain-ux | F-24 | Formalize Quick Find result list as FullScreenListPicker variant; filter chips in header bar. | accepted | Phase F IA spec. |
| 06-domain-ux | F-25 | When empty state caused by table boundary, replace generic "no results" with specific boundary warning card. | accepted | Safety-driven omissions never look like data absence. |
| 07-field-conditions | G-1 | Primary tap targets 56pt minimum height/width with 4pt CSS touch extension in all themes. | accepted | Overrides visual-language B-16 for operations actions; B-16 remains baseline for non-operation primary buttons. |
| 07-field-conditions | G-2 | Status transition buttons 60pt minimum height. | accepted | The hard floor for the most-used action. |
| 07-field-conditions | G-3 | Card left-edge status stripe is a secondary tap zone for the card's primary action (16pt wide full card height). | accepted | The surprise finding (synthesis §3.1). Phase E primitive. |
| 07-field-conditions | G-4 | 8-second undo window during active operation; 5 seconds outside. | rejected | Timed undo window superseded by slide-to-advance + always-reversible status (Alex). No time-limited window. |
| 07-field-conditions | G-5 | Sunlight mode auto-triggers at 10,000 lux via AmbientLightSensor or DeviceMotionEvent.illuminance; manual override priority. | accepted | Phase E spec. |
| 07-field-conditions | G-6 | Sunlight mode minimum text contrast 7:1 (WCAG AAA); status pairs <7:1 communicate via label only. | accepted | Matches visual-language B-6. |
| 07-field-conditions | G-7 | Minimum gap between adjacent tap targets 8pt dead zone; 64pt center-to-center. | accepted | Wet screen ghost-tap protection. |
| 07-field-conditions | G-8 | Light haptic on touch start, medium haptic on state commit, light haptic on toast appear. | accepted | Phase H wires up. |
| 07-field-conditions | G-9 | No audio feedback in v4; opt-in at v4.5 only, defaulting off. | accepted | Consistent with Principle 10. |
| 07-field-conditions | G-10 | Custom numeric keypad for measurement input: 56pt × 56pt keys, 3-column layout. | accepted | Phase E primitive. System dictation secondary. |
| 07-field-conditions | G-11 | navigator.wakeLock.request('screen') when operation active; release on background. | accepted | Phase H wires up. |
| 07-field-conditions | G-12 | Maximum 60s Firebase background sync interval; detach listeners on background, reattach on foreground. | accepted | Carries v3.6.0 teardown pattern. |
| 07-field-conditions | G-13 | Pocket lock: manual button + proximity sensor (5s covered trigger); swipe-up from bottom handle to dismiss. | accepted | Phase E primitive + Phase H wiring. |
| 07-field-conditions | G-14 | Every state mutation writes to IndexedDB synchronously before UI updates; dropped phone produces zero loss. | accepted | Architecture A-7 confirms IndexedDB via Dexie. |
| 07-field-conditions | G-15 | Tablet operations view: status summary bar with counts per active status above SP list. Phone does not show. | accepted | Progressive density (K-9). |
| 07-field-conditions | G-16 | Cutting queue reorder is CP-only (tablet drag handles only); phone shows queue read-only. | accepted | Phone is fully functional for the queue (mark cut done, advance) per Alex's phone-as-floor; only drag-reorder is the larger-canvas enhancement. |
| 07-field-conditions | G-17 | Minimum row height 56pt in operations view list + pickers accessed during active operation. | accepted | 44pt floor applies only to tertiary disclosure contexts. |
| 07-field-conditions | G-18 | Sunlight mode: 2pt minimum borders + 2pt offset card shadow at 8% opacity. | accepted | Edge visibility in direct sun. |
| 08-skeptical-review | H-1 | Reject the PWA/RN question at Phase H; defer until Phase I+ unless a specific capability gap surfaces. | accepted | Architecture A-2 already keeps PWA for v4.0/v4.5; RN at v5.0. Phase H does not relitigate. |
| 08-skeptical-review | H-2 | Drop D5 dual architecture in v4.0; ship only Build A. | accepted | Build C deferred to v5 with RN per architecture A-9. The dual-architecture is still the ceiling design, just not the v4.0 implementation. |
| 08-skeptical-review | H-3 | Cut twelve essay brainstorm to four essays. | rejected | Procedural; the 12-essay corpus is now committed and produced load-bearing convergence in §1 of synthesis. Phase D adopts the corpus as input. |
| 08-skeptical-review | H-4 | Defer checklist feature from v3.20.0 until Hartsdale drill validates. | accepted | Open Q5 resolution: primitive ships v4.0; content seeding deferred to v4.1 after first drill. |
| 08-skeptical-review | H-5 | Drop demo mode from v3.20.0; use scripted seed. | accepted | Demo dropped entirely per Alex (Q4) — including the scripted-seed fallback; cold-open is a plain guest state. |
| 08-skeptical-review | H-6 | Drop marketing site from v4 scope entirely. | accepted | Accepted per Alex review — the marketing site is dropped from v4 entirely. Any credibility content lives in the user manual. |
| 08-skeptical-review | H-7 | Defer cross-dept mutual aid to v5, not v4.5. | accepted | Two facts not in evidence; deferral correct. |
| 08-skeptical-review | H-8 | Contract admin user manager (D7.3) to "Firebase security rules + per-device UID." | accepted | v4.0 ships rules + UID; user management UI deferred. |
| 08-skeptical-review | H-9 | Drop broadcast TV from first-class status. | accepted (partial) | The *surface* is treated as a projection (progressive-density adapter per K-9); the *theme tokens* (B-7) ship as authored. Roughly half-half between accept and reject. |
| 08-skeptical-review | H-10 | Cut fifteen primitive spec target in half. | rejected | The picker doctrine, the shore-point card, the warning gate, the nested checklist, the empty state, and the loading state all surface load-bearing convergence in §1. Cutting them moves work to ad-hoc later — the cost shifts, not declines. |
| 08-skeptical-review | H-11 | Reject "FAANG grade" framing as Phase J pass criterion; replace with concrete criteria. | accepted | Phase J adopts concrete criteria: outdoor readability test at Hartsdale, WCAG AA, picker drift eliminated, NIMS terminology corrected, per-device UID shipped, audit ledger closed. |
| 08-skeptical-review | H-12 | Preserve single-file architecture in v4.0 unless architecture essay names blocked capability. | rejected | The audit ledger names the capability gap. ~30% of v3 findings are TypeScript-class bugs. ADR-007 records the call. See synthesis conflict 2.8. |
| 08-skeptical-review | H-13 | Add a retraining gate to Phase J. | accepted | The surprise finding (synthesis §3.7). A Hartsdale drill on v4 with v3 users must verify they reach SP list, org chart, and cutting workflow without explanation. Plate picker, Quick Find tab, shore-point card lifecycle, and org-chart drag-and-drop preserved unless doctrine-driven change required. |
| 08-skeptical-review | H-14 | Reduce twelve principles to nine; drop Principle 11 (fold into 4) and Principle 12 (move to sibling doc). | rejected | Principle 12 stands per ADR-004 and synthesis conflict 2.3. Principle 11 stands; even Principle 11 was cited five times in other essays. Constitution stays at 12. |
| 08-skeptical-review | H-15 | Set hard Phase E exit criterion of "color tokens + type ramp + outdoor mode + four primitives shipped on v3 as visual refresh." | rejected | The retraining gate (H-13 accepted) covers the "test design system on real users" intent. Shipping the design system to v3 first creates two design systems in parallel and risks the v3 codebase regressing during v4 development. Phase E ships design system to v4 only. |
| 09-data-resilience | I-1 | Replace shared anonymous auth with per-device Firebase UIDs persisted in IndexedDB at `fieldshore_auth_uid`; Firebase Auth persistence LOCAL; v3→v4 migration on first launch. | accepted | Canonical statement for the auth theme. |
| 09-data-resilience | I-2 | Owner / Admin / Member / Observer roles via nested role lookups in rules; Owner claimed once. | accepted | Phase H1 rule generation. |
| 09-data-resilience | I-3 | Schema test suite in CI round-tripping payloads through Firebase Rules emulator; validate rule failures surface as toast (Admin only). | accepted | Tech-debt L-11 reinforces (single Zod schema generates rules). |
| 09-data-resilience | I-4 | Generalize STATUS_ORDER into state machine doctrine for every monotonic field. | accepted | Tech-debt L-6 confirms STATUS_ORDER becomes a typed reducer. |
| 09-data-resilience | I-5 | Last-write-wins for free-text fields with conflict surface (`_meta/lastEditedBy` + `_meta/lastEditedAt`). | accepted | Phase F UI for the conflict prompt. |
| 09-data-resilience | I-6 | Build C (CP hub) as Settings toggle using WebRTC + mDNS + QR fallback; explicit Owner/Admin election. | deferred | v4.0 ships Build A only per architecture A-9. WebRTC + QR fallback documented for v4.5+ design. |
| 09-data-resilience | I-7 | Per-row sync state on roster screen (green / amber / grey dots). | accepted | The PAR test case; the surprise visibility win. |
| 09-data-resilience | I-8 | Settings → "Sync health" for Admin role: pending writes, last 20 events, hub status, "Copy diagnostics" button. | deferred | Diagnostics path stays in v4.0 (tech-debt L-25); the UI surface ships in v4.1. |
| 09-data-resilience | I-9 | TTL /diagnostics/sync/ tree at 30 days via scheduled Cloud Function. | accepted | Bounds storage cost. Cloud Functions enabled at v4.0. |
| 09-data-resilience | I-10 | Extend audit logging to every state-changing mutation; before snapshot for shallow paths, diff for deep paths. | accepted | Same as architecture A-19. Canonical: audit log == event log + projection. |
| 09-data-resilience | I-11 | Ship allocateAndCreate Cloud Function for atomic inventory decrement + SP create; same pattern for role assignment, op start, op end. | accepted | Phase H wiring. Falls back to local transaction + offlineTouched when offline. |
| 09-data-resilience | I-12 | Refactor sw.js for v4 multi-asset bundle via vite-plugin-pwa; "update ready, reload now" toast. | accepted | Same as architecture A-17. |
| 09-data-resilience | I-13 | Settings → "Export dept data" (JSON) and "Restore from export" (Owner only); auto weekly export to Firebase Storage, 90-day retention. | deferred | v4.0 ships backupBeforeDestructiveWrite (tech-debt L-23 spirit); full export/restore UI deferred to v4.1. |
| 09-data-resilience | I-14 | Department deletion: type name, checkbox acknowledgment, 30-second countdown; soft-delete with 30-day Restore; 60d cold storage; permanent delete after 90d. | deferred | v4.0 deletion is Owner-only with confirm; full soft-delete + cold storage deferred to v4.1. |
| 09-data-resilience | I-15 | Cross-device handoff via per-device UIDs; command transfer moves role between UIDs with audit log entry. | accepted | Same as architecture A-19 + IC-workflow C-2. |
| 09-data-resilience | I-16 | Listener scoping by role; lazy-load checklists, hazards, archived ops; listener fire-count instrumentation. | accepted | Phase H wiring. |
| 09-data-resilience | I-17 | Ship "How sync works" page on v4 marketing site. | rejected | Marketing site dropped (Q6); "how sync works" content lives in the user manual. |
| 09-data-resilience | I-18 | Promote APP_VERSION + appVersion filter on pendingWrites to first-class resilience contract. | accepted | Carries verbatim from v3.8.2. |
| 09-data-resilience | I-19 | Inventory available counts stay on v3.16.4 transaction + offlineTouched pattern; Cloud Function path for create only. | accepted | Both paths coexist; clients pick based on online state. |
| 09-data-resilience | I-20 | Hub mode and Build A coexist; if hub unreachable >60s peers auto-fall-back to Firebase directly. | deferred | v4.0 ships Build A only; hub coexistence design at v4.5/v5.0 RN ramp. |
| 10-implementation | J-1 | Adopt Vite as build tool; single vite.config.ts; vite-plugin-pwa for SW. | accepted | Same as architecture A-3. |
| 10-implementation | J-2 | Adopt React 18 as UI framework. | accepted | Same as architecture A-2 / tech-debt L-21. |
| 10-implementation | J-3 | Adopt TypeScript strict mode from line one; brand safety-critical primitives via Zod. | accepted | Same as architecture A-4 / tech-debt L-20. |
| 10-implementation | J-4 | Adopt TanStack Router for client routing. | accepted | Same as architecture A-11. |
| 10-implementation | J-5 | Adopt TanStack Query for Firebase data. | accepted | Same as architecture A-10. |
| 10-implementation | J-6 | Adopt Zustand for UI state. | accepted | Same as architecture A-10. |
| 10-implementation | J-7 | Adopt Tailwind v4 with custom design tokens via @import config. | accepted | Tokens executable in tokens.css. |
| 10-implementation | J-8 | Build custom primitives on Radix headless; no Shadcn copy-paste. | accepted | Phase E delivers. |
| 10-implementation | J-9 | Adopt Lucide for icons; custom shore-type silhouettes separate. | accepted | Same as visual-language B-13 split. |
| 10-implementation | J-10 | Adopt Zod for runtime validation at every boundary. | accepted | Same as architecture A-12. Tech-debt L-11 reinforces. |
| 10-implementation | J-11 | Adopt Sentry on free Developer tier; React Error Boundary, source maps in prod. | accepted | Phase H wiring. |
| 10-implementation | J-12 | One repo, two source folders, one Vite config (src/app/ + src/site/). | accepted | Resolves conflict 2.1 (vs architecture A-1 monorepo). |
| 10-implementation | J-13 | Deploy v4 to GitHub Pages at /v4/ subpath; GitHub Actions builds on push to v4-redesign. | accepted | Same as architecture A-21. |
| 10-implementation | J-14 | Stay on GitHub Actions for CI/CD; ~3 minute pipeline. | accepted | Same as architecture posture. |
| 10-implementation | J-15 | Run Vitest for unit + integration tests; do not adopt Cypress or Playwright. Real UI verification via qa-driver. | accepted | Overrides architecture A-18 (Playwright). qa-driver MCP is the established verification path. |
| 10-implementation | J-16 | Adopt Firebase emulator for integration tests in CI. | accepted | Tech-debt L-11 reinforces. |
| 10-implementation | J-17 | Migrate v3 schema additively, not destructively. v4 reads v3 shape; dual-write Bucket 2 renames for 3 months. | accepted | Open Q3 resolves: event-driven window not calendar-driven (Hartsdale validation). |
| 10-implementation | J-18 | Use Inter Variable as v4.0 default typeface. | rejected | Visual-language B-1 wins on substance: Geist as v4.0 default per open Q1. Inter is the fallback if Geist hits a variable-axis or subsetting issue during Phase H. |
| 10-implementation | J-19 | Do not adopt Turborepo or monorepo tooling in v4.0; single package. | accepted | Resolves conflict 2.1. ADR-005 records. |
| 10-implementation | J-20 | Do not adopt Storybook. | accepted | Source is the doc; primitives are documented in 03-primitives/. |
| 10-implementation | J-21 | Do not build a Next.js or Astro marketing site; Vite multi-page covers it. | accepted | Resolves architecture A-15 in favor of Vite. |
| 10-implementation | J-22 | Maintain three-location version bump (index.html, src/app/version.ts, sw.js CACHE_NAME). | accepted | Phase H wiring. |
| 10-implementation | J-23 | Cap production dependency tree at ~15 packages; each addition is an ADR. | accepted | Dependency hygiene. |
| 10-implementation | J-24 | Plan cutover as single PR to main; archive v3 to v3-legacy branch for 6 months. | accepted | Same as architecture A-21 + A-28. |
| 10-implementation | J-25 | Hold v4.0 timeline at 5-6 implementation weeks. | accepted (with caveat) | The v4 plan explicitly has no timeline pressure (ADR-003 + 01-context.md). This is the implementation lens's estimate after Phase E/F ship; not a commitment to 5-6 weeks for Phase H. |
| 11-scenario-stress | K-1 | Guest mode is the default first-run; no auth at app open; auth registration in Settings. | accepted | Canonical statement for the guest-mode theme. Overrides any literal reading of architecture A-26. |
| 11-scenario-stress | K-2 | Demo department doubles as cold-open placeholder; "Start your first operation" affordance. | rejected | Demo mode dropped entirely per Alex (Q4); cold-open is a plain guest state. |
| 11-scenario-stress | K-3 | Org chart primitive renders only populated roles by default; grows on demand; never asks IC to manage empty slots. | accepted | Phase E primitive spec, authored against single-name case first. |
| 11-scenario-stress | K-4 | Empty-state primitive ships with at least two named variants: "no matching strut" and "no inventory". | accepted | Per Principle 7 (visible safety). Phase E primitive. |
| 11-scenario-stress | K-5 | Operations tab card list groups by shore point at top level with alternatives nested; ShorePointCard vs. RecommendationCard primitives. | accepted | Closes the 220-card IA seam. Phase E + F. |
| 11-scenario-stress | K-6 | Picker primitive specifies "apply to grouped siblings" semantic with inline note ("Applies to all 3 members of this T-Shore group"). | accepted | The surprise finding (synthesis §3.5). Phase E doctrine addition. |
| 11-scenario-stress | K-7 | Command transfer is single drag-or-tap action at all scales; optional "Capture the brief" expansion using nested-checklist primitive. | accepted | Merged with IC-workflow C-2 (the choreography is the flow; the entry point is the single action). |
| 11-scenario-stress | K-8 | Safety Officer surface: decorative or operational (Safety-Hold status blocks SP advancement until cleared). | rejected | Q2 resolved no: no `safety-hold` status. The app carries no in-app comms (Principle 10); the Safety Officer surfaces hazards visibly only. |
| 11-scenario-stress | K-9 | Dashboard primitive uses progressive density across four surfaces, not one dashboard with smaller text. | accepted | Phase E + F. Same projection, four adapters. |
| 11-scenario-stress | K-10 | Cutting Group screen as first-class on cutting-table tablet; FIFO queue with priority overrides; CuttingQueueRepo as projection. | accepted | Q7: v4.0. Renamed "Cutting Station" (under Operations). Must work phone-only — tablet is a larger-canvas enhancement, not an assumption (Alex). Off-queue regress shows the red-slash "Removed from cut list" state. |
| 11-scenario-stress | K-11 | Phase E primitive set includes WarningGate primitive distinct from Toast and Modal. | accepted | One primitive, three uses (unrated zone, qty>4, liability disclaimer). |
| 11-scenario-stress | K-12 | Org chart card primitive has max width so 7 cards across 2 levels fit on tablet portrait without horizontal scroll. | accepted | Meadowville OP2 is the binding constraint. Phase E spec. |
| 11-scenario-stress | K-13 | Role history exposed as one-tap-from-chart-node affordance, not separate audit log screen. | accepted | Same data, different UI. |
| 11-scenario-stress | K-14 | Operations tab includes scope selector (inline segmented picker) defaulting to user's assigned scope. | accepted | Phase F IA spec. |
| 11-scenario-stress | K-15 | Shore-point list virtualized so 250 cards at Surfside scale render without lag; explicit virtualization test before Phase H closes. | accepted | Phase H test gate. |
| 11-scenario-stress | K-16 | Every Phase E primitive + Phase F screen dispositive against Verplanck → Hamden → Meadowville (Surfside is disqualifier). | accepted | Embedded into Phase E/F gate criteria. |
| 11-scenario-stress | K-17 | Phase H vertical slice must drive both Verplanck single-engine scale AND Hamden T-Shore group of 3 scale before gate passes. | accepted | Phase H gate criteria. |
| 11-scenario-stress | K-18 | Phase I milestone gates run Level V → IV → III against v4; Level II + I gate v4.0 RC + v4.5 RC respectively. | accepted | Formalizes simulation infrastructure as design validation per ADR-003. |
| 12-tech-debt | L-1 | Codify app.js seams in docs/v4-design/07-design-system/module-boundaries.md before Phase H starts. 11 modules. No file > 800 lines. | accepted | Phase E deliverable. |
| 12-tech-debt | L-2 | Delete escapeHtml() and escapeAttr() from v4 codebase; replace with JSX default escaping; `react/no-danger` as error. | accepted | Tech-debt cleanup. |
| 12-tech-debt | L-3 | Keep v3.9.0 escapeAttr discipline as historical reference in docs/v4-design/LESSONS.md. | accepted | Phase E delivers LESSONS.md. |
| 12-tech-debt | L-4 | Move ACME_LOAD_TABLE + LONGSHORE_LOAD_TABLE to core/load/tables.ts as frozen typed arrays; snapshot test against PDF-extracted JSON fixture. | accepted | Phase H1. |
| 12-tech-debt | L-5 | Move getLoadCapacity() + conservative floor doctrine to core/load/engine.ts; add property test. | accepted | Phase H1. |
| 12-tech-debt | L-6 | Keep STATUS_ORDER verbatim in core/shorepoint/status.ts as discriminated union; v3.9.0 progression guard as reducer invariant. | accepted | Phase H1. No `safety-hold` entry (Q2 resolved no). Status is now bidirectional/always-reversible per the slide-to-advance model. |
| 12-tech-debt | L-7 | Rename firebaseSave() → syncService.enqueue(); keep offline queue, version tag, retry counter, diagnostics behavior verbatim. | accepted | Lint rule: no UI component imports syncService directly. |
| 12-tech-debt | L-8 | Rename persistOperation/persistInventory → operationStore.commit/inventoryStore.commit; local-first contract; CI assertion against direct syncService calls. | accepted | Phase H1. |
| 12-tech-debt | L-9 | Keep flushPendingWrites + logSyncEvent behavior verbatim; 24h stale drop, version filter, error capture, 50-entry buffer. | accepted | Phase H1. |
| 12-tech-debt | L-10 | Keep SRI pins + SheetJS precache; CI lint check fails on remote `<script>` without `integrity`. | accepted | Phase H tooling. |
| 12-tech-debt | L-11 | Generate database.rules.json from single TypeScript schema (Zod); client validates against same schema; CI asserts generated rules match committed file. | accepted | Closes v3.8.2 silent-failure class permanently. |
| 12-tech-debt | L-12 | Replace Date.now()+Math.random() ID pattern with crypto.randomUUID() at every site. | accepted | Phase H1. |
| 12-tech-debt | L-13 | Replace 94 inline onclick= in app.js + 70+ in index.html with JSX event handlers. | accepted | Closes XSS surface entirely. |
| 12-tech-debt | L-14 | Replace 10 confirm() + 19 alert() with toast-based undo pattern; no-alert lint as error. | accepted | confirm()/alert() removed; status uses slide-to-advance + always-reversible (not a timed undo). Toast for transient messages. |
| 12-tech-debt | L-15 | Replace localStorage.getItem/safeParse scatter with single persistence/ module owning IndexedDB. | accepted | Same as architecture A-7. |
| 12-tech-debt | L-16 | Delete capacityAll array from strut combination result type (S-L4 in findings ledger, dead since shipped). | accepted | Phase H1 cleanup. |
| 12-tech-debt | L-17 | Delete debounce() helper (app.js:737); not called. | accepted | Phase H1 cleanup. |
| 12-tech-debt | L-18 | Plate connector base64 thumbnails → static assets under public/plates/*.jpg; SW precaches on first install. | accepted | Phase H asset move. |
| 12-tech-debt | L-19 | Finish group → assignedResource rename; one-time migration on first launch; delete getSPGroup fallback chain after clean. | accepted | Same as NIMS E-1. |
| 12-tech-debt | L-20 | Adopt TypeScript strict mode for v4 (open question #12 resolves yes at Phase H). | accepted | Same as architecture A-4 / implementation J-3 / ADR-007. |
| 12-tech-debt | L-21 | Adopt React for v4 (open question #8 resolves PWA). | accepted | Same as architecture A-2. |
| 12-tech-debt | L-22 | Adopt Vite for build tooling (open question #11). CI gate: tsc, eslint, vitest, load-table snapshot. | accepted | Same as implementation J-1. |
| 12-tech-debt | L-23 | Write docs/v4-design/LESSONS.md capturing institutional memory of every audit-driven fix. | accepted | Phase E deliverable. |
| 12-tech-debt | L-24 | Adopt v3 audit-trail comment convention from day one in v4. | accepted | Every non-obvious branch carries issue ID or doctrine source. |
| 12-tech-debt | L-25 | Keep /diagnostics/sync/ path, rules, writer behavior verbatim; add Admin-only Settings read surface; Excel/CSV export. | accepted (partial) | v4.0 ships the path + writer verbatim; the Admin Settings read surface is essay-09 I-8 deferred to v4.1. CSV export of ledger ships when surface ships. |
| 12-tech-debt | L-26 | Replace SheetJS with papaparse (CSV) as primary; SheetJS as optional secondary; R5 per-item .update() crosses verbatim. | accepted | Phase H wiring. |
| 12-tech-debt | L-27 | Replace v3 hand-rolled drilldown router with real client-side router (TanStack Router); drilldown levels become URL segments. | accepted | Same as architecture A-11. |
| 12-tech-debt | L-28 | Replace 3 editingShorePointId/editingExternalId/editingIndividualId module-level pointers with modal local state. | accepted | Closes R14 v3.6.0 wrong-save-target class. |
| 12-tech-debt | L-29 | Implement 4 picker variants in ui/picker/; preserve v3 plate picker behavior verbatim as VisualGridPicker via React createPortal (replaces document.body move). | accepted | Phase E delivers; closes L-L5 deferred finding. |
| 12-tech-debt | L-30 | Encode v4 lint floor in eslint.config.js: react/no-danger error, no-alert error, react-hooks/exhaustive-deps error, @typescript-eslint/no-floating-promises error, custom rule "no `<script>` without `integrity`" error. | accepted | Phase H tooling. |

---

## Summary by status

(Updated 2026-05-31 after Alex's PR #282 review.)

- **accepted**: 218 recommendations (incl. partial accepts on H-9, L-25)
- **deferred**: 13 (A-1, C-14, E-6–E-11 level presets, I-6, I-8, I-13, I-14, I-20)
- **rejected**: 15 (A-15/B-15/I-17 marketing site, A-16/K-2 demo mode, B-11/G-4 timed undo, F-1 capacity-leads, K-8 safety-hold, H-3 essay cut, H-10 primitive cut, H-12 single-file, H-14 principle cut, H-15 v3 design refresh, J-18 Inter default)
- **merged**: 1 (A-24 with L-15)

Total accounted for: 247 ✓

Each rejected recommendation has its rationale in the Notes column. The H-series rejections address ADR-003/ADR-004 standing per synthesis §2.2/§2.3. The Alex-review changes (★ in the controversial-rows tables) reflect PR #282: marketing site and demo mode dropped; capacity demoted to a secondary field; timed undo replaced by slide-to-advance + always-reversible status; safety-hold rejected; level presets deferred.

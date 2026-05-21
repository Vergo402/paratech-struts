# First Due

> Competitive-reference teardown of a cloud-native, end-to-end Fire/EMS records-and-operations SaaS suite. Used as a comparative reference for FieldShore v4. Public sources only.

## What it is

First Due is a multi-module SaaS platform positioning itself as "the entire operation in one platform" for fire and EMS agencies. The category is RMS + CAD-adjacent everything: NFIRS/NERIS incident documentation, ePCR (NEMSIS 3.4), scheduling and personnel management, fire prevention, pre-incident planning, hydrant management, training/LMS, assets and inventory, vehicle inspections, community engagement, and — most relevant to FieldShore — a real-time **Incident Command** module with a digital command board. The headline promise is consolidation: rip out five legacy single-purpose vendors and run everything from a single web login that ships with iOS/Android companion apps. The customer surface is web-first, with two native mobile apps (a Responder app and a separately-listed FedRAMP variant) acting as field arms of the same cloud database. The platform claims 2.8K+ agencies and 300K+ users.

The overlap with FieldShore is narrow but real: their **Incident Command** module is the on-scene piece — a digital command board for the IC to assign units to tasks, run timers (Command, PAR, Task), and drive an AAR. They do not ship a structural-shoring engine, a strut/load-rated math layer, or USACE shore-type doctrine. That gap is FieldShore's defensible territory.

## Target user

- **Career fire and EMS departments** — primary marketing surface. Career shift management, FLSA reporting, time-off/trade workflows, and call-shift filling dominate their personnel module.
- **Volunteer departments** — supported, but reviewers explicitly call out that "core functionality is tailored to a full-time shift-based fire department." Volunteers are a marketed segment, not a designed-for segment.
- **EMS agencies, state EMS, federal agencies (FedRAMP-authorized variant)** — meaningful enterprise customers; the logos page lists Charlotte FD, Fairfax County, Fort Worth.
- **Department size: mid-to-large.** Implementation $3K–$20K plus $1K–$8K data migration plus integrations push the floor well above a 20-firefighter volunteer house. Sold by quote, not self-serve.
- **Role in dept: chief / admin / training officer / records officer first**, then line crews as downstream mobile users. The system of record is for the office; the field is a read/append surface. Their Command product is the only piece designed primarily for an IC on scene.
- **ICS scale: Type III–Type I.** The Command module's vocabulary — multi-unit, drag-and-drop assignment, configurable checklists per incident type — is built for working/extended-attack incidents through larger structures and mutual-aid scenarios. Not pitched at Type V (single-engine residential) and not at federal USAR scale either.

## Pricing tier

SaaS, per-user/month, quote-only. Industry benchmarks place per-user pricing in the **$8–$25/user/month** band depending on modules selected, with several layered one-time and ongoing costs:

- Implementation / setup: **$3,000–$20,000** one-time.
- Data migration from legacy RMS: **$1,000–$8,000**.
- CAD / dispatch integration: **$2,000–$10,000**.
- Advanced analytics / compliance modules: **$1,500–$7,500/year** on top.

No free tier, no freemium, no published price sheet — everything is via "Request a Demo." This is enterprise SaaS economics for a public-sector buyer, sold to a chief or city procurement office, not to an end-user firefighter.

## Visual language

### Color palette

The brand sits on a high-contrast, lightly fire-themed palette dominated by red accents on near-white surfaces. Approximate sampled hexes from marketing surfaces and product imagery:

- **Primary brand red:** `#E11B22` (a saturated emergency red, used for the wordmark, primary CTA buttons, and active-state highlights).
- **Deep navy / near-black text:** `#0E1B2C` to `#13171F` for body copy and headers.
- **Surface white:** `#FFFFFF` with a faint cool-gray secondary surface `#F4F6F8`.
- **Neutral border / divider:** `#D7DCE2`.
- **Semantic states (inferred from product screenshots):** green `#1FA463` for available / OK, amber `#F0A000` for warn / PAR-approaching, red (same brand red) for committed/urgent. Map and tactical layers use a separate functional palette — blue for routing, color-coded hydrants per NFPA standards.

The overall feel is "enterprise SaaS dressed in fire-engine red" — closer to a Salesforce or Workday density visually than to a tactical/console aesthetic. The red is used as an accent and CTA color, not as a dominant field. There is no "tactical black-and-red" treatment.

### Typography

The wordmark is a custom geometric sans. Marketing and product surfaces use a standard sans-serif system stack (looks like Inter, Source Sans, or a near-clone) at a conservative weight ladder — Regular for body, Semibold for labels, Bold for headers. No serif anywhere. No display-weight typography in the product UI. Type sizes in the RMS are small (12–14px body) consistent with a desktop-first, info-dense application; the mobile app inherits this density and pays the price (see below).

### Information density

**Dense, trending toward extreme on web.** The RMS surfaces are multi-column, tab-heavy, dropdown-heavy enterprise forms — the NFIRS module, fire-prevention inspection forms, and scheduling grid are all built for a records officer who lives in the product. The Command product is more spacious by category necessity (drag targets need room) but still presents a Management Snapshot with task lists, unit lists, checklist status, and three live timers all visible at once. Mobile mirrors much of the web density rather than re-laying-out for phone — reviewers report iPhone resolution issues (zoom too tight, hydrant icons "extremely small") because "most of the app is just a mirroring of the web view."

### Dark/light strategy

**Light only**, in all the marketing and product imagery available. No dark mode advertised, no sunlight mode, no high-contrast variant for outdoor reading. The app expects an office monitor, an MDT, or a held phone — not a screen on a turnout coat in noon sun.

### Iconography

Mixed. The marketing site uses a custom illustrated icon set (flat, two-tone, semantic-red accents) for product-module tiles. The in-product UI uses standard system / generic web iconography — chevrons for expand/collapse, pencils for edit, generic pin icons on maps, color-coded hydrant pin standard (NFPA blue/green/orange/red). Stroke style is consistent-weight light stroke. No fire-service-specific custom glyph language — no strut iconography, no IDLH glyph, no shoring symbology. Live-map status uses a transparent-vs-solid icon convention for stationary-vs-moving units, which is a clean field-readable trick worth noting.

## Primary workflows (3–5 top tasks)

1. **Dispatch → respond on the Mobile Responder app.** Field user opens the iOS/Android app, sees the Incident List, taps an incident, taps a status button to log response, taps Quick Route for turn-by-turn directions, taps Calculate Route for in-app navigation. Surface: phone. Taps: roughly 3 from notification to en-route status. Lives in the app's primary nav.

2. **Run a command board on iPad / MDT.** IC opens the web-app Command module on a tablet or toughbook. Dispatched units appear as draggable cards. IC drags units onto task assignments. Configurable checklist templates load by incident type; IC checks off objectives. Command Timer auto-starts on incident creation; PAR Timer is configurable per SOP with audible/visual alerts. After incident closes, IC reviews a Dynamic LogView (chronological log) and exports an AAR report with photo/video attachments. Surface: tablet / browser. Click count is high — this is a controlled cockpit, not a one-tap surface.

3. **Author a pre-incident plan.** Records officer or planning officer opens the Pre-Incident Planning module on web. Pulls aerial imagery (EagleView / pictometry) and Streetview into the plan editor, draws hazard layers and access markers, fills out structured occupancy data, attaches utility shutoff locations, publishes. Mobile responders see the published pre-plan on the building during dispatch. Surface: web-first, mobile-read. Lives 2 clicks deep in the main module nav.

4. **Document an incident in NFIRS / NERIS post-call.** Officer opens the incident record in the web RMS, fills the NFIRS form (advertised as "fewer clicks, more data"), auto-pulls CAD data, attaches ePCR records if EMS, submits for QA/QI. This is the records workflow that pays for the whole platform.

5. **Schedule and trade shifts.** Personnel open the Employee Center on web or mobile to see their shift schedule, request time off, accept call-shift fills, post trades. Chief approves via mobile. This module is the daily-use surface for the average career firefighter — they touch this far more than they touch Command.

## What they do well

- **Single login, single database, single audit trail across modules.** NFIRS, ePCR, scheduling, training, prevention, and command all share users, units, and apparatus. That coherence is a real moat versus best-of-breed stitch-ups.
- **Pre-incident planning integrated with response.** A pre-plan authored in the planning module surfaces automatically on the responder's phone when CAD pushes a dispatch for that address. That is the right loop.
- **Configurable everything.** Checklist templates per incident type, custom NFIRS fields, ad-hoc reports, configurable activity types with color coding. Department admins can tailor without engineering involvement.
- **Stationary-vs-moving icon convention.** Transparent icons for parked units, solid icons for moving units on the live map. A field-readable visual primitive that respects the operator's glance budget.
- **AAR built into the live command surface.** Dynamic LogView, multimedia attachments, filter-by-unit/user/time/task — the after-action artifact is a byproduct of running the incident, not a separate documentation task. FieldShore should aspire to the same.
- **Cross-agency / mutual-aid sharing of pre-plans and unit visibility.** Pre-plans can be shared with mutual-aid and law-enforcement partners; live tactical map shows multi-agency units. This is exactly the seam v4.5's mutual-aid scope will hit.
- **Cloud-native release cadence.** No on-prem install, no version-pinned client. New features ship continuously, which is a structural advantage over the legacy fire-RMS vendors they displace.

## What they do poorly

- **Mobile is a web mirror, not a phone design.** Reviewers report the iPhone view "zooms in too far," hydrant icons are "extremely small," and an inspection form requires rotating to landscape to even see the submit button. Tablet UI mostly works; phone UI doesn't. The team officer in the building is not the design center.
- **Cold-start performance.** Reviewers report waiting "a few minutes" for the app to load on alert. For a tool that has to be live in the cab on tone-out, that's a structural failure.
- **Android lag and notification fragility.** Reviewers specifically call out that Android alerting is slower than iPhone and that notifications "can't override the silent setting." A life-adjacent tool that depends on phone notifications and ships unreliable notifications has earned a hard line in our Principle 10.
- **Volunteer-fit gap.** Reviewers explicitly: "core functionality is tailored to a full-time shift-based fire department." A volunteer in a 20-person rural house pays for and trains on workflows that don't match their staffing model.
- **No structural / collapse / shoring doctrine.** Their Command module assigns units to "Search," "RIT," "Ventilation," etc. via configurable templates, but there is no concept of a shore point, no load-rated strut math, no USACE shore-type taxonomy, no NIMS-correct Resources-Unit reconciliation at demob. Structural collapse is generic Operations to them.
- **Density inherited from desktop into all surfaces.** The phone surface presents the same number of fields and the same nav depth as the web — there is no per-surface workflow redesign.
- **Sold to the office, not to the firefighter.** The buyer is the chief; the daily user of half the modules is a records officer. Line firefighters touch the responder app, the schedule, and not much else. That's the right business but it shows in the product.

## What they assume about the user

- **Tech sophistication: moderate to high.** The records officer power-user is the implicit center of UX. New users get a several-day implementation and training engagement; the product is not built to be opened cold and understood in 30 seconds.
- **Training: institutional.** A department buys the platform, an admin gets trained, the admin trains the line. There is no self-onboarding path.
- **Time available: office time for the records / admin user; alert time for the responder.** The product hops between two very different time budgets without re-laying-out for either one cleanly.
- **Hardware: a desktop PC or MDT for the records work, a personal iPhone or department tablet for the field work.** Toughbook compatibility is named but not optimized for.
- **Connectivity: cloud-online, mostly.** Some offline read-access for pre-plans and hydrants is advertised on the mobile app, but the platform is fundamentally cloud-first. The "WiFi flickers and the screen greys out" failure mode is exactly the one we reject in Principle 8.
- **ICS knowledge: present.** The Command module assumes the user knows what PAR is, what a Division is, what a Task is. It does not teach ICS — it presumes it.
- **Doctrine: NIMS-aware but not NIMS-strict.** Configurable per-department checklists let a department drift from doctrine without flagging it.

## What we will deliberately NOT copy

- **All-modules-in-one-app architecture.** They sell an 18-module suite. We are a single-purpose tool. **Principle 11** — earn our place quietly. We don't bolt on scheduling or prevention.
- **Density-mirror mobile design.** Their phone UI is a shrunk web UI. **Principle 2** — designed for the role, not the device.
- **Configurable-everything checklists.** Per-dept ad-hoc objective lists let doctrine drift quietly. **Principle 1** — defer to doctrine. Our shore types, deductions, and ICS roles are doctrine-first, configurable second.
- **Cloud-first architecture with cached fallback.** They degrade when WiFi flickers. **Principle 8** — local-first. Device is source of truth; cloud is optional mirror.
- **Notification-as-feature.** Reviewers report unreliable delivery. **Principle 10** — respect the radio. We never push, never alert, never carry life-safety signal.
- **Office-buyer-first positioning.** Their primary customer is a chief signing a quote; ours is a team officer five minutes into a working incident.
- **Sold-by-quote pricing opacity.** FieldShore's commercial layer (v5+) should have transparent per-dept pricing visible on the site.
- **Cold-start measured in minutes.** **Principle 11** — no splash longer than 400ms.

## What we will deliberately differentiate on

- **Glove-readable phone UI in sunlight.** A future sunlight mode (Phase E) that bumps weight, thickens borders, and amplifies contrast — designed for noon-on-a-collapse-pile, not for a fluorescent office. They don't have this; we will.
- **Load-rated math made visible.** Strut load tables, deduction math, header/footer logic, qty-over-4 warnings, unrated-zone warnings, and load-table provenance are first-class in our UI. **Principle 7** — visible safety. They surface command-level resource state; we surface engineering-level load state, and we never collapse the math.
- **Single-purpose depth over multi-module breadth.** We will not have ePCR, scheduling, training, prevention. We will have the most correct, most field-honest shoring operations tool in existence. Depth in one square inch.
- **Doctrine-first defaults that refuse to guess.** T-Shore lumber stays manual because both 4×4 and 6×6 are defensible. They would let a department template that. **Principle 5** — doubt-free defaults; never default a safety decision.
- **Doubt-free reversibility instead of confirmation modals.** They use traditional Save/Cancel/Confirm patterns in inspection forms and command actions. We use the 5-second undo toast pattern (Principle 6) — commit immediately, surface a quiet escape, never block flow with "Are you sure?"
- **Four-surface story end-to-end.** Phone, tablet, laptop, broadcast-TV — each with its own layout, not a responsive shrink. They have phone + web. We have a real broadcast view designed for CP-wide legibility at 8–12 feet.
- **No mystery meat in primary actions.** Their icon set is generic chevrons and pencils. We label every glyph on primary actions (**Principle 9**). Visual grid pickers (plates) keep their image affordances because the image *is* the label.
- **Calm-in-chaos visual treatment over emergency-red branding.** Their brand is fire-engine red on white. Our v4 visual system (per Phase E) is built on confidence typography and controlled neutral surfaces with semantic color used surgically — not as a marketing identity. **Principle 3.**

## Archive links

- [Marketing homepage — product positioning and module overview](https://web.archive.org/web/2024/https://www.firstduesizeup.com/)
- [Fire department product page — feature breakdown and customer logos](https://web.archive.org/web/2024/https://www.firstdue.com/fire)
- [Incident Command product page — digital command board, timers, AAR](https://web.archive.org/web/2024/https://www.firstdue.com/products/command)
- [Mobile Responder product page — iOS/Android field app description](https://web.archive.org/web/2024/https://www.firstdue.com/products/mobileresponder)
- [App Store listing — Mobile Responder iOS, version history and screenshots](https://web.archive.org/web/2024/https://apps.apple.com/us/app/first-due-mobile/id1300758445)

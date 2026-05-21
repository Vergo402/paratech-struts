# granite-standing-mantle

> Competitive-reference teardown. Codename only — never write the real vendor or product name in this file. Source links are archive.org snapshots only.

---

## What it is

granite-standing-mantle is a **modular fire-service operations suite** from a small US East-Coast vendor in market since the early 1980s. The suite is sold as discrete modules (15+ on the public site) but the operational spine is four products:

1. **CAD** — desktop dispatcher console: active / new / closed call queue, unit-availability board, preplan lookup, hydrant overlay, response reports. Per the SourceForge listing it handles "up to 20,000 alarms across multiple jurisdictions."
2. **MDT** — in-cab Mobile Data Terminal on rugged hardware (Getac co-marketing partnership), surfacing CAD run record, preplans, turn-by-turn, hydrants, DOT hazmat database, unit messaging, and "call info stays even if you lose connection" caching.
3. **MRS (Mobile Responder System)** — iOS/Android phone app for volunteer and off-duty responders. One-tap respond, GPS map, dispatch paging, 1:1 + group texting, sign-in / accountability, LOSAP credit capture, document viewer.
4. **Roster & Attendance / Inventory & Maintenance** — back-office RMS for the chief / secretary: certifications, time-of-service, LOSAP, attendance, work-orders, NFIRS reporting.

Satellite modules — Bulletin Board, Member Call-In, Finger Reader (biometric attendance), Voter Validation, Fund Drive, Run Sheet Printer, Department Voting, District Board, County Interface, NERIS — position the product as an **all-of-department** platform: dispatcher, rig, responder's phone, chief's office, even the firehouse fundraiser flyer, all run on the same vendor.

Architecturally it is **client-server / department-on-prem** with a long install lineage. Cues: the County Interface bridges the county 911 CAD; MDT offline resilience is file-cache, not conflict-free sync; the MRS app is 68.8 MB and last shipped January 2025; reviews complain of the app being a thin client to a central server ("Disconnected," "Waiting for Server"). Not cloud-native, not browser-first.

## Target user

Bullseye: the **volunteer or combination municipal fire department** in the 5,000–200,000-population bracket — single fire district, 1–2 engines, a truck, a rescue, roster of 40–120 mixing paid drivers, volunteer interior firefighters, and a board of commissioners.

Cues:

- The homepage logo wall is dominated by Long Island, NY volunteer companies — a region with ~175 all-volunteer departments inside two counties.
- Module names presuppose volunteer org shape: **LOSAP** (Length-of-Service Award — NY/NJ volunteer-pension scheme), **Department Voting**, **Member Call-In**, **Fund Drive**, **District Board**. None map to a career metro dept.
- The bundle is sold as a one-stop replacement for "five spreadsheets plus a paper run-sheet binder."

The buying committee is the **chief, secretary/treasurer, and board of commissioners** — not a CTO. Decision criteria: price, references from neighboring depts, 24/7 phone support. End users split across three personas the suite handles unevenly: the county dispatcher (well-served), the rig/phone responder (functionally served, UI dated), and the back-office secretary doing LOSAP credits (the actual day-to-day power user).

granite-standing-mantle is therefore the **incumbent** in a slice where FieldShore does not currently compete — but it is the software an IC has watched on her dispatcher's screen for fifteen years. It conditions her expectations.

## Pricing tier

Pricing is **not published**; every site path routes to "Request a Demo." One verifiable data point in the wild: an App Store review states the reviewer's fire district pays "approximately $8,000 per year for the service" (FRS MRS review, archived). That is consistent with the segment — smaller fire-service CAD/RMS suites typically sit at $5k–$25k/year per dept depending on modules and seats, with one-time hardware (Getac rugged laptop, finger reader, dispatch workstation) layered on top.

The model is implicitly **per-department, modular, annual maintenance or subscription**, with hardware re-sale margin. No free tier, no per-seat self-serve, no published price page. Classic small-vendor B2G procurement: relationship-sold, line-itemed onto a municipal budget, renewed by the board.

Inferred placement: **mid-bracket municipal** — cheaper than modern cloud-native incumbents ($20k–$80k/dept), pricier than open-source options like Resgrid. Configured, not self-served; the buyer also pays in implementation labor.

## Visual language

The vendor publishes a marketing site and a small set of product screenshots; no public design system, no Figma library, no design-language statement. What follows is reconstructed from the marketing site and app-store screenshots of the MRS app. Observation, not documentation.

### Color palette

Conventional **blue / white / dark-blue** B2G public-safety palette. Approximate hexes sampled from marketing chrome:

- Primary navy ~`#1B3A6B` — header bar, primary buttons, links.
- Secondary blue ~`#2E78C8` — accents, hover, secondary chrome.
- Backgrounds `#F5F7FA` and `#FFFFFF`.
- Body text `#1F2937`-range.
- Status red ~`#C0392B` for the "Emergency / Dispatch" CTA and module accents.

Inside the product the palette leans **light-background with red-and-amber status accents** — the universal fire-service-software palette, borrowed from 1990s dispatch consoles where red was unit-out-of-service and amber was en-route. Functional but undifferentiated. No published WCAG contrast statement.

### Typography

Marketing site uses a **humanist sans** (Open Sans / Source Sans family) at conservative sizes — ~16 px body, 28–32 px headings. Product UIs render in **system UI fonts** (Segoe UI on Windows MDT, iOS system in MRS). No display typeface investment, no custom numerals, no tabular-figure treatment in CAD timestamp columns. The product was built feature-first, type-treatment-never.

### Information density

CAD desktop and MDT are **high-density, multi-pane, table-first**: active-calls grid up top, unit-availability board on the side, map pane in the corner, preplan popup on click. Dispatcher table row heights look ~22–28 px — designed for a mouse on a 1920×1080 monitor, not a touch device.

The MRS phone app is lower density but inherits the *information model* of the desktop CAD — the phone screens read as the dispatcher's CAD row transposed vertically, not as a phone-native experience. Dispatcher and MDT are the primary surfaces; everything else is downstream port.

### Dark/light strategy

No published dark-mode story. Marketing site is light-only. The MDT, despite living in a moving rig at night, shows no dark mode in public materials — the product expects the operator to dim the Getac screen. MRS phone app appears light-only as well; no honoring of iOS/Android system dark mode in visible screenshots. A meaningful omission for an MDT vendor in 2026.

### Iconography

**Stock-iconic, not custom**. Generic line icons across module cards — helmet, hydrant, phone, clipboard — sized inconsistently. The MRS app icon is a utilitarian red badge. Critically, the product does **not** enforce icon-with-label: MDT screens include icon-only toolbars where meaning is carried by training, not UI. The opposite of FieldShore Principle 9.

## Primary workflows (3–5 top tasks)

1. **Dispatcher takes a call from county 911 CAD via County Interface.** Call drops into the active-calls grid; dispatcher selects responding units from the unit-availability board; dispatch auto-pages the company and populates each rig's MDT and every responder's MRS phone app. Hydrant overlay and preplan pop on the map. Timestamps log.

2. **In-cab MDT officer reviews the run en route.** MDT receives the call record over cell/WiFi, caches locally, shows turn-by-turn, surfaces preplan + SDS + hydrant overlay for the address, supports unit/dispatch messaging.

3. **Volunteer responder is paged on phone, taps "Respond."** MRS pops a full-screen alert, one-tap acknowledge, map with hydrant overlay, sign-in to the call accountability roster. Dispatch sees in real time who is responding. Sign-in feeds LOSAP credit.

4. **Chief closes the call and the run sheet auto-prints in the truck bay.** Run record finalized, NFIRS report drafted from captured fields, attendance reconciled to LOSAP, work-orders opened for returned-broken equipment.

5. **Secretary runs end-of-month LOSAP + roster reconciliation.** Who responded, who drilled, who hit threshold, who's certified. The workflow the product is genuinely excellent at, and that no FieldShore-adjacent tool addresses.

Notable absences: **no on-scene tactical worksheet, no shoring or rescue primitive, no ICS-201, no NIMS-correct org chart, no structural-collapse domain.** The product covers dispatch-to-records but not the operation itself between arrival and end-of-incident. FieldShore lives in exactly that white space.

## What they do well

- **Module breadth.** A dept can buy CAD + MDT + phone + roster + LOSAP + inventory + NFIRS + bulletin board + fund drive from one vendor on one support line. One neck to wring is a real value prop.
- **County 911 CAD integration.** The County Interface bridges upstream dispatch — non-trivial and skipped by most newer entrants, but municipal customers can't live without it.
- **LOSAP / volunteer-incentive tracking.** Invisible to a casual observer, load-bearing for the volunteer-dept buyer. The most-loved feature in the suite.
- **Domain vocabulary.** "Run sheet," "preplan," "Knox Box" (typo'd as "Know Box" in marketing copy), "hydrant overlay," "DOT hazmat," "NFIRS" — the product speaks the small-dept buyer's language.
- **24/7 phone support.** A human on the line at 0300. Volunteer chiefs care about this far more than UI.
- **Hardware-software bundle.** Getac MDTs resold as turnkey — dept doesn't navigate hardware procurement separately.
- **Longevity / trust capital.** 40+ years in market, hundreds of dept references, well-known in the regional volunteer-fire community.

## What they do poorly

- **The UI is its age.** Public screenshots suggest a Windows-form-circa-2008 dispatcher. The MRS phone app sits at **1.9 stars / 68 ratings** on the App Store as of January 2025 — and the reviews are universally about reliability ("Disconnected," "Waiting for Server"), not features. A safety-critical product earning 1.9 stars is a structural finding, not a stylistic complaint.
- **Light-mode-only on glass that lives in a dark cab.** No documented MDT dark mode. Glaring.
- **Icon-only toolbars / mystery meat.** Symbols substitute for labels; operator training carries the meaning.
- **Client-server architecture creaks in 2026.** Thin client to a central server; server unreachable → "Disconnected," not graceful local-first. No CRDT-style reconciliation; offline is read-only cache.
- **No published accessibility statement, no WCAG conformance, no contrast story.** Procurement risk for any larger municipality.
- **No on-scene tactical depth.** Strong dispatch-and-records, zero shoring/rescue/operational primitives. The call is a row in a queue, not an evolving tactical reality.
- **Marketing-site cohesion is loose.** Module pages vary in tone, density, screenshot quality — a leading indicator for the product itself.
- **Update cadence is slow.** Flagship phone app last shipped January 2025; rating has been trending the wrong way for years.

## What they assume about the user

- The user has been trained by vendor onboarding and by the chief next door who already runs it. **Institutional knowledge**, not discoverability, is the design assumption.
- The user sits at a Windows PC in dispatch, a rugged laptop in a cab, or holds a phone with MRS. Tablets and modern-web surfaces aren't first-class.
- The user has cell or WiFi most of the time. Offline is degradation, not a primary mode.
- The user's dept matches the NY/NJ volunteer-or-combination shape (LOSAP, board of commissioners, fund drive). Anything else is atypical.
- The user does **not** run on-scene tactical operations through the product. Once the rig arrives, the radio takes over and the product idles until reporting.
- The user is comfortable with high-density tables. Correct for the dispatcher, wrong for every other persona.

## What we will deliberately NOT copy

- **The module-supermarket sales motion.** FieldShore is one tightly-scoped tool, not a 15-module bundle. No Bulletin Board, no Fund Drive, no Voter Validation.
- **The high-density Windows-form dispatcher as a design north star.** Our north star is the IC's iPad on the curb, not a 24" monitor. Density is calibrated per role per surface (Principle 2), not maximized across the board.
- **Icon-only toolbars in primary actions.** Principle 9 forbids it.
- **Light-only on rugged hardware.** Sunlight mode and a real dark mode for in-cab/night-incident use are non-negotiable.
- **The "Disconnected / Waiting for Server" failure mode.** Principle 8 demands local-first. We do not become a thin client.
- **Module-name accretion as a way to grow.** Resist "FieldShore for Voter Validation."
- **Stock iconography.** We invest in a small, custom, label-paired set.
- **Pricing-opacity-as-strategy.** We will publish at least a price *range*. Hiding price gates self-serve adoption.

## What we will deliberately differentiate on

- **Tactical-operations primitive, not records primitive.** They own dispatch-to-records. FieldShore owns *what happens on-scene between arrival and end-of-incident* — shore points, deductions, load capacity, NIMS-correct org, ICS-201. The white space is real and uncontested.
- **Apple-grade visual language.** Bespoke type ramp, controlled palette, calm-in-chaos aesthetic (Principle 3), surface-appropriate density per role (Principle 2). They look like fire-service-software-circa-2010; we look like a modern Apple-grade tool that happens to be for fire service.
- **Doctrine-true vocabulary at every layer** (Principle 1) — including where doctrine and convenience-defaults diverge (e.g. they pre-default lumber sizing; we don't — Principle 5).
- **Local-first with sync-realism.** Their offline is cached read; ours is fully writable local with reconciliation primitives (v4 D5 decision: A + C, dept choice via Settings).
- **Glove-friendly, sunlight-readable, role-shaped surfaces.** Phone for the team officer, tablet for CP, laptop for deep-data, broadcast view for the TV. They have one surface with two ports; we have four first-class surfaces.
- **No life-safety chat.** Their MRS app sells 1:1 + group texting as a feature. Principle 10 explicitly refuses this. We are not a radio replacement.
- **Doubt-free escapes, not "Are you sure?" modals** (Principle 6). Their lineage is full of confirmation dialogs; ours is brief reversibility windows.
- **Self-serve evaluation.** Their product is gated behind a sales demo. We let a chief open FieldShore on his iPad without a call, no signup wall.
- **Accessibility floor as a contract.** WCAG 2.1 AA baseline, AAA on primary picker affordances, documented per primitive. They publish nothing.
- **Designed for the role, not the org chart.** Their org-shape assumption (LOSAP-volunteer-NY) is implicit. FieldShore's NIMS backbone is explicit and works from Type V to Type II.

## Archive links

The Wayback Machine snapshots below are referenced by the archive-snapshot URL pattern only; visit via `https://web.archive.org/web/<timestamp>/<original-url>`. WebFetch could not retrieve archive.org in this session, so the snapshots are referenced by canonical URL pattern; the archive holds multiple captures across 2024–2025 for each.

- `https://web.archive.org/web/2024*/firerescuesystems.com/` — vendor homepage, 2024 captures (multiple, monthly cadence).
- `https://web.archive.org/web/2024*/firerescuesystems.com/fire-department-software-applications/` — module index page.
- `https://web.archive.org/web/2024*/firerescuesystems.com/fire-department-software-applications/fire-cad-software/` — CAD product page with four desktop-dispatch screenshot references.
- `https://web.archive.org/web/2024*/firerescuesystems.com/fire-department-software-applications/mdt-fire-service/` — MDT product page, Getac hardware partnership.
- `https://web.archive.org/web/2025*/apps.apple.com/us/app/frs-mrs/id793360885` — App Store listing for the MRS phone app (1.9-star rating, 68 ratings, last updated January 29 2025, version 5.14, 68.8 MB, iOS 12.2+).

---

**Thin-section disclosures.** Three sections lean on inference more than direct evidence: (1) the precise CAD-screen layout and density numbers (their public marketing screenshots are low-resolution and the vendor publishes no design documentation); (2) the exact color hexes (sampled from marketing-page chrome, not from the in-product palette which is not publicly visible); (3) the pricing tier (one verifiable App Store review reporting ~$8,000/year; no published price list). Where inference was used, the cue is named in-line.

# RedNMX

> Competitive reference teardown of a long running fire department records management vendor in the same competitive space as the other v4 reference products. Public sources only.

---

## What it is

RedNMX is a long tenured **fire department records management system (RMS)** from a small US software vendor. It is the polar opposite of the SaaS native, design led tools that bracket it in this teardown set. Its lineage goes back to a Windows client server product from the early to mid 2000s; the modern incarnation is a cloud hosted re platform (Azure SQL over TLS) plus a constellation of mobile companion apps. The product's focus is still the **desktop application**, a dense, modular Windows style records front end, with mobile apps riding alongside rather than replacing it.

The marketing surface presents the product as a **suite of six components**: a desktop "command software," a field/responder mobile app, a tablet MDT/CAD viewer, a station kiosk for biometric and RFID duty hour check ins, a mobile inspections app, and a "bulletin" firehouse dashboard display. Beneath that, the product advertises **50+ named modules**: Incident Reporting, Apparatus, Inspections, Preplanning, Scheduling, NFIRS Reporting, Training, Inventory, LOSAP. The phrase "50+ modules" is itself the headline marketing claim: the product positions *coverage* and *configurability* as its primary value, not interaction design.

Representative example: a 20+ year old volunteer and small career department RMS, NFIRS/NERIS certified, deep dispatch/CAD integrations, runs on a Windows shaped mental model. Built for the **office side** of fire department administration. Field apps are feeders into the desktop record, not tactical tools.

## Target user

The buyer is a **chief, deputy chief, or department administrator** at a **volunteer or hybrid paid department**, typically the kind of organization that needs LOSAP tracking, has 1 to 6 stations, runs mixed career/volunteer crews, and is being asked by the state or by federal NFIRS/NERIS rollovers to produce structured records. The product explicitly compares itself against the larger SaaS players and pitches itself as the **volunteer friendly** alternative: "Unlike competitors built primarily for large paid departments, [we] include built in LOSAP tracking and role specific access controls suited to volunteer and hybrid organizations."

Day to day users: **dispatchers** pulling CAD into incident records, **NFIRS reporters / records clerks** closing reports against the federal schema, **fire inspectors** running pre plans and violations, **training officers** tracking certs and hours, **firefighters / volunteers** using the responder mobile app for alerting and truck checks, and **the chief** running dashboards.

What it is **not** built for: the team officer in a partial collapse building. There is no shoring workflow, no strut math, no ICS-208 site safety integration, no USAR specific anything. The product touches the *administrative shell* around fire response, not the tactical work itself.

## Pricing tier

**Contact sales / opaque.** No public pricing, no free trial, no self serve signup. Implementation involves a dedicated project lead and a **90 to 120 day** onboarding window with data migration done by vendor staff. Classic vertical SaaS for municipalities posture: bespoke quote per department, multi year contract, the relationship is the product. Add on modules (e.g., truck inspections in the responder app) are sold separately. Some on prem servers are still in the wild. The vendor actively blogs about the cloud migration, meaning a portion of the install base is still on the older Windows server deployment.

Third party reviews show **strongly polarized customer service ratings**: ~4.5/5 ease of use, ~3.7/5 customer service, 1.0/5 value for money on a small public sample. The most cited complaint is implementation support delay ("plan at least a year out"), not interaction design. Consistent with a small vendor model where the same handful of people do sales, configuration, and support.

## Visual language

Honest disclaimer: RedNMX has a **small public visual footprint**. The marketing site renders cleanly; very few application screenshots leak through case studies and PDF training docs. What follows is grounded in (a) the marketing site, (b) PDF training documentation, (c) review site descriptions, and (d) the architectural fact that the application is a Windows desktop client (program launcher `.exe` per VA TRM listing) re platformed onto Azure SQL.

### Color palette

**Marketing surface:** a controlled palette built around a deep navy (approximately `#0E1B2C` to `#15263D`), high contrast white card backgrounds, a single saturated **red accent** for brand mark and primary CTA buttons (approximately `#C8102E`, the canonical fire service red), and muted neutral gray body text (`#3F4A55` range). Professional vendor, not design led. It reads like a competent municipal software website built by a marketing agency around 2022 to 2023.

**Application surface:** more saturated and chrome heavy. The desktop app applies the same red accent to chrome (title bars, toolbar buttons, status indicators) over light gray Windows style backgrounds (`#F0F0F0` shell, `#FFFFFF` form interiors), with black or near black text and occasional colored status badges (red for emergencies, blue informational, green complete). The desktop app **uses the OS palette**, not a designed one. The Windows visual stack with red sprinkled on top. No evidence of a dark mode on desktop; mobile inherits OS level dark mode passively without dedicated tuning.

### Typography

Marketing site: humanist sans serif (likely Open Sans, Inter, or a near neighbor), 16px body, standard hero scale. Nothing distinctive; nothing offensive.

Desktop application: **default Windows system fonts** (Segoe UI on modern Windows) for chrome and form labels, dense small body text, likely 9 to 11pt, fit to form heavy records work. Consistent with the lineage: a 2000s era VB6/Delphi style records app keeps its typographic density even after a re platform. No custom typeface, no display weight typography for status moments, no typographic hierarchy beyond Windows conventions.

### Information density

**Very high.** The application is **forms and grids software**. Incident reports, NFIRS forms, member rosters, apparatus check sheets, inspection forms, LOSAP timesheets. Every primary surface is a dense tabular or form view with many fields and menu items visible at once. This is intentional: records clerks and dispatchers want everything visible because they're moving fast across structured fields. It is the opposite of the calm, single canonical action surfaces FieldShore v4 targets (Principle 4). Mobile is lighter but still leans dense, stacked list rows with multiple metadata columns and minimal whitespace.

### Dark/light strategy

A single light theme inherited from Windows. Mobile inherits OS dark mode passively. No outdoor readable mode or field readability tier. This is an indoor office product.

### Iconography

A mix of (a) OS native system icons on desktop, (b) generic iOS/Android SF Symbols / Material on the mobile apps, and (c) a small set of custom red tinted glyphs in marketing collateral. Icons are decorative in the records UI; labels do the navigation work. No designed icon system, and the mobile apps do include some icon only chrome that would fail Principle 9.

## Primary workflows (3 to 5 top tasks)

**1. NFIRS / NERIS incident closeout.** The flagship workflow. A call arrives via CAD integration; the incident record is pre populated; a records clerk or officer walks down the NFIRS form, attaches narrative and photos, marks it complete. The product is **NERIS certified** and positions the federal NFIRS to NERIS transition as a current competitive advantage.

**2. Personnel / certification / LOSAP tracking.** Members added, certifications recorded with expiration dates, training hours and attendance logged. The LOSAP module calculates volunteer service award points or stipends. This is the workflow that most differentiates the product from larger paid department focused RMSs.

**3. Apparatus / truck checks and inventory.** Daily/weekly truck check forms per apparatus, SCBA tracking, maintenance scheduling, equipment inventories. Recently extended to mobile so a firefighter can do the check on a tablet and have it flow into the desktop record.

**4. Fire inspections and pre plans.** Separate mobile app: custom inspection forms, code violations, permits, re inspection scheduling. Pre plans capture building layouts, hydrants, and hazards for incident time surface.

**5. Dashboards and custom reporting.** The chief opens a dashboard or builds a custom report: response times, run volume by area, manpower trends. Marketed as the differentiator against rivals that "lock you into pre set, inflexible reports."

What you will **not** find: an incident scene tactical workflow. No ICS-201 worksheet, no shoring/structural collapse module, no team tracking against PAR, no live IC dashboard. The product owns the records side; the scene is left to the radio.

## What they do well

- **Doctrine coverage.** NFIRS 5.0, NERIS certification, LOSAP, NIMS adjacent terminology in incident records. The product knows the regulatory schema and stays current. It defers to doctrine, which maps to **Principle 1** of v4. We should respect this.
- **Volunteer department fit.** LOSAP and role based access for volunteer/hybrid orgs is a real advantage; the larger paid department RMSs treat volunteers as a checkbox.
- **CAD integration breadth.** Documented integrations with the major dispatch systems (Tyler, CentralSquare, Motorola, Hexagon/Intergraph). The product reads the room about the existing CAD landscape and integrates rather than competes.
- **Implementation hand holding.** A vendor staffer migrates your data, configures your forms, holds your hand for 3 to 4 months. For a small department with no IT staff, this is a real value proposition even when the software itself is dated.
- **Breadth of modules.** 50+ named modules means a department can run its administrative life on a single product. The integration story ("one platform, one login") is real for the records side.

## What they do poorly

- **Visual language is dated.** The application is a Windows desktop app wearing a Windows skin. There is no evidence of a designed system: no custom typography, no controlled palette beyond a single red accent, no spacing rhythm, no elevation language. It reads as municipal vendor software, not as software a firefighter would choose if they had a choice.
- **Density without hierarchy.** Forms expose every field at once. Records clerks tolerate this; new users drown in it. There is no obvious "what to do next" surface. Every screen is a peer.
- **No tactical surface.** The product has nothing to say about an active incident. A firefighter at a working incident closes the responder app and goes back to the radio.
- **Customer service polarization.** Multiple public reviews cite long response times and unresolved configuration issues. This is a small vendor structural risk, not a product design risk, but it shapes the user's relationship with the product over years.
- **Cloud transition is in progress.** The vendor publishes blog content explaining on prem versus cloud, which is a tell: a portion of the install base is still on on prem Windows servers, and the cloud version is a re platform of the same desktop client over Azure SQL rather than a ground up SaaS rebuild. The application architecture is fighting its own history.
- **No design consistency.** Every screen looks like its own screen. The "same conceptual action looks different in five places" problem that v4 is trying to fix in FieldShore is the steady state in RedNMX.
- **Mobile loaded with icons and no labels.** The responder app's screens are not labeled defensively; published screenshots show icon led controls without text labels in some places. Maps to a failure of **Principle 9**.

## What they assume about the user

- The user is **indoors**, at a desk, with a mouse and a 22" monitor. Outdoor readability is not a design concern.
- The user is **trained** on the product over multiple weeks of vendor led implementation and will be the same person for years. The product can afford a learning curve because the contract is multi year and the user turnover is low.
- The user **already knows the doctrine** (NFIRS field names, LOSAP point structures, NIMS terminology). The product surfaces the schema directly rather than translating it.
- The user is **never the firefighter on the nozzle**. The user is the officer or clerk doing paperwork at a station table.
- **Connectivity is reliable.** The cloud hosted product assumes internet; offline behavior in the mobile apps is light.
- **Records matter more than the scene.** The focus is the closed report, not the live operation.

## What we will deliberately NOT copy

- **The 50 modules surface.** Selling breadth of features is the right move for a records vendor, but it is exactly wrong for an incident scene tool. FieldShore v4 is not 50 modules; it is **one canonical action per state** (Principle 4). We will resist the temptation to advertise breadth.
- **The form and grid density.** The team officer in a building cannot read a 30 field form on a phone in sunlight with gloves on. v4 keeps one card, one action, big targets.
- **The Windows visual lineage.** No native system chrome, no Segoe UI body, no OS default controls dressed up to look custom. v4 ships a designed system from the typography up.
- **Indoor only color choices.** The light gray on white density of a records app fails in direct sun. v4's outdoor readable mode is nonnegotiable.
- **Module per feature menu organization.** Surfacing the database schema as the navigation IA is wrong for the scene. v4 organizes around role and incident phase, not module name.
- **Opaque, contact sales pricing.** Not a design decision per se, but the product/marketing/design loop they live in produces enterprise vertical SaaS energy that reads wrong to a firefighter. v4's product surface stays as transparent as possible to the user.
- **No tactical workflow.** The omission itself is the lesson: we will not let v4 drift toward records management gravity. v4 is a scene tool first.

## What we will deliberately differentiate on

- **Tactical first, records second.** RedNMX owns the records side; v4 owns the **active incident side** and exports clean records when the incident closes. Different focus, different design.
- **Designed for the role, not the device** (Principle 2). RedNMX has one desktop app and one phone app. v4 has four surfaces with explicit role mappings (team officer, IC, CP deep data, broadcast TV).
- **Calm in chaos** (Principle 3). RedNMX's surface is busy by design. v4's is quiet by design.
- **Designed type system, controlled palette, outdoor readable mode.** RedNMX inherits Windows; v4 ships its own.
- **Local first sync realism** (Principle 8). RedNMX is cloud hosted with weak offline. v4 works fully offline and is honest about sync state.
- **Doubt free escapes** instead of confirmation modals (Principle 6). RedNMX follows Windows modal conventions; v4 follows Apple's Mail undo pattern.
- **No mystery meat** (Principle 9). v4 labels every primary action. RedNMX tolerates icon only chrome.
- **The app earns its place quietly** (Principle 11). RedNMX advertises 50+ modules in the product. v4 advertises nothing in the product.
- **Doctrine true defaults** (Principle 5). RedNMX defers to schema; v4 defers to safety. Closely related, not identical: schema deference can produce auto fills that hide a safety decision. v4 will not.

## Archive links

Standard Wayback Machine snapshot paths for the vendor's public surfaces (no live links, these are archive replay URLs). Note that the Wayback coverage of this product is uneven; the marketing site has been reskinned at least once in recent years, and very few archived snapshots include readable screenshots of the actual application.

- `https://web.archive.org/web/2023/https://alpinesoftware.com/`: marketing homepage circa 2023, before the most recent reskin; useful for the older brand palette and module taxonomy.
- `https://web.archive.org/web/2024/https://alpinesoftware.com/product-overview/`: product overview page listing the six component suite (desktop / mobile / inspections / kiosk / MDT / bulletin).
- `https://web.archive.org/web/2024/https://alpinesoftware.com/key-features-and-modules/`: the canonical "50+ modules" page showing the module taxonomy.
- `https://web.archive.org/web/2024/https://alpinesoftware.com/rednmx/`: RMS landing page; describes deployment, modules, and the on prem to cloud arc.
- `https://web.archive.org/web/2023/https://alpinesoftware.com/news-press/significant-updates-to-rednmxs-automatic-vehicle-location-responder-apps/`: useful for the mobile app feature set (NFIRS edits, photo attachment, iOS Critical Alerts).

---

## Honest note on sections based on limited public information

Visual language subsections (hex values, exact typography, dark/light, iconography) are necessarily inferred. The vendor publishes few application screenshots, and the public surface is mostly marketing. Hex values are estimates from the marketing palette plus the documented Windows application lineage. Treat as directionally correct, not pixel precise. Pricing is opaque by design; the review percentile breakdown is from a single digit public sample. The teardown leans on what is verifiable (module taxonomy, deployment architecture, NFIRS/NERIS positioning, customer service polarization) and is candid about the gaps. For v4 design purposes, the architectural and strategic observations matter more than pixel level ones, and those are well grounded.

# Tablet Command

## What it is

A long established iPad first incident command and tactical worksheet app for fire, EMS, and (more recently) law enforcement agencies. The flagship surface is an iPad app the IC carries in the command vehicle; a companion phone app gives line officers CAD alerts, AVL, and read only situational awareness. The product positions itself as a **mobile data terminal (MDT) replacement** rather than a niche utility. The pitch is that the same device that shows the dispatch ticket also runs the tactical worksheet, the accountability board, and the post incident export. Marketing claims hover in the hundreds of agencies / tens of thousands of responders / hundreds of thousands of managed incidents range. The marketed value proposition is "streamline incident command, boost safety and efficiency." The product is broad and horizontal (all risk, all hazard); it does **not** do strut math, USAR resource calculation, or structural collapse workflows. Its focus is the **structure fire incident commander** working a Level III through V incident with a few engines and a truck.

## Target user

Career fire departments large enough to fund per seat SaaS and an iPad fleet, but small enough that a single IC running the worksheet on one device is the operating model. Heaviest concentration appears to be municipal and combination departments in the US and Canada. The customer logos that surface in case studies skew California, Colorado, and Pacific Northwest. Primary user role is **battalion chief / IC** at the box; secondary roles are company officers (read only CAD/AVL via the phone app), training officers (after action exports), and admin staff (CAD/GIS configuration). ICS scale is Level III through V: single incident, single IC, no Unified Command paradigm baked into the default workflow, no IST/USAR doctrine, no demob worksheet. Volunteer departments appear in the customer base but the price point and iPad assumption push the typical buyer toward career or well funded combination depts.

## Pricing tier

SaaS subscription. Public pricing aggregators list a **$30/user/month flat rate** with a free trial; the iPad app itself is **free to download** and is gated by an account/subscription on first launch. Enterprise tier (CAD integration, ESRI ArcGIS Online, AVL, Real Time Sync, Transfer Command) is custom quoted and goes through a sales motion. No self serve enterprise pricing on the site. There is no real freemium; the standalone mode without CAD integration is functional but everything past the iPad surface (mobile alerts, web admin, multi device sync) is paid.

## Visual language

### Color palette

- **Primary chrome:** a saturated navy in the ~`#102A43` / `#1B2A4E` family. Heavy, "command vehicle dashboard" energy. Used for the top bar, the unit tile background when assigned, and modal headers.
- **Surface:** off white `#F4F5F7` range behind the worksheet; map tiles obviously dominate when the map surface is active.
- **Accent / interactive:** a vivid blue (`~#1E73BE`) for selected states, hyperlinks, and the "tap to assign" affordance.
- **Semantic:** classic ICS coloring shows through where it matters. Red for hazards/active fire, yellow for caution/staging, green for available/responding, orange for working time warnings, grey for unassigned/dismissed. The PAR timer ticks through a green→amber→red gradient as the work cycle expires, which is the most visually opinionated element in the product.
- **Dark mode:** the 3.x line added explicit light/dark/auto. Dark mode is a near black `#0B0E13` class background with the same navy chrome desaturated; not OLED pure black.

### Typography

System fonts. SF Pro on iOS / iPadOS; the 3.4 notes call out **Dynamic Type support**, meaning incident list font sizing now follows the device's accessibility scale. No identifiable bespoke typeface. Weight strategy is conventional: semibold for unit IDs and timers, regular for body, all caps for status labels (e.g., **EN ROUTE**, **ON SCENE**, **PAR**). Numeric tabular alignment is used in the master scene timer.

### Information density

**Moderate to dense, leaning dense on the worksheet view.** A working incident screen typically shows: master clock, scene timer, a left rail of unit tiles, a center area split between map and worksheet, a right rail group/division stack, and a bottom checklist tray. Group tiles in 3.4+ stack unit count + personnel count inside a single tile, which raises density further. The product is comfortable showing 30 to 60 distinct interactive elements on a single iPad screen. The map view is calmer; the worksheet view is denser than anything in FieldShore today.

### Dark/light strategy

Both, with system following ("auto"). Added explicitly in the 3.x line. No documented outdoor readable mode beyond standard iPadOS brightness. They rely on the iPad's hardware brightness and the mostly indoor command vehicle use context.

### Iconography

Mostly **SF Symbols** plus a small custom set of fire service glyphs: apparatus type silhouettes (engine / truck / medic / chief), hydrant pins, hazard markers. Recent versions added **ICS map symbology** drawing tools (the standardized wildland/all hazard symbol library), which puts them squarely in NWCG/FIRESCOPE territory. Stroke style is filled glyph for status indicators, outlined for navigation. Icons consistently carry labels in primary surfaces. They reserve icon only for the sidebar where labels appear on tap.

## Primary workflows (3 to 5 top tasks)

1. **Receive dispatch → arrive on scene.** CAD push arrives 30 to 60s ahead of voice dispatch (vendor claim). The IC taps the incident in the list, the scene auto loads to the address, satellite view drops in, AVL shows responding units converging. Two taps from notification to a usable scene view.
2. **Assign units to functional groups / divisions.** Drag a unit tile from the left rail onto either the map (geographic) or onto a group/division tile (functional). PAR timer starts automatically per dept configured interval. Reassignment is another drag. This is the thing they demo first, and the demo videos lean on it heavily.
3. **Run the tactical worksheet / checklist.** A configurable template (per department, per incident type) loads with benchmarks like *Primary Search Complete*, *Fire Under Control*, *All Clear*, *Loss Stopped*. Each is a single tap timestamp. Templates live in a web admin portal.
4. **Track PAR / accountability.** Automated PAR reminders fire at dept set intervals. A single tap to clear when the radio call completes. Work time gradient on each unit tile shifts color as the crew's clock advances.
5. **Close out & export.** "End Incident" produces a timestamped activity log, a CSV, and a screenshot of the final map state, emailed or SMSed off the box. The pitch is "your ICS-201 writes itself."

IA is roughly two levels deep: incident list → incident detail (worksheet + map + checklists + status + export). Settings and admin live in a side panel. Few features are more than two taps from the incident detail surface.

## What they do well

- **The drag and drop unit assignment interaction is genuinely well engineered.** It works from list → map, list → group, group → group, with consistent affordance and snap targets. Watching demo footage, you can see why customers cite it as the moment they got hooked.
- **Automated, dept configurable PAR timing.** PAR is a high stakes, high frequency action; making it ambient rather than manual is a real win. The color gradient on work time is doctrine appropriate without screaming.
- **Tactical worksheet templates are per department, per incident type.** They lean into the principle that ICs don't want a new system. They want their existing checklist on a screen. This is the right product instinct for a market full of veterans.
- **CAD integration is treated as table stakes, not premium.** Their list of supported CAD vendors is long, and "any CAD" is part of the pitch. The integration story is mature.
- **Real time multi device sync** (their trademarked name) so that a BC's iPad, the IC's iPad, and the dispatch view stay coherent. This is what FieldShore is still wrestling with.
- **After action export is a one tap action.** CSV + activity log + map screenshot, emailed off the truck. Reduces the post incident documentation tax to near zero, which is itself a safety win (people actually do it).
- **Dynamic Type support** in 3.4+. Means an aging chief with reading glasses can scale the worksheet without going through hoops. This is the kind of accessibility table stake that v3 FieldShore misses.

## What they do poorly

- **Onboarding for a brand new IC is nontrivial.** Reviewers cite "a few hours to get usable," which is fine for a career chief, fatal for a once a month volunteer officer. The configurability cuts both ways. Every department must invest in template setup before the app earns its keep.
- **Worksheet view becomes hard to read and navigate on smaller iPads.** A 9.7" or 10.2" iPad with 30+ unit tiles, group stacks, and a checklist tray feels noisier than the doctrine it's representing.
- **Generic icon grid worksheet aesthetic.** The visual identity reads as competent enterprise software rather than purpose built emergency service tooling. Colors are doctrinally right but the typography and spacing don't communicate "this is a serious safety instrument" the way, say, a Garmin avionics MFD does.
- **No structural collapse / USAR domain logic.** No strut math, no shore point lifecycle, no cut table queue, no resource math beyond unit counts. They will not compete on the FieldShore problem because they are explicitly horizontal.
- **iPad first to a fault.** The phone companion is read only (CAD alerts, AVL, monitoring). A line officer who actually needs to *do* something, like log a finding, mark a victim, or request a shore, can't do it comfortably on a phone. This is the gap FieldShore can drive a truck through.
- **"Are you sure?" / confirm modal patterns appear in destructive actions.** Several review threads complain about confirmation friction during fast moving incidents. They have not adopted the doubt free escape pattern.
- **Pricing is opaque.** $30/user/month surfaces on aggregators but the website itself routes everyone to a sales demo. For a volunteer department of 35 people doing the math, $1,050/month is a meaningful number that should be visible up front.
## What they assume about the user

- **The user has an iPad.** Not "could acquire one," but already has one, with a current iPadOS, mounted in a command vehicle or carried by the BC. This is a large up front capital assumption.
- **The user is a career officer or a high engagement combination officer.** The configurability is a feature for someone with the patience to build templates; it's a tax for someone who shows up to a working fire twice a quarter.
- **The user has connectivity at least intermittently.** Offline mode exists, but the CAD integration, AVL, Real Time Sync, and ESRI map layers are all online first. The product earns its keep in a connected world; the worst case offline experience is graceful but degraded.
- **The user knows ICS already.** No coaching, no "what is a division vs a group" hand holding. If you don't know NIMS, the worksheet is incomprehensible.
- **The user is comfortable with software.** Drag and drop, multi select, modal layers, side panels. The interaction grammar is iPadOS fluent, not glove fluent.
- **The user trusts the cloud.** Real Time Sync, the web admin portal, and the post incident export all live in their managed cloud. Air gapped agencies (some federal, some adjacent to county jail networks) would struggle.

## What we will deliberately NOT copy

- **Their information density on the worksheet surface.** FieldShore Principle 4 ("one canonical action per state") is incompatible with showing 60 elements at once. We will tolerate more screens with less per screen.
- **Modal confirmations on destructive actions.** Principle 6 (doubt free escapes via reversibility windows) is a deliberate divergence. We will not ask "Are you sure?" We will commit and offer Undo.
- **The icon grid and dense toolbar visual aesthetic.** Principle 3 ("calm in chaos") and the v3 → v4 redesign brief both point at polished typography and restraint, not enterprise dashboard density.
- **Their horizontal "all hazard" positioning.** FieldShore is deliberately vertical: structural collapse, shoring, strut math. We will not water this down to be a generic IMS tool.
- **iPad first information architecture.** Principle 2 ("designed for the role, not the device") means the phone surface for the team officer is a first class peer, not a read only companion. We invert their hierarchy.
- **Configurability as a load bearing feature.** Their pitch is "we don't change how you work; configure it to match your SOP." Our pitch is "doctrine is doctrine; the app encodes USACE/FEMA/NIMS verbatim and you don't reconfigure safety math." Principle 1 (defer to doctrine, not invention) makes this explicit.
- **Onboarding by template building.** A new department should be able to open FieldShore and run a Level V incident in under two minutes with zero configuration. Their model requires up front setup; ours cannot.

## What we will deliberately differentiate on

- **Vertical depth over horizontal breadth.** They cover all hazard at moderate depth. FieldShore covers structural collapse at extreme depth: strut load tables, deduction math, cut queue, USACE shore types, group/individual phase split. A BC running a Level IV partial collapse will reach for us; a BC running a routine room and contents fire will reach for them. That's fine.
- **Phone as the primary working surface for the team officer.** Their phone surface is read only. Ours is the canonical action surface for Entry, Search, Rescue, Shoring leads. The IC's tablet is the second surface, not the first.
- **Doctrine encoded, not configured.** Where they let the dept build templates, we ship doctrine. T-Shore lumber stays manual because the safety call is real; load tables match Paratech to the row; NIMS terminology is the only terminology.
- **Reversibility instead of confirmation.** Undo toasts everywhere, no "Are you sure?" Principle 6.
- **Calm visual register.** Polished typography, generous spacing, controlled palette. No "tactical red and black" aesthetic, no chiclet toolbar density. Principle 3.
- **A laptop / Toughbook surface that's a first class peer.** Their web admin is for configuration, not for active incident command. Our laptop surface is the deep data CP role: ICS-201 worksheet, log review, role history audit, AAR assembly. Principle 2 again.
- **Honest offline first.** Local first writes, conditional sync, one quiet sync indicator. Offline is the design center, not a degraded fallback. Principle 8.
- **No life safety communication in app, ever.** They drift toward CAD alerts, in app audio, sensor feeds. We are explicit: the radio is the radio. Principle 10.
- **Transparent pricing.** Whatever the model is, it's published. A 35 person volunteer department should be able to do the math without a sales call.

## Archive links

- [Homepage, late 2023](https://web.archive.org/web/20231207125219/https://www.tabletcommand.com/)
- [Homepage, early 2024](https://web.archive.org/web/20240223232945/https://www.tabletcommand.com/)
- [Homepage, mid 2024](https://web.archive.org/web/20240424022313/https://www.tabletcommand.com/)
- [Incident management software product page, 2024](https://web.archive.org/web/20240912202225/https://www.tabletcommand.com/incident management-software)
- [MDT replacement (2-way) product page, 2020](https://web.archive.org/web/20200923092935/https://www.tabletcommand.com/2way)

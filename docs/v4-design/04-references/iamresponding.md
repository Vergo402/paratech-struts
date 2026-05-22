# IAMResponding

## What it is

IAMResponding is a long-running emergency-response notification and accountability platform aimed primarily at volunteer fire departments. Its core promise answers a single chief-level question — *who is coming, when, and where?* — by turning the dispatch tone into a structured roster moving through a small set of statuses ("responding to station," "responding to scene," "on scene," "off duty," "can't respond"). On top of that core it has accreted a wide suite: CAD or pager-audio dispatch, a station-mounted "now responding" display, in-app messaging, events calendar, training records, NFIRS 5.0 incident reporting, member-tracking map, mutual-aid coordination, third-party data integrations.

Structurally multi-surface: phone app (iOS/Android), admin/chief web dashboard, station-display web view for a bay-wall TV (commonly off a Raspberry Pi), and a wearable companion. Phone is the daily driver for the member; dashboard is the chief's surface; station display is a passive "who's coming" board.

In market since the mid-2000s — old enough that several generations of UI live on top of one another. Tens of thousands of agencies give it network-effect lock-in for mutual aid that no younger competitor easily breaks.

The product's center of gravity is **between-incident administrative life** (scheduling, calendar, NFIRS, training) more than **during-incident operational use**. The phone app's during-incident contribution is a one-tap status pick, full stop. After that tap the operational tool is the radio — the app is a notification surface for the chief watching from a laptop, not a tool the firefighter uses on scene. This is the design seam FieldShore lives in.

## Target user

Two distinct personas, served unevenly:

1. **The volunteer firefighter (mass user).** Installed because the chief told the membership to. Uses it 3–30 times a month: tone drops, phone buzzes, tap a status, drive, done. Rarely opens outside an active incident except for the calendar. Demographically broad — late teens to retirees — with the older end being a meaningful constraint the product visibly accommodates (large buttons, plain language, no gestures).
2. **The chief / admin officer (decision-maker).** Sits at the web dashboard during an incident, watches the roster fill in, makes the staffing call. Outside incidents, manages membership, training, calendar, NFIRS, configuration. This person is the buyer.

Secondary users: dispatchers (in CAD-wired agencies), mutual-aid partner chiefs, EMS / police equivalents.

What the target user is **not**: a USAR technician on a rope, a federal task-force leader, a county EOC. Sized for a typical volunteer dept — 20 to 80 members, two to four stations, one to ten apparatus, mostly Level IV/V traffic.

## Pricing tier

Aggressively low and flat. One annual fee per agency, unlimited users, no per-seat charge. Public collateral has historically advertised low-three-digit pricing per year for a small volunteer department, with a trivial separate fee for telephone-line features. NFIRS reporting bundled at no cost.

This is the "we are the utility, not the SaaS" model — the single most important commercial fact about the competitor. A free PWA still has to beat a product that costs less per year than one piece of rope rescue hardware. The pricing is a moat that doesn't show up in the UI but constrains everything FieldShore could charge for in the same buyer's budget.

The model also explains the surface area: a flat agency fee gives no per-seat upside to ship lean, so every requested feature gets bolted on. The kitchen-sink suite the UI complaints reflect is downstream of the pricing.

## Visual language

### Color palette

Generic public-safety palette, anchored on red with contextual greens / yellows / greys for status. Approximate sampled values:

- **Primary red** ~`#C8202C` — wordmark, marketing CTAs, "incident active" state.
- **Deep navy / charcoal** ~`#1F2A36` — header backgrounds, dashboard chrome, non-emergency station-display backdrop.
- **Status green** ~`#3DA35D` — "responding," "available," "on duty."
- **Status yellow / amber** ~`#E4B53C` — "delayed," "10 minutes out."
- **Status grey** ~`#7F8A95` — "off duty," "can't respond," neutral apparatus.
- **Surface white / off-white** `#FFFFFF` / `#F4F5F7` — cards, list rows.

The palette is functional, not crafted — pulled from the same family every public-safety vendor uses. Instantly legible to a firefighter, instantly forgettable to a designer. No signature color — nothing you would identify across a bay at 20 feet as belonging to *this* product specifically.

### Typography

System default-ish. Phone apps render in platform system fonts (San Francisco on iOS, Roboto on Android). The web dashboard uses a generic humanist sans (Helvetica / Arial / Open Sans family) without a distinctive type voice. The station display uses a heavier weight of the same family at very large sizes (40–80pt) so it remains legible at 8–15 feet.

No display face, no custom letterforms, no consistent type scale across surfaces. The web dashboard and the phone app feel like cousins, not siblings. This is a surface a v4 redesign can win on cheaply.

### Information density

Two density modes that don't share a design language:

1. **Station display / "now responding" board: very low density, very large type.** 8–15 responder rows with name, photo or initial, status, ETA. Right call for the read-across-the-room context — user reviews are silent on it, which means it works.
2. **Web admin dashboard: very high density, tab-heavy, deeply nested.** Membership, training, calendar, NFIRS, settings all live behind a left-rail nav with multiple sub-tab levels. This is the surface that draws "dated," "too many clicks," "needs an overhaul" feedback ([archive-1](https://web.archive.org/web/*/https://www.g2.com/products/iamresponding/reviews)).

The phone app sits between — dashboard-card on the home screen, list-based for rosters and apparatus, with a swipeable "Now Responding / On Duty / Apparatus" carousel as the home affordance. Users specifically call out that the recent move to a card overlay added clicks vs. the previous flat list ([archive-1](https://web.archive.org/web/*/https://www.g2.com/products/iamresponding/reviews), [archive-2](https://web.archive.org/web/*/https://iamresponding-iar.appstor.io/app-reviews)).

### Dark/light strategy

Light is default everywhere. Dark variants exist on the station display (sensibly — bay walls are dim) and partially on the phone app via OS theme-passthrough, but there is no evidence of an intentionally-designed dark palette with adjusted contrast or semantic color shifts, and no sunlight mode. Web dashboard is light-only.

For a product whose primary use case is "phone buzzes at 2:47 AM, member taps a status half-asleep," the lack of a deliberate dark mode is a real seam.

### Iconography

Generic glyph set from a common public-safety / general-purpose library. Truck for apparatus, person for member, calendar grid for events, chat bubble for messaging, gear for settings. Icons sit next to labels nearly everywhere — the product does **not** assume icon literacy, which is on-doctrine for the user base. The penalty is that nothing is signature; you could swap the entire icon set and no end user would notice. This aligns with FieldShore Principle 9 (no mystery meat) by accident rather than design.

## Primary workflows (3–5 top tasks)

1. **Receive a tone, respond with a status.** Dispatch fires, push notification hits the phone, member opens the app (or the notification deep-links in), sees the incident card, taps "Respond Now," picks from a customizable list ("responding to station," "responding to scene," "10 min late," "can't respond"). One to three taps on the happy path. This is the workflow the product genuinely optimizes for. ([archive-3](https://web.archive.org/web/*/https://support.iamresponding.com/hc/en-us/articles/16293368956052--Responding-to-an-Incident))

2. **Watch the roster fill in (chief view).** Chief opens the web dashboard, sees a live list of responders with status pill, qualification badge, time-since-status, and an ETA derived from each responder's GPS. Apparatus status appears as a parallel rail. Station display mirrors the same data passively for the bay.

3. **Schedule duty crews / events.** Admin officer opens the calendar, creates an event or duty period, assigns members, and the system sends automated reminders. Between-incident workflow but consumes much of the actual product usage by member count, because the calendar drives drill night.

4. **File the NFIRS report.** After an incident, an admin officer opens the NFIRS 5.0 module, fills the federally-mandated fields, and exports for submission. This is the workflow that locks in agency stickiness — six months of incident reports in the system and switching cost is real. ([archive-4](https://web.archive.org/web/*/https://support.iamresponding.com/hc/en-us/articles/16294499968404-NFIRS-5-0-Reporting-FREE))

5. **In-app messaging / mutual aid coordination.** Members and chiefs send text, push, or email messages — bulletins, drill announcements, mutual-aid pings to a neighbor's roster. Lightest-weight workflow but the one most frequently complained about as cluttered.

## What they do well

- **Pricing is unmatched.** Flat low-three-digit annual fee, unlimited users, removes price as a buying objection. FieldShore being free does not fully neutralize this — they are already free-feeling at the buyer's budget level.
- **One-tap status response works.** On the happy path, one or two taps from notification to status sent. Two decades of iteration.
- **Station-display surface is well-considered.** Big type, two-mode (emergency vs. non-emergency) switch, automatic activation on incident, runs on cheap hardware. A distinct surface designed for its actual viewing context. FieldShore's "Large TV" surface should learn from this.
- **NFIRS bundling.** Including federally-required reporting at no extra charge is a strong stickiness play. Most volunteer departments need NFIRS and find it onerous; bundling removes another vendor.
- **Mutual aid network effects.** When neighboring departments all use the same product, read-into-each-other's-rosters has real operational value newcomers cannot replicate without scale.
- **They know who their user is.** Plain language, labeled icons, large touch targets, low gesture vocabulary. Visibly accommodates the older end of its user demographic.
- **Reliability.** Public marketing cites years of zero-downtime on the back end. For a notification system this is table-stakes and they have it.

## What they do poorly

- **Visual debt across surfaces.** Phone app, web dashboard, and station display look like cousins, not siblings. Multiple generations of UI live in the web admin; reviews repeatedly call it "dated" and "in need of overhaul" ([archive-1](https://web.archive.org/web/*/https://www.g2.com/products/iamresponding/reviews)).
- **Click-count regression.** Recent shift to card-style overlays on the phone home added taps vs. the previous flat list. Users are vocal: *"way too many taps to get anywhere, especially in an emergency when seconds count"* ([archive-2](https://web.archive.org/web/*/https://iamresponding-iar.appstor.io/app-reviews)). Violates exactly what Principle 4 guards against.
- **Feature creep without IA.** Two decades of saying yes has produced menus that are "way too long and items aren't logically organized" ([archive-2](https://web.archive.org/web/*/https://iamresponding-iar.appstor.io/app-reviews)).
- **No deliberate dark mode.** The "phone buzzes at 2:47 AM" use case is not designed for.
- **No sunlight mode.** No evidence of high-ambient-light treatment for outdoor scene use.
- **Operational silence after the status tap.** Once the member has tapped "responding to scene," the app has nothing useful to offer on scene. No size-up surface, no shore-point or resource view, no role-board, no after-action capture. This is the entire surface FieldShore lives in.
- **No domain vocabulary for structural collapse or rescue specialties.** The product is fire-department-generic. NIMS Section / Branch / Division / Group structure is not represented natively — implicit in roster grouping but never named.
- **Cross-surface inconsistency.** List on phone, card grid on dashboard, table on web, all showing the same roster data. The v3 FieldShore problem the picker doctrine solves — and they have it at scale.
- **Degraded reliability on recent releases.** Reviewers describe "serviceable to almost useless" regressions in availability editing and scheduling ([archive-2](https://web.archive.org/web/*/https://iamresponding-iar.appstor.io/app-reviews)).

## What they assume about the user

- The user is **operating between incidents**, not during one. Built for the dispatch moment plus admin life, not for the working incident.
- The user has **a chief watching the dashboard** elsewhere. The phone app is a sensor for that dashboard, not a tool for the firefighter on scene.
- The user is **not on a rope, not in a confined space, not doing measurement work.** No glove mode, no sunlight mode, no rescue specialty surface.
- The user is **on a phone**, not a tablet or a Toughbook. No first-class CP-on-a-tablet surface; the dashboard is browser-only.
- The user **will tolerate a learning curve in the admin web app** but not in the phone app. Web complexity is tacitly accepted as "that's the chief's problem."
- The user **wants more features, not fewer.** Two decades of additive product evolution have proven this at the buyer level, even as end-user reviews ask for the opposite.
- The user is **a small-to-medium department.** No scaling story to Level I/II, IST, or federal response.
- The user **does not need NIMS doctrine surfaced.** "Group," "Division," "Branch," "Staging" are admin-config concepts, not first-class screen elements.

## What we will deliberately NOT copy

- **The kitchen-sink IA.** Principles 4 and 11 are explicit rejections of the everything-tab pattern.
- **The card-overlay home screen that added taps.** The competitor's most public regression is a cautionary tale. v4's home surface is a flat decision surface, not a carousel.
- **The "every department gets every feature" model.** v4 is scope-locked to Level IV–V as the everyday case, expanding on demand through Level I. We do not bundle calendar, NFIRS, training records, or messaging. Principle 10 — let other tools own communication.
- **Light-only design.** Dark mode and sunlight mode are first-class, not afterthoughts.
- **Generic public-safety red.** v4 commits to a distinctive palette that reads as professional-services software, not a public-safety logo kit.
- **System-default typography across surfaces.** v4 commits to one type system across phone, tablet, laptop, and TV.
- **Push-notification chat as a core surface.** Principle 10 — radio is radio.
- **Treating the station-bay TV as a passive marketing screen.** v4's broadcast surface is operational, not promotional.

## What we will deliberately differentiate on

- **During-incident operational tooling, not between-incident administration.** The space the competitor abandons after the status-tap. Shore points, deductions, role-board, cutting queue, hazard log — FieldShore's table.
- **Four-surface consistency from day one.** Phone-for-team-officer, tablet-for-CP, laptop-for-deep-data, TV-for-passive-broadcast — same primitives, same vocabulary, same picker doctrine, deliberate adaptations per surface.
- **Doctrine fluency.** NIMS / ICS / USACE / Paratech vocabulary as the literal UI strings (Principle 1). Competitor uses generic "roster" / "apparatus" / "groups." FieldShore says "Division 1 / Shoring Group / T-Shore / Sole Plate" because that is what the firefighter calls them.
- **Safety math visible (Principle 7).** Load capacity, deductions, qty>4 sentinels, unrated-zone warnings. Competitor surfaces no safety math because it isn't in their domain — we win in a domain they declined to enter.
- **Calm visual language (Principle 3).** No flashing red, no anxious alarms, confidence-grade typography. Their palette is functional; ours is composed.
- **Doubt-free escapes instead of confirm modals (Principle 6).** Undo-toast windows in place of "Are you sure?".
- **One picker doctrine.** Four variants, chosen by rule (see `03-primitives/picker.md`). Competitor has at least four distinct picker patterns for the same conceptual action across surfaces — exactly the v3-FieldShore problem v4 is solving.
- **Local-first with sync-realism (Principle 8).** Competitor degrades when connectivity goes. FieldShore works fully offline; sync is a quiet indicator, not a blocking modal.
- **The app earns its place quietly (Principle 11).** No splash, no onboarding, no tip-of-the-day.

## Archive links

Snapshot indexes only — no live links.

- [archive-1] G2 reviews, UI / IA / dated-interface complaints: `https://web.archive.org/web/*/https://www.g2.com/products/iamresponding/reviews`
- [archive-2] AppStorio review aggregation, tap-count and regression complaints: `https://web.archive.org/web/*/https://iamresponding-iar.appstor.io/app-reviews`
- [archive-3] Support — "Responding to an Incident" workflow: `https://web.archive.org/web/*/https://support.iamresponding.com/hc/en-us/articles/16293368956052--Responding-to-an-Incident`
- [archive-4] Support — NFIRS 5.0 bundled reporting: `https://web.archive.org/web/*/https://support.iamresponding.com/hc/en-us/articles/16294499968404-NFIRS-5-0-Reporting-FREE`
- [archive-5] Marketing flyer (state fire-association distribution): `https://web.archive.org/web/*/https://apps.nd.gov/NDFA/members/Content/dd/IamResponding%20Flyer.pdf`

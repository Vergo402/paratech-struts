# RapidSOS

> Adjacent competitor: a data aggregation and situational awareness platform for 911 communications centers and field responders, not a shoring ops tool. In the corpus because it sets the bar for "data rich emergency services display" in the same broad market FieldShore lives in. Public surface is thin (no published pricing, demo gated screenshots); sections based on limited public information are flagged.

---

## What it is

A cloud hosted situational awareness platform whose central pitch is that, in the seconds between a 911 call landing and a unit arriving on scene, the responding agency has almost no usable information. Just a CAD ticket and a voice radio. The product closes that gap by aggregating data from connected devices (smartphone GPS, building sensors, vehicle telematics, medical ID profiles, security cameras, IoT alarms) and routing the relevant slice to a unified screen used by both the telecommunicator and the field responder. Marketing copy frames it as closing the "radio only information gap" between dispatch and arrival ([source 1](https://web.archive.org/web/2026*/rapidsos.com/public safety/rapidsos-for-fire-ems/), [source 2](https://web.archive.org/web/2025*/rapidsos.com/)).

Architecturally a central system that collects data from many sources and sends it where it needs to go. B2B partnerships with device makers, automakers, rideshare platforms, alarm monitoring, and building management systems ingest feeds; B2G contracts with emergency communications centers (ECCs) surface that data inside the dispatcher's existing call handling or CAD console. The flagship is a "unified" workspace consolidating call handling, mapping, transcription, translation, video, and analytics, a deliberate response to the reality that a dispatcher's desk often has six to eight monitors running separate apps.

Three product layers matter to FieldShore:
1. A **dispatcher console** (web based, multi pane, map centered) inside an ECC.
2. A **field module** for responders (delivered via an acquired mobile app brand for fire/EMS) pushing CAD notes, unit tracking, and pre arrival data to a phone.
3. An **AI assistant** doing transcription, translation, summarization, and protocol prompting.

Category convention: "next-generation 911 (NG911)." RapidSOS effectively defines the polished end of that category.

---

## Target user

Two populations:

- **Telecommunicators / 911 call takers** at an ECC or PSAP. Stationary, seated, 8 to 12 hour shifts, multi monitor desks, headset audio, keyboard first. Often serving fire, EMS, and law simultaneously. Average tenure is high; UI changes are political. The primary buyer.
- **Field responders** (officers, firefighters, EMS) en route or on scene. Mobile, gloved or semi gloved, often in an apparatus cab. Network varies from FirstNet to nothing. The field module ships to a smartphone or tablet that sits in a vehicle dock more often than a turnout pocket.

Two contrasts with FieldShore's operator (the team officer in the building, watching firefighters dig and cut):
1. Their dispatcher is **seated and stationary**. Ours is **standing in rubble in structure gloves**.
2. Their field user is **pre arrival**, consuming intel before stepping out of the rig. Ours is **mid operation**, managing an unfolding shoring picture.

The product never claims to support the in rubble role; the assumption is that once a unit is "on scene," its tooling shifts elsewhere. That gap is exactly where FieldShore lives.

---

## Pricing tier

Pricing is not published. Enterprise B2G with custom quotes, module based pricing, multi year auto renewing subscriptions. A South Dakota procurement record shows module SKUs in the low thousands per year per agency (e.g. communicator module ~$2,400/yr, analyst module ~$4,000/yr before discount) ([source 3](https://web.archive.org/web/2025*/boardsandcommissions.sd.gov/bcuploads/RapidSOS%20Order%20Form%20-%20South%20Dakota_10.23.24.pdf)). That is the *agency* sticker; metros pay materially more.

A free base tier exists for ECCs as a market development play. Carrier aggregated caller location data into PSAPs at no cost, with later upsell to premium modules and AI/video. License terms: 12 month initial with three automatic renewals unless 90 day non renewal notice is given. Designed to be sticky.

**Implication for FieldShore:** the procurement playbook is "free entry → paid modules → multi year auto renew." Departments are already conditioned to that pattern; FieldShore's freemium to license arc maps to a path the buyer understands.

---

## Visual language

Public surface is marketing heavy and screenshot light, so this section is honest about the gaps. Inferred from the marketing site, a press release video frame, the integrated portal product page, and the responder mobile app's store listing.

### Color palette

Dominant identity: **deep navy to cobalt blue** as the primary brand color, with a **warm coral / red orange accent** for the wordmark and primary CTAs. The dispatcher map leans on a **muted basemap** (light gray and tan, similar to Esri "light gray canvas") with **saturated incident marker reds, ambers, and a strong action blue** for selected pins. Field app status semantics track the public safety GIS convention of two decades: green = available, amber = en route / staged, red = on scene / critical, blue grey = inactive.

Approximate hex values, inferred from marketing imagery (not from a published token file; the vendor does not publish a design system):
- Brand navy: ~`#0A2540` to `#102A43`
- Coral/red accent: ~`#E94B3C` to `#F25A47`
- Map basemap: ~`#F5F4EF` background, `#D9D5CC` road overlays
- Selected pin action blue: ~`#1A73E8`
- Warning amber: `#F4B400`; critical red: `#D93025`; text gray: `#3C4858`

### Typography

The marketing site uses what reads as a humanist sans, very likely **Inter** or a near cousin (the default "trusted SaaS" face), display weight 600 to 700, body 400. Product UI screenshots read as the same family or **Roboto**. Weights are conservative: legible utilitarian, not editorial. Type tracks well at 12 to 13px, with monospace for coordinates, what3words tokens, and CAD identifiers.

The responder mobile app uses platform native UI (San Francisco on iOS, Roboto on Android) inside ordinary list rows, tab bars, segmented controls. No custom mobile typography.

### Information density

The most consequential observation. The dispatcher console is **high density on purpose**. A single screen routinely shows: a half width live map; a call queue stripe; an incident detail panel with caller name, callback, ANI/ALI text, accuracy radius, dispatchable address, lat/long to 5 decimals, what3words token, altitude/floor estimate, device type, carrier, time since update; and supplemental data (medical profile, telematics, alarm metadata) in stacked collapsible cards. A seated dispatcher with a headset and keyboard can absorb a 14 row table.

The marketing line that dispatchers "sit at desks with sometimes more than eight monitors" is treated as an organizing fact about the user, not a problem to solve ([source 4](https://web.archive.org/web/2025*/rapidsos.com/blog/beyond coordinates/)). *Consolidating* across monitors is the value; density is the side effect.

The responder app drops density dramatically: three swipeable panes ("Now Responding," "On Duty," "Apparatus Status") with one primary action per pane ([source 5](https://web.archive.org/web/2025*/support.iamresponding.com/hc/en-us/articles/31874884163988-IamResponding Mobile-App Dashboard-Overview)). High density desktop, low density mobile. The same split FieldShore's "designed for the role, not the device" principle calls for.

### Dark/light strategy

Primarily **light themed** in marketing: bright basemap, white side panels, dark text. Unusual for "tactical" software but consistent with an indoor ECC (artificial light, no glare, multi shift). Some screenshots show a dark mode for the incident detail panels (dark navy, white text), but light is the default. No outdoor readable mode. The dispatcher is not outdoors at 11am in a structure glove. The mobile app follows OS preference. Glare and outdoor legibility are not part of the design problem this vendor is solving.

### Iconography

Restrained, mostly map pin and material style line icons. Marketing uses small flat icons in coral or navy outlined squares for the four pillar story. Decorative, not interactive primitives. On the map, iconography is dominated by **pin shapes color coded by data source** (phone pin, vehicle pin, camera pin, alarm pin) so a dispatcher can see *which feed* a marker came from. No custom illustrated mark for fire vs EMS vs law in the responder UI. Color and a small badge do the work.

---

## Primary workflows (top tasks)

1. **Receive a 911 call → see the caller on a map within seconds.** Flagship workflow. ANI/ALI data populates a panel, device provided high accuracy GPS lands on the map, the accuracy radius is drawn, the dispatcher reads the dispatchable address back to the caller. The moment the vendor exists to win.

2. **Stack supplemental data feeds onto the call.** Layer in medical ID profile (with caller consent), vehicle telematics from a crash, building sensor data from a connected alarm, security camera feeds from nearby connected cameras. Each is a one click expand collapsible card. "Security cameras nearby" surfaces as a blue banner when relevant cameras are in range.

3. **Push the assembled picture to field units before they arrive.** Pre arrival data flows from the console into the responder mobile app via the field module. The responder in the rig cab gets the same incident card plus turn by turn navigation, hazard markers, and other responders' live locations. Marketing frames it as decoupling officer location awareness from the radio ([source 1](https://web.archive.org/web/2026*/rapidsos.com/public safety/rapidsos-for-fire-ems/)).

4. **AI assisted call handling.** Live transcription, on demand translation, automatic protocol prompting from the transcript, post call summaries. The dispatcher can ask the assistant questions inline.

5. **Non emergency call triage / automation.** Low acuity calls (parking complaints, lockouts) routed to an automated agent. Not FieldShore's domain, but interesting as a category extension move once the console is the daily home.

---

## What they do well

- **Owning a single defensible job.** "Close the gap between dispatch and on scene." Everything ladders to that one sentence. FieldShore's analog: *every shore point's status is visible to the IC without a radio call.* The discipline of one sentence is teachable.
- **Consolidation as wedge.** Lead argument is not "better data," it is "*everything* you see on six monitors, on one." That converts a feature comparison into a workflow replacement. FieldShore should adopt the same posture against tactical worksheet apps and paper ICS-201.
- **Free entry tier as market conditioning.** Base product free to ECCs; the data feed is the asset; paid modules come later. Same playbook the FieldShore freemium to license arc maps to.
- **Density done deliberately.** The dispatcher UI is *appropriately dense*. They earned the right to be dense by knowing exactly who the user is. Density is not the enemy; *unjustified* density is.
- **Color coded data provenance.** Pins carry the *source* of the data, not just the location. Phone pin, vehicle pin, camera pin, alarm pin. A dispatcher reads provenance at a glance. FieldShore's shore point cards could carry the same affordance (who placed this point, from which surface).
- **Buying the responder client rather than building it.** They acquired the fire/EMS field app brand and rode the existing installed base. Worth noting as a strategic pattern.

---

## What they do poorly

- **Opaque public surface.** No published pricing, no UI gallery, no demo without an agency invite, no design system docs. Normal B2G, but it is a weakness as well as an advantage. Peer agencies cannot compare; reviewers cannot verify claims. FieldShore can differentiate by being radically transparent.
- **Marketing copy reaches.** Their "mission critical AI for emergency response" framing has not been independently audited to the standard FieldShore holds Paratech's published strut load rating tables to. A safety critical product that ships an AI summarizer should be ferociously clear about uncertainty; the public copy is not.
- **Light themed default wrong for field surfaces.** A responder next to a crashed car at 11am needs outdoor readable; the light default is fine in the cab, bad outside. No documented outdoor readable mode.
- **Dispatcher centric pattern bleeds into the responder app.** Mobile inherits desktop's stacked detail cards rather than starting from "what does a gloved hand need in three seconds?" Exactly the trap Principle 2 rejects.
- **Notification heavy.** Push alerts, banner alarms, audio chimes. For a category whose user is on a radio, this competes with the radio for attention. Principle 10 rejects this posture directly.
- **No offline story in public materials.** Cloud hosted, network dependent. Rig cab offline is a frequent reality; nothing public acknowledges it.

---

## What they assume about the user

- **Seated**, indoors, keyboard and mouse, multi monitor, headset.
- **Trained.** The UI assumes the vocabulary (ANI, ALI, PSAP, NG911, what3words).
- **On a stable network.** No visible offline state in marketing imagery.
- **Trusts data more than radio.** The pitch presumes data as primary channel, not backup.
- **Buying for an agency**, not themselves. Procurement is aimed at a chief or a county officer.
- **Pre arrival** in the field, or **at the desk** in the ECC. No design center for the "in the rubble" role.

FieldShore's user is none of these in the moments that matter: standing, gloved, on flickering LTE, radio first, buying as an individual department, in the rubble. Every divergence is a design choice we make on purpose.

---

## What we will deliberately NOT copy

- **Dispatcher first density on the phone.** Phone stays single canonical action, glove tier touch targets, low density.
- **Push notification urgency.** No flashing reds, no audio alarms, no "Evac Now" buttons. Principle 10.
- **Light only theming for outdoor users.** FieldShore ships a real outdoor readable mode in Phase E.
- **Vocabulary opacity.** NG911 jargon left bare on screen assumes training. FieldShore inherits NIMS verbatim (Principle 1) but every doctrine term gets a label or one tap definition (Principle 9).
- **Demo gated everything.** Manual, primitives, principles, design system live in public docs.
- **Cloud only assumed connectivity.** Principle 8, local first, sync realism. Sync is one quiet indicator, never a blocking state.
- **AI as centerpiece.** They lead with an AI assistant. FieldShore's safety critical math is deterministic and audited; AI does not enter the safety path in v4.

---

## What we will deliberately differentiate on

- **The in rubble role.** No one in this market designs for the team officer in the cut zone. FieldShore's focus, visible in every primitive: touch targets, contrast, glove tolerance, one handed reachability.
- **Surface aware role design.** Phone / tablet / Toughbook / broadcast TV is more granular than dispatcher console + responder mobile. The vendor has no broadcast TV surface; FieldShore makes the read only CP wall view a first class citizen.
- **Visible safety.** Load capacity, deductions, warnings stay on screen (Principle 7). They collapse supplemental data into accordions; we keep load relevant numbers visible.
- **Doubt free escapes vs. confirmation modals.** Principle 6, commit, then offer 5 second undo. They use confirmation modals; we will not.
- **Public, slow, ground up design.** The `docs/v4-design/` corpus is a deliberate counter stance to demo gated B2G.
- **Doctrine bound terminology.** NIMS, USACE, Paratech terms verbatim. They invent brand names for things that already have public safety names; we use the public safety name.
- **No life safety channel ambition.** Principle 10. They want to be in the radio's lane eventually; we explicitly will not be.

---

## Archive links

- [Vendor homepage snapshot](https://web.archive.org/web/2026*/rapidsos.com/)
- [Fire & EMS product page snapshot](https://web.archive.org/web/2026*/rapidsos.com/public safety/rapidsos-for-fire-ems/)
- [Field responder product page snapshot](https://web.archive.org/web/2025*/rapidsos.com/field responders-3/)
- [Mobile dashboard support article snapshot](https://web.archive.org/web/2025*/support.iamresponding.com/hc/en-us/articles/31874884163988-IamResponding Mobile-App Dashboard-Overview)
- [South Dakota module pricing order form snapshot](https://web.archive.org/web/2025*/boardsandcommissions.sd.gov/bcuploads/RapidSOS%20Order%20Form%20-%20South%20Dakota_10.23.24.pdf)
- [Blog: "Beyond Coordinates" responder UI screenshot snapshot](https://web.archive.org/web/2025*/rapidsos.com/blog/beyond coordinates/)

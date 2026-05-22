# Reference-App Positioning

## Purpose

This document plots the six reference apps and FieldShore on a single two-axis map. It exists so that every downstream essay, primitive, screen, and copy decision in v4 has one canonical answer to the question "where do we sit relative to the market, and what does that imply?" Come back here when a design choice starts pulling FieldShore toward a competitor's center of gravity — the map should immediately surface whether that drift is intentional or accidental.

The six teardowns each describe a competitor at the screen level. The synthesis below does the work the individual teardowns cannot: it forces a positional commitment. Without that commitment, v4 risks becoming a more polished version of whichever competitor the most recent designer was reading.

---

## The Two Axes

Eight candidate axes were considered before choosing. The shortlist:

1. **Tactical-operations focus ↔ Records / admin focus** — where does the product spend the user's day? At an unfolding incident, or in the schema that wraps around it?
2. **Field-first ↔ Office-first** — is the design center a gloved hand outdoors, or a seated user with a keyboard and a multi-monitor desk?
3. **Doctrine-fluent (NIMS / ICS / USACE) ↔ Doctrine-agnostic** — does the product surface verbatim public-safety doctrine, or does it speak its own marketing language and let departments configure their way to compliance?
4. **Single-purpose depth ↔ Suite-breadth** — does it own one square inch deeply, or own the whole administrative life of the department?
5. **Local-first / offline-tolerant ↔ Cloud-required** — what happens when the WiFi flickers, the cell goes down, or the rig is in a basement?
6. **Career-dept SaaS-priced ↔ Volunteer-friendly cheap** — who can actually afford it, and who is the buyer?
7. **Designed visual language ↔ Inherited / vendor-default UI** — is there a real type system and palette, or is it Windows / SF Symbols / "fire-engine red on white"?

The candidates collapse into clusters. Axes 1 and 2 are tightly correlated — products focused on records tend to live on office hardware; tactical products tend to be designed for the field. Axes 3 and 4 also correlate — the doctrine-fluent vendors tend to ship a smaller, more focused product because doctrine is itself a scoping discipline. Axes 5, 6, and 7 are individually important but they describe execution quality more than position. Two products can sit in the same quadrant and disagree on dark mode.

The two axes that most cleanly separate this competitive set **and** clarify FieldShore's intended position are therefore:

- **X axis: Tactical-operations focus ↔ Records / admin focus.** Where does the product earn its keep? At the moment a measurement is being taken and a strut is being deployed, or at the moment a closeout report is being filed?
- **Y axis: Doctrine-fluent depth ↔ Doctrine-agnostic breadth.** Does the product encode verbatim NIMS / ICS / USACE / Paratech terminology and stay narrow, or does it speak its own configurable vocabulary and stretch wide across modules?

These two reveal the white space more cleanly than any other pair. The tactical ↔ records axis separates "what happens when the rig arrives" from "what happens at the station table after the rig is back in the bay." The doctrine-depth ↔ doctrine-breadth axis separates "ship the schema verbatim and stay narrow" from "configure your way to coverage." A product can be tactical-and-agnostic (an iPad incident-command board with generic checklists), records-and-fluent (a NFIRS / NERIS RMS), records-and-agnostic (a calendar-and-messaging utility), or — the empty corner — **tactical-and-doctrine-fluent**.

That empty corner is where FieldShore lives.

---

## The Chart

```
                              DOCTRINE-FLUENT
                              (verbatim NIMS /
                              ICS / USACE depth)
                                     ▲
                                     │
                                     │
                                     │
                                     │      ◆ FIELDSHORE
                                     │        (tactical +
                                     │         doctrine-fluent,
                                     │         single-purpose)
                                     │
                                     │
                                     │
   ◆ RedNMX            │
     (records + NFIRS/NERIS          │
      fluent, dense Windows)         │
                                     │
                                     │      ◆ Tablet Command
                                     │        (tactical, NIMS-aware
                                     │         but configurable; iPad)
                                     │
   ◆ First Due            │
     (records-first suite,           │
     NIMS-aware-not-strict,          │
     command module bolted on)       │
                                     │
   ◆ Fire Rescue Systems ────────┼──────────────────────────────► TACTICAL
     (dispatch + records,            │                      OPERATIONS
     legacy Windows-form,            │                      FOCUS
     LOSAP-shaped)                   │                          (active incident,
                                     │                          on-scene work)
                                     │
                                     │
                                     │
   RECORDS / ADMIN ◄─────────────────┤
   FOCUS                             │
   (closeout, scheduling,            │      ◆ IAMResponding
   compliance, between-              │        (notification + roster;
   incident life)                    │         dispatch-to-status, then
                                     │         silence; volunteer-fit)
                                     │
                                     │
                                     │      ◆ RapidSOS
                                     │        (NG911 dispatcher console
                                     │         + responder app; pre-arrival
                                     │         data, not on-scene)
                                     │
                                     ▼
                              DOCTRINE-AGNOSTIC
                              (configurable categories,
                              brand-name vocabulary,
                              suite-breadth)
```

FieldShore sits **upper-right**: tactical-operations focus, doctrine-fluent depth. No observed competitor occupies that quadrant. The tactical competitors (`Tablet Command`, `RapidSOS`) stay agnostic-to-mildly-fluent and configurable. The doctrine-fluent competitor (`RedNMX`) stays in records. The "everything" suites (`First Due`, `Fire Rescue Systems`) straddle records-and-tactical at moderate depth in either direction, ending up plotted near the center-low.

---

## Per-product placement justification

**Tablet Command** plots in the **tactical, lower-doctrine-fluency** zone — right of center on X, just below the horizontal midline on Y. It is the most tactical of the suite: drag-and-drop unit assignment, PAR timers, scene timer, one-tap benchmark logging, after-action export emailed off the truck. Its handling of terminology is the right call. Vocabulary varies department to department — one agency's "rescue" is another's ambulance and another's heavy equipment truck, and a product that refuses to map onto local language locks those departments out. Letting a department rename "Group" to "Squad" is a feature, not a weakness, because vocabulary is a configuration surface by nature. What Tablet Command does not ship is the other half of the picture: the universal safety doctrine that is the same in every department, every incident, every time. Shore type taxonomy, manufacturer load tables, the math behind a strut at a given length under a given load, NIMS org structure — these are not configurable inputs, they are physics and federal doctrine. Tablet Command's tactical worksheets are intentionally all-hazard and shallow on that material; there is no shoring primitive, no strut load surface, no USACE depth. For the IC running a multi-unit fireground from an iPad, the configurable all-hazard worksheet is a well-shaped tool. For the team officer standing over a measurement deciding whether a strut holds, it is not the design center.

**First Due** plots **records-leaning, mid-doctrine-aware** — left of center on X, near the horizontal midline on Y. First Due's modules are sold à la carte. A department can buy the Command module on its own, or only NFIRS, or only training, or any combination it wants, and most of the departments running First Due never buy the whole catalog. Each module is built wide rather than deep. The Command module is NIMS-aware but not NIMS-strict, configurable down to the field name, and the pre-incident plans surfacing on a responder's phone during dispatch is genuinely good loop design. What no module ships, regardless of which ones the department buys, is a detailed shoring operation tracking and control system. For a department that wants to assemble its own platform from records, scheduling, prevention, training, and ePCR pieces with a tactical view alongside, picking modules one at a time is the actual advantage.

**RedNMX** plots **records-deep, high-doctrine-fluency** — far left on X, above the horizontal midline on Y. NFIRS / NERIS certified, LOSAP-native, 50+ named modules organized around the schema rather than the operator. The doctrine fluency is real (federal record schemas, volunteer-pension structures, NIMS-adjacent terminology) but its design center is the records lexicon, not on-scene terminology. The active-incident layer is outside the product's scope. Visually it inherits Windows; design-language thinking is not present. For a volunteer department whose center of gravity is NFIRS / NERIS / and personalized LOSAP / Pension compliance, that depth is hard to match.

**IAMResponding** plots **records-and-admin-leaning, doctrine-agnostic** — left of center on X, well below the horizontal midline on Y. Its center of gravity is between-incident administrative life: calendar, scheduling, NFIRS, member-tracking. During-incident contribution is a single status tap. NIMS structure (Section / Branch / Division / Group) is not first-class — it is implicit in roster grouping. The vocabulary is generic public-safety, not USACE / Paratech. Its tactical surface ends the moment "responding" is tapped, which is exactly where FieldShore's surface begins. For the volunteer-response loop — who is coming, when, in what — IAMResponding is a focused, well-fit tool.

**RapidSOS** plots **tactical-adjacent-but-pre-arrival, doctrine-agnostic** — slightly right of center on X (call it dispatch-tactical, not on-scene-tactical), well below the horizontal midline on Y. The product owns the gap between the 911 call landing and the unit arriving. Once the unit is on scene, the product's tooling is silent — the marketing copy concedes that the in-rubble role is not the design center. Vocabulary is NG911 jargon (ANI, ALI, what3words) rather than NIMS / USACE. It is the polished end of dispatcher-and-pre-arrival tooling and explicitly not the active-incident operations layer. For the dispatcher console and 911 caller location tracking, RapidSOS owns its lane.

**Fire Rescue Systems** plots **records-and-dispatch, mid-low doctrine-fluency** — left of center on X, just below the horizontal midline on Y. The suite covers dispatcher CAD, MDT, responder phone, roster, LOSAP, NFIRS, inventory — fifteen-plus modules organized around the volunteer-or-combination municipal dept shape. Vocabulary is fluent in the small-dept buyer's language (run sheet, preplan, Knox box, LOSAP) but not in NIMS-correct ICS doctrine. There is no on-scene tactical layer, no shoring primitive, no ICS-201, no NIMS-correct org chart. The phone app reads as the weakest part of the suite — the local-first contract is broken there, which is a structural finding, not a stylistic one. For a small combination department that needs CAD, MDT, roster, LOSAP, and NFIRS from one vendor at a volunteer-friendly price, the suite breadth is the value.

---

## FieldShore's place

FieldShore plots in the **upper-right quadrant**: tactical-operations focus crossed with doctrine-fluent depth. The placement is not a competitive accident — it is the direct consequence of every Phase A decision. Principle 1 ("defer to doctrine, not invention") pins the Y position; the 2026-05-17 local-first pivot to Type IV–V incidents pins the X position. Every other principle (calm in chaos, one canonical action per state, visible safety, doubt-free defaults, designed for the role, local-first) is a consequence of those two commitments, not an independent dimension.

The position is intentional. The doctrine-fluent records vendors (`RedNMX`) are anchored in records by the contract structure that funds them; the move rightward into tactical would unwind that gravity — their buyer signs a multi-year contract because the product owns NFIRS / NERIS / LOSAP, not because it owns the scene. The tactical SaaS vendors (`Tablet Command`) cannot extend upward into doctrine-fluency without sacrificing the horizontal "all-hazard" positioning their TAM depends on — a product whose shore-type taxonomy follows USACE word for word, and whose T-Shore lumber stays an operator choice, has narrowed its market on purpose. The suite vendors (`First Due`, `Fire Rescue Systems`) cannot pivot into either deep doctrine or deep tactical without breaking the broad-catalog-of-modules shape their buyers pay for.

What is intentional vs. accidental about the position deserves naming. **Intentional:** the tactical-and-doctrine-fluent corner, the four role-shaped surfaces — phone, tablet, laptop, broadcast TV — the local-first contract, the calm visual register, the decision not to carry life-safety communication. **Accidental but worth keeping:** the free-PWA economic posture, which is currently a v3 artifact but maps cleanly to `IAMResponding`'s flat-fee discipline and `RapidSOS`'s free-base-tier conditioning, both of which volunteer departments are already trained to. **Accidental and worth fixing in v4:** the Phase A surface still looks like v3 — system fonts, default browser controls, generic gray cards — which puts FieldShore visually adjacent to `RedNMX`'s Windows-inheritance even though strategically it is the polar opposite. The visual debt is the largest gap between the position FieldShore *holds* and the position it *looks like it holds*.

---

## White space we own

- **Tactical-and-doctrine-fluent (upper-right quadrant), single-purpose depth.** No competitor occupies this corner. The records-fluent vendors stay in records; the tactical vendors stay agnostic. A team officer running a Type IV partial collapse has no other tool that ships USACE shore-type taxonomy, Paratech load tables, and NIMS-correct org structure verbatim.
- **The in-rubble role.** `RapidSOS` explicitly concedes it; `IAMResponding` goes silent after the status tap; `Tablet Command` is iPad-first and the phone is read-only-ish. The team officer standing in structure gloves over a measurement is no one else's design center. (Axis: tactical-X, role.)
- **Four-surface consistency from one picker doctrine.** The closest competitor (`IAMResponding`) has at least four distinct picker patterns across phone / dashboard / station-display for the same conceptual action. The picker doctrine in `03-primitives/picker.md` is itself a competitive moat — same primitives, same vocabulary, role-shaped adaptations. (Axis: design-language, cross-surface.)
- **Local-first as design center, not as cached fallback.** `First Due` and `RapidSOS` are cloud-first with offline degradation; `Fire Rescue Systems`'s MRS earns 1.9 stars on "Disconnected" / "Waiting for Server"; `Tablet Command` is "graceful but degraded" offline. A real local-first writable surface with quiet sync indicators is uncontested in the tactical-X half of the chart.
- **Visible safety math.** Load capacity, deductions, qty>4 sentinels, unrated-zone warnings, conservative-floor interpolation, ACME load tables matched to the row. No competitor in any quadrant surfaces engineering-level load state — they surface command-level resource state at best. (Axis: doctrine-fluent-Y, safety-specific.)
- **A real broadcast-TV surface designed for CP-wide legibility.** `IAMResponding`'s station-display is the only adjacent attempt and it is a passive "who's coming" board for the bay wall, not an operational read-only CP view. The other five competitors have no broadcast surface at all. (Axis: cross-surface, role.)
- **Doctrine-encoded defaults that refuse to guess.** T-Shore lumber stays manual; load tables match Paratech to the row; the app never defaults a safety decision in the name of convenience. Configurable-everything platforms take the opposite design stance; FieldShore is not designed to be configurable in this dimension. (Axis: doctrine-fluent-Y, principle 5.)

---

## What FieldShore is not designed to be

- **No 50-module suite.** Principle 4 (one canonical action per state) and Principle 11 (earn its place quietly) make `RedNMX` / `Fire Rescue Systems` breadth a structural anti-goal. FieldShore is not designed to bolt on scheduling, training, prevention, LOSAP, or NFIRS.
- **No in-app life-safety communication.** Principle 10 is a hard contract. `Fire Rescue Systems`'s MRS sells 1:1 + group texting; `RapidSOS` ships push-notification urgency. FieldShore is not designed to replace a radio — no chat, no push during active operations, no "Evac Now" buttons.
- **No "all-hazard" horizontal expansion.** Principle 1 (defer to doctrine) pins us to structural collapse. The temptation to broaden into wildland, hazmat, technical rescue, or generic IMS is the temptation that put `Tablet Command` at moderate depth across many domains. FieldShore stays vertical.
- **No configurable doctrine.** Departments do not template their way out of USACE shore types, NIMS terminology, or Paratech load tables. Principle 5 (doubt-free defaults) means the safety call is never hidden behind a per-dept template. Configurable-everything is `First Due`'s design center; FieldShore is not designed that way.
- **No office-buyer-first positioning.** The team officer is the design center; the chief is the second surface, not the first. `First Due` and `RedNMX` sell to the records officer or the chief; FieldShore designs for the firefighter five minutes into a working incident.

---

## One-line "FieldShore's place"

Three candidates:

1. *"FieldShore is the only tool built for the team officer in the rubble — verbatim USACE / NIMS / Paratech doctrine on a glove-friendly, local-first phone, with role-shaped tablet, laptop, and broadcast surfaces, and zero life-safety communication."*

2. *"FieldShore lives in the empty corner of the fire service software market: structural collapse operations, designed for the rescuers inside the building and the technicians in the street — not the administrative officer at the desk."*

3. *"FieldShore is the active-incident structural-collapse tool: one canonical action per state, four role-shaped surfaces, visible safety math, doctrine encoded verbatim — owning the on-scene work that sits outside the records suites' design center and below the tactical SaaS vendors' altitude."*

**The Sentence** (#2 — most positional, fits in a pitch-deck header):

> **FieldShore lives in the empty corner of the fire service software market: structural collapse operations, designed for the rescuers inside the building and the technicians in the street — not the administrative officer at the desk.**

---

## Drift to watch for

- **Drift toward `Tablet Command`** — if Phase E starts optimizing the IC's tablet surface ahead of the team officer's phone surface, FieldShore slides downward and leftward toward the configurable-tactical iPad-first quadrant. Protection: Principle 2's "designed for the role, not the device" is enforced essay-by-essay; the phone surface for the team officer is *always* the first surface designed for any workflow, and the tablet is the second.
- **Drift toward `First Due` / `Fire Rescue Systems`** — if v4.5+ scope creeps into NFIRS export, scheduling, LOSAP, or mutual-aid messaging, FieldShore slides leftward into records-suite territory. Protection: the 2026-05-17 local-first pivot is explicit that v4 is Type IV–V scene tooling only; federal / IST / records workflows are deferred to v5 or later. Every scope-add request gets tested against "does this make the in-rubble role better?"
- **Drift toward `RedNMX`** visually — the current v3 surface (system fonts, default controls, gray cards) reads as records-suite even though the architecture is tactical. Protection: Phase E ships a real designed type ramp, controlled palette, sunlight mode, and four-surface design system before any new feature lands.
- **Drift toward `IAMResponding` / `RapidSOS`** on notifications — push notification temptation is real because every competitor uses it. Protection: Principle 10 is the hardest contract in the system; no PR adds a push notification, ever, without an ADR that explicitly cites and overrides Principle 10. Default is "no."

# Scenario Stress — Brainstorm Essay

> Phase C, essay 11 of 12. Lens: scenario stress. The job is to drive every other essay's recommendation through three real shape scenarios — Verplanck (Level V, car into house), Hamden (Level IV, URM strip mall), and Meadowville (Level III, warehouse pancake with command transfer and LongShore) — and call out where the proposed IA, primitives, or workflows tear. Surfside (Level I) gets a closing paragraph as the ceiling guardrail.

---

## Executive Summary

Verplanck is the entry test the v4 plan has not yet passed on paper. One engine, one IC who is also the company officer, three shore points, and a 5 second decision about whether to even open the app instead of placing a shore by hand. If the v4.0 auth screen, dept registration flow, invite code prompt, or any of the D7 onboarding ceremony sits between Captain Torres and her first shore point, the app loses the call. The principle that the app earns its place quietly has to ship as default-on guest mode, with auth as a deferred prompt at end of operation, not as a gate at start.

Hamden is where the proposed IA tears in two specific places. First, the cards-per-recommendation IA the architecture essay leaves unspoken would produce a 220-card list at TF scale; even at 8 shore points, the wrong dedup choice produces 24 cards instead of 8. Second, the T-Shore group of 3 with header/footer choice surfaces the principle-5 doubt-free-default conflict mid-list: the picker doctrine has no answer for "ask once for the group, apply to all members." Cards must group by shore point with strut alternatives nested, and grouped shore creation must ask the wood question once per group, not once per member.

Meadowville is where two essays I have not read yet are predicted to tear. The IC workflow essay's "first 90 seconds" framing will probably propose a dense single-screen dashboard; at 25 shore points and 10 apparatus with a command transfer at E+2:00, that screen runs out of pixels on a phone and breaks span of control on a tablet. The org chart primitive has to scale from one IC to a Section Chief with 4 direct reports without changing layouts. Surfside guardrail: any IA that does not survive 250 shore points across 4 task forces with concurrent OSC handoffs gets rejected here, not at Phase J cutover.

---

## Verplanck — Level V — Where the v4 Plan Has to Earn the Entry

### The shape of the call

Engine 1 from Millbrook FD takes the call at 14:30. A Honda Civic struck the front corner support post of a two-story platform-framed residence at about 25 mph. The front wall is leaning approximately 8 degrees off plumb, the second-floor joists above the impact zone are sagging visibly, and there is one ambulatory victim in the second-floor bedroom. The crew is four. Captain Torres is the IC. FF-1 is the shoring lead. FF-2 is entry assist. FF-3 is the runner. There will be no command transfer, no second alarm, no mutual aid, no second operational period, and no chief on scene. The call closes in about two hours.

This is approximately ninety nine percent of structural collapse calls a North American fire department will run in a career. Per the positioning doc and ADR-003, this is the everyday case that drives defaults, onboarding, and first impressions. If v4 does not work cleanly at Verplanck scale, nothing further in the design system matters.

### The auth gate is the kill switch

The D7 decision locks in email-plus-password auth, dept registration, invite code distribution, role assignment, and audit logging for v4.0. The plan, read straight, would put a login screen between Torres opening the app on the rig and her getting to a shore-point list. The architecture essay nods at this with "feature flag the security rule expansion until Phase J cutover" but does not solve the user-facing gate.

Drive it through the scenario. Torres is at 14:34, four minutes into the call, standing in the front yard watching her crew throw chocks and pull a hose for fuel suppression. She has not used FieldShore at a real incident before; her department onboarded three weeks ago. She unlocks her phone, opens the home screen, and the first thing she sees is a login form she does not remember setting up. She has the dept invite code on a sticky note in the rig glovebox. She does not open the app. She places three shore points with a Sharpie on a clipboard. The app has lost the call.

The v3 entry experience does this right by accident. Firebase Anonymous Auth gives every device a UID, the dept code is a single text field in Settings, and the Operations tab is the landing screen. The Round-2 audit flagged the anonymous-auth multi-tenancy gap as IP-001, which is real, but the cure cannot be to break the entry experience. The v4 answer has to be: the app is fully usable by an unauthenticated user against a default "no department" local-only sandbox, with all data persisting locally and showing a quiet "Sign in to sync across devices" banner that is dismissible. Auth becomes a prompt at end of operation when the IC is back at the rig with time to enter an email, or a prompt at the moment the user tries to share to a second device, never a prompt at app open.

This is also where the demo mode (open question 18) becomes load-bearing. The seeded demo department serves the marketing site, but it also serves the moment Torres opens the app cold, has not configured a department yet, and needs to see what the screen will look like before she trusts it with a real call. The first-run experience is: app opens, lands on the Operations tab, shows the demo department's sample operation as a dimmed placeholder behind a single "Start your first operation" affordance. One tap and the demo is hidden, a new operation is created against a local-only sandbox, and Torres is at the shore-point list within seven taps of dispatch.

### The IC-is-the-company-officer collapse

Principle 4 (one canonical action per state) and Principle 2 (designed for the role, not the device) both assume role separation that does not exist at Level V. Torres is the IC, the Operations Section Chief, the Safety Officer, the Shoring Group Supervisor, and the person calling for the second alarm if it gets worse. The org chart for this incident is one node with one name. The proposed v4 org chart primitive, sized for the SmartArt redesign in v3.16.x and the Meadowville scale described below, has to render cleanly as a single name with a "promote when you need it" affordance that does not feel like the app is asking for ceremony she does not have time for.

The v3 ICS Organization section already gets this approximately right; the v3.19.0 default chart (IC, Safety, Ops, Staging Area Manager, Division 1, collapsed) is exactly wrong for Verplanck and exactly right for Hamden upward. The collapse-default-when-empty pattern from v3.19.0 (collapse Division 1 because phone screens cannot render the tree) needs to be inverted for Level V: render only the populated roles, with an inline "Add role" affordance, and never show an unfilled slot. The chart for Torres at E+0:06 is one card with her name on it; the chart grows as she assigns FF-1, FF-2, FF-3 to specific functions. The org chart primitive in Phase E has to be authored against this state first, not against the Surfside tree first.

### The inventory math at Engine-1-only scale

Engine 1 has 2 ACME 60-inch struts, 4 universal plates, 2 wedge plates. That is it. The Quick Find lens entered at 58 inches and asked for shores returns one combination (the 60-inch with a 2-inch deduction handled by the wood footer). The Quick Find lens entered at 44 inches for the raker returns nothing, because there are no struts shorter than 60 in the kit. The v3 empty state fix in v3.7.3 handled this once; the v4 design system has to inherit that "no matching struts found, here is what to do" pattern as a first-class empty state primitive, not as a fallback. The visual-language essay (essay 2, not yet read) is predicted to propose elegant cards-with-images-and-deductions cards as the result-list; that design has to be tested against the literal "one result, deploy it" Verplanck case before it gets tested against the Hamden eight-results case.

The deployment of the 60-inch strut to SP #1 then deducts inventory to 1/2 available. The deployment to SP #2 deducts to 0/2. The Quick Find for the 44-inch raker now has to handle the legitimate case of "no inventory left," not just "no inventory match." This case (legitimate empty kit after legitimate deployment) is the case the v3 implementation got wrong until v3.7.3, and it is the case the v4 visible-safety principle (Principle 7) has to surface differently from "no compatible strut exists." The empty-state primitive has to ship with at least two variants by Phase E.

### Verplanck verdict

The v4 plan as written, with D7 auth as a v4.0 gate, fails Verplanck. The reframe required: guest mode is default, all data persists locally, auth is a deferred prompt, dept registration is a Settings flow not a startup flow, and the org chart primitive is authored against the single-name case first. The empty-state primitive ships with at least two variants (no match, no inventory). The demo department serves the cold-open experience as well as the marketing site.

## Hamden — Level IV — Where the Cards-Per-Recommendation IA Tears

### The shape of the call

Engine 1, Engine 2, Rescue 1, and BC-1 from Millbrook are working a URM strip mall parapet failure at 822 Dixwell Avenue at 42 degrees F in light rain. The roof over Units 2 and 3 is partially collapsed; two units (1 and 4) are intact but compromised. There are two suspected victims. The crew is 13 across four pieces of apparatus. Capt. Torres takes initial command at E+0:05; BC Whitfield assumes command at E+0:12 and reassigns Torres as Division Alpha Supervisor. There is a Safety Officer (Lt. Chen from Rescue 1). There is no formal Operations Section Chief; Whitfield runs Ops directly. The op runs for six hours; eight shore points get placed (five single verticals and one T-Shore group of three). A paper-event secondary collapse at E+2:30 forces a temporary withdrawal.

This is the typical working incident. Hamden is the test that proves v4 handles command transfer, grouped shore points, multi-apparatus inventory, division geography, and a Safety Officer with no special features in the v3 model.

### The 220-card IA problem the architecture essay does not solve

The architecture essay's recommendation 13 says "Build a real component library in packages/ui. Every primitive in 03-primitives/ has a corresponding typed component." Recommendation 16 says the demo mode embeds in the marketing site. Neither essay so far names how the Operations tab renders a shore-point list when each shore point has up to three strut recommendations attached. The v3.17.x dedup work fixed this in the result list (220 cards at TF scale collapsed to one card per configuration with alternatives nested), but the architecture essay does not explicitly carry that decision forward.

Drive it through Hamden. Marcus Webb (Shoring, Rescue 1) creates SP #1 (52 inches, single vertical, Division Alpha). Quick Find at 52 returns three valid combinations: ACME 48-inch with a 4-inch deduction, ACME 48-inch with no deduction plus 4 inches of 4x4 wood, and a third combination with a different plate pairing. If the Operations card list renders one card per Quick Find recommendation per shore point, Webb's 8 shore points produce 24 cards. Stretch the same logic to the T-Shore group of 3 with two recommendations each: 6 more cards. Total: 30 cards at Hamden scale. At Surfside scale (250 shore points, three recommendations average), the IA blows past 750 cards.

The correction the architecture essay needs is explicit. The Operations tab card list groups by shore point at the top level. Each shore-point card shows the deployed (or planned) configuration prominently. The two or three alternative recommendations are nested in an expandable detail row, collapsed by default. This matches the v3.17.x dedup work. The architecture essay's typed component recommendation has to carry an explicit ShorePointCard primitive that owns the configuration display and the alternatives disclosure, separate from a RecommendationCard that lives only inside Quick Find.

### The grouped shore wood-choice problem

Principle 5 (doubt-free defaults) and the v3.9.1 revert (T-Shore lumber not auto-filled, IC must choose 4x4 or 6x6 per shore type) collide with the grouped-shore creation flow. Webb creates a T-Shore group of 3 at the 78-inch measurement. The header and footer wood choice (4x4 vs 6x6) is a safety decision per Principle 5 and cannot be defaulted. But asking the question three times for a 3-member group is a Principle 4 violation (one canonical action per state) and a workflow tax that no other shoring tool charges.

The picker doctrine in `03-primitives/picker.md` does not have an answer. The bottom-sheet picker variant assumes single-select. The inline segmented picker variant is the right affordance for the 4x4-or-6x6 choice (two options, mutually exclusive). But neither variant has a documented "apply to grouped siblings" semantic. The picker primitive needs a documented modifier: when invoked inside a group-creation context, the picker writes its value to all group members at once. The UI affordance is a small inline note above the picker: "Applies to all 3 members of this T-Shore group." That is the explicit version of what the picker doctrine has to specify in Phase E.

### Concurrent multi-agency org chart edits

Whitfield assumes command at E+0:12. The v3 implementation overwrites the IC pointer and loses Torres's role-history record (Surfside TTX-2 IP-006). The architecture essay's event-sourced log fixes this at the persistence layer, but it does not address the UI ergonomic of the transfer itself. Drive the Hamden command transfer through the proposed v4 interface and the question surfaces: does the IC change happen via an org-chart drag (Torres dragging her own card to Division Alpha and Whitfield dragging into the IC slot), via a dedicated "Transfer Command" affordance, or via a sequence of role-clear and role-assign actions?

The v3 org chart already supports the drag-and-drop swap; the dnd-kit migration the architecture essay proposes preserves the affordance. But the workflow essay (essay 3, not yet read) is predicted to specify the command transfer as a multi-step wizard with an ICS-201 brief embedded. At Hamden scale (one transfer in a six-hour op, in light rain, with a parapet that just failed and a Safety Officer waiting for direction), a wizard is the wrong fit. The transfer at Hamden is one swap and one announcement. The wizard belongs at Meadowville and Surfside scale, where the transfer carries a real briefing burden.

The recommendation falls out: command transfer is a single drag-or-tap action at all scales, with an optional "Capture the brief" expansion that opens a nested checklist primitive (the same primitive that backs IC Command Checklist) prefilled with ICS-201 fields. The single action is the default; the briefing expansion is the disclosure. Verplanck never opens it (no transfer). Hamden may open it (one transfer, optional brief). Meadowville opens it every time (two transfers, brief is doctrine). Surfside opens it every time (five-plus transfers, brief is required).

### The Safety Officer with no app footprint

Lt. Chen has the Safety Officer role. In v3, the role assignment lights up a chart node and changes nothing else. The Mod-NIMS observation in the level-iv-sim skill flags this: "Safety Officer is the role distinct in the org chart? Does it have any Safety-specific features?" The honest answer in v3 is no. The hazard log (added in v3.12.0) is the closest thing, but it is not Safety-Officer-scoped or Safety-Officer-attributed.

The v4 design has a choice. Either the role assignment is just a label and the hazard log is the actual Safety surface (in which case the role-permissions matrix in D7.3 does not need a Safety entry, and the chart node is decorative), or the Safety Officer gets a dedicated surface (the hazard log, plus authority to flag a shore point with a Safety-Hold status that blocks status advancement until cleared). The Hamden secondary collapse at E+2:30 is the moment this matters most: Chen calls for crew withdrawal, the IC pauses operations, and the app should be able to record a Safety-Hold that prevents any further status transitions until Chen clears it. If the design picks the dedicated-surface path, the Safety-Hold status becomes a new entry in the STATUS_ORDER state machine the architecture essay locks down in recommendation 5. That is a real design call that has to happen in Phase F, not in Phase I.

### Hamden verdict

Three IA reframes required. ShorePointCard primitive groups by shore point with alternatives nested, never by recommendation. The picker doctrine adds a documented "apply to grouped siblings" semantic. The command transfer is a single action with an optional brief expansion, the brief expansion using the nested checklist primitive. One open design call: Safety Officer is either decorative or gets a dedicated hazard-log surface with a Safety-Hold status; if dedicated, STATUS_ORDER grows.

## Meadowville — Level III — Where Two Sibling Essays Are Predicted to Tear

### The shape of the call

Meadowville is the call that breaks every comfortable assumption. Pre-engineered metal building, 180 by 240 feet, 28-foot clear height. Snow load failure on the east bay at 05:45 on a Tuesday. 60 by 240 feet of roof deck pancaked onto the warehouse floor. Two confirmed workers inside per security badge-in records. Active snowfall, 28 degrees F, 15 mph wind gusting 30. Visibility a quarter mile. Cold-stress requires 30-minute work cycles. Liquid nitrogen dewar (500 gallons) in the northeast corner with integrity unknown. West bay roof showing midspan deflection (100-foot exclusion zone). Single personnel door for egress.

The response: 9 Millbrook apparatus over 22 minutes, plus County Engine 4 as mutual aid. Heavy Rescue 1 arrives at E+0:22 with the primary strut kit. Command transfer Torres-to-Whitfield at E+2:00, with Torres demoted (or promoted, depending on doctrine reading) to OSC. OP2 boundary at E+6:00 with OSC rotation Torres-to-Vega. 25 shore points across Divisions Alpha (interior) and Charlie (exterior). 2 grouped shore types: a LongShore group of 3 at 96 inches (16 feet, on the boundary of the LongShore unrated zone), a Double-T group of 2. 12 hours.

This is the call that justifies the existence of the four-surface design model from Principle 2. The phone is the Shoring participants in the void. The tablet is Whitfield at the CP. The Toughbook is Vega doing the OP2 ICS-201 brief at E+5:30. The broadcast TV is Donovan (Safety) projecting the hazard log and the 100-foot exclusion zone onto a rig-mounted screen for the rest of the CP to see.

### The IC workflow essay's first-90-seconds problem

I have not read essay 3 (IC workflow) yet. My prediction: it proposes a dense single-screen command dashboard, sized for the moment the IC takes the radio and needs to see status, resources, victims, divisions, and the IAP cover sheet in one view. At Verplanck scale that screen is trivially one card. At Hamden scale it fits a phone with scroll. At Meadowville scale it has to render 10 apparatus, 2 divisions, a Safety section, an OSC card, a Shoring Group card, a Cutting Group card, a current OP marker, the OP2 boundary countdown, the LN2 hazard, the parapet exclusion zone, the victim count, and the 25 shore-point status summary. On a phone, this is a scroll. On a tablet, this is multi-pane. On the Toughbook, this is multi-column. On the broadcast TV, this is the canonical board.

The risk the IC workflow essay carries is that it specifies a one-size-fits-all dashboard that works at the scale it imagined and breaks at the scale it did not. The scenario-stress correction: the dashboard primitive specifies progressive density. The phone variant shows the next decision (the next status transition pending IC approval, the next role unfilled, the next hazard requiring acknowledgment). The tablet variant adds the resource board. The Toughbook adds the IAP cover sheet and the audit log. The broadcast TV adds the SP map and the cutting-table queue. Every variant uses the same primitives. The data the dashboard pulls is the same projection of the event log (per architecture essay recommendation 8); the presentation layer adapts per surface.

### The cutting-table foreman's phone-vs-tablet handoff

This is the seam the field-conditions essay (essay 7) is predicted to flag and the IC-workflow essay (essay 3) is predicted to miss. At Meadowville, the cutting table is a dedicated workspace, probably staffed by Squad 1 or Heavy Rescue 1 personnel with at least one foreman managing the queue. The cuts come in over radio from the shoring teams in the void: "Send me a 4x4 cut to 38 inches for the T-Shore at Division Alpha row 3, marked SP-12 member 2." The cutting table needs to display the queue, mark cuts as in-progress, advance them to ready-for-runner, and hand off to the runner.

The v3 model collapses this onto the same shore-point card the team officer sees in the void. The cut status (cutting, runner, secured) is per-shore-point per the v3.8.0 phase split. The cutting-table foreman in v3 sees the same card the team officer sees, just at a different stage. That model breaks at Meadowville because the cutting-table foreman is managing 8 to 12 concurrent cuts across all shore points, not one card at a time. The right primitive is a cut queue view, sorted by FIFO with priority overrides, with each row showing the shore-point ID, the cut spec (lumber type, length, count), the requesting team officer's name, and the current status.

This is a tablet-specific surface the v3 model does not have. The IA essay (essay 5, NIMS) and the IC workflow essay (essay 3) may not name it. The Operations tab does not need this view because the IC does not run the cutting table. The right placement is a Cutting Group dedicated screen that opens by default on the cutting-table tablet when the operator is assigned the Cutting Group Supervisor role. Surface adaptation per Principle 2: phone shows the foreman's own cuts only (relevant if they are also cutting); tablet shows the full queue; broadcast TV shows the queue projected for the CP awareness.

The architecture essay's repository pattern (recommendation 6) supports this naturally because a CuttingQueueRepo is a filtered projection over the same event log the ShorePointRepo uses. No new persistence path. The IA essay needs to name the Cutting Group screen as a first-class screen in the Phase F IA spec.

### The org chart at span-of-control scale

The Meadowville OP2 org chart (per the personnel roster):
- IC: Whitfield
- Safety: Donovan
- OSC: Vega (rotated in from Torres)
- Division Alpha Supervisor: Tran
- Division Charlie Supervisor: Hashimoto
- Shoring Group Supervisor: Heavy Rescue 1 Officer
- Cutting Group lead: Squad 1 Officer

OSC Vega has 4 direct reports (Div Alpha, Div Charlie, Shoring Group, Cutting Group). IC Whitfield has 3 direct reports (Safety, OSC, plus probably PIO and Liaison if they exist at this scale). Span of control is within NIMS guidance (3 to 7). The org chart primitive renders 7 cards in a tree with two levels below IC. On a phone, this is at the edge of what fits without horizontal scroll. On a tablet, this is comfortable. The v3.19.0 default chart (collapsed by default) is the right move at this scale.

The drag-and-drop org chart from v3 with dnd-kit migration (architecture essay recommendation 22) handles this. The risk is the visual-language essay (essay 2) proposing card sizes that make the tree look beautiful at Hamden scale but break at Meadowville scale. The constraint that propagates back: the org chart card primitive has a maximum width such that 7 cards across two levels fit on a tablet in portrait without horizontal scroll. The tablet portrait constraint is the binding one because the CP tablet is often used in portrait when handheld near the rig and in landscape when on the IC table.

The Meadowville two-transfer scenario (Torres-to-Whitfield at E+2:00, Torres-to-Vega OSC rotation at E+6:00) also stresses the role-history audit (D7.5, IP-006). The architecture essay's event log captures this naturally. The UI affordance: at any time, an IC can tap a chart node and see the full role-history for that position across the operation. At Meadowville, the IC position shows Torres E+0:06 to E+2:00 then Whitfield E+2:00 onward; the OSC position shows Torres E+2:00 to E+6:00 then Vega E+6:00 onward. This is one tap into the chart, not a separate audit log screen.

### The LongShore unrated-zone surfacing

Webb (Shoring-A) creates the LongShore group of 3 at 96 inches (8 feet). That is well within rated range. The stress case is when the same team needs to span 17 feet on the west bay deflection mitigation and the operator enters 204 inches into Quick Find. The v3.5.2 unrated-zone treatment surfaces a deployable warning that requires explicit team acknowledgment. The v4 design has to inherit this verbatim per Principle 7 (visible safety). The risk the domain UX essay (essay 6) carries is treating the warning as a modal block rather than as a deployable-with-acknowledgment. The Principle 6 doubt-free-escape pattern argues for an inline warning that the operator must check before the Deploy button is enabled, not a modal stack.

The Phase E design system has to define the "warning that gates an action" pattern as its own primitive, distinct from the Toast primitive (informational, dismissible) and the modal primitive (interrupt). The warning-gate primitive is the right primitive for the unrated-zone case, the qty>4 sentinel case (NEW-3 from v3.5.2), and the liability-disclaimer case (v3.7.2). It is one primitive, three uses.

### The cross-surface story at 25 shore points

Whitfield on the CP tablet sees the dashboard. Vega on the Toughbook (probably opened around E+5:00 to prepare for the OP2 ICS-201 brief) sees the multi-column ops view. Webb on the phone in Division Alpha interior sees the shore-point list filtered to Division Alpha. Krug on the phone in Division Charlie exterior sees the shore-point list filtered to Division Charlie. Medina (runner, Engine 3) on the phone sees the cutting-table queue filtered to "cuts assigned to me." All five views are projections of the same event log. The architecture essay's TanStack Query layer plus the repository pattern handles this naturally if the projections are filterable at the query level.

The IA essay has to explicitly name the filtered-shore-point-list as a screen-level concept, not a one-off filter that bolts onto the Operations tab. The right model: the Operations tab has a "scope" selector at the top (visible only when the user has a divisional or group role) that defaults to the user's assigned scope. Webb's tab opens to Division Alpha by default. Krug's tab opens to Division Charlie by default. Whitfield's tab opens to "all." The scope selector is the inline segmented picker variant per the picker doctrine. The Hamden division-filter request from Entry-B (level-iv-sim Mod-UX item U-4) is the same affordance at a smaller scale.

### Meadowville verdict

Three predicted-tear corrections needed before Phase F. The IC workflow essay's dashboard must be progressive-density across the four surfaces, not one dashboard with smaller text. The IA essay must name a Cutting Group screen as a first-class screen for the tablet surface. The Phase E primitive set must include a warning-gate primitive distinct from Toast and Modal. The org chart card primitive must fit 7 cards across two levels on a tablet in portrait without horizontal scroll. Scope-filtered Operations tab opens to the user's assigned scope, not all.

## Surfside Guardrail — The Ceiling That Disqualifies Any IA That Cannot Hold

Surfside-TTX-2 already ran. The artifact is in `.claude/simulations/surfside-ttx-2/`. The headline numbers tell the story: 494 personnel at peak, 250 shore points, 4 OPs across 36 hours, 5 command transfers, 6 OSC rotations, 63 catalogued findings. The top three critical findings (IP-001 multi-tenancy gap, IP-006 role history loss, IP-007 add-SP modal save button hidden) are exactly the findings the v4 plan is designed to close.

For this essay's purpose, Surfside serves as the upper-bound disqualifier. Any IA recommendation that does not survive 250 shore points across 4 task forces with concurrent OSC handoffs and unified command (Fire, LE, FBI) gets rejected here, not at Phase J. The progressive-density dashboard from Meadowville scales to Surfside cleanly because each surface renders only what the user with that role needs. The ShorePointCard primitive from Hamden scales to 250 cards because the cards are grouped, scope-filtered, and virtualized at the list level. The picker doctrine from Verplanck scales to 250 shore points because the search-when-over-7 rule kicks in early and stays kicked in. The org chart from Meadowville scales to a full IMT with all General Staff sections, Branches under OSC, and IST elements because the tree primitive does not change shape between three nodes and three hundred nodes; it just collapses subtrees by default at every level past two. The warning-gate primitive scales because federal qualifications add more warnings (every Type I task force has its own gate-the-action moments), not bigger ones.

The architecture essay's event-sourced log is the load-bearing call at Surfside scale. Without it, the role-history loss across 11 transfers (5 IC + 6 OSC) repeats. With it, the audit log is the event log filtered for display. The repository pattern is what lets the IC dashboard, the IST liaison's view, the federal TF leader's view, and the unified command planning brief all read the same data through different projections at the same time without one slowing another down.

The disqualification rule: if any recommendation from any sibling essay would force a redesign at Surfside scale that breaks the Verplanck experience, the recommendation is rejected here, not held over to Phase J.

---

## Recommendations

1. Guest mode is the default first-run experience. The app opens to the Operations tab with no auth prompt; data persists locally; a dismissible "Sign in to sync across devices" banner is the only auth surface. Auth registration is a Settings flow, not a startup flow. Predicted to be rejected by the architecture essay's recommendation 26 if read literally; the correction is "v4 reads the same Firebase tree v3 writes, security rules tighten at Phase J, AND v4 supports an unauthenticated guest path against a local-only sandbox indefinitely."

2. The demo department doubles as the cold-open placeholder on first run. New users see the seeded sample operation dimmed behind a single "Start your first operation" affordance. This satisfies open question 18 and Principle 11 (the app earns its place quietly) at the same time.

3. The org chart primitive renders only populated roles by default; the v3.19.0 collapse-Division-1 default is correct at Hamden upward but wrong at Verplanck. The primitive grows on demand, never asks the IC to manage empty slots. Authored against the single-name case first in Phase E, the seven-cards-two-levels case second, the Surfside-full-IMT case third.

4. The empty-state primitive ships with at least two named variants in Phase E: "no matching strut" (correct combinations not available in inventory) and "no inventory" (legitimate empty kit after legitimate deployment). The visible-safety principle (Principle 7) requires they look different.

5. The Operations tab card list groups by shore point at the top level with alternative strut recommendations nested in an expandable detail row, collapsed by default. The architecture essay's typed components must include a ShorePointCard primitive (configuration display + alternatives disclosure) separate from a RecommendationCard primitive (lives only inside Quick Find). This closes the 220-card IA seam the v3.17.x dedup work already opened.

6. The picker primitive specifies an "apply to grouped siblings" semantic with a documented inline note ("Applies to all 3 members of this T-Shore group"). The inline segmented variant is the right affordance for the 4x4-vs-6x6 wood choice at Hamden grouped-shore scale.

7. Command transfer is a single drag-or-tap action at all scales. The optional "Capture the brief" expansion uses the nested-checklist primitive prefilled with ICS-201 fields. Verplanck never opens it. Hamden may. Meadowville and Surfside open it every time. The IC workflow essay (essay 3) is predicted to want a wizard; the correction here is single-action-with-optional-expansion.

8. The Safety Officer surface decision is open and has to land in Phase F. Either the role is decorative and the hazard log is the actual Safety surface, or the role grants the authority to set a Safety-Hold status that blocks shore-point status advancement until cleared. If the latter, STATUS_ORDER grows by one entry and the architecture essay's state machine in recommendation 5 needs updating.

9. The dashboard primitive specifies progressive density across the four surfaces, not one dashboard with smaller text. The phone variant shows the next pending decision. The tablet variant adds the resource board. The Toughbook adds the IAP cover sheet and the audit log. The broadcast TV adds the SP map and the cutting-table queue. Sibling essays predicted to violate this: essay 3 (IC workflow) and essay 6 (domain UX).

10. The IA spec (Phase F) names a Cutting Group screen as a first-class screen, surfaced on the cutting-table tablet when the operator is assigned Cutting Group Supervisor or Cutting Group lead. The screen shows a FIFO cut queue with priority overrides. CuttingQueueRepo is a filtered projection over the event log per the architecture essay's repository pattern.

11. The Phase E primitive set includes a "warning-gate" primitive distinct from Toast (informational, dismissible) and Modal (interrupt). The LongShore unrated-zone case, the qty>4 sentinel case, and the liability-disclaimer case all use this one primitive.

12. The org chart card primitive has a maximum width such that 7 cards across two levels fit on a tablet in portrait without horizontal scroll. The Meadowville OP2 chart (IC + Safety + OSC + 4 reports under OSC) is the binding constraint. Sibling essay 2 (visual language) predicted to violate this if cards are sized for Hamden scale only.

13. Role history is exposed as a one-tap-from-the-chart-node affordance, not as a separate audit log screen. Tapping a chart node shows the full role-history for that position across the operation. Meadowville OP1+OP2 shows IC = Torres E+0:06 to E+2:00 then Whitfield; OSC = Torres E+2:00 to E+6:00 then Vega. Built on the event log per architecture essay recommendation 8.

14. The Operations tab includes a scope selector (inline segmented picker variant) at the top, defaulting to the user's assigned divisional or group scope. Webb opens to Division Alpha. Krug opens to Division Charlie. Whitfield opens to "all." Handles Hamden Mod-UX item U-4 and Meadowville's 25-shore-point cross-surface problem in one IA decision.

15. The shore-point list is virtualized at the list level so that 250 cards at Surfside scale render without scroll lag. The architecture essay's recommendation 13 (typed component library) and recommendation 18 (Playwright end-to-end tests) need an explicit virtualization test against 250 shore points before Phase H closes.

16. Every Phase E primitive and Phase F screen is dispositive against three scenario states in this exact order: (a) it must render cleanly at Verplanck single-IC single-operation single-screen scale, (b) it must hold its IA at Hamden multi-apparatus multi-division T-Shore-group scale, (c) it must not break the Operations tab at Meadowville 25-shore-point command-transfer-mid-op OP-boundary scale. Surfside is the disqualifier above; the three lower scenarios are the design tests below.

17. The Phase H vertical slice (per the v4-master-plan plan) is the "Start operation → Add shore point → Deploy strut" workflow. This essay's correction: the slice must be driven through both Verplanck single-engine scale AND Hamden T-Shore-group-of-3 scale before the gate passes. The Verplanck drive proves Principle 11 (quietly earns its place); the Hamden drive proves the grouped-shore wood-choice picker semantic and the multi-apparatus inventory deployment work together.

18. The Phase I milestone gates run Level V (Verplanck), then Level IV (Hamden), then Level III (Meadowville) against the v4 build before the gate moves. Level II (Riverside) and Level I (Surfside) re-runs gate the v4.0 release-candidate build and the v4.5 mutual-aid release-candidate build respectively. This formalizes the simulation infrastructure as design validation per ADR-003, not as technical stress testing.

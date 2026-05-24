# IC Workflow — Brainstorm Essay

## Executive Summary

The Incident Commander's workflow in FieldShore v4 needs to be designed as if the app were the only tool on the command post table at 3am. The first screen an IC sees when they take command should answer four questions in under five seconds: who is the current IC, where is the Safety Officer, how many personnel are on scene, and what op period is active. None of those are above the fold in v3. The app makes the IC hunt for each piece.

Command transfer is the sharpest test. At E+0:09 in the Surfside TTX-2, BC McAllister arrives at a working collapse with five companies already on scene and takes command from Capt. Reyes via an ICS-201 brief. In v3 that transfer is a buried interaction inside the org chart. In v4 it needs to be one deliberate tap that animates the IC card, announces the new commander via an aria-live region, and offers a five-second undo window. The outgoing IC's hazard log, briefing notes, and all shore point status survive intact and are immediately visible to the incoming IC.

Span of control is the second critical gap. At E+5:00, the State USAR TF arrival pushed the Operations Section Chief past twelve direct reports with no in-app signal that the NIMS limit of seven had been exceeded. The org chart should warn at seven, warn harder at nine, and offer one-tap Branch promotion.

The Safety Officer needs to be visible from any screen the IC is on without navigation. The hazard log is absent from v3 entirely and needs to be a first class object, one tap from the IC's home screen. The operational period boundary, the PAR status, and the ICS-201 handoff screen all need to be deliberate interactions designed at the same depth as the picker primitive, not afterthoughts buried in the tree.

The Surfside TTX-2 produced sixty-three findings. The eleven that touch IC workflow directly — IP-006 (role history loss), IP-013 (singular IC prevents Unified Command), IP-014 (no NIMS preset), IP-016 (no op period indicator), IP-020 (no span warning), IP-032 (no safety state), IP-036 (no hazard log), IP-037 (no SitStat), IP-050 (no radio script), and the command transfer UX gaps — are the substrate this essay works from.

---

## The First Ninety Seconds

When an IC arrives on scene, the first question is situational. Not "where do I log in" and not "what feature should I open." The question is: what is happening right now and what needs to happen in the next five minutes?

The v3 Command tab does not answer this. It shows the org chart. The org chart is useful during command, but it is not a size-up view. The IC arriving at E+0:09 does not need to see which role is assigned to which apparatus first. They need: current IC name and status, Safety Officer name and assignment status, personnel on scene count, active shore points by status, current op period number with elapsed time, and Phase I checklist progress.

The Surfside TTX-2 surfaced this directly. The incoming IST Plans Section Chief at E+27:00 needed what she described as a sixty-second SitStat — a single screen that gave her current incident state without reading four operational periods of IAP narrative. That need applies to every IC arrival, not just IST. The IP-037 finding called it out as high severity.

The IC's home screen on the iPad is the SitStat view, not the org chart. Six things, in large readable type, with no chrome competing for space. Incident name and location across the top. IC name with a gold underline — the canonical "this is who is in command" signal. Safety Officer name in the persistent header with status coloring: green when assigned, amber when the role is vacant. Personnel on scene as a single large number. Shore point status as a horizontal count row showing pending, in process, secured, and returned. Op period indicator with elapsed time. Below the fold: Phase I checklist progress and the hazard log entry count as a badge.

That is the above the fold view. Everything else is one tap away.

Tablet Command's worksheet view gets dense with thirty-plus unit tiles, a checklist tray, and a map competing for attention. The SitStat approach inverts that instinct. Show the six facts that matter for orientation right now. Keep the rest at one tap depth. The IC does not manage the incident from the SitStat screen — they orient from it, then navigate to the org chart, the hazard log, the shore point board, or the IAP from there.

---

## Command Transfer

At E+0:09, BC McAllister's apparatus rolls up and he physically walks to Capt. Reyes for a face-to-face brief. The app parallel to that moment needs to feel like that handoff, not like navigating a settings menu.

The command transfer interaction in v4 works as a two device choreography. The outgoing IC sees a "Transfer Command" button in the persistent IC header — not in the org chart, not in settings. It is the one canonical action available to an IC who is about to hand off. Tapping it opens a bottom sheet picker (five to seven options per the picker doctrine) showing the apparatus and individuals on scene eligible to receive command. The outgoing IC selects the incoming IC. The app commits immediately: the IC card in the SitStat header animates a 200ms horizontal swap, the gold underline shifts from the outgoing name to the incoming name with a 1pt pulse at 300ms (no repeat, no loop), and an aria-live polite region announces "Command transferred to [name]." The outgoing IC sees a toast: "Transferred to [name]. Undo (5s)" — tapping Undo reverts with the same 200ms animation in reverse.

The incoming IC's device surfaces a full screen takeover: "You are now the Incident Commander — [Incident Name]" with two primary actions: "View Briefing" and "Confirm (5s)" countdown. If the incoming IC does not tap Confirm within five seconds, the takeover stays visible but the incident keeps running. The five-second auto-confirm prevents the takeover from blocking operations if the incoming IC's device is in someone else's hands.

The briefing view is the ICS-201 handoff screen. It shows four fields: current incident objectives, resource assignment summary, Safety Officer identity, and the active hazard log. It is derived from the role history log and requires no additional data entry at transfer time — the outgoing IC's work during their tenure populates it.

Role history is the structural foundation of this interaction. The Surfside TTX-2 identified IP-006 as a critical finding: every role transition across five IC transfers and six OSC rotations resulted in complete history loss, because the roles map overwrites the previous holder. In v4, every role assignment appends to an audit log at `/operations/{opId}/roleHistory/{push}` — who held the role, when they took it, when they departed, which device made the write, and who authorized it. The briefing view is a derived view from that log. The log is always current and the handoff view has zero additional implementation cost beyond the log itself.

At E+0:45 when DC Park takes IC for the third time and McAllister moves to Operations Section Chief, the handoff happens again — this time at high speed with more resources on scene. The two-device choreography and the five-second window are not just nice to have; they are the difference between a transfer that takes ninety seconds and one that takes six minutes.

---

## Span of Control

NIMS sets seven direct reports as the upper bound for any supervisor. At E+5:00 in the Surfside TTX-2, the State USAR TF arrival pushed the Operations Section Chief from six direct reports to twelve with no in-app signal of any kind. Twelve direct reports means the section chief cannot maintain situational awareness of each resource. The doctrine answer is to introduce a Branch tier. The app should know this and say so (IP-020).

In v4, every supervisor node in the org chart carries a live count of direct reports. When that count exceeds seven, the node label gains an amber dot and a badge with the count. When it exceeds nine, the dot goes red and a non-blocking toast surfaces: "Operations has 9 direct reports. Add a Branch?" — tapping the toast opens a one-action sheet that creates a Branch Director node and presents the existing direct reports as a reassignment list. The IC picks which resources move under the new Branch Director. The restructure commits locally first and syncs to Firebase. The org chart rerenders in place with the new tree structure.

This is not a blocking modal. The IC can dismiss the toast and keep working. The amber dot stays on the node as a persistent reminder. The doctrine nudge is visible but never forces a stop.

The org chart needs to render correctly at depth four, five, and six. The Surfside TTX-2 found that the v3 renderer crashed on undefined roleAssignments at parentId depth four (IP-023). In v4, the tree renders at any depth, and the IC's tablet uses progressive disclosure by default: Command Staff and Section Chiefs visible at first glance, Branches at one tap, Groups at two taps, Units at three. An "Expand All" control exists for the Toughbook surface where keyboard navigation makes it practical. The IC does not need to see every Unit Leader while managing a span of control adjustment.

---

## Safety Officer as Permanent Fixture

The Safety Officer is not another role in the org chart. The Safety Officer is the person the IC calls when a building makes a noise. Finding them should take zero navigation from any screen the IC is on.

In v4, the Safety Officer name appears in the persistent header on every IC-facing screen. When the role is vacant, the header shows an amber "SO: Vacant" badge. When filled, it shows the name in high-contrast type adjacent to the IC name. There is no tap required to see it. It is always visible.

One tap on the Safety Officer badge opens a summary: what hazards they have logged, the last hazard timestamp, and which area they are currently monitoring. That tap is a reference tap, not a navigation tap. The badge itself is the signal.

This is encoding NIMS doctrine in layout, not in a database field. The Safety Officer reports directly to the IC. The app's visual structure should reflect that relationship, not just the org chart tree.

---

## Op Period as the IC's Time Horizon

The operational period is the heartbeat of an extended incident. The Surfside TTX-2 ran four operational periods across thirty-six hours and the app rendered the entire span as one undifferentiated timeline. IC #4 Chief Whitaker took command at E+9:00 with no in-app indication he had crossed an op period boundary (IP-016).

In v4, the op period number and elapsed time appear in the persistent header on every IC screen. The format is "OP 2 — 4h 22m" with a thin progress indicator showing position within the planned op period length. At thirty minutes before the planned end, the header gains a subtle amber accent — not alarming, not flashing. A quiet signal that the IAP cycle is approaching and the next period planning should be underway.

At the op period boundary, the app surfaces a non-blocking transition card: "OP 2 complete. Start OP 3?" with a field for the new op period duration and an ICS-202 IAP reference. The IC can dismiss it and keep working. Every write after that boundary is tagged with the new op period number so the post-op reconstruction is clean and the export filters by period without manual sorting.

The E+9:00 twelve-hour shift transfer to Chief Whitaker is an example of an op period boundary and a command transfer happening simultaneously. The two interactions compose: the command transfer fires first, the op period card surfaces after the briefing view closes. The incoming IC completes the handoff, then sees the op period prompt as a second step.

---

## Hazard Log

The hazard log did not exist in v3. Across the Surfside TTX-2, seven standing hazards — gas leak at the northeast corner, cantilever risk on the south pancake, salt-saturated debris affecting cribbing integrity, suspended facade fragments, deteriorating balcony rails, seawall proximity, vehicle fluids from abandoned cars — lived only in the Safety Officer's notebook and the IAPs. None of that was in the app (IP-036).

In v4, the hazard log is one tap from the IC's SitStat home screen. The badge on the SitStat shows the count of active unmitigated hazards. Tapping opens the list: each entry shows the hazard description, the area it applies to, mitigation status (open, mitigating, mitigated), Safety Officer attribution, and timestamp. New hazards can be added by the IC, the Safety Officer, or any company officer — hazards are operation-wide data, not IC-only.

Shore point cards display a hazard badge when their area has active unmitigated hazards. If SP-42 is in an area with a cantilever risk, that badge appears on the card for the team officer in the field who is about to work that point. The hazard log and the shore point lifecycle are connected, not parallel systems.

The hazard log also exports to ICS-208 format. The IC should be able to hand off a printed hazard summary to an incoming IC or to the Safety Officer at shift change without reconstructing it from memory.

---

## Cross-Surface Story

The IC's iPad shows the SitStat view with one tap depth to the org chart, hazard log, and op period IAP. Multi-pane on the iPad Pro screen: SitStat on the left rail, shore point status board on the right, persistent header across the top with IC name, Safety Officer, and op period clock. The tablet is the command view.

The cutting table foreman's phone is not the IC's screen. It shows the cut queue, current strut inventory, and one canonical action per shore point in the cut phase. The IC can see the cutting table's status on the tablet, but does not manage the cut queue — the app enforces that separation through role-based display. Same incident, different views, appropriate to role.

The deputy's Toughbook at the CP runs the deep data view: ICS-201 worksheet with all fields editable, role history audit log, activity feed with every write since op start, and the export pathway to ICS-203 and ICS-207. The Toughbook surface has a command palette (Cmd+K, or Ctrl+K on Windows) that opens full text search across all IC actions available to the current role. "Transfer command," "Add hazard," "Start OP 3," "Export ICS-201" — all searchable, all reachable in under three keystrokes. This is the Linear-style ergonomics the desktop IC surface deserves. Keyboard fluent command never hunting through menu depth.

The CP television is the broadcast view. Org chart on the left third showing Command Staff and Section Chiefs. Shore point status board in the center with count totals per status. Persistent header across the top: incident name, current IC, Safety Officer, op period clock. No interactive elements. No picker chrome. Font scaling for legibility at twelve feet — 48pt heading minimum, 32pt body. Dark background with high-contrast type. The TV layout is a read only derived view from the tablet's current state; the IC does not manage a separate broadcast configuration.

---

## Against Tablet Command

Tablet Command's drag and drop unit assignment is genuinely well built. The snap targets work, the visual feedback is clear, and the PAR timer gradient that shifts from green to amber to red as the work cycle advances is doctrine-appropriate without being alarming. Those are the two things worth learning from directly.

Their worksheet view becomes noise at thirty-plus elements on a single screen. Their phone companion is read only — a line officer cannot do anything actionable on it. Their command transfer involves confirmation modals. They have no structural collapse domain logic, so the IC running a Level IV partial collapse gets a generic assignment board. FieldShore gives that IC actual shore point status, load ratings, and cut queue state.

The comparison that matters: a Tablet Command IC managing a working residential fire has an appropriate tool. A FieldShore IC managing a partial commercial collapse has not just more features but a fundamentally different data problem — unique measurements, simultaneous multi-area input, load-rated resources, and a phase-based shore point lifecycle that no general incident management tool understands. Principle 12 is the reason this tool exists at all.

---

## The Craft Bar

Two software products set the craft bar for different parts of the IC experience.

Linear's command palette is the right model for the Toughbook IC surface. Every action reachable in under three keystrokes. No toolbar scanning, no menu depth. The IC running a large incident on the Toughbook should never need to navigate to find an action they know exists. That is what Cmd+K delivers, and it is well-tested interaction grammar at this point.

Things' approach to time horizon is the right model for the IC's primary view. Things does not show every project and every task simultaneously — it shows what matters today and keeps everything else at one tap depth. The IC's SitStat view carries the same restraint: the six facts that matter right now, large and clear, with all history and detail one tap away. No analytics panel, no graph of historical shore point rates, no notification feed. Calm in chaos per Principle 3.

The PAR ambient indicator belongs on the IC's primary screen as a work-time gradient per unit, not as a timer or an alarm. Green units are within their work cycle. Amber units are approaching rotation time. One tap marks PAR complete and resets the gradient. The radio stays the channel — the app provides the visual record that confirms the radio call actually happened.

---

## Recommendations

1. Define the IC's home screen on iPad as a SitStat view with six canonical datums above the fold: incident name, IC name with gold underline, Safety Officer name and status in the persistent header, personnel on scene count, shore point status counts by state (pending, in process, secured, returned), and op period indicator with elapsed time. The org chart is one tap away, not the default view.

2. Implement command transfer as a two-device choreography triggered from the persistent IC header (not the org chart). The outgoing IC selects the incoming IC from a bottom sheet picker. The app commits immediately with a 200ms horizontal card-swap animation, a 1pt gold underline pulse at 300ms on the new IC's name (no repeat), and an aria-live polite announcement. The outgoing IC receives a five-second undo toast. The incoming IC receives a full screen takeover with two actions: "View Briefing" and a self-advancing five-second confirm countdown.

3. Build the command transfer briefing view from four ICS-201 fields: current incident objectives, resource assignment summary, Safety Officer identity, and active hazard log. Derive it from the role history log — no additional data entry required from the outgoing IC at transfer time.

4. Replace the single-slot roles map with an append-only role history log at `/operations/{opId}/roleHistory/{push}`. Each entry records: who held the role, assigned at, departed at, device ID, and authorizing user. This resolves IP-006 and makes the command transfer briefing view possible at zero additional cost.

5. Surface an amber dot on any supervisor org chart node when its direct report count exceeds seven. At nine, the dot goes red and a non-blocking toast offers "Add Branch" — tapping opens a one-action sheet that creates a Branch Director node and presents existing direct reports for reassignment. The IC can dismiss the toast; the amber dot persists as a reminder.

6. Display the Safety Officer name and status in the persistent header on every IC-facing screen, with no navigation required to see it. Amber "SO: Vacant" badge when the role is unfilled. One tap on the badge opens the Safety Officer's current hazard log and area assignment as a reference view.

7. Add op period number and elapsed time to the persistent header on every IC screen, formatted as "OP 2 — 4h 22m" with a thin progress indicator. At thirty minutes before the planned op period end, the header gains a subtle amber accent. At the boundary, surface a non-blocking transition card for the new op period. Tag every write with the op period number.

8. Build the hazard log as a first class object reachable in one tap from the SitStat home screen. Each entry carries description, area, mitigation status, Safety Officer attribution, and timestamp. Allow any role to add hazards. Display a hazard badge on shore point cards when the card's area has active unmitigated hazards. Export to ICS-208 format.

9. Implement a command palette on the Toughbook surface (Cmd+K on Mac, Ctrl+K on Windows) providing full text search across all IC actions available to the current role. Target: every action reachable in under three keystrokes from any screen.

10. Replace the singular IC field with an IC collection supporting two or more simultaneous IC nodes for Unified Command. The SitStat header renders "Unified Command: [Name A] / [Name B]" when multiple ICs are active. This resolves IP-013.

11. Add an operation-level safety state with four values: operating, paused-weather, paused-hazard, and paused-PAR. When any value other than operating is active, a persistent amber or red banner appears across all tabs on all devices in the operation. The banner shows the state name, time set, and who set it. This resolves IP-032.

12. On command transfer or any major role change, generate a one-line radio script suggestion populated with the new and outgoing role holder names and a 24-hour formatted time. Display it adjacent to the transfer confirmation with a copy to clipboard affordance. The radio call is still made on radio; the app makes composing it faster.

13. For the broadcast TV layout: left third shows the org chart to Section Chief depth (Branch Directors visible when active), center shows the shore point status board with count totals per state, and the persistent header shows incident name, current IC, Safety Officer, and op period clock. Minimum 48pt heading, 32pt body. No interactive affordances. No picker chrome.

14. Add a NIMS Level I through V preset selector to the Start Operation modal. The Level IV/V default keeps the current lean org chart. The Level II preset adds all five Section Chiefs, full Command Staff (Safety, PIO, Liaison), and Staging under Operations as placeholder nodes. The Level I preset adds Branch Directors, Group Supervisors, and Unit Leaders as additional placeholders. This resolves IP-014 and eliminates the custom-role accumulation the Surfside TTX-2 reached twenty-four roles by OP4 close.

# NIMS Doctrine — Brainstorm Essay

## Executive Summary

FieldShore entered the v3.5.1 audit with 19% NIMS compliance (14 out of 75 scored criteria, per the Round 2 audit). The specific problems are not abstract — they are the kind a trained battalion chief would notice in the first two minutes of use. The shore point "Group" field stores apparatus IDs even though NIMS Group is a functional command unit. The org chart default opens with a position labeled "Operations" rather than "Operations Section Chief." "Cutting Table" appears in the ICS position hierarchy as if it were a NIMS role. "Initial Shoring," "Wood Shoring," and "Runner" appear alongside it, none of which exist in NIMS doctrine. "Task Force" sits in the apparatus type picker as though it were a type of vehicle, when in NIMS it is a specific resource configuration assembled from mixed types.

v4 fixes every one of these. The fix is not labeling — it is structural. The default org chart by incident Level (V through I) opens with positions that match what FEMA ICSSCI SM-0322 actually shows in its illustrative figures. The Group and Division and Branch hierarchy is implemented the way structural collapse actually uses it: geographic Divisions by building face and floor, functional Groups (Rescue, Search, Shoring, Medical) under Operations, Branches appearing only when span of control demands it. Three ICS forms ship with v4: the ICS-201 incident briefing, the ICS-203 organization assignment list, and the ICS-214 unit activity log. Two distinct operational phase taxonomies get sorted out — the five ICS response phases and the five US&R tactical phases — and each finds its correct home in the app. The marketing site uses every NIMS term correctly, because a chief who knows the doctrine cold is exactly who should trust the product first.

---

## The Chief Test

Imagine handing FieldShore to a battalion chief who has been through a FEMA USAR Task Force credentialing course. She opens the Command tab and sees an org chart. It reads, from top to bottom: Incident Commander, Safety Officer, Operations, Staging Area Manager, Division 1, Cutting Table, Entry, Rescue, Initial Shoring, Wood Shoring, Runner.

She knows what every one of those words means in ICS doctrine, and what several of them do not mean. "Operations" is the name of a section, not a position holder — the position is Operations Section Chief. "Cutting Table" is where the lumber gets cut; it is not an ICS organizational position that appears in any FEMA reference. "Initial Shoring" and "Wood Shoring" do not exist in any NIMS document she has read. "Runner" is a task, not a position. She knows that Rescue Group Supervisor, Search Group Supervisor, and Medical Group are standard ICS positions for structural collapse, and none of them are on the chart.

This is the craft bar. Tablet Command lets a department rename "Group" to "Squad" because Tablet Command knows that vocabulary varies by department. That is a feature, not a weakness, as ADR-002 documents. But FieldShore is not Tablet Command. FieldShore's competitive claim is exactly that it encodes doctrine rather than leaving the department to template around it. A chief who reads the word "Runner" in an org chart node next to "Rescue" and "Initial Shoring" does not think "this app knows NIMS." She thinks "these developers got close but did not actually read the manual." v4 closes that gap completely, and it has to close it at every layer — the org chart default, the terminology in form fields, the status labels on shore point cards, the apparatus type picker, and the copy on the marketing site.

---

## The v3 Doctrine Ledger

The current violations fall into five categories. Each has a specific source document that contradicts it.

The most visible violation is the position naming in `ICS_ROLES_DEFAULT` in `app.js`. The Operations Section Chief is labeled simply "Operations." That is the name of the section, not the name of the person leading it. In FEMA ICSSCI SM-0322 every org chart figure that includes this position labels it "Operations Section Chief" or abbreviates it "OSC." A position labeled "Operations" in an ICS chart reads as a section header, not as a person. When a firefighter is assigned to that position and their name appears under "Operations" on a status board, it reads as a section label rather than as a named assignment. The fix is renaming the position to "Operations Section Chief" with abbreviation "OSC."

The Cutting Table entry is in a different category entirely. FEMA ICSSCI and every ICS reference document define ICS positions as roles in the command structure: Incident Commander, Safety Officer, Division Supervisor, Group Supervisor, Task Force Leader, Strike Team Leader, Single Resource. "Cutting Table" is none of these. It is a workstation — a physical location where lumber is cut to length. Resources are assigned to work at it, but the workstation itself is not an ICS position. Treating it as one sends the wrong message to every trained practitioner who opens the org chart. The cutting workstation function needs to be represented in v4 as a resource assignment or a named workstation tag, not as an org chart node in the ICS position hierarchy. This rename will ripple into the `SHORE_ACTION_ALLOWED_ROLES` permission matrix, which currently gates actions like "Mark Cut Done" and "Send to Runner" on the `'cutting'` role ID.

"Entry," "Rescue," "Initial Shoring," "Wood Shoring," and "Runner" share the same fundamental problem. None of them are ICS position names. In NIMS, the positions that perform these functions would be resources assigned to functional Groups. A Rescue Group is supervised by a Rescue Group Supervisor. The firefighters doing the rescue work are resources — single resources, or members of a Task Force or Strike Team — assigned under that Group Supervisor. Having "Entry" and "Rescue" as sibling org chart nodes suggests they are parallel ICS positions, when in NIMS they are functions performed by resources under the same functional Group. This shapes how personnel get assigned and how accountability gets tracked. If a chief tries to add a Search Group Supervisor alongside a Rescue Group Supervisor as the incident grows, the current org structure has no clear place for it.

The shore point `group` field storing an apparatus ID is the oldest and most documented of these violations, tracked since the Round 2 audit finding N2 and given a dual-write migration path starting in v3.12.0. The field has been renamed to `assignedResource` in the code logic (with `getSPGroup()` reading `sp.assignedResource ?? sp.group ?? sp.team`), but the v4 cutover has not yet landed. "Group" in NIMS means a functional command unit — Rescue Group, Search Group, Medical Group — not "which apparatus is responsible for this shore point." The `assignedResource` name correctly describes what the field actually stores.

The `customRoles` array, beyond its architectural problems (array versus keyed object, tracked for v4 migration), carries a naming problem. The word "custom" implies that the default roles are the authoritative ones and this is a departmental override layer. That framing is half right — the defaults are doctrine, and per-department configuration lives on top of them — but "roles" is the wrong noun. In NIMS vocabulary, the things in this array are positions. IC is a position. Safety Officer is a position. Division Supervisor is a position. The data structure should be called `positions`, keyed by ID, and the constant naming it should be `ICS_POSITIONS_DEFAULT` rather than `ICS_ROLES_DEFAULT`.

The `strutplaced` status label displayed as "Strut Installed — awaiting cutting" is an informal construction. Shoring practitioners more commonly say "strut set" to describe an installed and loaded prop. The compound label mixes the installed state with a waiting-for-action note, which creates ambiguity about whether the card needs attention. "Strut Set" as a clean primary label aligns with field language and is less likely to be misread as a prompt to take action.

Finally, missing from the current default entirely: the Planning Section Chief, Logistics Section Chief, Finance and Administration Section Chief, Public Information Officer, and Liaison Officer. These five positions are required by SM-0322 for Level III and above incidents. The PIO and Liaison are appropriate at Level IV working incidents where media and mutual aid agency contacts are already on scene. Their absence from the default set is not a cosmetic gap — it is the primary reason the app cannot model a working extended attack incident against doctrine.

---

## Default Org Charts by Incident Level

The correct defaults per Level come directly from FEMA ICSSCI SM-0322 Chapter 6, which provides illustrative org chart figures at each scale. These are not FieldShore inventions — they are the structures FEMA shows in the structural collapse ICS training manual.

At Level V, the initial response is a single company officer assuming command of a scene with a small structure involved. FEMA Figure 6-1 shows IC with a handful of single resources directly assigned and no formal section structure. The app's Level V default should open with IC only. Everything else expands on demand.

At Level IV, the working incident — a residential partial collapse with multiple apparatus, a safety officer established early, and operations underway — the chart should open with IC at the top, Safety Officer as command staff alongside IC (not in the reporting chain, but accountable to IC), Operations Section Chief under IC, Staging Area Manager under the Operations Section Chief, and at least one Division (the building's primary work face as Division Alpha or a floor as Division 1). Under that Division, the minimum for a structural collapse working incident is a Rescue Group Supervisor and a Shoring Group Supervisor. The current v3 default is structurally close to this but labels the positions incorrectly and treats Entry, Rescue, Initial Shoring, and Wood Shoring as org chart siblings rather than as functional Group Supervisors under a Division Supervisor. The corrected v4 Level IV default: IC with Safety Officer as command staff, Operations Section Chief → Staging Area Manager and Division 1 Supervisor → Rescue Group Supervisor and Shoring Group Supervisor.

At Level III, the expanded response — a significant collapse with mutual aid, multiple work areas, extended operations — FEMA Figure 6-2 adds PIO and Liaison as command staff, a more developed Operations section with multiple Divisions, and a Law Enforcement Branch for scene security and perimeter. At this Level, the Planning Section Chief appears because a written IAP is now required per SM-0322 Phase II doctrine. The v4 Level III default adds PIO, Liaison, Planning Section Chief, and a second Division to the Level IV foundation.

At Level II, the extended response with full ICS — a major collapse requiring 24-hour operations across multiple operational periods — all four General Staff sections are staffed: Operations, Planning, Logistics, and Finance and Administration. Branch Directors appear under Operations when the Operations Section Chief's span of control approaches seven. The v4 Level II default adds Logistics Section Chief, Finance and Administration Section Chief, and one Branch Director placeholder under Operations.

At Level I, the major disaster — Surfside scale, federal Task Force mobilization, Unified Command — the structure follows FEMA Figure 6-4: Unified Command with multiple ICs representing each agency, Joint Information Center, full section staffing with Deputy positions, and multiple Branches under Operations, each with Divisions and Groups below them. This Level is the design ceiling for v4 per ADR-003, but federal Unified Command implementation is deferred to v5. The v4 Level I default opens the correct position structure in the org chart but does not yet implement multi-agency write permissions or the Unified Command IC collection.

---

## Group, Division, and Branch in Structural Collapse

The most important doctrine concept for FieldShore to model correctly is the distinction between Groups and Divisions, because structural collapse uses both simultaneously and the current app conflates them.

A Division is a geographic area. FEMA SM-0322 specifies that building sides are labeled Division Alpha (address front face), Bravo (left when facing the address side), Charlie (rear), and Delta (right), progressing clockwise from the front. Building floors are Division 1 (ground floor), Division 2 (second floor), and so on. Below-grade spaces are Subdivision 1 and Subdivision 2. The Division Supervisor is responsible for all tactical operations within that geographic boundary, regardless of which functional groups are working there.

A Group is a functional assignment. Rescue Group, Search Group, Shoring Group, Medical Group, Hazmat Group — each Group executes a specific function across whatever geography the incident requires. The Group Supervisor is responsible for that function wherever the Group's resources work. At a structural collapse, the Shoring Group Supervisor coordinates all shoring resources regardless of which Division they are working in at any given moment.

In practice, structural collapse incidents at Level III and above use both simultaneously. A significant collapse will have geographic Divisions by building side or floor, and functional Groups — particularly Medical Group and Evacuation Group — that operate across multiple Divisions. SM-0322 explicitly supports this: resources can be assigned to a Division (geographic control) or to a Group (functional control) based on which model fits the specific resource's mission.

The v3 org chart places Entry, Rescue, Initial Shoring, and Wood Shoring as direct children of Division 1. This treats the sub-units as position nodes in the hierarchy when they should be Group Supervisors commanding resources within Division 1. In v4, Rescue Group Supervisor and Shoring Group Supervisor sit under Division 1, with apparatus and personnel assigned as resources under those Supervisors — not as additional position nodes.

Branch Directors appear when the Operations Section Chief's span of control approaches seven direct reports. At Level I scale, a Search and Rescue Branch Director would be positioned above multiple Divisions and Groups executing rescue operations; a Law Enforcement Branch would handle scene security and perimeter; a Public Works Branch would manage debris removal coordination. v4 should expose Branch Director as an available position type that the IC can add between Operations Section Chief and Divisions or Groups as the incident grows, rather than hardcoding it in any lower-Level default.

Span of control guidance from SM-0322: optimal is five direct reports, acceptable range is three to seven. Command Staff positions (PIO, Safety Officer, Liaison) do not count toward the IC's span of control. When the IC's operational span approaches seven, a Deputy IC or Branch structure is warranted. The app should surface a soft warning when any supervisor's direct report count reaches six.

---

## Two Operational Phase Taxonomies

There are two separate phase taxonomies relevant to FieldShore, and they are not the same thing. Conflating them is a doctrine error and a UX error at the same time.

The first is the ICS operational phase taxonomy from FEMA ICSSCI SM-0322 Chapter 6: Phase I (Initial Response), Phase II (Expanded Response), Phase III (Extended Response, 24-hour operations), Phase IV (Demobilization), Phase V (Return to Readiness). These phases describe the administrative and organizational state of the incident management system over time. They govern which paperwork is required, what level of ICS staffing is needed, and when the written IAP becomes mandatory. They are not workflow states that track what a shore point is doing. Phases I and II are relevant at every Level. Phase III is Level II and above.

The second is the US&R tactical phase taxonomy from the FEMA US&R Operations Manual (MANUAL 12-001, September 2012): Recon (rapid structural assessment, victim location, hazard identification), Surface Rescue (rescuing easily accessible victims), Void Search (systematic search of accessible void spaces), Selected Debris Removal (targeted removal of specific debris to reach identified victim locations), and General Debris Removal (bulk debris clearance when live survivor probability is exhausted). These phases describe what the rescue teams are doing operationally on the site, not how the ICS is organized.

For FieldShore, the ICS operational phases belong as metadata on the incident — a field that indicates "this operation is in Phase II, which means a written IAP is required" — rather than as a workflow state that changes how the app behaves moment to moment. The ICS form generation follows directly from this: ICS-201 is a Phase I and Phase II deliverable (the formal size-up briefing document used at command transfer), ICS-203 becomes necessary at Phase II and beyond, and ICS-214 is a continuous log from Phase II through demobilization.

The US&R tactical phases are a different matter. These belong as a first-class field on the active operation. The incident commander or Operations Section Chief declares the current tactical phase — "we are in Void Search" — and that declaration is information the entire command post needs to see and track over time. It drives resource priorities directly: during Void Search, shoring resources are creating safe void access, which differs from Selected Debris Removal where shoring supports debris lift operations. The v4 app should expose the current US&R tactical phase as a prominent, editable field on the Command tab and on the broadcast display, changeable by IC and Safety Officer.

---

## ICS Forms in v4

Three ICS forms should ship with v4. The recommendation in the design memory aligns with what the operational model demands at Level IV and above.

The ICS-201 Incident Briefing is the most important. It is the formal document used to brief an incoming Incident Commander at command transfer — a SM-0322 Phase II requirement that the Surfside TTX-2 exercised six times in 36 hours. The ICS-201 captures: current situation and map sketch summary, resources on scene, current org structure, actions taken, and current objectives. FieldShore already captures most of this: shore point status, apparatus assignments, org chart, operation start time and location, event timestamps. v4 should render an ICS-201 from existing operation data, generated both on demand and automatically when command transfer is initiated. The map sketch section should note where a hand-drawn or photo attachment would be added; the field itself is beyond scope.

The ICS-203 Organization Assignment List is a formatted export of the current org chart with every position and its assigned personnel. FieldShore already tracks role assignments. The ICS-203 is that data in a standardized form, available at any time during an active operation, not only at transfer.

The ICS-214 Unit Activity Log is a per-unit chronological log of tasks, notable events, and resource actions. In FieldShore's model, this maps to the shore point event history (status transitions with timestamps, assigned resources, strut data) plus the role history audit trail added in v4. The ICS-214 should be generated per apparatus or per Group, exportable at any point and automatically populated at operation close.

All other ICS forms (ICS-202, 204, 205, 206, 207, 208, 209, 213) should be deferred to v5. They require either input FieldShore does not currently capture (communications frequencies, medical resources, weather) or they are primarily administrative documents generated by Planning Section personnel using dedicated planning software. v4 is the on-scene operations layer, not the full planning tool.

---

## The Task Force Apparatus Type

`APPARATUS_TYPES_DEFAULT` at line 3148 of `app.js` lists "Task Force" as an apparatus type alongside Engine, Ladder, Rescue, and Squad. NIMS and FEMA ICSSCI SM-0322 both define a Task Force as a resource configuration — a mixed-type grouping assembled for a specific tactical need, with a designated leader and common communications — not as a type of individual apparatus. A Task Force does not have a quantity in a department's inventory the way an Engine does.

Removing Task Force from the apparatus type options is the correct doctrine fix. A department that assembles a task force from its engines and rescue units models that configuration in the app by creating an apparatus group (which already exists in v3 as `apparatusGroups`) and assigning the constituent apparatus to it. The named apparatus group with a designated leader is the correct NIMS representation of a local task force configuration.

---

## Marketing Copy Is Doctrine Too

The v4 marketing site is part of the craft bar. If the site uses "Group" to mean a collection of apparatus, a trained chief notices. If it uses "Type" to describe incident complexity (where the doctrine term is "Level"), a credentialing examiner notices.

The picker documentation in `03-primitives/picker.md` currently uses "incident type (NIMS I through V)" as an example picker label. That should read "incident Level (Level V through Level I)" per the terminology decision recorded in #281. Every piece of copy — in the app, in the marketing site, and in the design documentation — must use incident Level, not incident Type. Type is the building construction classification. Level is incident complexity. A FEMA instructor who sees "Type II incident" in a product that claims NIMS alignment will not trust the product.

The positioning document accurately describes FieldShore as using "the actual NIMS org structure, encoded the way they are written down." That sentence should be unassailably true the moment v4 ships. Every recommendation in this essay is in service of making it so.

---

## Recommendations

1. Complete the `sp.group` to `sp.assignedResource` cutover in v4. Remove the `getSPGroup()` fallback chain reading `sp.group` and `sp.team` after verifying all data has migrated. The dual-write window opened in v3.12.0 closes at v4 launch.

2. Rename the `operations` position in `ICS_ROLES_DEFAULT` from `name: 'Operations'` to `name: 'Operations Section Chief'` with `abbr: 'OSC'`. The current label names the section, not the position holder. Source: SM-0322 Chapter 6 figures.

3. Remove `Cutting Table` from `ICS_ROLES_DEFAULT` as an ICS org chart position. Model the cutting workstation as a named workstation tag or as a resource assignment outside the formal position hierarchy. Update `SHORE_ACTION_ALLOWED_ROLES` to replace the `'cutting'` role gate with a workstation assignment check. Update the `suggestedView: 'cuttable'` binding so the cutting view is surfaced without requiring an ICS position called "Cutting Table."

4. Replace the four informal position nodes `entry`, `rescue`, `shoring`, and `wood` in `ICS_ROLES_DEFAULT` with doctrine-correct Group Supervisor positions: `Rescue Group Supervisor` (id: `rescue-gs`) and `Shoring Group Supervisor` (id: `shoring-gs`) as children of Division 1 in the Level IV default. Update `SHORE_ACTION_ALLOWED_ROLES` to reference the new IDs.

5. Remove `runner` from `ICS_ROLES_DEFAULT`. Runner is a task assigned by a Group Supervisor, not a named ICS position. Rethink the `'runner'` permission gate: if the intent is to gate "Send to Runner," the gate should check workstation assignment or a named functional task, not an ICS position.

6. Add `Public Information Officer` (id: `pio`, command staff reporting to IC, does not count toward IC's span of control per SM-0322) to the Level IV and above preset defaults.

7. Add `Liaison Officer` (id: `liaison`, command staff reporting to IC) to the Level III and above preset defaults.

8. Add `Planning Section Chief` (id: `planning-sc`, General Staff reporting to IC) to the Level III and above preset defaults. SM-0322 Phase II doctrine requires Planning when a written IAP is needed.

9. Add `Logistics Section Chief` (id: `logistics-sc`, General Staff reporting to IC) to the Level II and above preset defaults.

10. Add `Finance and Administration Section Chief` (id: `finance-sc`, General Staff reporting to IC) to the Level II and above preset defaults.

11. Ship five Level-specific org chart presets selectable at operation start: Level V (IC only), Level IV (IC + Safety Officer + OSC + Staging Area Manager + Division 1 Supervisor + Rescue Group Supervisor + Shoring Group Supervisor), Level III (adds PIO, Liaison, Planning Section Chief, second Division Supervisor), Level II (adds Logistics and Finance Section Chiefs, Branch Director placeholder under Ops), Level I (correct structure rendered, Unified Command implementation deferred to v5).

12. Remove `Task Force` from `APPARATUS_TYPES_DEFAULT`. A Task Force is a resource configuration per NIMS, not an apparatus type. Departments that operate pre-assembled task force groups should use the existing apparatus group feature.

13. Rename the constant `ICS_ROLES_DEFAULT` to `ICS_POSITIONS_DEFAULT`. Rename the per-operation field `customRoles` to `positions`, implemented as a keyed object (this aligns with the concurrent-write safety migration already planned for v4).

14. Rename the `strutplaced` shore point status: display label from "Strut Installed — awaiting cutting" to "Strut Set," and the status code from `strutplaced` to `strutset`. Update `STATUS_ORDER`, `renderOpsLegend()`, `updateShoreStatus()`, and any other function that compares or renders this status code.

15. Add the US&R tactical phase (Recon, Surface Rescue, Void Search, Selected Debris Removal, General Debris Removal, per FEMA MANUAL 12-001) as a first-class field on the active operation, editable by IC and Safety Officer. Display it on the Command tab and on the broadcast view. This is an operation-level field, not a shore-point-level field.

16. Add ICS operational phase (I through V per SM-0322 Chapter 6) as inferred metadata on the active operation. Inference rules: Phase I until a formal command transfer is logged in the role history; Phase II when transfer-of-command first occurs; Phase III when the operation has run longer than 24 hours. Display the inferred phase on the Command tab with an optional IC override.

17. Generate an ICS-201 Incident Briefing from existing operation data on demand and automatically when command transfer is initiated (the IC taps "Transfer Command"). The form includes current situation summary (editable text), resources on scene (from apparatus list), current org structure (from positions), actions taken (from shore point event log), and current objectives (editable text field the incoming IC fills in). Export as PDF.

18. Generate an ICS-203 Organization Assignment List on demand from the current positions and their assigned personnel. Available at any time during an active operation, not only at transfer.

19. Generate an ICS-214 Unit Activity Log per apparatus or per Group on demand and at operation close, populated from the shore point event history and the role history audit trail introduced in v4.

20. Audit all marketing site copy and all design documentation for doctrine-correct usage of Group (functional), Division (geographic), Task Force (resource configuration), Strike Team (same-kind resources with common comms and a leader), and Level (incident complexity, not Type). Correct the picker documentation example at `docs/v4-design/03-primitives/picker.md` that reads "incident type (NIMS I through V)" — it should read "incident Level (Level V through Level I)."

21. Add a span-of-control soft warning: when any supervisor position in the org chart has six or more direct reports, surface a soft indicator on that position node noting that the span is approaching the SM-0322 limit of seven. Not a blocking error — a quiet advisory.

22. Add `Search Group Supervisor` as an optional position available in the Level IV and above position picker, distinct from Rescue Group Supervisor. In NIMS, Search and Rescue are often handled by a combined group at Level V and split into separate Group Supervisors at Level IV and above when distinct teams are operating simultaneously.

# NIMS Organizational Structure — Reference for FieldShore v4

> Doctrine reference and v3-to-NIMS mapping. Input to the ADR on v4 org-chart redesign. Audience: Alex (firefighter, product owner) and the design team. Written by the NIMS/ICS doctrine reviewer.

---

## 1. Authoritative Sources

Everything in this document is grounded in the following sources. Where a claim depends on a specific source, that source is cited inline by the short form below.

| Short form | Full citation |
|---|---|
| **NIMS 2017** | *National Incident Management System*, 3rd ed. FEMA, October 2017. |
| **SM-0322** | *ICS for Single Resources and Initial Action Incidents* (ICSSCI), FEMA Emergency Management Institute, SM-0322. Used as the structural collapse ICS training manual throughout the fire service. |
| **MANUAL 12-001** | *Urban Search and Rescue Response System: Operations Manual*, FEMA, MANUAL 12-001, September 2012. Governs FEMA US&R Task Force composition and operational doctrine. |
| **ICS 100** | *Introduction to the Incident Command System*, FEMA IS-100.C (2018). Foundational position-title and terminology reference. |
| **NFES 2731** | *Incident Command System Field Operations Guide*, NFES 2731, National Wildfire Coordinating Group, 8th ed. (2014). Position-title and span-of-control quick reference used across the fire service. |

---

## 2. ICS Organizational Structure

### 2.1 Command and General Staff — the top of every chart

Every ICS activation, regardless of incident Level, places the Incident Commander at the top. No exceptions in any FEMA document. (NIMS 2017, Chapter 3.)

Under the Incident Commander, positions fall into two groups:

**Command Staff** — Positions that report directly to the IC but are not in the General Staff chain of command. Command Staff do *not* count toward the IC's span of control for purposes of Branch/Section expansion decisions. The three Command Staff positions are:

- **Safety Officer** — Authority to halt unsafe operations. Does not restructure command or redirect resources. Authority is limited to stop-work. (SM-0322, Chapter 5; NIMS 2017 p. 23.)
- **Public Information Officer (PIO)** — Media, public communications, joint information.
- **Liaison Officer** — Point of contact for cooperating and assisting agencies.

**General Staff** — The four Section Chiefs who report directly to the IC and lead the operational, administrative, and support functions of the incident. Collectively they are "General Staff":

- **Operations Section Chief** — Directs all tactical operations. This is the central position for FieldShore.
- **Planning Section Chief** — Collects and evaluates situation information, writes the Incident Action Plan (IAP).
- **Logistics Section Chief** — Provides facilities, services, and support resources.
- **Finance and Administration Section Chief** — Tracks costs, contracts, procurement, and time recording.

**Span-of-control note:** At Level V and many Level IV incidents, the IC holds all four Section Chief functions personally. As the incident grows, these positions are delegated one at a time — Operations first, then Planning, then Logistics. Finance/Admin last. (SM-0322, Chapter 6.)

### 2.2 Operations Section internal structure

This is the section FieldShore builds its org chart around. (NIMS 2017, Chapter 3; SM-0322, Chapter 3.)

The Operations Section Chief commands the section. Below the OSC, resources are organized via three structural levels, which can be used independently or in combination:

```
Operations Section Chief
    |
    +-- Branch Director (used when OSC span > 7)
         |
         +-- Division Supervisor (geographic)
         +-- Group Supervisor (functional)
              |
              +-- Task Force Leader (mixed-type resource grouping)
              +-- Strike Team Leader (same-type resource grouping)
              +-- Single Resource (individual apparatus or person)
```

The Branch is optional at Level IV and required at Level II and above when the OSC cannot manage all Divisions and Groups within a 3-to-7 span. (NIMS 2017 p. 25.)

### 2.3 Division vs. Group — the critical distinction

This distinction is the most important for structural collapse, because both are used simultaneously on a significant collapse.

**Division — geographic area**

A Division is defined by a physical boundary. The IC or OSC declares a Division when a specific geographic area needs to be commanded as a unit. At a structural collapse:

- Building faces are labeled Alpha (the address side), Bravo (left when facing the address side), Charlie (rear), Delta (right), progressing clockwise. (SM-0322, Chapter 7.)
- Building floors are labeled Division 1 (ground floor), Division 2 (second floor), and so on.
- Below-grade areas are Sub-Division 1 and Sub-Division 2.

The **Division Supervisor** commands all tactical operations within that geographic boundary, regardless of which functional groups are working there. Source: NIMS 2017, p. 25: "Divisions are used to divide an incident into geographic areas of operation."

**Group — functional assignment**

A Group is defined by a function, not a location. A Group executes a specific function wherever that function is needed across the incident. At a structural collapse:

- Rescue Group — executes victim extraction wherever extraction work is occurring.
- Search Group — conducts systematic search operations.
- Shoring Group — installs and monitors shoring systems at all work areas.
- Medical Group — manages victim care and triage.
- Debris Removal Group — coordinates debris handling.

The **Group Supervisor** is responsible for that function across whatever geography the Group's resources work in. Source: NIMS 2017, p. 25: "Groups are established to divide the incident into functional areas of operation."

**Using both simultaneously**

At a significant collapse you will have both. A Division Supervisor for Division Alpha coordinates all activity on the building's front face; under that Division Supervisor you may have a Rescue Group Supervisor (extraction-focused resources) and a Shoring Group Supervisor (shoring-focused resources) both working Division Alpha. This is the NIMS-correct representation. (SM-0322, Chapter 3, illustrative figures 3-5 through 3-8.)

In FieldShore terms: a shore point has a geographic Division assignment ("Division Alpha, Level 1") and its assigned resources report to the Shoring Group Supervisor. Both are attributes of the same shore point.

### 2.4 Resources below Groups and Divisions

Three resource configurations sit below the Group/Division layer. (NIMS 2017, pp. 26-27; MANUAL 12-001, Chapter 3.)

**Single Resource** — a single piece of apparatus with its crew (Engine 3, Rescue 1) or an individual person. The building block of all ICS. A Single Resource is never a "type" of organization — it is an individual apparatus or person assigned to a position in the org chart.

**Strike Team** — five resources of the same kind (five engines, five rescues) with common communications and a designated Strike Team Leader. The number five is fixed in NIMS. A Strike Team is identified by type and number: "Engine Strike Team 3." Source: NIMS 2017, p. 26.

**Task Force** — a group of mixed-type resources assembled under a Task Force Leader with common communications to perform a specific tactical mission. The mix of resource types is flexible. A Task Force is assembled for the incident, not a standing unit type. Source: NIMS 2017, p. 27.

**The doctrine point that directly affects FieldShore:** "Task Force" is not an apparatus type. It is a resource configuration assembled from apparatus. You cannot have "one Task Force" in your inventory alongside "three Engines" — that conflates what is actually one Engine, one Rescue, and a Squad assembled under a Task Force Leader for a specific mission. Removing Task Force from `APPARATUS_TYPES_DEFAULT` is therefore a doctrine fix, not just a cleanup.

### 2.5 FEMA US&R Task Force composition (MANUAL 12-001)

MANUAL 12-001 defines the two FEMA US&R Task Force types:

**Type I Task Force** — 70 personnel. Includes: Task Force Leader, Safety Officer, Search Team Manager, Rescue Team Manager, Medical Team Manager, Structures Specialist, Hazmat Specialist, Logistics Specialist, and four functional teams (Search Team, Rescue Team, Medical Team, Logistics Team). Full 24-hour self-sufficient operation for 72 hours. Source: MANUAL 12-001, Annex A, Table A-1.

**Type II Task Force** — 35 personnel. Scaled version of Type I for shorter duration or lighter operations. Source: MANUAL 12-001, Annex A, Table A-2.

These are resource typing standards, not org chart positions. A Task Force Leader leads the Task Force as a resource within the incident's Operations Section — the TFL is a resource-level position (see Section 3 below on title vocabulary), and the Task Force reports to whichever Division Supervisor or Group Supervisor it is assigned under.

---

## 3. ICS Position-Title Vocabulary

Title is not cosmetic in ICS. Each title encodes the supervisory level of the position. A trained IC will assign authority correctly, and a trained firefighter will know immediately where they sit in the chain of command, based on title alone. (NIMS 2017, p. 22; ICS 100, Unit 3.)

| Organizational level | Correct title suffix | Examples |
|---|---|---|
| Section (under IC) | **Chief** | Operations Section *Chief*, Planning Section *Chief* |
| Branch (under Section) | **Director** | Rescue Branch *Director*, Law Enforcement Branch *Director* |
| Division (geographic) | **Supervisor** | Division Alpha *Supervisor*, Division 1 *Supervisor* |
| Group (functional) | **Supervisor** | Rescue Group *Supervisor*, Shoring Group *Supervisor* |
| Strike Team | **Leader** | Engine Strike Team 1 *Leader* |
| Task Force | **Leader** | Task Force 1 *Leader* |
| Unit (within a Section) | **Leader** | Communications Unit *Leader*, Medical Unit *Leader* |
| Single Resource | (none, or the resource's own title) | Engine Captain, Rescue Specialist |

Source: NIMS 2017, Table 2, p. 22; NFES 2731, p. 4-1.

The Deputy prefix is reserved for positions that can assume full authority of the superior position when that person is absent. "Assistant" is used for positions supporting Command Staff. These distinctions appear on real ICS-203 forms and matter for multi-agency operations.

**No acronyms in the UI.** The titles above are what FieldShore displays. "Operations Section Chief" is correct. "OSC" is not. This is locked per the brief. The reference file may use acronyms; the UI position labels must be spelled out.

---

## 4. Incident Level Terminology

The correct NIMS term for incident complexity is **Level** (Level V through Level I, from smallest to largest). "Type" in NIMS refers to resource capability classification (Type I, Type II apparatus), not incident complexity. This distinction is locked per issue #281.

| Incident Level | Typical description | General Staff needed |
|---|---|---|
| Level V | Single company, initial action | IC holds all Staff roles |
| Level IV | Working incident, multiple apparatus, mutual aid possible | IC + Safety, OSC often established |
| Level III | Significant incident, multiple work areas, extended | OSC + Planning Section Chief active; PIO and Liaison assigned |
| Level II | Extended attack, 24-hour operations, multiple operational periods | All four General Staff sections staffed |
| Level I | Major disaster, federal involvement, Unified Command | Full Section staffing with Deputies; Unified Command |

Source: SM-0322, Chapter 6, Figures 6-1 through 6-4; NIMS 2017, Appendix A.

---

## 5. Span of Control

The NIMS standard: optimal is five direct reports; acceptable range is three to seven. Source: NIMS 2017, p. 25; SM-0322, Chapter 3.

**The three tiers, and what FieldShore should show:**

| Direct reports to one supervisor | Indicator | Doctrine action |
|---|---|---|
| Fewer than 3 | Informational note (optional) | Position may be unnecessary — could consolidate |
| 3–5 | No indicator — this is healthy | — |
| 6–7 | Soft warning (amber) | Approaching limit; consider adding a Branch |
| 8 or more | Hard warning (red) | Exceeds NIMS acceptable range; restructure required |

Command Staff (Safety Officer, PIO, Liaison) do not count toward the IC's span of control. (NIMS 2017, p. 23.) FieldShore must not count these positions when calculating the IC's direct reports for span-of-control warnings.

At a typical Level IV structural collapse, the OSC manages: Staging Area Manager, one or two Division Supervisors, a Rescue Group Supervisor, a Shoring Group Supervisor, and possibly a Medical Group Supervisor — four to five direct reports. That is healthy. The OSC is the first position to exceed span at Level III, when a second building face opens and the Medical Group formalizes.

---

## 6. Structural Collapse Default Charts by Incident Level

These are the NIMS-correct org chart presets FieldShore should offer at operation start. They come directly from SM-0322, Chapter 6. They are not inventions.

### Level V — Initial response

```
Incident Commander
```

IC alone. Single company officer assuming command of a scene. All Staff and Section functions held by the IC. No formal structure below. Resources report directly to IC. SM-0322, Figure 6-1.

### Level IV — Working incident

```
Incident Commander
    |
    +-- Safety Officer (Command Staff — does not count toward IC span)
    |
    +-- Operations Section Chief
         |
         +-- Staging Area Manager
         +-- Division 1 Supervisor  (or Division Alpha Supervisor — see note)
              |
              +-- Rescue Group Supervisor
              +-- Shoring Group Supervisor
```

PIO and Liaison are typically added at Level IV when media arrives and mutual aid agencies check in. Recommend including them in the preset but marking them as "optional at Level IV" in the UI.

Division naming note: For above-grade interior operations, use floor numbers (Division 1, Division 2). For exterior perimeter command of building faces, use phonetic alphabet (Division Alpha, Division Bravo). Both are correct per SM-0322. FieldShore v3.15.0 added numbered Divisions. The phonetic labels should be an alternate option.

### Level III — Significant incident

```
Incident Commander
    |
    +-- Safety Officer
    +-- Public Information Officer
    +-- Liaison Officer
    |
    +-- Operations Section Chief
    |    |
    |    +-- Staging Area Manager
    |    +-- Division 1 Supervisor
    |    |    +-- Rescue Group Supervisor
    |    |    +-- Shoring Group Supervisor
    |    +-- Division 2 Supervisor (second work face)
    |         +-- Search Group Supervisor
    |
    +-- Planning Section Chief
```

The Planning Section Chief is required at Level III because a written IAP becomes mandatory. SM-0322, Chapter 6.

### Level II — Extended attack

```
Incident Commander
    |
    +-- Safety Officer / PIO / Liaison
    |
    +-- Operations Section Chief
    |    +-- [Branch Director, if OSC span exceeds 5]
    |         +-- Division Supervisors (multiple)
    |              +-- Group Supervisors (multiple per Division)
    |
    +-- Planning Section Chief
    +-- Logistics Section Chief
    +-- Finance and Administration Section Chief
```

All four General Staff positions staffed. Branch Director appears here as an available slot under Operations, not hardcoded into the default chart.

### Level I — Major disaster

Full Unified Command. Scope deferred to v5 per ADR-003. FieldShore v4 renders the correct position structure in the org chart but multi-agency write permissions and Unified Command IC collection are v5 work.

---

## 7. V3-to-NIMS Mapping Table

This table maps every v3 role in `ICS_ROLES_DEFAULT` to its NIMS status and proposes the v4 disposition. Locked inputs (from the brief) are marked.

| v3 role (id) | v3 label | NIMS status | v4 proposed position label | Category | Notes |
|---|---|---|---|---|---|
| `ic` | Incident Commander | NIMS-correct title | **Incident Commander** | Position — Command | No change needed. |
| `safety` | Safety Officer | NIMS-correct title | **Safety Officer** | Position — Command Staff | No change needed. `canReparent()` must remove Safety from org-edit authority (R6-03). |
| `operations` | Operations | Violation — names the Section, not the person | **Operations Section Chief** | Position — General Staff | Locked per brief. Full title, no "OSC" abbreviation in UI. |
| `entry` | Entry | Not a NIMS position. "Entry" is a task, not a supervisory role. | Remove from default position list. | Function/resource task | Entry is what rescue resources *do* inside a Division or Group. It is not a supervisory position. The Rescue Group Supervisor directs entry resources. |
| `rescue` | Rescue | Not a NIMS position name. Partial — "Rescue" is a correct Group *label* but the position title is wrong. | **Rescue Group Supervisor** | Position — Functional Group under Division | "Rescue Group" is doctrinally correct. The missing word is "Supervisor." Source: NIMS 2017, p. 25. |
| `shoring` / `initial_shoring` | Initial Shoring | Not a NIMS position. "Initial Shoring" names a task phase, not a supervisory level. | **Shoring Group Supervisor** | Position — Functional Group under Division | Collapse Search and Rescue uses a Shoring Group for all shoring-system work. Source: MANUAL 12-001, Chapter 3. |
| `wood` / `wood_shoring` | Wood Shoring | Not a NIMS position. Names a material and task, not a supervisory level. | Remove as a distinct position. Wood cutting is a Shoring Group resource task. | Function/resource task | Wood-shoring work is executed by resources *under* the Shoring Group Supervisor. It is not a parallel supervisory position. The Shoring Group Supervisor assigns a crew to wood work. |
| `cutting` | Cutting Table | Violation — a workstation, not an ICS position. | **Cutting Station** (workstation label, not an org chart node) | Resource assignment / workstation tag | Locked per brief. Cutting Station sits under Operations as a named work area, not as an ICS position in the hierarchy. Staff assigned to it are Shoring Group resources. |
| `runner` | Runner | Violation — a task assignment, not a supervisory position. | Remove from position list. Track as a **resource assignment** attribute on personnel/apparatus. | Task/resource assignment | Locked per brief. A Runner is a go-fer resource hauling equipment from staging to the work point. That function is managed by the Group Supervisor (usually Shoring Group) and tracked as who is currently performing the task, not as an org-chart node. |

**New positions to add at appropriate Levels (not in v3 defaults at all):**

| Proposed position label | Level minimum | Category | Doctrine source |
|---|---|---|---|
| Public Information Officer | Level IV (optional), Level III (required) | Command Staff | NIMS 2017, p. 23; SM-0322 Ch. 6 |
| Liaison Officer | Level IV (optional), Level III (required) | Command Staff | NIMS 2017, p. 23 |
| Search Group Supervisor | Level IV (optional — when separate search team) | Functional Group | NIMS 2017, p. 25; MANUAL 12-001, Ch. 3 |
| Medical Group Supervisor | Level IV (optional), Level III (active) | Functional Group | SM-0322, Chapter 6 |
| Staging Area Manager | Level IV | Under Operations Section Chief | SM-0322, Chapter 6 |
| Planning Section Chief | Level III (required when IAP is written) | General Staff | SM-0322, Chapter 6 |
| Logistics Section Chief | Level II | General Staff | SM-0322, Chapter 6 |
| Finance and Administration Section Chief | Level II | General Staff | SM-0322, Chapter 6 |
| Branch Director | Level II (optional slot, not in default chart) | Between Section Chief and Divisions/Groups | NIMS 2017, p. 25 |

---

## 8. Functional Groups for Structural Collapse

For a Level IV structural collapse, FieldShore should default to standing up **two functional Groups** and make a **third and fourth available on demand**:

**Always in the Level IV default:**

1. **Rescue Group** — Victim extraction, void entry, confined space rescue. Resources: Entry team firefighters, rescue apparatus crew. Supervisor: Rescue Group Supervisor.

2. **Shoring Group** — All shoring system installation, monitoring, and adjustment. Resources: Shoring-qualified firefighters, apparatus with shoring inventory, Cutting Station personnel. Supervisor: Shoring Group Supervisor.

**Available as optional additions at Level IV, defaults at Level III:**

3. **Search Group** — Systematic victim location, canine teams, technical search equipment. Supervisor: Search Group Supervisor. (Absent a separate search team, the Rescue Group Supervisor handles search and rescue together.)

4. **Medical Group** — Victim triage, treatment, stabilization. Supervisor: Medical Group Supervisor. (At small incidents a single EMS apparatus handles this without a formal Group.)

**Rationale for this default count:** SM-0322 Chapter 6 illustrative figures for Level IV show a single Division with Rescue and Shoring as the minimum Group structure for a collapse. The Surfside TTX-2 simulation in `.claude/simulations/surfside-ttx-2/roster/ics-leadership.md` confirms: Shoring Group Supervisor and Search Group Supervisor were established within the first hour, with Heavy Rigging Group and Medical Branch formalized later as the incident scaled.

**Resources beneath each Group Supervisor — not org chart nodes:**

Within FieldShore, the following are *resource assignments* tracked as properties of personnel or apparatus, not as additional position nodes in the org chart:

- Which apparatus is currently assigned to a Group (the `assignedResource` field on each shore point)
- Which personnel are performing entry at a given moment
- Which personnel are at the Cutting Station
- Who is currently performing a Runner task

This is the direct fix for the v3 `group` field violation. "Assigned resource" is what the field stores. It maps to a specific apparatus, not to a NIMS Group.

---

## 9. The Cutting Station

This section consolidates the doctrine treatment because it touches both org-chart structure and the shore-point workflow.

In every FEMA US&R depiction and in practice at structural collapse incidents, the lumber-cutting function happens outside the structure, typically next to apparatus in the staging area. It is a safe-area workstation, not an interior operational position.

**Doctrine classification:** The Cutting Station is a **named workstation** within the Operations Section's resource picture. Staff assigned to it are Shoring Group resources. The Shoring Group Supervisor is accountable for the Cutting Station output (cut lumber ready for the interior team).

**What this means for the FieldShore org chart:**

- Cutting Station does NOT appear as a node in the ICS position hierarchy.
- Cutting Station appears as a labeled work area under Operations (at the same visual level as Staging Area, not nested under a Group Supervisor node).
- Personnel assigned to the Cutting Station are tracked as Shoring Group resources with a workstation tag of "Cutting Station."
- The shore-point workflow status "Cutting" means lumber is being cut at the Cutting Station for that specific point. That status is a shore-point state, not an org-chart position.

Source for classification as a workstation: MANUAL 12-001, Chapter 3, which describes the lumber support function as a logistics task supporting the Rescue/Shoring Group, not as a supervisory position in its own right.

---

## 10. Runner as Resource Assignment

Runner is resolved here with the same logic as Cutting Station.

In USAR operations, "Runner" describes a person performing a specific logistics task: carrying equipment, materials, or messages between the staging area (or apparatus) and the interior work point. The function is critical — interior teams cannot break contact with a void to retrieve equipment themselves. But the person performing this task holds no supervisory authority. They are executing a directive from the Group Supervisor.

**Doctrine classification:** Runner is a **resource task assignment** tracked as an attribute on the personnel record, not as an ICS position. The Group Supervisor (typically Shoring Group Supervisor) assigns a crew member to runner duties for a specific shore point or operation phase.

**What this means for the FieldShore data model:**

- No `runner` node in `ICS_POSITIONS_DEFAULT`.
- The shore-point status "Runner" (meaning the cut lumber has been dispatched toward the interior by a runner) is a *shore-point workflow state*, not an org-chart position. That status is correct and should be kept as a workflow status.
- The individual performing runner duty can be tracked as a named assignment under the Shoring Group Supervisor's resource list, with `task: 'runner'` on their assignment record.

---

## 11. The `group` Field and `assignedResource` Rename

This is the oldest tracked compliance violation (first documented in the Round 2 audit, finding N2, v3.5.1; tracked through v3.11.2 audit finding V3.11.2-R6-01).

**The violation:** The shore-point `group` field stores an apparatus ID (e.g., "Engine 3") and is labeled "Group" in the UI. In NIMS, "Group" means a functional command unit led by a Group Supervisor. Displaying "Group: Engine 3" on a shore-point card reads as "this shore point is being managed by an ICS Group called Engine 3," which is not what is stored or intended.

**The fix:** The field stores which apparatus (resource) is assigned to a given shore point. The correct field name is `assignedResource`. The v3.12.0 dual-write opened the migration window. V4 closes it: `sp.group` is read during migration and then abandoned; `sp.assignedResource` is the canonical field.

**Doctrine source:** NIMS 2017, p. 25: "Groups are established to divide the incident into functional areas of operation." An individual apparatus is not a functional area of operation. NIMS 2017, p. 27: "Single Resources — an individual piece of equipment with its personnel." This is what `assignedResource` stores: a Single Resource reference.

---

## 12. Task Force Removed from Apparatus Types

**Current violation:** `APPARATUS_TYPES_DEFAULT` lists "Task Force" alongside Engine, Ladder, Rescue, Squad. This implies a Task Force is a kind of apparatus that a department owns and inventories, the way it owns three Engines.

**Doctrine:** A Task Force is assembled from available resources for a specific tactical mission, then disbanded. It is not a piece of apparatus. It has a Task Force Leader, not a type of vehicle. (NIMS 2017, p. 27; SM-0322, Chapter 3.)

**The fix:** Remove "Task Force" from `APPARATUS_TYPES_DEFAULT`. Departments that pre-assemble a standing group of apparatus for deployment should model this using the existing apparatus-group (`apparatusGroups`) feature, which is the correct NIMS representation of a local task force configuration.

---

## 13. ICS Forms Relevant to FieldShore Operations

Brief guidance on the forms FieldShore should generate. Full form specifications are deferred to the implementation phase.

| Form | Name | When required | What FieldShore provides |
|---|---|---|---|
| **ICS-201** | Incident Briefing | Phase II onward; at every command transfer | Generated from existing data: situation summary (editable), resources on scene (from apparatus list), current organization (from positions), actions taken (from shore-point event log), objectives (editable). PDF export. |
| **ICS-203** | Organization Assignment List | Phase II onward; on demand | Generated from `ICS_POSITIONS_DEFAULT` plus assigned personnel. Available at any time, not only at transfer. |
| **ICS-207** | Incident Organization Chart | Phase II onward; posted at Command Post | Rendered org-chart graphic. Already exists in v3 as the SmartArt chart; v4 version must use doctrine-correct position titles. |
| **ICS-214** | Activity Log | Per unit, continuous from Phase II | Generated per apparatus or per Group from shore-point event history and role history. Populated automatically; exported at operation close. |

Forms ICS-202 (Incident Objectives), ICS-204 (Assignment List), ICS-205 (Radio Frequencies), ICS-206 (Medical Plan), ICS-208 (Safety Message), ICS-209 (Incident Status Summary), ICS-211 (Check-In/Check-Out List), and ICS-213 (General Message) are deferred to v5. They require data FieldShore does not currently capture (frequencies, medical resources, weather) or are primarily Planning Section documents generated by dedicated planning software.

**ICS-211 note:** This form is partially relevant to FieldShore because it tracks apparatus check-in and demobilization timestamps. The v4 `assignedApparatus` keyed-object migration (replacing the flat ID array) creates the data fields `arrivedAt` and `demobAt` that ICS-211 requires. The form can be generated from those fields in v4 or early v5.

Source for form requirements: SM-0322, Chapter 6 (form requirement by Phase); *ICS Forms Booklet*, FEMA/USFA (ICS 420-1).

---

## 14. `canReparent()` and Org-Edit Authority

One finding from the v3.11.2 audit (V3.11.2-R6-03) is worth preserving as doctrine here, because it drives a v4 design decision.

**Current behavior:** The Safety Officer role can reparent org chart nodes, meaning any device operating as Safety can change the org structure and push it to Firebase.

**Doctrine:** The Safety Officer's authority is limited to stopping unsafe operations. Organizational restructuring authority belongs to the Incident Commander. At expanded incidents (Level II and above), the Resources Unit Leader under the Planning Section Chief facilitates org structure changes with IC approval. In no NIMS reference does the Safety Officer have authority to restructure command. (SM-0322, Chapter 5; NIMS 2017, p. 23.)

**The fix:** Remove Safety from `canReparent()`. Only the IC role (and, at Level II, the Resources Unit Leader if that position is added) should be able to reparent org nodes.

---

## 15. Open Doctrine Questions for Alex

These cannot be resolved without operational input from Alex. Each should become a resolved question before the v4 org-chart IA spec is finalized.

**Q1 — Division naming default: floors or faces?**
SM-0322 supports both floor numbers (Division 1, Division 2) and building-face phonetics (Division Alpha, Bravo, Charlie, Delta). V3.15.0 implemented numbered Divisions. Should the Level IV default org chart preset use floor numbers, face labels, or offer a picker at operation start? Which does Alex see in practice at local incidents?

**Q2 — Cutting Station location in the UI**
The brief locks Cutting Station under Operations, not inside the collapsed structure section. The open question is the visual representation: does it appear as a workstation card below the org chart but above the shore-point list? As a labeled row in the resource board? Alex should confirm the mental model he expects to see on the Command tab.

**Q3 — Runner task tracking granularity**
The brief locks Runner as a task assignment, not an org-chart node. The question is how granular the tracking needs to be. Options: (a) a single checkbox on a shore-point card reading "Runner dispatched" (the simplest — essentially what v3 does already via the "Runner" status); (b) a named assignment linking a specific person to a specific shore point in runner status; (c) a runner-task queue visible to the person assigned runner duty. Which granularity does field practice require?

**Q4 — Search Group at Level IV default**
SM-0322 Figure 6-2 and the Surfside TTX show Search Group standing up early. But at a single residential structural collapse (Level IV, one Engine and one Rescue), a separate Search Group Supervisor is unrealistic — the Rescue Group does both search and rescue. Should the Level IV default include a Search Group Supervisor, or should it be available as an add-on? Operational input from Alex (and Hartsdale field partners) is needed.

**Q5 — Medical Group at Level IV default**
Same question as Q4 for Medical. At a Level IV incident one EMS apparatus typically handles medical without a formal Group. Should Medical Group Supervisor be in the Level IV default chart or in the add-on picker?

**Q6 — Staging Area Manager placement**
SM-0322 shows the Staging Area Manager reporting to the Operations Section Chief. Some departments place Staging Area Manager directly under the IC at smaller incidents. Where does Alex's department and mutual aid practice put Staging? This affects the Level IV default preset.

**Q7 — "Shoring Group" vs. department-specific terminology**
Some departments use "Shore Group," "Prop Group," or informal labels. NIMS doctrine calls for "Shoring Group." The brief is clear that default labels follow doctrine. But departments may need to alias. Should FieldShore allow a department to display "Shore Group" while storing the canonical `shoring-gs` position ID? Or is the display name locked to doctrine in v4?

---

## Sources

- FEMA. *National Incident Management System*, 3rd ed. October 2017. Chapters 2–3. https://www.fema.gov/sites/default/files/2020-07/fema_nims_doctrine-2017.pdf
- FEMA Emergency Management Institute. *ICS for Single Resources and Initial Action Incidents* (SM-0322). https://training.fema.gov/emicourses/crsdetail.aspx?cid=e0319
- FEMA. *Urban Search and Rescue Response System: Operations Manual*, MANUAL 12-001, September 2012.
- FEMA/USFA. *ICS Forms Booklet*, ICS 420-1. https://training.fema.gov/emiweb/is/icsresource/assets/ics%20forms%20booklet.pdf
- FEMA. *Introduction to the Incident Command System*, IS-100.C, 2018. https://training.fema.gov/is/courseoverview.aspx?code=IS-100.c
- National Wildfire Coordinating Group. *Incident Command System Field Operations Guide*, NFES 2731, 8th ed., 2014.

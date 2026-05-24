# Future Scale — Brainstorm Essay

## Executive Summary

The most consequential design choices v4 makes will never appear on a feature list. They live in the data model — in whether an inventory record knows which agency owns it, in whether the Incident Commander is a field or a collection, in whether a role assignment is a slot that gets overwritten or a log that gets appended to. Get those choices right before v4 ships and v5 is mostly additive: new screens, new workflows, a fuller ICS form suite, federal auth. Get them wrong and v5 requires migrating every record every department has ever written, or accepting that federal rollup is simply not possible for data written during the v4 era.

The Surfside TTX-2 simulation ran 36 hours across 4 task forces and a peak of 470 personnel. It produced 14 critical findings and 28 high-severity findings across 63 improvement plan items. The three most consequential were not about missing features. They were about structural choices that had been made, implicitly, by omission. There was no agency identifier on any record, so the FEMA IST Plans Chief had full write access to TF-State's cache from the moment she connected. There was no role history log, so every command transfer overwrote the prior assignment silently and the Documentation Unit Leader maintained a parallel Google Sheet for 36 hours to reconstruct the record. The Incident Commander was a singular field, so Unified Command with County Law lived entirely outside the data model for 30 hours.

v4 ships Level IV and V. The design ceiling reaches Level I. This essay identifies the structural choices that determine whether v5 can reach that ceiling or hits a migration wall.

---

## The Namespace That Determines Everything Else

v4's Firebase structure puts everything under `/departments/{deptId}/`. That is the right structure for a single department on an everyday call. It is the wrong ceiling for an operation where a state task force arrives at E+5:00, a federal task force at E+14:00, and an Incident Support Team at E+27:00. None of those actors belong to the local department. Their apparatus, their personnel, and their inventory belong to their agency, not to the incident.

The way the current data model handles this is by making all those agencies share the same `deptId`. The state task force cache arrives and gets added to the local department's inventory. The federal IST connects and gets the same read-write permissions as Engine 1's captain. There is nothing in the data structure to express that TF-State Cache is TF-State property or that the IST Plans Chief is a FEMA actor with a different scope of authority than a local firefighter.

The simulation confirmed the cost of this at E+27:00. IST PSC Bauer connected from a FEMA device. Within 15 minutes, the moderator documented: "anonymous auth grants identical read-write scope to a federal IST member, a state TF Plans, and a local-FD member. There is no agency tag on any write, no per-actor audit trail, and no surface preventing a TF-State Cache operator from accidentally writing to TF-Fed-Alpha inventory." The only scope mechanism was a shared `deptId` that everyone on scene used identically.

The fix is not to implement multi-agency auth in v4 — that is v5 work and the 2026-05-17 pivot correctly deferred it. The fix is to reserve the namespace now. Every inventory item, every apparatus record, and every role assignment should carry an `agencyId` field even if v4 never enforces it. When v5 adds federal auth and per-agency write scoping, the field is already on every record. Without it, v5 must walk every existing record to add the field, or accept that agency attribution is impossible for anything written during the v4 era.

The right logical structure is `{agencyId}/{deptId}/{resourceId}` even if the physical Firebase path stays at `/departments/{deptId}/` for now. An `agencyId` matching the department's own identifier is the default for Level IV-V everyday use — the user never sees it, never configures it, it just exists. When a state task force arrives, their cache lands with their `agencyId` stamped at import. When the federal IST connects in v5, the auth layer knows which writes belong to which agency because the field was always there.

This single decision — reserving `agencyId` as a first class field on every record type — costs one schema addition in v4 and eliminates a data migration in v5. Document it in ADR-005 before v4 ships.

---

## The IC Is Not a Field

NIMS doctrine defines Unified Command as a structure where two or more agencies with jurisdictional responsibility share the IC role. It is not an edge case at major incidents — it is the expected configuration wherever law enforcement, public works, or multiple fire jurisdictions have overlapping authority. At Surfside, Unified Command appeared at E+6:15 when the Sheriff's Office established UC with the fire department IC. It stood for 30 hours.

The current data model expresses the IC as a single slot: `roles[targetId] = 'ic'`. When Sheriff Garza joined as UC-Law at E+6:15, the data model had nowhere to put him that expressed co-equal IC status. He appeared in IAPs and in the moderator's notes and not in FieldShore at all. For 30 hours, the app's command structure showed a single IC while the actual command structure had two.

The fix in v4 is straightforward. The IC role becomes a collection, not a slot. The MASTER-PLAN Phase 3B.4 already scopes this. The work is not complex. But it must happen before v4 is in the field, because once real departments have real operations with real IC assignments written to the database, changing the schema requires a migration. Doing it now, before the first department uses v4, costs one data model change and corresponding UI adjustments. Doing it in v5 costs every existing department's data.

The collection model for IC also directly enables the SitStat view — the 60-second incoming situational awareness screen that the IST needs. A SitStat that shows both IC nodes is only possible if the data model can hold both. A SitStat that shows a single IC slot is wrong for any Unified Command incident.

This is the same reasoning as the `agencyId` field. The change is cheap now. The migration is expensive later. The operational cost of getting it wrong is an IC structure that does not reflect reality for 30 hours of the worst incident a department will ever run.

---

## Role History Is Operational Data, Not Audit Data

Five IC transfers and six OSC rotations across 36 hours of the Surfside TTX-2. Every one of them overwrote the prior assignment silently. When IST PSC Bauer arrived at E+27:00 and asked who had held OSC at E+14:00, the answer was not in FieldShore. Documentation Unit Leader Sayer maintained a parallel Google Sheet for the entire operation — 9 IC-tier transitions, 14 Branch-Group-Unit tier transitions, 21 specialist role assignments — all reconstructed outside the app. That sheet was the authoritative record for ICS-209 reconstruction. The app was not.

Role history is not an audit trail feature that federal agencies need. It is operational data that drives reimbursement, incident documentation, and legal defensibility. ICS-203 (Assignment List) and ICS-209 (Incident Status Summary) both require a record of who held which position when. A state or federal mutual-aid reimbursement package requires signed role-assignment records with timestamps. An after-action review at any major incident starts with reconstructing the command chain over time.

The data model change is to replace the overwrite model with an append model. Every role assignment writes a new record to a `roleHistory` log: `{ roleId, targetId, assignedAt, departedAt, byUid, agencyId }`. The current rendered state of the org chart derives from the most recent active entry per role. When IC changes, the prior IC gets a `departedAt` timestamp and the new IC gets a new record. Neither is deleted.

This is the right architecture for everyday Level IV-V use as well. When a residential collapse cycles through three officers in four hours, the IC on scene at the time of a critical decision should be queryable. The append model costs nothing in performance and gains the full history. The single-slot overwrite model loses the history immediately and permanently.

The v4 design decision is to add `roleHistory` to the operation schema now, even if v4's UI only reads the most recent entry for display. The write path adds a record instead of updating a slot. The read path filters by `departedAt == null` to get current assignments. v5 builds the timeline view and the ICS-209 export on top of data that was already accumulating.

Without this change, every role transition in every v4 operation is a document that will never exist.

---

## The Cache at Demob

The federal TF cache that arrives with TF-Fed-Alpha at E+14:00 carries 120 struts, 144 extensions, and 198 connector plates — 462 units across 49 line items. Three federal task force caches at peak (Alpha, Bravo, Charlie), plus TF-State's cache, means roughly 1,400 individual items of equipment on scene simultaneously. Every one of those items needs to go home.

The Demob Unit Leader worked entirely outside FieldShore for two operational periods. The TF-State demob discussion at E+30:30 — release sequence, cache decon prerequisites, reimbursement documentation — all lived in parallel Google Sheets and paper ICS-220 and ICS-221 forms. The app had no demob surface anywhere. Not in Settings, not in Inventory, not in Operations, not in Command.

v4 does not need to ship the full ICS-221 form generator. That is v5 work, and attempting it in v4 without established local-department usage would repeat the mistake the 2026-05-17 pivot corrected. But v4 does need to add lifecycle hooks to the inventory and apparatus data models. Without them, v5's demob workflow has no data to compute against.

The minimum v4 change: a `status` enum on every inventory item. Values: `staged`, `deployed`, `decon-required`, `decon-complete`, `released`. Today inventory items track `quantity` and `available`. They have no lifecycle state. When TF-State's cache goes into decon at E+30:00, there is nowhere in the data model to record that. Adding `status` to inventory items costs nothing in v4 — no v4 screen reads it, nothing breaks if it sits at the default value. But when v5 builds the demob workflow, the field is there on every record.

A second minimum change: `arrivedAt` and `demobbedAt` timestamps on apparatus records. These drive ICS-211 (Check-In List) and the PAR system. They also drive the reimbursement package — no federal mutual-aid reimbursement can be submitted without apparatus deployment timestamps. Adding them to the apparatus schema means they can be populated from the moment a department connects apparatus to an operation. v4 populates them manually or not at all. v5 makes them automatic. The data model supports both.

The cache decon math from the simulation: 4 personnel-hours per cache item, 46 items in TF-State cache. That is 184 personnel-hours of decon work that needs to be tracked, verified, and documented before the cache releases. None of those numbers can live in FieldShore today. They need to live there before v5 ships.

---

## The Comms Data Model Is a One-Time Choice

The Surfside TTX-2 ran a 36-hour Type I operation and generated ICS-205 (Incident Radio Communications Plan) forms at every operational period boundary. All of them were drafted outside FieldShore. The app has no radio net concept anywhere — not a field, not a placeholder, not a label. A grep across `app.js` and `index.html` returned zero matches for radio, frequency, talkgroup, tactical net, or ICS-205.

ICS-205 is not optional at Type II and above. It specifies which frequencies and talkgroups are assigned to which functional nets (Command, Tactical-Alpha, Tactical-Bravo, Support, Air-to-Ground, Emergency Traffic) and which ICS roles monitor which nets. The OSC monitors Command and the primary Tactical net. A Group Supervisor monitors Tactical-Bravo and Support. The incoming IST Plans Chief monitors Command and a separate IST coordination net. When a role assignment is made without a net assignment, the comms plan is incomplete.

The cheapest possible v4 change is adding `nets: []` as a typed field on every role record — an empty array by default, populated optionally when comms plan data is available. This field costs nothing in v4. It gives v5 a target field to write comms plan data to without a schema migration. Every existing operation where someone has assigned roles will have `nets: []` on those records, which v5 reads as "no net assigned yet" and surfaces appropriately.

Without this field, v5 either adds it and migrates every existing role assignment record, or accepts that comms plan data cannot be bound to roles assigned during the v4 era. That is the corner to avoid.

The related change is the 24-hour timestamp format. Every timestamp in the current app renders in 12-hour AM/PM via the browser's default `toLocaleString()` behavior. Fireground radio doctrine is 24-hour universally. Command transfers log "0914" not "9:14 AM". A 5-transfer IC chain across 36 hours with all timestamps in 12-hour format is a doctrine violation on the face of the record. Fixing this in v4 is a find-and-replace across the formatting calls. Not fixing it means every timestamp in every v4 record is in the wrong format for formal documentation.

---

## What the SitStat Requires

The 60-second incoming IST situational awareness view is not a feature. It is a query over structured data. Whether it is possible depends entirely on whether the underlying data is typed correctly.

A SitStat that shows "IC: Chief Whitaker / UC-Law: Sheriff Garza" requires the IC collection. A SitStat that shows "12 shore points secured, 8 in runner, 5 in cutting" requires typed status fields on SP records. A SitStat that shows "TF-State: 66 personnel, TF-Fed-Alpha: 80 personnel" requires agency-tagged apparatus records. A SitStat that shows "TF-State cache: 86 struts, 68 available" requires the apparatus-level inventory rollup. Every structural decision in this essay either enables or blocks those four lines.

The SitStat is also the most powerful demo FieldShore has for the design ceiling marketing claim. A live demo where a federal IST arrives at a simulated Level I incident and achieves full situational awareness in 60 seconds is the product argument no competitor in the fire service software space can make. That demo requires every structural choice in this essay to be correct before v5 ships. The namespace, the IC collection, the role history, the inventory lifecycle, the agency tags — all of it needs to be in place.

None of those choices require shipping the SitStat view in v4. They only require that the data model does not make the view impossible.

---

## FEMA Resource Typing and the Credentialing Hook

FEMA classifies USAR task forces by resource type: Type I (the largest federal TF, 70+ personnel, full equipment suite), Type II, Type III, down through Type V for local teams. When an Operations Section Chief is allocating shoring resources across 4 task forces at a Level I incident, the resource type tells them what each TF can do. A Type I federal TF carries the full Paratech system suite — AT, LK, and LS struts plus the full connector plate set. A Type III state TF carries a subset.

The current apparatus data model has a `type` field: Chief, Engine, Ladder, Rescue, Squad, Task Force, Other. Task Force is in the enum. What is missing is a `resourceType` field that carries the FEMA typing level distinct from the apparatus category. A Task Force that is FEMA Type I is structurally different from one that is Type III, and the difference matters for resource allocation at scale.

Adding `resourceType` as an optional field on apparatus — with values matching the FEMA US&R resource typing schema — gives v5's credentialing import a target field. The import workflow in v5 reads a task force's FEMA certification and stamps `resourceType` on their apparatus records. In v4, the field sits empty on most apparatus because Level IV-V calls don't use it. On task force apparatus records, it can be populated manually during cache import. The field costs nothing and avoids a migration.

---

## What v4 Can Honestly Claim

v4 ships Level IV and V as the everyday case. The design ceiling reaches Level I. That gap is not a weakness to minimize — it is a positioning statement that no competitor makes accurately.

Tablet Command covers all hazard incidents at moderate depth with no structural collapse doctrine. First Due covers module breadth across records, scheduling, and command at moderate incident complexity. Neither carries strut load tables, USACE shore types, or the shoring operation lifecycle. Neither has a data model that could support a Surfside-scale operation without fundamental redesign. FieldShore v4 will.

The honest claim is: v4 is the structural collapse tool that works correctly at the scale most departments will ever see and does not break or require a new app when the incident grows. The everyday case is a car into a building. The design ceiling is a pancake collapse with 4 task forces over 36 hours. When that incident eventually arrives, command does not switch apps. The org chart expands. The inventory table adds more rows. The role history log gets longer. The SitStat view, which ships in v5, becomes the single screen that lets incoming IST teams get oriented in 60 seconds.

That is a defensible ceiling claim because it is grounded in simulation evidence and structural choices, not in marketing aspiration. Every recommendation in this essay is a constraint that makes the claim true.

---

## Recommendations

1. Document `agencyId` as a reserved first-class field on every data schema type — inventory items, apparatus records, operation writes, and role assignments — before v4 ships. Default value is the department's own identifier. Enforce nothing in v4. Record this decision in ADR-005. Without this field on every existing record, v5 cannot do agency-scoped writes or per-agency inventory attribution without a data migration across every record in the database.

2. Replace the singular `ic` role slot with an `IC` collection that supports one or more co-equal IC assignments. Express Unified Command as two entries in the collection, not as a workaround in IAP prose. This is a schema change, not a feature. The cost is near zero before v4 ships and grows with every operation written under the old schema.

3. Implement role assignments as append-only log entries at `/operations/{opId}/roleHistory/{pushId}` with fields `roleId`, `targetId`, `assignedAt`, `departedAt`, `byUid`, and `agencyId`. The current rendered state derives from entries where `departedAt` is null. v5 builds the timeline view and ICS-209 export over this log. Without the log, the ICS-209 reconstruction capability does not exist for any v4-era operation.

4. Add a `status` enum to every inventory item schema with values `staged`, `deployed`, `decon-required`, `decon-complete`, `released`. Default to `staged`. No v4 screen reads it. v5 writes the demob workflow against it. Without the field, v5 must run a migration across every inventory record in the database before the demob workflow can be built.

5. Add `arrivedAt` and `demobbedAt` timestamp fields to the apparatus schema. Default null. These fields drive ICS-211, PAR, and the federal mutual-aid reimbursement package. Populate them manually in v4. Make them automatic in v5. The data model supports both; the alternative is a migration.

6. Add `nets: []` as an empty typed array to every ICS role record. v4 never reads it. v5 writes the ICS-205 comms plan data to it. Per-role net assignment requires this field to exist before the comms plan workflow can be built without a schema migration.

7. Replace all `Date.toLocaleString()` and `Date.toLocaleTimeString()` calls with explicit `{ hour12: false }` formatters before v4 ships. Every timestamp in the app currently renders in 12-hour AM/PM on US locales. Fireground radio doctrine is universally 24-hour. Every timestamp in every ICS form generated from v4 data will be in the wrong format until this is fixed.

8. Add `resourceType` as an optional field on apparatus records with values matching the FEMA US&R resource typing schema (Type I through Type V). Default empty. Populate manually on task force apparatus records during cache import. Gives v5 credentialing import a target field and the Operations Section Chief a filter dimension for resource allocation.

9. Enforce apparatus naming uniqueness across the combined agency namespace, not just within a department. When TF-Fed-Alpha, TF-Fed-Bravo, and TF-Fed-Charlie each bring an apparatus named "Rescue-A," three teams answer when the radio calls "Rescue-A." The validator must canonicalize names across all apparatus visible in the incident, not only within the owning department's roster.

10. Add `opNumber` as a tagged field on every write — shore points, status transitions, role assignments, and inventory transactions — so that post-incident export can filter by operational period. The app today renders 36 hours as one continuous timeline with no OP boundary markers. ICS-204 assignment lists are per-OP by definition. Without the tag, the per-OP export requires reconstructing OP boundaries from timestamps rather than reading a stored field.

11. Reserve a `linkedVictim` field on shore point records — typed as a string ID, defaulting null. Victim cluster linkage in the TTX lived as freeform strings in SP label text, which is not queryable. v5 builds the Victim Locator view by filtering SPs where `linkedVictim` matches a cluster ID. The field needs to exist in the schema before that query can be written.

12. Document the design ceiling claim with quantitative specifics in the marketing site before v4 launches: Level IV-V as the everyday case, design validated against a Level I simulation (4 task forces, 470 personnel, 66 shore points, 36 hours, 4 operational periods). State what ships now and what the ceiling enables in v5. That specificity is the credibility that no competitor can match with a general "scales to enterprise" marketing claim.

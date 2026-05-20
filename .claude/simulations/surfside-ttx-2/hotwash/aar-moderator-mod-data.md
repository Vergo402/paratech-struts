# AAR — Moderator `mod-data` (Data Integrity / Multi-Agency / After-Action)

## Subject identification

- **Subject ID:** `mod-data`
- **Role / Persona:** Moderator — Data Integrity, Multi-Agency, After-Action; reference MASTER-PLAN Phases 3A/3B/3C/3D + `database.rules.json` validate rules + `app.js` listener/pendingWrites architecture
- **Active window:** E+0:00 → E+36:00 (full sim, silent observation)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

OP1, OP2, OP3, OP4 — all four periods, plus T-15 pre-event baseline.

---

## Question 1 — What was supposed to happen?

The observation framework for `mod-data` was set against three layers of the v4.0.0 hypothesis: (1) the v3.x data-integrity baseline holds under load (local-first writes survive, listener first-fire guard from v3.5.2 does not regress, `firebaseSave()` queueing handles offline cleanly); (2) the **multi-tenancy gap** predicted by MASTER-PLAN Phase 3A/3B shows up the moment a non-local actor (TF-State, TF-Fed, IST) touches the dept; (3) the **append-only role history + ICS-form export** scoped for Phase 3C.5 / 3D.1 is missing in ways that surface concretely as IC/OSC rotate.

I expected the 13-item checklist to produce mostly clean reads on items 1, 2, 9, 13 (v3.5.2 / v3.8.1 already shipped) and mostly gap findings on items 3, 4, 5, 7, 8, 10, 11, 12 (Phase 3A/3B/3C/3D scope). I also expected SP creation, status transition, and role assignment to be the three highest-traffic write paths, and that any latent validate-rule mismatch (post-v3.8.2 inventory `model` fix) would surface during the 66-SP campaign. The TTX-2 budget was 240 SP across 4 OPs; actual was 66 (14/35/34/17 = 28% of budget) — well within the band where backend correctness can be evaluated without saturating the local-first queue.

## Question 2 — What actually happened?

The single largest data-integrity finding of the sim was systemic and reproducible across all four OPs: **the Add-SP modal's Save Changes button is hidden in the Add path until the user runs the find-struts flow**, which made the supported UI path for creating shore points functionally unreachable for the participant subagents. Every shore point created in OP1, OP2, OP3, and OP4 (66 in total) was injected via programmatic `db.ref().push() + persistOperation()` — documented in `conductor-state.json.ui_friction_logged_by_participants[]` and surfaced in op2/3/4 `sp_creation_method_friction` strings. Four OPs running without a v3.x patch is a critical signal that this gap was discovered, worked around, and never escalated to a release — the simulation runtime substituted a writer-side bypass for what should be a Save Changes click. Cross-reference: this is the single most-cited entry in the friction log, occurring as four discrete OP findings.

The second critical finding was the **`estimatedLoad` validate-rule mismatch** discovered in OP4. The first SP-creation eval failed with `PERMISSION_DENIED` because `database.rules.json` requires `estimatedLoad` to be numeric, while the UI dropdown emits string values like `'medium'` / `'heavy'`. The contract is undocumented in the API surface; the participant only learned the type by failing a write. Combined with the existing v3.8.2 inventory `model` validate-rule history, this is the second silent type-mismatch we have shipped — a class of bug that costs real wall-clock at field time. The agency field on `external-equipment-pool.json` did **not** round-trip through Firebase (mod-data line 4, T-15 baseline): zero of 249 inventory items and zero of 38 apparatus carried an `agency` field anywhere in the data model — Phase 3B.1 is greenfield, not partial.

The third class of findings concerned **role history loss**. Across the four OPs we observed 5 IC transfers (Reyes→McAllister→Park→Whitaker→Vasquez→Whitaker) and 6 OSC rotations, plus Branch/Group/Unit escalations (Beck promotion E+10:30 area, Patel Medical-Unit→Medical-Branch-Director escalation OP3, Grayson Heavy Rigging Group Sup escalate OP3, Penz Finance/Admin SC OP4). The friction log captures 6 separate instances of "role history not preserved on apparatus or individual role transitions" — confirming the v4.0.0 3C.5 gap end-to-end. When IST PSC Bauer arrived at E+27:00 and asked "who held OSC at E+14:00?", the answer was not derivable from the app's state — only from the IAP `.md` files. Related: the **orphan custom_medical_unit role** remained after Patel escalated to Medical Branch Director (OP3 friction entry), exactly the kind of inconsistency append-only history with active/superseded flags would prevent.

The fourth class concerned **simulation persistence**. The OP3 driver event-log documented 34 SP creations + 21 status writes + IC/OSC transitions + role escalations, but these were **NOT persisted to UI/database** — the OP4 driver had to re-apply state at the OP boundary (friction entry: "OP3 driver event-log entries documented changes NOT persisted to UI/database; OP4 driver re-applied state"). This is partly a simulation-runtime gap, but it also reflects an absence of OP-boundary verification tooling in the app: there is no in-app surface that says "since the last snap, you have written N times". The conductor wrote `snap-T-20-initial.json`, `snap-E+04h.json`, `snap-E+16h.json`, `snap-E+28h.json` from outside the app entirely (Item 9 — `Phase 3C.3` snapshot ownership is conductor-only, not app-owned).

The fifth and arguably highest-stakes finding: **all anonymous-auth users have full read/write to all departments** (OP3 friction entry, mod-data note line 8, mod-ist note line 8). The v3.7.0 anon-auth membership-gating rule (`data.child('members').child(auth.uid).exists()`) does scope reads to dept members, but does not scope writes by role or by agency — federal IST PSC, state TF Plans, and local-FD have identical write privileges. There is no agency tagging on any write, no per-actor audit trail, and no surface preventing a TF-State Cache operator from accidentally writing to TF-Fed-Alpha inventory.

Finally: **dashboard count cards did not refresh after programmatic mutation** (OP2 friction) and the **dual-keyed SP IDs (Object.keys vs push key, undocumented)** (OP1 friction) — two latent inconsistencies in the read/write model that compounded the bypass workflow.

## Question 3 — Why was there a difference?

The Add-SP modal Save-button hidden state is a UX-induced data-layer hole: the data model is willing to accept a fresh SP, but the only sanctioned write path requires a find-struts pre-flow. When the find-struts step is unreachable (no matching strut in inventory at the requested length, or operator wants to defer find-struts until cut planning), the user has no way to commit the SP — so they bypass. The conductor's choice to bypass via `db.ref().push()` is technically correct (writes are local-first + Firebase-mirrored), but it skips client-side validate normalization, which is exactly how the `estimatedLoad` numeric/string mismatch surfaced. The deeper cause is that the v3.x app conflates "create SP" and "find struts for SP" into a single modal state machine — Phase 3F (UX) and 3C (data model) both have to change to break this lock.

The multi-tenancy gap is doctrinal: v3.7.0 shipped anon auth as a coarse "auth != null" gate, with per-write scoping deferred to v4.0.0 Phase 3A.2 + 3B. The sim merely confirmed the prediction — federal IST visibility into a state-tagged write is indistinguishable from local-FD visibility because there is no agency tag on the write at all.

Role-history loss is the canonical Phase 3C.5 finding (scoped, not shipped). The fact that we hit it 6 times in 36 sim hours — at every IC/OSC rotation and at every Branch/Group/Unit promotion — confirms the priority of 3C.5 in the v4.0.0 plan. The orphan custom role and the OP4 ICS_ROLES_DEFAULT-missing-Finance/Admin-SC findings are both knock-on effects of treating role assignment as a single-slot overwrite rather than a versioned tenure record.

OP3 driver non-persistence is partly a simulation runtime gap (an out-of-band scaffolding issue), but it points to a real Phase 3C.3 / 3F need: the app should be able to say "here is what I think happened during the last OP, and here is the diff against the snapshot you cut at the boundary."

## Question 4 — What can we learn from it / what should change?

**App changes (concrete):**

1. **Add-SP modal: make Save Changes always-available in the Add path.** Decouple "create SP" from "find struts for SP". The find-struts step should be a follow-up state on the SP card, not a gate to commit. Tag: `Phase 3F` / **NEW**. Severity: critical.
2. **Publish the validate-rule schema in-app.** Surface `estimatedLoad: number` (and any future numeric fields) as inline form hints + emit a structured client-side error when a string is sent. Document the rule in the API contract. Tag: `Phase 3F` + `Phase 3D.1` (documentation export). Severity: high.
3. **Add `agency` field to inventory + apparatus + external equipment, end-to-end.** Round-trip from import → Firebase → render. Validate rule on write. Render badge per agency on chips. Tag: `Phase 3B.1` + `3B.3`. Severity: critical.
4. **Append-only role history** (`/operations/{opId}/roleHistory/{push}` with `assignedAt`, `departedAt`, `byUid`, `agency`, `supersededBy`). Migrate the single-slot `roles` map to a view derived from history. Tag: `Phase 3C.5`. Severity: critical.
5. **Per-write actor + agency attribution.** Stamp every write with `byUid` + `agency`. Validate rule enforces presence. Render `by/agency` on SP timeline + Command activity feed. Tag: `Phase 3A.2` + `3B.1` + `3D.1`. Severity: critical.
6. **Per-role write scope.** Federal IST PSC vs local-FD write paths must differ. Begin with read-only IST visibility into local dept and progress to scoped writes. Tag: `Phase 3A` + `3B`. Severity: critical.
7. **Dual-keyed SP ID normalization.** Either commit to `Object.keys()` indexing or to push-keys, not both. Document. Tag: `Phase 3C` + **NEW**. Severity: high.
8. **OP-boundary snapshot ownership inside the app.** App emits its own snap at op boundary; conductor read-only. Surface "writes since last snap" diff in Command tab. Tag: `Phase 3C.3`. Severity: high.
9. **ICS_ROLES_DEFAULT additions:** Finance/Admin SC, Cost UL, Time UL, Doc UL, Demob UL, Branch Directors (Rescue, Medical, Heavy Rigging), Group Sups (Search, Shoring, Heavy Rigging), Unit Leaders, PSC, LSC, Liaison, PIO. Tag: `Phase 3C.1`. Severity: high.
10. **Orphan role detection.** When an individual escalates, the old custom role should be marked superseded, not left orphaned. Tag: `Phase 3C.5`. Severity: medium.
11. **Dashboard count refresh after every write** (eliminate the 30s debounce gap). Tag: `Phase 3F` / **NEW**. Severity: medium.
12. **`/diagnostics/sync` read rule.** Add an admin-readable rule so mod-data + conductor can inspect sync events without Firebase Console access. Tag: `Phase 3F`. Severity: medium.

**Doctrine / runtime changes:** the simulation runtime needs a persistence-verification step between OPs (re-read all writes the prior driver claimed) so OP3-style drift cannot recur.

## Cross-reference

- **Linked notes:** `notes/moderator-mod-data-notes.jsonl` lines 1–9 (init + T-15 baseline through architecture confirmation)
- **Linked IAPs:** `iaps/iap-op1.md`, `iap-op2.md`, `iap-op3.md`, `iap-op4.md`
- **Linked conductor-state friction entries:** all 30 lines in `ui_friction_logged_by_participants[]`; especially indexes 9, 19, 20, 21, 22 (SP modal bypass × 3, multi-tenancy gap, estimatedLoad validate gap, OP3 non-persistence)

## Synthesis tags

```
tag: Decouple SP-create from find-struts so Save Changes is always available | phase: 3F | severity: critical
tag: Add agency field end-to-end on inventory + apparatus + external equipment | phase: 3B.1 | severity: critical
tag: Append-only role history with assignedAt/departedAt/byUid/agency/supersededBy | phase: 3C.5 | severity: critical
tag: Per-write byUid + agency attribution stamped + validate-enforced | phase: 3A.2 | severity: critical
tag: Per-role write scope so federal IST and local FD differ | phase: 3B | severity: critical
tag: Publish validate-rule schema in-app + structured form errors for numeric estimatedLoad | phase: 3F | severity: high
tag: Default ICS_ROLES_DEFAULT must include Finance/Admin SC + Cost/Time/Doc/Demob ULs + Branch/Group tier | phase: 3C.1 | severity: high
tag: OP-boundary snapshot owned by app with "writes since last snap" diff surfaced | phase: 3C.3 | severity: high
```

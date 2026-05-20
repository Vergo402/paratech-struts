# AAR — Participant Cohort: OP1 (Initial Response)

> Army-AAR format. Cohort lead voice. Drafted at hotwash Phase 1 after E+36:00 event-clock halt. ⚠️ Training-only.

---

## Subject identification

- **Cohort ID:** `op1-cohort` (composed of `ic-op1`, `osc-op1`, `rescue-op1`, `cut-op1`)
- **Personae:**
  - **IC #1–3** — Capt. Reyes (Engine 1, IC #1 verbal E+0:04) → BC McAllister (BC-1, IC #2 from E+0:09) → DC Park (ACOO-1, IC #3 from E+0:45)
  - **OSC #1** — BC McAllister (post-IC handoff at E+0:45)
  - **Rescue Captain** — Rescue 1 senior officer (drove the first 14 SPs)
  - **Cut Table Lead** — Squad 1 senior (stood up the cut station at E+0:22)
- **Active window:** E+0:00 → E+4:00
- **Submission date / wall-clock:** 2026-05-17 (hotwash phase 1)

## Operational period(s) covered

OP1 only (initial response / Type IV → Type II escalation).

---

## Question 1 — What was supposed to happen?

Per **IAP-OP1** (ICS-201 retrospective) and the per-role overlays for `ic-op1`, `osc-op1`, `rescue-op1`, `cut-op1`, our cohort was tasked with seven initial-response objectives across a four-hour window:

1. Establish Command and execute two cmd transfers within the first hour (Reyes → McAllister → Park) on the Type IV → III → II escalation ladder.
2. Evacuate the N-wing cleavage zone and begin emergency shoring of the Floor 11 cantilever (Cluster V-3).
3. Search Pile Sector A west face for confirmed Cluster V-1 / V-2 voids.
4. Coordinate utility for SW gas-service-stub isolation (Sector B locked until iso).
5. Stand up a Type II Command Staff: Safety, OSC, PIO, Liaison, LSC, PSC #1.
6. Transmit ESF-9 SAR request to State EM.
7. **SP creation budget: ~30 shore points** distributed across Cluster V-3 (cantilever), V-4 (Bravo divisional Fl 7–9), V-1 (Pile A west Fl 8), V-2 (Pile A SW Fl 6 pre-positioning). Mix of T-Shore (majority) and Double-T (overhead transit voids).

Cut-table lead's mandate was passive until pipeline produced its first `strutplaced` → `cutting` transition (estimated E+0:45). Rescue Captain owned actual SP entry; OSC #1 coordinated the four operational groups (Rescue, Search, Cutting, Heavy Rigging) and managed the Shoring Group transition from interim USAR-Alpha (Aragon) to USAR-Bravo (Beck) at E+2:15.

Tooling: Settings → Start Operation modal for op creation, Command tab for IC/Command-Staff role assignments, Operations tab + Add-SP modal for shore-point entry, Cut Table tab when work arrived. Resources were lean — 28 apparatus and ~123 personnel by E+4:00, with TF-State advance (4 personnel) confirmed at E+2:30.

---

## Question 2 — What actually happened?

The cmd-transfer chain executed on schedule. Cmd Transfer #1 (Reyes → McAllister) landed at **E+0:09**; Cmd Transfer #2 (McAllister → Park) at **E+0:45**. Both were ICS-201 verbal + Command tab UI re-assigns, both logged as `transfer-of-command` events in `runtime/event-log.jsonl`. McAllister rotated cleanly from IC #2 into OSC #1 on `app-bc1` — but the FieldShore app overwrote the prior `ic` assignment on that apparatus without preserving role history (first observation of the v4.0.0 Phase 3C.5 gap).

We hit **14 of the 30 SP budget** (47% completion). All 14 came from Rescue Captain entering SPs through the Operations tab. Distribution: 3 SPs on V-Cluster-3 (cantilever), 4 on V-Cluster-4 (Bravo divisional Fl 7–9), 4 on V-Cluster-1 (Pile A west Fl 8), 3 on V-Cluster-2 (Pile A SW Fl 6). Type mix: 13 T-Shore + 1 Double-T (Cluster V-1 Fl 8/9 overhead transit void). Status at OP1 close: **7 in `process`, 7 in `pending`, 0 in `strutplaced`-or-beyond**. The pipeline never reached cutting, which meant `cut-op1` (Squad 1) sat staffed from E+0:22 forward with zero work to do — token released back to OSC for the remainder of OP1.

The under-budget SP count was not a personnel-attention issue. It was the app. The friction stack hit us in this order:

- **Start-Op modal apparatus checkbox list rendered empty** at the very first op-creation attempt (E+0:02). We could not pre-tick the apparatus on initial submit; had to dismiss, refresh, and re-open before chips appeared.
- **`guardClick` swallowed the first Submit silently** — the modal looked unresponsive, no error toast, no console feedback visible to a field user. Lost ~90 seconds before figuring out we needed to click a second time.
- **`renderOrgChart` bare-call crash** during OP1 retrospective when verifying the org chart for the ICS-201 — threw `Cannot convert undefined or null to object` at line 4777 (`Object.values(roleAssignments)`). Worked around by passing the assignments explicitly.
- **`ICS_ROLES_DEFAULT` missing Liaison/PIO/LSC/PSC** — three of four Command Staff slots required custom-role creation. Liaison (Mendoza, E+1:45), PIO (Hollis, E+2:00), and LSC (Romano, E+3:30) all needed `custom_liaison_*` / `custom_pio_*` / `custom_lsc_*` entries. Workaround was clean but consumed senior-officer attention that should have been on SP throughput.
- **No pre-imported apparatus for Liaison or LSC** — `app-eoc-liaison` and `app-lsc1` were absent. We attached Mendoza and Romano via the Individuals subsystem; doctrinally weak for chief-level positions.
- **Add-SP modal Save Changes button hidden** until a find-struts flow completed. First encounter happened mid-OP1; Rescue Captain figured out the workaround (run find-struts → return to modal → button now visible) within the first three SPs and never lost it again. But every SP creation costed an extra modal cycle.

Despite the friction, all seven IAP objectives advanced. Safety BC Conway assigned E+0:25, Liaison Mendoza E+1:45, PIO Hollis E+2:00, PSC #1 Doyle (TF-State advance) E+2:30, LSC Romano E+3:30 — full Type II Command Staff stood up by E+3:30. Gas isolation confirmed at E+1:15 by utility crew. **ESF-9 SAR request transmitted at E+3:45** as the final OP1 milestone. IAP-OP1 (ICS-201 retrospective, 2,464 words) was filed at boundary.

---

## Question 3 — Why was there a difference?

The 47% SP-budget achievement was a **direct consequence of the Add-SP modal Save-button friction × cmd-transfer attention cost**. The cmd-transfer chain consumed the senior officer (IC) for the first 45 minutes — that part is realistic and matches FEMA Type IV → II escalation reality, not a defect. What's not realistic is that every SP creation cost an extra modal cycle to surface the Save button, and that the find-struts roundtrip was mandatory before deploy. That's the app.

The `ICS_ROLES_DEFAULT` shallowness (no Liaison/PIO/LSC/PSC) is a **doctrine gap, not a UI gap** — the data model can hold these roles, the UI can render them, but the default tree does not seed them. This means every Type II / Type I incident requires three to six custom-role creations *before* the structure can be mapped, which is exactly backwards from what FEMA ICS-203 intends. Custom roles should be the long-tail of agency-specific positions, not the basic Command Staff.

The `renderOrgChart` bare-call crash is a defensive-programming gap — `Object.values(undefined)` is a known JS footgun and the function should default to `{}`. The Start-Op modal empty-apparatus-list and `guardClick`-swallowed-submit are both initialization race conditions that vanish on second attempt; they're soft failures but they erode the operator's confidence in the app at the worst possible moment (incident minute zero).

The role-history-not-preserved gap (McAllister IC → OSC overwrite) is a **data-model decision**, not a bug. The app currently treats `roleNames[apparatusId]` as a scalar; it needs to be a stack (or a time-keyed log) to preserve provenance. This is the v4.0.0 Phase 3C.5 finding and our cohort confirmed it for the first time during OP1.

Persona / understanding of role was not a factor. Reyes, McAllister, and Park executed clean ICS-201 transfers; Rescue Captain entered SPs at appropriate rescue priorities (Cluster V-3 first, then V-1, deferred V-2 due to LS-series strut availability, avoided V-6 until gas iso confirmed). Cut Table Lead correctly stood down when no work was available rather than chasing busy-work.

---

## Question 4 — What can we learn from it / what should change?

**App changes (cite v4.0.0 phase tags):**

- **Add-SP modal Save Changes button always visible in Add path** — do not gate on find-struts completion. Allow SP creation without deploy and let the operator return later to assign struts. **Phase 3B / NEW**, **severity: critical**.
- **`ICS_ROLES_DEFAULT` expanded to full FEMA Type I Command Staff and General Staff** — Liaison, PIO, Safety (already present), IC (already present), OSC, PSC, LSC, FASC seeded by default. **Phase 3C.1**, **severity: high**.
- **Pre-import canonical chief-level apparatus** — `app-eoc-liaison`, `app-lsc1`, `app-psc1`, `app-fasc1` as default apparatus rows so chief positions don't have to be hung off the Individuals subsystem. **Phase 3C.1**, **severity: med**.
- **`renderOrgChart` default-argument hardening** — accept `undefined` / `null` for `roleAssignments` and default to `{}`. One-line defensive fix. **NEW**, **severity: med**.
- **Start-Op modal apparatus list — eager-render fix** — populate checkbox list synchronously from `apparatus` ref before modal opens, not on first user interaction. **NEW**, **severity: med**.
- **`guardClick` first-submit visibility** — when the guard swallows a click, surface a toast or temporary inline message so the user knows the click registered. **NEW**, **severity: low**.
- **Role-history preservation on apparatus/individual role transitions** — keyed log per apparatusId / individualId with `{role, assigned_at, cleared_at}`. **Phase 3C.5**, **severity: high**.

**Doctrine / scenario changes:**

- IAP-OP1 should template an ICS-201 narrative directly into FieldShore (not just a Markdown file) so the field operator at incident-minute-zero has a guided form, not a blank Markdown editor.
- Hotwash framework should explicitly flag that **SP-budget achievement under 60% in OP1 is the modal-friction tell**, not a coordination failure — i.e., this is a known fingerprint of the v3.11.x app and should not be misread as participant error in future TTX cycles.

---

## Cross-reference

- **Linked SP IDs:** all 14 OP1 SPs (V-Cluster-1 ×4, V-Cluster-2 ×3, V-Cluster-3 ×3, V-Cluster-4 ×4). See `runtime/firebase-snapshots/snap-E+04h.json` for SP IDs at OP1 boundary.
- **Linked IAP:** `iaps/iap-op1.md` (2,464 words; filed retrospective at E+4:00 by IC #3 DC Park).
- **Linked event-log entries:** cmd-transfer #1 (E+0:09) and #2 (E+0:45); ESF-9 transmit at E+3:45.

---

## Synthesis tags (for the Phase 2 merge)

```
tag: Make Add-SP modal Save Changes button visible in Add path without find-struts gate | phase: 3B | severity: critical
tag: Seed full FEMA Type I Command Staff + General Staff in ICS_ROLES_DEFAULT (Liaison/PIO/LSC/PSC/FASC) | phase: 3C.1 | severity: high
tag: Pre-import canonical chief-level apparatus rows (Liaison, LSC, PSC, FASC) | phase: 3C.1 | severity: med
tag: Harden renderOrgChart against undefined roleAssignments (default {}) | phase: NEW | severity: med
tag: Eager-render Start-Op modal apparatus checkbox list before open | phase: NEW | severity: med
tag: Preserve role history on apparatus / individual role transitions (keyed log per ID) | phase: 3C.5 | severity: high
tag: guardClick swallowed-first-submit toast feedback | phase: NEW | severity: low
tag: Template ICS-201 form natively in FieldShore for incident-minute-zero ICs | phase: 3C / NEW | severity: med
```

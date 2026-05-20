# `mod-data` Observation Checklist — Data Integrity / Multi-Agency / After-Action

> Reference: MASTER-PLAN Phases 3A (Auth), 3B (Multi-tenancy), 3C.3 (op periods), 3C.4 (apparatus check-in/demob), 3C.5 (role history), 3C.6 (PAR), 3D.1 (ICS forms export); `database.rules.json` validate rules; `app.js` listener + pendingWrites architecture.
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-data-notes.jsonl`.

## Checklist (13 items)

### Item 1 — F1 regression: listener-wipe-local
- **Observe:** F1 in prior interactive-findings: Firebase listener overwrote localStorage with empty arrays on first connect to a new dept. v3.5.2 added a first-fire guard. Verify: at T-25 (after sim dept creation but BEFORE inventory import), check localStorage state via preview_eval; confirm guard fires.
- **Surface:** Settings — Connect to dept; localStorage `fieldshore_inventory` + `fieldshore_apparatus`
- **v4.0.0 Phase:** `none` (v3.5.2 — verify no regression)

### Item 2 — USAR-on-plane local-first survival
- **Observe:** F1 specifically affected USAR task forces setting up the app on the plane (offline) before arriving at scene. Simulate: with sim dept connected, force offline, add an inventory item locally, then come back online. Confirm the item survives the listener fire.
- **Surface:** Settings → Log Out → Re-enter; offline-online cycle
- **v4.0.0 Phase:** 3F / **NEW**

### Item 3 — Per-record agency tag round-trip
- **Observe:** v4.0.0 multi-tenancy (3B.1) adds an `agency` field on inventory + apparatus. Test: import `external-equipment-pool.json` which has `agency` field on every entry. After import, query Firebase directly (preview_eval); does the `agency` field survive, or is it stripped?
- **Surface:** Inventory import + Firebase RTDB inspector
- **v4.0.0 Phase:** 3B.1 (preview — currently almost certainly stripped)

### Item 4 — Agency badge color render
- **Observe:** Once apparatus are tagged with agencies (TF-State Cache, TF-Fed-Alpha Cache, etc.), do apparatus chips render with distinguishable color/badge per agency?
- **Surface:** Operations tab — apparatus chips; Inventory tab — apparatus selector
- **v4.0.0 Phase:** 3B.3 (preview — current app has no per-agency rendering)

### Item 5 — External equipment cross-agency tracking
- **Observe:** External equipment entries have agency fields (local-fd, tf-state, tf-fed-alpha, etc.). Can a participant see "all 6x6 lumber across all agencies" or "all TF-Fed-Alpha external equipment"?
- **Surface:** External Equipment screen
- **v4.0.0 Phase:** 3B (preview — multi-agency view)

### Item 6 — Apparatus demob timestamp survives OP boundary
- **Observe:** When a participant attempts to "demobilize" an apparatus (e.g., TF-State half rotates to rehab at E+23:00), does the app preserve a timestamp + reason, or just remove from the assigned list?
- **Surface:** Operations tab — assigned apparatus → demobilize button (if exists)
- **v4.0.0 Phase:** 3C.4 (apparatus check-in/demob with timestamps)

### Item 7 — Role history on every assignment, reparent, demob
- **Observe:** Track every role mutation (5 cmd transfers, 6 OSC rotations, several reparents). After OP4, can a reader produce a complete chronological history? Or are prior assignments overwritten without trace?
- **Surface:** Command tab; Firebase RTDB at `/operations/{opId}/roles/...`
- **v4.0.0 Phase:** 3C.5 (append-only role history)

### Item 8 — PAR (Personnel Accountability Report) correctness
- **Observe:** Headcount in Command header. Is it counting apparatus (e.g., "21 apparatus") or actual personnel (apparatus × crew size)? At peak (E+25), should be ~440. Currently almost certainly shows just apparatus count.
- **Surface:** Command tab header
- **v4.0.0 Phase:** 3C.6 (personnel + PAR — apparatus.crewSize + apparatus.crew[])

### Item 9 — OP boundary snapshot capture
- **Observe:** At each OP boundary (E+4, E+16, E+28), the runbook says the conductor writes `runtime/firebase-snapshots/snap-E+04h.json`. Verify: does the app itself produce an OP-boundary snapshot, OR is this an external (conductor-only) action?
- **Surface:** Command tab — Op Period transition; Firebase RTDB
- **v4.0.0 Phase:** 3C.3 (operational period snapshots)

### Item 10 — ICS-203 export completeness
- **Observe:** At E+16:00, attempt to export current org assignment list as ICS-203 (if app supports). Does the export include every named ICS leader from current op?
- **Surface:** Settings → Export (or wherever ICS-203 lives, if anywhere)
- **v4.0.0 Phase:** 3D.1 (ICS forms export)

### Item 11 — ICS-211 check-in list with arrival timestamps
- **Observe:** Inventory export currently includes apparatus assignment but not check-in timestamp. ICS-211 requires arrival time. Does the app capture this when an apparatus is first assigned?
- **Surface:** Inventory export + Apparatus chip metadata
- **v4.0.0 Phase:** 3D.1 + 3C.4

### Item 12 — Shore-point timeline export with by/agency attribution
- **Observe:** Each SP status transition should be attributable (who did it, when, from which agency). Export the SP timeline if possible. Does each event have `by` + `agency`?
- **Surface:** Settings → Export → SP timeline (or Archived ops view)
- **v4.0.0 Phase:** 3A.2 + 3B.1 + 3D.1

### Item 13 — Sync-degraded banner + manual retry
- **Observe:** Force network degradation mid-OP3 via preview_eval. Does a "Last synced" banner appear with elapsed time + manual retry option? Per v3.8.1 sync diagnostics, errors should be captured to `/diagnostics/sync/`.
- **Surface:** App header banner; Firebase `/diagnostics/sync/`
- **v4.0.0 Phase:** `none` (v3.8.1 partial — verify behavior)

---

## Calibration anchors

- Inventory validate rule (v3.8.2 fix): `newData.hasChildren(['model', 'quantity', 'available'])`
- Apparatus validate rule: `newData.hasChildren(['name', 'type'])`
- Shore point status enum: `pending | process | strutplaced | cutting | runner | secured | returned`
- Local-first write pattern (v3.5.3): every mutation = in-memory + localStorage + conditional Firebase
- `persistOperation()` and `persistInventory()` are the centralized localStorage saves
- `firebaseSave()` wraps every Firebase write (handles offline queue)
- v3.7.0 Firebase Anonymous Auth shipped — all reads/writes require `auth != null`
- v3.8.1 sync diagnostics — `/diagnostics/sync/` logs

## Firebase inspection commands (preview_eval)

```javascript
// Inspect inventory in Firebase
firebase.database().ref('departments/sim-surfside-ttx-2/inventory').once('value').then(s => console.log(JSON.stringify(s.val(), null, 2)))

// Inspect apparatus
firebase.database().ref('departments/sim-surfside-ttx-2/apparatus').once('value').then(s => console.log(JSON.stringify(s.val(), null, 2)))

// Inspect active operation
firebase.database().ref('departments/sim-surfside-ttx-2/operations').once('value').then(s => console.log(JSON.stringify(s.val(), null, 2)))

// Inspect localStorage state
['fieldshore_inventory', 'fieldshore_apparatus', 'fieldshore_operation', 'fieldshore_pendingWrites'].forEach(k => console.log(k, ':', localStorage.getItem(k)))

// Force offline
firebase.database().goOffline()

// Force online
firebase.database().goOnline()
```

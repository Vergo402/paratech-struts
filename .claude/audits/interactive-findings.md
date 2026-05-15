# Interactive Stress Test Findings — Surfside-Scale Scenario

**Scenario:** 41 shore points across 12-story North/South Tower, 21 assigned apparatus (MDFR + Hialeah + Pembroke Pines + Coral Gables + Fort Lauderdale + FL-TF1 + PA-TF1 + OH-TF1), 12 ICS roles assigned, multi-day operation with multiple statuses in flight.

**Test methodology:** Injected scenario data into localStorage, drove the app via JS-injected calls against running functions, captured behavior + performance + functional issues.

---

## CRITICAL findings

### F1 — Firebase listener overwrites local data with empty arrays (HIGH priority data-loss risk)
**Symptom:** On first connection to a new (empty) Firebase department, the apparatus and inventory listeners fire with empty data and overwrite localStorage. Any local-only data is silently lost.
**Reproduced by:** Setting `fieldstruts_deptId` to a new dept ID, putting apparatus/inventory in localStorage, then loading the app. After `setupListeners()` runs, localStorage contains empty arrays.
**Code:** `app.js` line ~1038 (`apparatusRef.on('value')`) and ~995 (`inventoryRef.on('value')`) — both unconditionally call `safeSetItem` with `data || {}` results.
**Impact:** If a department first uses the app offline (puts in apparatus + inventory locally), then later connects to a new Firebase department for the first time, they lose all their offline work. This affects USAR task forces that may set up the app on the plane before they have department credentials.

### F2 — Section-button actions silently fail in collapsed state
**Symptom:** In v3.4.1, the four operation header sections (Assigned Apparatus, External Equipment, Individuals, My Role) start collapsed. The action buttons inside those section headers ("Assign", "+ Add", "Change") render their UI INTO the collapsed section. User taps the button, nothing visible happens — content is rendered behind a closed `display: none` div.
**Reproduced by:** With sections collapsed (default), call `showAssignApparatus()` → `assignedApparatusList.innerHTML.length === 6388` (lots of content) but `getComputedStyle(sectionApparatus).display === 'none'` (hidden).
**Code:** `app.js` line ~1736 (`showAssignApparatus`) writes to `#assignedApparatusList`. Same pattern for external and individuals. The action functions need to auto-expand their parent section.
**Impact:** This is a complete dead-end UX. A new user clicks "Assign" and nothing happens — they think the button is broken. **Confirmed via reproduction.**

### F3 — Status transitions don't update UI when online (queued writes don't reflect locally)
**Symptom:** Calling `updateShoreStatus(spId, 'cutting')` when `db` is set but the network is down (or `goOffline()` has been called) queues the write to `pendingWrites` but never updates `activeOperation.shorePoints[i].status`. The card still shows the old status until reconnect.
**Reproduced by:** Called `db.goOffline()` then `updateShoreStatus('sp-1', 'cutting')` — status stayed `strutplaced`.
**Code:** `app.js` line ~3351-3355. The `if (db && deptId && opId)` branch ONLY writes to Firebase. The `else` branch updates memory. There's no path that does both — and there should be, because the Firebase listener won't fire while offline.
**Impact:** During a real incident with spotty WiFi/cellular, every button press appears to do nothing. Operations Section Chief and Rescue Captain both flagged this as catastrophic in the prior audit. **Confirmed via reproduction.**

---

## HIGH findings

### F4 — Render cost scales linearly with shore point count, no virtualization
**Observed:** At 41 SPs, `renderOperations` takes ~5.6ms, Command view 1.3ms, Cut Table 0.7ms. Acceptable.
**Concern:** Surfside actually had hundreds of shore points over the 28-day operation. Linear render at 200+ SPs starts approaching 30ms+ which is noticeable on older devices.
**Code:** `renderOperations` and `renderCommandLayout` both iterate over `getShorePoints()` and `Object.entries(groups)`. No memoization or windowing.

### F5 — Default org chart only has 9 roles, but Surfside-scale needs much more
**Observed:** With 21 apparatus assigned, only 9 default org roles exist. Custom role creation works (we added 8 in the span-warning test) but the default tree (IC → Safety, Operations → Entry, Rescue, Shoring, Runner, Cutting, Wood) is undersized for a 5-task-force operation.
**Suggestion:** A "Type II/III collapse" preset or pre-built USAR org template (with Search Group, Heavy Rigging Group, Medical Group, Logistics Group, etc.) would let an IC stand up the structure in seconds.

### F6 — No way to indicate apparatus has DEMOBILIZED
**Observed:** During a multi-day operation, apparatus rotate out (shift changes, demob). The `assignedApparatus` array is binary (assigned or not). Removing an apparatus from the array loses the historical record that they were ever there.
**Impact:** ICS after-action reports require accurate timeline of every unit on scene. Currently no way to mark an apparatus as "checked out at 1430" while preserving the history.

### F7 — Drilldown stops at Area level with no SP cards shown directly
**Observed:** Drilling Building > Division (Floor) > Area shows the shore point cards. Drilling continues to Group level if data exists. But the Group drilldown is now apparatus-name-resolved (good after v3.5.0), which means crews looking at "Rescue 1's shore points" navigate correctly.
**Concern:** When the user lands on a card list (after 3-4 drilldown levels), there's no way to filter further by status. With 41 SPs at Surfside-scale, even Floor 5 / Quadrant C has 3 cards in different statuses. No quick "show only Pending" filter.

---

## MEDIUM findings

### F8 — Span of control warning works, but threshold may be wrong
**Observed:** Added 8 children under Operations → ⚠ badge appeared correctly.
**Suggestion:** NIMS optimal is 5, max 7. A "yellow" warning at >5 and "red" at >7 would match NIMS doctrine more precisely.

### F9 — No visual indicator of "shift change due" or operational period boundary
**Observed:** The operation runs continuously with no concept of operational periods (12-hour cycles in USAR). Crews coming on duty have no clear visual on what's been done in the prior period.
**Impact:** ICS-205 (Incident Radio Communications Plan) and ICS-203 (Organization Assignment List) tied to operational periods. The app currently treats the whole operation as one continuous period.

### F10 — Headcount counts apparatus + individuals, not actual personnel
**Observed:** "12/25 resources assigned" — that's APPARATUS to roles, not BODIES on scene. Each apparatus carries 2-6 personnel. A real headcount needs personnel count per apparatus.
**Impact:** Accountability is a NIMS Safety priority. PAR (Personnel Accountability Report) needs actual numbers.

---

## OBSERVATIONS / OK behavior

- ✅ Drilldown breadcrumbs work correctly with the new Group-as-apparatus dropdown (v3.5.0)
- ✅ Plate picker scroll fix (v3.5.1) verified — `touch-action: pan-y` + `translateZ(0)` applied
- ✅ Reparenting role hierarchy works (Entry → Rescue under IC permission)
- ✅ Reparent undo state captured correctly, toast shows
- ✅ Theme switching is instant (system / light / dark)
- ✅ Cut Table view renders quickly (0.7ms at 7 active cards)
- ✅ Status pills render correctly across all 7 status types

---

## Performance baseline @ 41 SPs

| View | Render time | DOM nodes |
|------|-------------|-----------|
| Operations | 5.6 ms | 868 |
| Command | 1.3 ms | ~600 |
| Cut Table | 0.7 ms | 83 |
| Drilldown (Building → Floor → Area) | <1 ms each | ~50 per level |

## Data shape verification

- 41 shore points, distributed across all 7 statuses
- 21 apparatus assigned (out of 25 in inventory)
- 12 ICS roles assigned (default 9 roles + adjustments)
- 2 buildings (North Tower 24, South Tower 17)
- 2 grouped shore points (Double T-post pair) — group advancement was tested

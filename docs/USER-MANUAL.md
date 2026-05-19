# FieldShore User Manual

**Version:** 3.15  
**Last updated:** 2026-05-19  
**App:** [https://vergo402.github.io/paratech-struts/](https://vergo402.github.io/paratech-struts/)

FieldShore is a progressive web app for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure. It works offline on any mobile device.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Quick Find](#2-quick-find)
3. [Operations](#3-operations)
4. [Shore Points](#4-shore-points)
5. [Command](#5-command)
6. [Cut Table](#6-cut-table)
7. [Inventory](#7-inventory)
8. [Settings](#8-settings)
9. [Safety & Updates](#9-safety--updates)
10. [Offline Use](#10-offline-use)
11. [Version History](#11-version-history)

---

## 1. Getting Started

### Installing the App

FieldShore is a Progressive Web App (PWA). No app store required.

1. Open [https://vergo402.github.io/paratech-struts/](https://vergo402.github.io/paratech-struts/) on your phone or tablet.
2. **iOS:** Tap the Share button → "Add to Home Screen."
3. **Android:** Tap the browser menu → "Add to Home Screen" or accept the install prompt.
4. The app icon appears on your home screen and launches fullscreen.

### Connecting Your Department

On first launch, you'll see the login screen asking for a **Department ID**.

- Enter your department's shared ID (e.g., `engine42`, `hfd217`). No password needed.
- This ID connects your device to shared inventory and operations via Firebase.
- All devices using the same Department ID see the same data in real time.
- You can change departments later from **Settings → Log Out**.

If you don't have a Department ID yet, enter any short identifier. Share the same ID with your crew so everyone syncs.

### Using FieldShore on Desktop

FieldShore is mobile-first, but it adapts to laptops and command-post screens. When the browser window is **1024px wide or wider** (most laptops and desktop monitors, plus iPad in landscape), the app switches into **desktop view**:

- **Top nav bar.** The five tabs (Quick Find, Operations, Command, Inventory, Settings) move from the bottom of the screen to a horizontal bar at the top.
- **Wider canvas.** The app expands to 1200px wide instead of the phone-width 600px column.
- **Split Command tab.** Your roster (Apparatus, External Equipment, Individuals, My Role, Hazards) stays pinned on the left while the Dashboard, ICS Organization (org chart), and Layout fill the right pane. The op title bar spans across the top.
- **Split Operations tab.** A drilldown sidebar on the left shows your Buildings → Divisions → Areas as a clickable tree, with live status counts on each node (e.g., a yellow `3` next to a division means 3 shore points are currently at Strut Placed). A search box above the tree filters shore points by label, building, division, or area in real time. The right column shows the filtered shore points, with the **+ Shore Point** button centered above the status groups. Mobile uses the inline breadcrumb instead.

**Switching to mobile view on a desktop.** A small toggle button sits in the upper-right corner of the viewport. Click it to flip the app back to the familiar phone layout (centered narrow column, bottom nav). The toggle icon swaps between a phone glyph and a monitor glyph depending on the current mode. Your choice is remembered — the next time you load FieldShore on the same browser, it opens in the layout you last chose.

Phones and iPad in portrait orientation always use the mobile layout — the toggle button is hidden because there's nothing to switch to.

---

## 2. Quick Find

The **Quick Find** tab is the fastest way to find which Paratech struts fit a given measurement.

### How to Use

1. Enter the **Opening Measurement** in feet, inches, and fraction (down to 1/16").
2. Optionally enter an **Estimated Load** in pounds.
3. Select which strut systems you have available: **Gold** (LongShore), **Grey** (AcmeThread), and/or **LockStroke**. If none are selected, all types are shown.
4. Tap **Find Struts**.

### Results

The app returns all strut and extension combinations that fit the measurement, ranked by safety factor. Each result card shows:

- Strut model name and system (Gold/Grey/LockStroke)
- Extension (if needed) and combined length range
- Load capacity at 4:1 safety factor
- Whether the combination is within safe working limits for the entered load

### Deductions

Toggle **Include Deductions** to account for header wood, footer wood, and connector plates in the measurement:

- **Header/Footer:** None, 4x4 (3.5"), or 6x6 (5.5")
- **Top/Bottom Plates:** Select from 14 Paratech connector types, each with a specific height deduction

The app subtracts these from your opening measurement before searching for struts, so the results reflect actual strut length needed.

### Inventory Quick View

Tap the **cube icon** (bottom-right floating button) anytime to see your current available inventory without leaving the screen.

---

## 3. Operations

The **Operations** tab is focused on the shore-point workflow — adding shore points and moving them through the status sequence. Apparatus, personnel, and org chart are on the **Command** tab (see Section 5).

### Starting an Operation

1. Tap **Start New Operation**.
2. Enter an **Operation Name** (e.g., "123 Main St Collapse").
3. Optionally enter a **Task Force** name.
4. Check **Multi-Building** if the operation spans more than one structure.
5. Select which **apparatus** to assign (all are checked by default).
6. Tap **Start Operation**.

### Ending an Operation

Tap **End**. A confirmation sheet opens. Type **END** (all caps) and tap the now-unlocked End Operation button. This two-step gate prevents accidental end-of-op from a stray tap — especially with gloves on.

The operation moves to the **Archived Operations** list at the bottom of the tab, where you can view or delete it. The app automatically backs up the operation before ending it.

---

## 4. Shore Points

Shore points are the core of an operation — each one represents a location that needs shoring.

### Adding a Shore Point

1. Tap **+ Shore Point**.
2. Enter a **Label** (e.g., "SP-1", "Kitchen Wall").
3. If multi-building is enabled, enter a **Building** name.
4. Pick the **Division** from the numbered dropdown — see [Numbered Divisions](#numbered-divisions) below. Enter the **Area** (specific location).
5. Select the **Group** (which apparatus is responsible).
6. Choose a **Shore Type:**
   - **Vertical T-Shore** — Single strut with header and footer
   - **Double-T Vertical Shore** — Two struts with shared header
   - **3-Post Vertical Shore** — Three struts with 6x6 header and footer
7. Enter the **Opening Measurement** and optional **Load**.
8. Set **Quantity** (1-4 struts).
9. Tap **Find & Deploy** to search inventory and deploy matching equipment.

### Shore Point Lifecycle

Each shore point progresses through six statuses:

| Status | Meaning |
|--------|---------|
| **Pending** | No equipment available — saved for later |
| **In Process** | Equipment deployed, work starting |
| **Strut Placed** | Strut is in position |
| **Cutting** | At the cut table for final sizing |
| **Runner** | Being transported to location |
| **Secured** | In place and operational |
| **Removed & Returned** | Shore deconstructed, equipment returned to inventory |

Use the status buttons on each shore point card to advance or send back through the workflow. Locked-card actions are role-gated: only **Cutting** can mark a cut complete or send to the runner; only **Runner** can mark the shore secured; only **Entry / Rescue / Initial Shoring** can remove and return equipment. **IC** and **Safety** can override any gate. If your role doesn't match the action, the button shows greyed with a tooltip explaining what's required — switch your role in My Role (Command tab) or have a teammate with the right role advance it.

When the strut finder offers a configuration in the LongShore unrated zone (>16 ft), the deploy button shows a final confirmation modal — Cancel or "I Acknowledge — Deploy" — before the shore point is created. The acknowledgement, including who tapped it and when, is recorded on the shore point for after-action review.

### Pending Shore Points

When no matching equipment is available, shore points are saved as **Pending** with a purple status badge. The app monitors inventory and shows a green "Equipment now available!" indicator when a match appears (e.g., after equipment is returned or external equipment is added).

Tap **Assign Equipment** on a pending card to open the strut picker pre-filled with that shore point's measurement, load, and deductions. The finder runs automatically against the current operation inventory; pick a strut to deploy. The pending card transitions to **In Process** and inventory decrements — the shore point keeps its label and location.

### Grouped Shore Points

Shore types with quantity > 1 (e.g., a 3-strut T-shore) create grouped shore points. Early status transitions (In Process → Strut Placed → Cutting) advance all members together, since the physical shore system is set up as a unit. Once in the cutting workflow, each card tracks independently — wood is cut, sent to the runner, secured, and returned one piece at a time.

### Drill-Down Navigation

Shore points are organized by hierarchy: **Building > Division > Area > Group**. Tap into each level to filter, with breadcrumb navigation and a back button at each step.

### Numbered Divisions

As of v3.15, division is a numbered dropdown instead of a free-text field. This keeps your shore-point labels consistent across the whole crew and removes radio ambiguity ("Bsmt" vs "Basement" vs "B-Level" → all the same).

**Reading the picker.** The dropdown reads top-to-bottom matching the building cross-section:

- **Div 3 (+2 floors up)**, **Div 2 (+1 floor up)** — higher floors at the top
- **Div 1 (Ground level)** — anchor row, always present
- **Sub Div 1 (Basement)**, **Sub Div 2 (+1 below)** — basement and sub-basements at the bottom

**Adding floors.** Use the two buttons below the dropdown:

- **+ Floor Above** — adds the next Division (Div 2, then Div 3, etc.)
- **+ Sub Div Below** — adds the next Sub Division (Sub Div 1 = Basement, then Sub Div 2, etc.)

There is no manual text entry. The list is shared across the operation — every shore point on the same op picks from the same set.

**Upgrading from older operations.** If your operation was created on v3.14 or earlier, the app automatically converts existing division labels:

- Numeric labels (`'1'`, `'2'`) become Div 1, Div 2, etc.
- `'Ground'`, `'G'` becomes Div 1.
- `'Basement'` becomes Sub Div 1.
- Anything else (`'A'`, `'Alpha'`, `'Mezzanine B'`) is preserved as a legacy label on each shore point.

When legacy labels are present, an orange banner appears above the shore-point list with a **Show legacy SPs** button. Open each of those shore points and re-pick a numbered division — saving clears the legacy label.

The renumber prompt only appears when the operation has been quiet for 30+ minutes; it never interrupts an active incident.

---

## 5. Command

The **Command** tab is the Incident Commander's dedicated screen. It holds everything needed to manage the command structure — apparatus, personnel, the org chart, dashboard stats, and the hazard log.

A runner working shore-point status works in the **Operations** tab. The IC reviewing staffing and hazards works here. Each role gets a focused surface.

### What's on the Command Tab

- **Assigned Apparatus** — Which apparatus are part of this operation. Tap **Assign** to add/remove, or **Group** to organize apparatus into named groups.
- **External Equipment** — Equipment borrowed from other departments or agencies. Tap **+ Add** to log external struts by department name, apparatus, and model.
- **Individuals** — Named personnel assigned to the operation. Tap **+ Add** to enter a name.
- **My Role** — Set your device's ICS role. This determines which view your device defaults to.
- **ICS Organization** — The full org chart (see below).
- **Hazard Log** — Log and track scene hazards (see below).

### ICS Organization Chart

#### Default Roles

The default ICS hierarchy is:

```
Incident Commander (IC)
├── Safety Officer
└── Operations
    ├── Entry
    ├── Rescue
    ├── Initial Shoring
    ├── Runner
    ├── Cutting Table
    └── Wood Shoring
```

#### Assigning Roles

- Tap any node to open the role management modal.
- Assign available apparatus or individuals to a role.
- Each role shows who's assigned and their status.

#### Status Indicators

Filled roles display a status dot:

- **Green (circle)** — Active: role has assignees AND at least one shore point is in progress under this role's area.
- **Amber (square)** — Staged: role has assignees but no active shore points (crew assigned, waiting).
- A **legend** below the org chart header explains the dot meanings.

#### Headcount Badge

The header shows a resource count (e.g., "3/5 resources assigned") so you can see staffing at a glance.

#### Span of Control

Two warning tiers, per NIMS guidelines (optimal span of control is 3–7):

- **Yellow ⚠** — Approaching limit: 6–7 direct reports. Keep an eye on it.
- **Red ⚠** — Exceeded: more than 7 direct reports. Split this branch.

#### Custom Roles

- Tap any node → **Sub-Role** to add a child role underneath it.
- Tap any node → **Rename** to change its display name.
- Custom roles can be **removed** (along with any sub-roles) via the node modal.

#### Reparenting Roles

Restructure the org chart hierarchy (not just swap personnel):

- **Long-press drag (mobile):** Hold a role for 500ms. An orange highlight and haptic feedback confirm reparent mode. Drag to the new parent and drop.
- **"Move to..." menu (all devices):** Tap a role → **Move to...** → select the new parent from the list → confirm.

After reparenting, a toast notification appears with an **Undo** link.

**Locked roles:** Incident Commander and Safety Officer cannot be moved. IC is always the root; Safety always reports directly to IC (NIMS requirement).

**Access control:** Only devices assigned the IC or Safety role can reparent.

#### Swapping Roles

A short drag (not a long-press) between two roles swaps their personnel assignments, not the hierarchy. This is useful for crew rotations.

### My Role

Set your device's ICS role from the **My Role** section. Your role controls your default view on launch:

- **IC / Safety** → Command tab
- **Operations roles** → Operations tab
- **Cutting Table** → Cut Table view

### Hazard Log

The **Hazard Log** section lets you document scene hazards during the operation. It supports your Incident Action Plan and post-incident review. It is not a substitute for radio communication — critical hazards still need to go over the air to all crews.

#### Logging a Hazard

1. Tap **+ Add Hazard** in the Hazard Log section.
2. Select a **Type:** Structural Instability, Utility, Atmospheric, Fall, or Other.
3. Enter a **Location** — describe it in plain words (e.g., "North wall, second floor").
4. Set **Severity:** Low, Medium, or High.
5. Add any **Notes** (optional).
6. Tap **Save**. The hazard is recorded with your name and the time.

Open hazards appear at the top of the list, sorted high-to-low severity.

#### Mitigating a Hazard

Tap **Mitigate** on a hazard card when the condition is controlled. The log records who mitigated it and when. Tap **Reopen** if the hazard returns.

Hazards stay with the operation record. They appear in the archived op after end-of-op.

---

## 6. Cut Table

The **Cut Table** sub-tab is a focused view for the cutting station. It shows all shore points currently in the **Cutting** status with their required measurements, making it easy to see what needs to be cut without scrolling through the full operations list.

Each shore point card has its own **Mark Cut Complete** button — even within a group, each piece of lumber is tracked individually. Once marked, the card moves to the **Cut Complete** section where it can be sent to the runner independently.

---

## 7. Inventory

The **Inventory** tab manages your department's strut, extension, and connector plate inventory across apparatus.

### Adding Apparatus

1. Go to **Inventory** → tap **+ Apparatus** (or go to Settings).
2. Enter a name (e.g., "Engine 42") and select a type (Chief, Engine, Ladder, Rescue, Squad, Task Force, Other).
3. Tap **Add**.

### Adding Equipment

For each apparatus:

1. Tap the apparatus name to expand it.
2. Tap **+ Add** to open the equipment modal.
3. Use **Quick Add** for fast entry — a visual grid of all Paratech strut models, extensions, and connector plates. Quantity badges show how many you've already added.
4. Or use **Manual Add** to enter a custom item.

### Editing Quantities

- Use the **+** and **-** buttons on each inventory item to adjust quantities.
- Items with deployed equipment cannot be reduced below the deployed count.

### Excel Import/Export

- **Export:** Tap the export button to download your full inventory as an Excel (.xlsx) file.
- **Import:** Tap the import button to upload an Excel file. The app reads the columns and merges with existing inventory. An ID column preserves item references across round-trips.

### Custom Apparatus Types

Departments can customize the apparatus type list from **Settings → Apparatus Types**:

- Add new types (e.g., Hazmat, Brush, Medic)
- Rename existing types
- Reorder with arrow buttons
- Remove unused types (blocked if apparatus still use the type)

---

## 8. Settings

The **Settings** tab includes:

- **Department Name** — Display name for your department.
- **Department ID** — Your current connection ID. Tap **Log Out** to disconnect and enter a different ID.
- **Appearance** — Choose System (follows your device), Light, or Dark theme.
- **Apparatus Types** — Customize the apparatus type list for your department.
- **Check for Updates** — Manually tells the app to look for a new version right now. Useful if dispatch announces a hotfix and you don't want to wait. The app normally checks every 5 minutes in the background, so this is rarely needed.
- **Feedback** — Submit bug reports or feature requests.
- **Data Management** — Options for managing local and synced data.

---

## 9. Safety & Updates

### Ending an Operation — Confirmation Gate

Ending an operation requires you to type **END** before the button unlocks. This prevents an accidental end-of-op from a stray tap when you're reaching for something else on the screen — a real risk with gloves on.

The app still creates an automatic backup of the operation before ending it. The type-gate is an extra layer at the tap, not the recovery net.

### Force Update

If a critical fix ships, a non-dismissible **"Update Required"** screen appears when you launch the app. There is one button: **Reload Now**.

- Tap it. The update takes about 3 seconds.
- Your local data — inventory, settings, any active operation — is preserved across the reload.
- You cannot use the app until the update is applied.

This screen only appears when an administrator has flagged a version as no longer safe to run. It is not a routine update prompt.

### Routine Updates

For normal updates, see Section 10 (Offline Use / Updating the App).

---

## 10. Offline Use

FieldShore is designed for field use where connectivity is unreliable.

- The app caches all assets locally and works fully offline after the first load.
- All data changes save to your device first, then sync to your team when a connection is available.
- If you lose connection mid-operation, keep working normally. Changes queue up and sync automatically when connectivity returns.
- The offline banner shows exactly how many changes are waiting to sync (e.g., "Offline — 5 changes queued, will sync when reconnected"). This tells you your data is safe even without a connection.

### Updating the App

When a new version is available, the app downloads it in the background. To activate the update:

- **Close and reopen** the app, or
- **Refresh twice** — the first refresh downloads the new version, the second activates it.

To check immediately, go to **Settings → Check for Updates**.

---

## 11. Version History

Major and minor releases only. Patch releases (bug fixes) are omitted.

| Version | Date | Highlights |
|---------|------|------------|
| **v3.15** | 2026-05-19 | Numbered divisions with vertical anchoring. Division is now a top-to-bottom picker — Div 3 / Div 2 / Div 1 (Ground) / Sub Div 1 (Basement) — with **+ Floor Above** and **+ Sub Div Below** buttons. No manual text entry; the division list is shared across the operation so labels stay consistent. Existing operations migrate automatically (numeric and 'Ground'/'Basement' labels convert in place; anything else is preserved as a legacy label with a non-blocking review banner). Offline inventory hardening: deploys and returns made while offline now reconcile correctly with Firebase on reconnect via a per-item touched-set flush-pass (closes the v3.8.2 architectural root cause). Concurrent-deploy race guard — when another device takes the last unit, the second device sees "Another user took the last X — try again" and the orphaned shore-point write is rejected. |
| **v3.14** | 2026-05-18 | Operations tab on desktop now splits into two columns. Left sidebar (sticky) shows a drilldown tree of Buildings → Divisions → Areas with live status counts on each node, and a search input above the tree filters by label / building / division / area. Right column shows the filtered shore points with the **+ Shore Point** button centered above the status groups. Mobile is unchanged (inline breadcrumb stays). |
| **v3.13** | 2026-05-18 | Desktop view. On screens 1024px wide and up the app now uses a horizontal top nav bar and widens the container to 1200px. The Command tab splits into two columns on desktop — roster (Apparatus, External, Individuals, My Role, Hazards) on the left (sticky), Dashboard / ICS Organization / Layout on the right. A small toggle in the upper-right of the viewport flips between desktop view and mobile view; the choice is remembered. Phones and iPad portrait are unchanged. |
| **v3.12** | 2026-05-18 | Command tab promoted to top-level navigation (apparatus, individuals, org chart, hazard log separated from shore-point workflow). Hazard Log (ICS-208 style) with severity tiers, mitigate/reopen, and archived op persistence. End Operation now requires typing "END" to confirm (glove-safe gate). Force-update overlay for critical fixes (data preserved). Yellow span-of-control warning tier at 6–7 direct reports. Offline banner shows queued write count. Settings → Check for Updates button. |
| **v3.11** | 2026-05-17 | Field-feedback round-up. Quick Find plate picker selection fixed (tap on a connector now actually selects it). Header scrolls away with content instead of locking real estate at the top. Edit Apparatus modal no longer shows the Add form simultaneously. Quick-add inventory list preserves scroll position when adding items near the bottom. Pending shore-point length edits now keep effective length in sync when deductions are toggled off, with success toast. Comprehensive dark-mode contrast pass — buttons, plate pickers, apparatus tabs, qty controls, and small action buttons are all theme-aware (no more black-on-dark text). |
| **v3.10** | 2026-05-16 | LongShore unrated-zone deploys now require an explicit acknowledgement modal (audit trail captures who/when). Pending shore points have a real "Assign Equipment" deploy flow. Locked-card status buttons are role-gated (Cutting / Runner / Entry-Rescue-Shoring, with IC / Safety override). Excel imports warn before orphaning deployed equipment references. Persistent banner on auth-failure / sync degradation with manual retry. SheetJS bundled into the service worker for offline import/export. Fully-extended boundary warning on strut results. |
| **v3.9** | 2026-05-16 | Group status guard — sending one shore point back through the workflow no longer drags advanced group-mates with it. Excel imports support extensions and connector plates (not just struts). Firebase scripts pinned with Subresource Integrity. Stored XSS hardening on shore point card rendering. |
| **v3.8** | 2026-05-16 | Individual wood cut tracking per shore point card (grouped points no longer share cut/runner/secured lifecycle). Inventory tab updates immediately after deploying or returning equipment. Sync diagnostics for offline write queue troubleshooting. |
| **v3.7** | 2026-05-15 | Firebase Anonymous Auth + security rules. Photo attachment in feedback form. Status dot key/legend on ICS org chart. Liability disclaimer (removed). Clearer empty state when inventory lacks a fitting strut. Conservative-floor interpolation for load capacity. |
| **v3.6** | 2026-05-15 | Firebase listener cleanup (no more leak on department switch). Concurrent edit safety for org chart swaps. Keyboard accessibility for all interactive elements. Performance optimization for apparatus name lookups. |
| **v3.5** | 2026-05-14 | Dark/light/system theme toggle. Shore point Group field changed to apparatus dropdown. Local-first write architecture across all mutation sites. |
| **v3.4** | 2026-05-14 | Command page overhaul: role reparenting (long-press drag + "Move to..." menu), collapsible branches, status indicators (active/staged), headcount badge, span-of-control warnings. |
| **v3.3** | 2026-05-14 | 6-pass production-readiness audit. App renamed from "Paratech Strut Selector" to FieldStruts. Extension rule fixes, error handling improvements, safety checks in selection algorithm. |
| **v3.2** | 2026-05-11 | Customizable apparatus types (add, rename, reorder, remove) from Settings. |
| **v3.1** | 2026-05-11 | Dynamic ICS org chart: custom sub-roles, rename roles, remove roles, tree-based rendering at any depth. |
| **v3.0** | 2026-05-11 | Drag-and-drop ICS org chart repositioning (tap-to-swap, desktop drag, touch drag). |
| **v2.4** | 2026-05-11 | Apparatus type hierarchy (Chief through Other). Apparatus groups for combining units during operations. |
| **v2.3** | 2026-05-11 | NIMS/ICS terminology update ("Team" to "Group"). Collapsible operation sections. Quick Find defaults to no system preselected. |
| **v2.2** | 2026-05-11 | Interactive ICS org chart (tap any node to assign). Grouped shore points advance together. |
| **v2.1** | 2026-05-11 | Cut measurement persistence. Actual vs. expected cut display. Label clarity improvements. |
| **v2.0** | 2026-05-11 | Production hardening: Firebase error handling with offline write queue, XSS protection, safe localStorage writes. |
| **v1.11** | 2026-05-10 | Pending shore points (save when no equipment available, auto-detect availability). ICS/NIMS hierarchy chart. |
| **v1.10** | 2026-05-10 | Individual personnel tracking with ICS role assignment. |
| **v1.9** | 2026-05-10 | External equipment editing after creation. Quick Add grid for external equipment. Drill-down stops at Area level. |
| **v1.8** | 2026-05-10 | 6-status shore point workflow (In Process through Removed & Returned). |
| **v1.7** | 2026-05-10 | ICS drill-down navigation (Building > Division > Floor > Team). 3-tier view system (Operations, Command, Cut Table). |
| **v1.4** | 2026-05-08 | Live inventory count badges on Quick Add. |
| **v1.1** | 2026-05-07 | Department login screen. Multi-strut deploy (1x-4x per shore point). |
| **v1.0** | 2026-05-07 | First release. Quick Select, apparatus management, inventory tracking, live operations. |

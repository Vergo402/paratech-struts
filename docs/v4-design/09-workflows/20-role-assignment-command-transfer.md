# Workflow: Role assignment & command transfer

> Phase G workflow spec — [#225](https://github.com/Vergo402/paratech-struts/issues/225). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) (SitStat — My Role, the resource roster, command transfer as a full-screen takeover); [`31-org-chart.md`](../08-information-architecture/31-org-chart.md) (the NIMS two-Group default, node assignment sheet, reparent, role history, span-of-control); [`sheet.md`](../03-primitives/sheet.md) (role-assignment + assign/clear sheets); [`modal.md`](../03-primitives/modal.md) (destructive removal of a populated position); [`badge.md`](../03-primitives/badge.md) (span-of-control indicator); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md) (two functional Groups; titles spelled out; `assignedResource`); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md) (assignment = sheet; command transfer = full-screen takeover; destructive removal = modal); [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (device back-office roles are orthogonal to ICS positions — the fireground stays ICS-position-gated).
> **Precondition:** an active operation exists (workflow [#219](10-starting-an-operation.md)). The founding device holds Incident Commander by default until command is explicitly assigned or transferred.

---

## Purpose and goal

Put the right people in the right ICS positions, and move command cleanly when it changes hands.

**Goal:** two related verbs on the Command surface —
1. **Role assignment** — a device claims its own ICS position (**My Role**), and the IC assigns
   apparatus / individuals to positions on the org chart.
2. **Command transfer** — the standing IC hands the Incident Commander position to another, a full-screen
   takeover that writes a role-history event.

Both feed the same org structure; both are audited. **This is the one place the gold accent marks who is
in command** ([`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md)).

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Any authenticated device** | Phone (floor) or tablet | Picks its own position via **My Role** |
| **Incident Commander** | Phone or tablet (CP) | Assigns resources to positions; restructures the org chart; initiates command transfer |
| **Incoming Incident Commander** | Phone or tablet | Accepts the command transfer |
| **Operations Section Chief / Group Supervisors** | — | Read-access to the org chart; cannot restructure |

**Two orthogonal axes** (ADR-017): a device's **back-office role** (Admin / Default / custom) governs
settings and administration; the **ICS position** governs fireground command. This workflow is entirely
about the ICS-position axis. Spelled-out NIMS titles per ADR-008 — never "IC," "Ops," "SO."

**Role gates:**
- **My Role** — any authenticated device may set its own position.
- **Assign resources / restructure / reparent / rename / add sub-role** — **Incident Commander only**.
- **Command transfer** — **Incident Commander only** initiates; the named incoming IC accepts.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> CommandSurface

    CommandSurface --> MyRoleSheet : any device · tap My Role → sheet
    MyRoleSheet --> CommandSurface : device · pick position / clear → sheet (commit; reversible)

    CommandSurface --> NodeSheet : IC · tap an org-chart node → sheet
    NodeSheet --> CommandSurface : IC · assign / clear resource → sheet (commit; reversible)
    NodeSheet --> RemovePositionModal : IC · tap Remove position → button (only if populated)
    RemovePositionModal --> NodeSheet : IC · tap Cancel → modal
    RemovePositionModal --> CommandSurface : IC · tap Remove → modal (destructive confirm)

    CommandSurface --> TransferTakeover : IC · tap Transfer Command → full-screen takeover
    TransferTakeover --> CommandSurface : IC · cancel → takeover (no change)
    TransferTakeover --> PendingAccept : IC · select incoming IC + confirm → takeover (writes role-history)
    PendingAccept --> CommandSurface : incoming IC · accept on their device → command moves (gold accent follows)

    CommandSurface --> RoleHistory : any read-access · tap role history → list (one tap, new in v4)
    RoleHistory --> CommandSurface : dismiss → list
```

Two sub-arcs share the Command surface — **role assignment** (My Role + node assignment + reparent) and
**command transfer**. Role assignment commits are **reversible** (re-pick, clear).
Command transfer commits a **role-history event** that cannot be un-written (the audit trail is
append-only) — but command can always be transferred again.

---

## Step-by-step

### Step 1 — Set My Role (any device)

```
┌─────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  ← drag handle
│  My Role                            │
│  ─────────────────────────────────  │
│  ○ Incident Commander               │
│  ○ Safety Officer                   │
│  ○ Operations Section Chief         │
│  ● Rescue Group Supervisor          │  ← this device's current pick
│  ○ Shoring Group Supervisor         │
│  ○ Staging Area Manager             │
│  ○ Runner                           │
│  ─────────────────────────────────  │
│  [ Clear my role ]                  │
└─────────────────────────────────────┘
```

A picker **sheet** (cites [`sheet.md`](../03-primitives/sheet.md)) — faithful to v3 `openMyRoleModal`,
re-homed to a sheet per ADR-016. The device picks the position it is staffing; the pick commits
immediately and is reversible (re-open and re-pick, or **Clear my role**). Setting My Role is what gates
the fireground actions in the operation workflows (#221–#224) on that device.

No confirm — this is a reversible setting (Principle 6).

---

### Step 2 — Assign a resource to a position (IC; org-chart node)

```
┌─────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Shoring Group Supervisor           │  ← the tapped node
│  ─────────────────────────────────  │
│  Assigned: — (unfilled)             │
│  ┌─────────────────────────────┐    │
│  │ Assign apparatus / individual│   │  ← opens the resource roster
│  └─────────────────────────────┘    │
│  Role history ›                     │  ← one tap (new in v4)
│  ⚠ Span of control: 6 reports       │  ← badge, informational, never a block
│  [ Remove position ]                │  ← only if populated → destructive modal
└─────────────────────────────────────┘
```

Tapping an org-chart node opens its assignment **sheet** (cites
[`31-org-chart.md`](../08-information-architecture/31-org-chart.md) §Node interactions). The IC assigns an
apparatus or individual from the **resource roster** (the assigned-apparatus / external / individuals
lists that populate org-chart positions; add flows are themselves sheets). Clearing an assignment is
reversible, no confirm.

The **span-of-control** indicator is a [`badge.md`](../03-primitives/badge.md) — caution at 6–7 direct
reports, over at >7. It is **informational, never a block** (Principle 10) — the IC may exceed it.

**Removing a populated command position** is the one destructive path: it raises a confirm
[`modal.md`](../03-primitives/modal.md) (Step 2-R). Clearing an *assignment* (leaving the position in the
structure) does not.

The default structure is the **NIMS two-Group** (ADR-008): Incident Commander + Safety Officer +
Operations Section Chief → Rescue Group Supervisor + Shoring Group Supervisor + Staging Area Manager +
Cutting Station (a workstation, not an org box). Search / Medical Group Supervisors are add-ons at
Level III+. Entry / Initial Shoring / Wood Shoring / Runner are tasks/resources beneath their Group, not
org boxes.

---

### Step 2-R — Remove a populated position (destructive)

```
┌─────────────────────────────────────┐
│  Remove Shoring Group Supervisor?   │
│─────────────────────────────────────│
│  This position is staffed by         │
│  Engine 3. Removing it returns the   │
│  resource to the roster.             │
│                                     │
│  [ Cancel ]          [ Remove ]     │
└─────────────────────────────────────┘
```

Cites [`modal.md`](../03-primitives/modal.md) §Destructive-confirm. Cancel is default-focused. Removing
returns the resource to the roster (reversible by re-assigning) but the structural removal is the
destructive act the modal gates.

---

### Step 3 — Reparent (restructure the org chart; IC)

The IC moves a position under a different parent:
- **Tablet:** drag the node to its new parent (v3's three input methods simplified to drag).
- **Phone + assistive tech:** button equivalents — **"Move under…"**, **Move up / Move down** — per the
  *assistive-tech-cannot-drag* contract ([`accessibility.md`](../07-design-system/accessibility.md)).

The K-12 layout budget holds: ≤ 7 cards × 2 levels in tablet portrait without scrolling; deeper levels
reached by tap-to-descend. Reparent commits to the structure (reversible by moving back); it is IC-only.

---

### Step 4 — Transfer command (full-screen takeover; IC)

```
┌─────────────────────────────────────┐
│  ‹ Cancel        Transfer Command   │  ← full-screen takeover (NOT a stacked modal)
│─────────────────────────────────────│
│  Current Incident Commander          │
│  Capt. Reyes (this device)          │
│                                     │
│  Transfer command to:               │
│  ○ Chief Alvarez · Battalion 1      │
│  ● B/C Okafor · this incident       │
│  ○ … other assigned individuals     │
│                                     │
│  A briefing (ICS-201) is attached    │  ← assembled from role history + op, no extra entry
│  ─────────────────────────────────  │
│  [ Transfer Command ]               │
└─────────────────────────────────────┘
```

Command transfer is a **full-screen takeover, not a stacked modal** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)
Command row) — it is consequential enough to own the screen. Afforded from the persistent IC header
action on SitStat.

The IC selects the incoming commander and confirms. On confirm, the app writes a **role-history event**
(K-13) — the append-only audit thread that command-transfer and assignment events feed. An ICS-201-style
briefing is attached, assembled from the role history + the operation with **no extra entry at transfer
time** (the structure ships v4.0; doctrine content v4.1).

**Two-device choreography:** the named incoming IC accepts on their own device; command then moves and
the gold accent underline follows the new IC. The exact handshake (does it require the incoming IC's
explicit accept, or move on the outgoing IC's confirm with the incoming notified on sync?) is an open
question below — Principle 10 forbids a push, so acceptance surfaces on the incoming device's next sync,
not as an alert.

⇩ commits → role-history event written; command moves to the incoming IC

---

### Step 5 — Role history (one tap; any read-access)

```
┌─────────────────────────────────────┐
│  ‹ Back     Role history            │
│─────────────────────────────────────│
│  14:43  Incident Commander           │
│         Capt. Reyes → B/C Okafor     │  ← transfer event
│  13:10  Rescue Group Supervisor      │
│         assigned Engine 3            │
│  12:55  Operation started · Capt.…   │
└─────────────────────────────────────┘
```

**New in v4** — v3 has no org history. One tap from a node (phone = within the node sheet; tablet/laptop =
a side panel). A read-only [`list.md`](../03-primitives/list.md) of the append-only assignment +
transfer events. Read-access to the org chart (Operations Section Chief, Group Supervisors) can view it;
only the IC edits structure.

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| Any device | 1 | Sets its own My Role; the org chart reflects the staffing on next sync |
| IC's **tablet** (CP) | 2–4 | Assigns resources, reparents (drag), initiates transfer |
| Incoming IC's **phone** | 4 | On next sync: command-transfer event appears; accepts → becomes IC |
| Operations Section Chief's **device** | — | On next sync: org chart updates; read-only |
| **Broadcast** (C-13) | — | On next sync: left-third org chart updates to Section-Chief depth; the IC name in the header changes after a transfer |

No push (Principle 10). Command transfer and assignments propagate via the event log on sync; the incoming
IC is not paged — the transfer appears on their next sync.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Set / clear My Role | Yes | Re-open the sheet; re-pick or Clear my role (no confirm) |
| Assign / clear a resource | Yes | Re-open the node sheet; re-assign or clear |
| Reparent a position | Yes | Drag / move it back |
| Remove a populated position | Yes (re-add) | Destructive modal to remove; re-add to restore (the role-history event stays) |
| Transfer command | Yes (transfer again) | Command can move again; **the role-history event is append-only — not erased** |

No timed undo (ADR-010). The audit trail (role history) is append-only by design — reversibility means
"do the inverse action," never "erase the record."

---

## Composed screens and primitives

- [`30-command-sitstat.md`](../08-information-architecture/30-command-sitstat.md) — SitStat hosts My Role,
  the resource roster, and the command-transfer affordance.
- [`31-org-chart.md`](../08-information-architecture/31-org-chart.md) — the structure, node assignment,
  reparent, role history, span-of-control.
- [`sheet.md`](../03-primitives/sheet.md) — My Role + node assignment + add-resource sheets.
- [`modal.md`](../03-primitives/modal.md) — destructive removal of a populated position.
- [`list.md`](../03-primitives/list.md) — the role-history list.
- [`badge.md`](../03-primitives/badge.md) — span-of-control indicator (informational).
- [`button.md`](../03-primitives/button.md) — reparent button equivalents; transfer action.

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard, the
*assistive-tech-cannot-drag* contract, and [`sheet.md`](../03-primitives/sheet.md) / [`modal.md`](../03-primitives/modal.md)
for focus management.

Screen-reader behavior particular to this workflow:

- **My Role sheet opens:** **"My Role. Choose your ICS position."** Each option reads its spelled-out title.
- **Role commit:** **"My role set to Rescue Group Supervisor."** (`aria-live="polite"`).
- **Node assignment:** **"Shoring Group Supervisor. Unfilled. Assign apparatus or individual."**
- **Reparent (AT):** the drag has button equivalents — **"Move under…", "Move up", "Move down"** — each a
  focusable, labeled control.
- **Span-of-control badge:** **"Span of control: 6 reports. Caution."** — informational, not an error
  (`aria-live="polite"`, not assertive).
- **Transfer takeover opens:** **"Transfer Command. Current Incident Commander, Captain Reyes."** Full-screen
  route announces as a navigation, focus on the first selectable incoming commander.
- **Transfer commit:** **"Command transferred to Battalion Chief Okafor."** (`aria-live="assertive"`).
- **Remove position (destructive):** modal traps focus, default on Cancel.
- No new SR script row needed (sheet + modal + list patterns already registered).

---

## Open questions

1. **Command-transfer two-device handshake:** does the transfer require the incoming IC's explicit accept
   on their device, or does it commit on the outgoing IC's confirm with the incoming IC notified on sync?
   Principle 10 forbids a push, so any "notification" is a passive sync reflection. The exact choreography
   (who-confirms, what happens if the incoming IC never accepts) is deferred to Phase H.
2. **Briefing default by incident Level:** the ICS-201-style transfer brief is attached by default at
   Level III+ and optional at Level IV–V — the threshold and whether it is skippable is a Phase H decision
   (the structure ships v4.0; doctrine content v4.1).
3. **My Role vs. org-chart self-assignment collision:** if a device sets My Role = Shoring Group Supervisor
   while the IC has assigned a different individual to that node, which wins? Working assumption: My Role is
   the device's self-declared staffing; the org chart is the IC's authoritative structure — they can
   diverge and Accountability reconciles. Phase H confirms.
4. **Founding-IC default + anti-lockout:** the founding device holds IC until assigned/transferred; how this
   interacts with ADR-017's ≥1-Admin anti-lockout (a different axis) is noted but distinct — back-office
   Admin ≠ fireground IC. Phase H.

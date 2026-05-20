# Runbook — Surfside TTX-2 Execution

> ⚠️ **Training-only.** Run only against the isolated `sim-surfside-ttx-2` Firebase department. Never against a real department.

This runbook is followable cold by another Claude session. Each step has explicit success criteria. The runbook covers the **live execution session** that follows this pre-event package.

---

## Pre-flight (T-30 min before event clock starts)

### Step T-30 — Read the canonical artifacts

- [ ] Read [`plan.md`](plan.md) end-to-end
- [ ] Read all 3 files in [`scenario/`](scenario/)
- [ ] Read all 3 files in [`roster/`](roster/)
- [ ] Read the moderator framework + the 6 checklists in [`moderators/`](moderators/)
- [ ] Read all 4 subagent prompts in [`subagent-prompts/`](subagent-prompts/)
- [ ] Read the hotwash templates in [`hotwash/`](hotwash/)

**Success criterion:** You can answer (a) what the building looks like, (b) who arrives when, (c) what each moderator is watching, (d) what the conductor's job is.

### Step T-29 — Confirm sim-surfside-ttx-2 does NOT already exist

Open the live preview, navigate to Settings, attempt to connect to `sim-surfside-ttx-2`:

```javascript
// preview_eval
localStorage.setItem('fieldshore_deptId', 'sim-surfside-ttx-2');
window.location.reload();
```

After reload, inspect the dept's state in Firebase:

```javascript
// preview_eval
firebase.database().ref('departments/sim-surfside-ttx-2').once('value').then(s => console.log('exists:', !!s.val(), 'data:', s.val()))
```

**Success criterion:** `exists: false` or `data: null`. If the dept exists with data, ABORT — do not overwrite. Either delete it manually first (Alex confirms), or use a different sim dept name and update all artifacts.

### Step T-28 — Create the sim dept (via app's startup flow)

1. In the preview, go to Settings → Department
2. Enter `sim-surfside-ttx-2` as dept ID
3. App creates the dept with empty state
4. Confirm the dept appears in Firebase with at least a `members/<uid>: true` entry (proving Anonymous Auth + member-registration worked per v3.7.0)

**Success criterion:** preview_eval `firebase.database().ref('departments/sim-surfside-ttx-2/members').once('value').then(s => console.log(s.val()))` returns an object with at least one uid.

### Step T-25 — Import inventory baselines

For each JSON file in [`inventory-baseline/`](inventory-baseline/):

1. **Local apparatus + inventory** (`local-apparatus-inventory.json`):
   - The JSON has both `apparatus` and `inventory` arrays
   - For each `apparatus` entry: use preview_eval to call `confirmAddApparatus` or directly write to Firebase:
     ```javascript
     // preview_eval — for each apparatus
     firebase.database().ref('departments/sim-surfside-ttx-2/apparatus/<id>').set({name: '<name>', type: '<type>'});
     ```
   - For the `inventory` array: extract just the inventory items, save to a temp JSON file matching the legacy import format (flat array), and use the app's Inventory → Import button
     - OR write directly via preview_eval:
     ```javascript
     // preview_eval — for each inventory item
     firebase.database().ref('departments/sim-surfside-ttx-2/inventory/<id>').set({type, model, system, apparatus, quantity, available, /* optional: length, plateId */});
     ```

2. **State TF cache** (`state-tf-cache.json`):
   - Same pattern — 1 apparatus (`app-tf-state-cache`) + 47 inventory items
   - **Important:** state TF arrives at E+5:00. You can pre-stage the apparatus + inventory at T-25 (the conductor will fire the "arrival" event in the event-log.jsonl, but the data is there from start). OR delay the import until E+5:00.
   - **Recommended for plan-build verification:** pre-stage all caches at T-25. The "arrival" timing is for narrative + roster purposes; the data being available early doesn't affect the simulation.

3. **Federal TF caches** (`fed-tf-cache.json` × 3):
   - For each of `alpha`, `bravo`, `charlie`: clone the template, replace `TEMPLATE` in IDs and the apparatus name (e.g., `app-tf-fed-alpha-cache` / `TF-Fed-Alpha Cache`), then write.

4. **External equipment** (`external-equipment-pool.json`):
   - These go to the External Equipment surface, not the strut/extension/plate inventory.
   - Use preview_eval or the External Equipment UI to add each.
   - **Note:** the `agency` field on each entry is a v4.0.0 preview field; the current app may discard it on save. That's expected — `mod-data` will observe this.

**Success criterion:** Inventory tab shows 34 local apparatus + 4 TF Cache apparatus = 38 total. Inventory items render in the Inventory tab (struts, extensions, plates with quantities). External Equipment tab shows ~28 entries.

### Step T-20 — Initial Firebase snapshot

Write the post-import snapshot to `runtime/firebase-snapshots/snap-T-20-initial.json`:

```bash
# In a terminal (Bash tool):
mkdir -p ".claude/simulations/surfside-ttx-2/runtime/firebase-snapshots"
# Then use preview_eval to dump:
```

```javascript
// preview_eval
firebase.database().ref('departments/sim-surfside-ttx-2').once('value').then(s => copy(JSON.stringify(s.val(), null, 2)))
// Then paste into the snapshot file
```

**Success criterion:** `snap-T-20-initial.json` exists and contains the full sim dept state.

### Step T-15 — Spawn the 6 moderator subagents

For each moderator in `moderator-framework.md` table:

Use the Agent tool with `subagent_type: "general-purpose"`. Pass:
- The base prompt from [`subagent-prompts/moderator-system-prompt.md`](subagent-prompts/moderator-system-prompt.md)
- The specific checklist file content (e.g., for `mod-nims`, attach `moderators/mod-nims-checklist.md`)
- The moderator ID

Each moderator should:
- Confirm spawn by writing initialization line to `notes/moderator-<id>-notes.jsonl`
- Acknowledge silent-mode constraint

**Success criterion:** 6 files exist:
- `notes/moderator-mod-nims-notes.jsonl`
- `notes/moderator-mod-struct-notes.jsonl`
- `notes/moderator-mod-ux-notes.jsonl`
- `notes/moderator-mod-data-notes.jsonl`
- `notes/moderator-mod-comms-notes.jsonl`
- `notes/moderator-mod-ist-notes.jsonl`

Each file has at least the initialization line.

### Step T-10 — Spawn the conductor

Use Agent with `subagent_type: "general-purpose"`, pass the [`subagent-prompts/conductor-system-prompt.md`](subagent-prompts/conductor-system-prompt.md). Pass also `plan.md`, all of `scenario/`, all of `roster/`.

The conductor should:
- Read all referenced files
- Initialize `runtime/event-log.jsonl` (creates if absent)
- Initialize `runtime/conductor-state.json` with `current_event_time: "E+0:00"` (clock not yet started)
- Acknowledge ready state

**Success criterion:** `runtime/event-log.jsonl` and `runtime/conductor-state.json` exist with initial content.

### Step T-5 — Spawn OP1 participants (4 subagents)

In order: `ic-op1`, `osc-op1`, `rescue-op1`, `cut-op1` (`osc-op1` and `cut-op1` are spawned but inactive until their persona windows begin).

Use Agent with `subagent_type: "general-purpose"` for each:
- Base prompt from [`subagent-prompts/participant-system-prompt.md`](subagent-prompts/participant-system-prompt.md)
- Overlay from [`subagent-prompts/per-role-overlays.md`](subagent-prompts/per-role-overlays.md) for that specific role
- Acknowledge persona + token protocol

**Success criterion:** All 4 OP1 participants acknowledged; conductor has noted each in `event-log.jsonl` with type `participant-spawned`.

---

## T-0 — Start the event clock

Conductor records `event-clock-start` wall-clock timestamp and begins firing E+0:00 events:

```json
{"ts":"E+0:00","wallclock":"<...>","type":"event-clock-start","note":"Event clock started; collapse onset at E+0:00"}
{"ts":"E+0:00","wallclock":"<...>","type":"paper-event","event":"COLLAPSE","note":"Building south wing pancake collapse"}
{"ts":"E+0:03","wallclock":"<...>","type":"paper-event","event":"first 9-1-1 calls","note":"Dispatch reports explosion/collapse"}
{"ts":"E+0:04","wallclock":"<...>","type":"arrival","unit":"Engine 1","personnel":4,"ics_role":"IC #1 (Reyes interim)"}
```

Conductor passes initial token to `ic-op1`.

`ic-op1` opens Settings → Start Operation, names it "Surfside TTX-2 — Generic Residential Collapse", begins.

---

## During the event (E+0:00 → E+36:00)

The simulation runs autonomously per the subagent prompts. Conductor responsibilities:

1. **Every wall-clock minute (or every event):** update `runtime/conductor-state.json`
2. **Per the timeline in `scenario/timeline-event-clock.md`:** fire arrivals + paper events
3. **At each OP boundary:** complete pre-boundary IAP, transfer command, snapshot Firebase, spawn/terminate participants
4. **Handle token-requests / releases:** broker access to the preview
5. **Handle stuck participants:** recovery per conductor prompt

Moderators write notes continuously to their `.jsonl` files. Participants drive the app and maintain their personal logs (in their session context, not files — the AAR will reconstruct).

---

## OP boundary checkpoints (E+4:00, E+16:00, E+28:00)

For each boundary, complete this checklist BEFORE crossing:

- [ ] Pre-boundary T-30 min: PSC finalizes next OP's IAP at `iaps/iap-op<N>.md`
- [ ] Pre-boundary T-5 min: outgoing IC writes transfer-of-command brief to `event-log.jsonl`
- [ ] At boundary: snapshot Firebase to `runtime/firebase-snapshots/snap-E+<HH>h.json`
- [ ] Verify `fieldshore_deptId === 'sim-surfside-ttx-2'` in localStorage (preview_eval)
- [ ] Spawn new participant subagents per `roster/participant-cast-by-op.md`
- [ ] Terminate retiring participants (OP3→OP4 boundary only — 6 retire)
- [ ] Transfer active-driver token to new IC
- [ ] Log boundary crossing event

**Success criterion per boundary:** IAP exists with all 8 ICS-202 sections filled (or 5 for ICS-201 at OP1); snapshot file written; participant roster matches expected count (4 → 10 → 14 → 8).

---

## E+36:00 — Event end

Conductor:

- [ ] Halt event clock; write `event-end` to `event-log.jsonl`
- [ ] Final Firebase snapshot to `runtime/firebase-snapshots/snap-E+36h.json`
- [ ] Notify all participants + moderators to submit AARs

---

## Hotwash phase 1 — AAR submissions (60 wall-clock min max)

Each of the ~14 active participants (over the event lifetime — some only active in one OP, but all contribute) and 6 moderators submits an Army AAR using [`hotwash/aar-question-template.md`](hotwash/aar-question-template.md).

Files:
- `hotwash/aar-participant-ic-op1.md`, ..., `hotwash/aar-participant-demob-op4.md` (~14 files)
- `hotwash/aar-moderator-mod-nims.md`, ..., `hotwash/aar-moderator-mod-ist.md` (6 files)

**Constraint:** subjects do NOT read each other's drafts during this phase.

**Success criterion:** ≥18 of ~20 AAR files exist with all four questions answered.

---

## Hotwash phase 2 — IP table synthesis

Spawn a synthesis subagent (general-purpose) with:
- All 20 AAR files
- All 6 moderator note files
- All 4 IAP files
- The `event-log.jsonl`
- The IP table template at `hotwash/improvement-plan-template.md`

Synthesis subagent produces `hotwash/improvement-plan.md` with rows per finding, sorted by severity / phase / IP-#.

**Success criterion:** `improvement-plan.md` has ≥40 IP-# entries with all 14 columns populated.

---

## Hotwash phase 3 — v4.0.0 gap analysis

Same synthesis subagent (or a fresh one) maps every IP-# to MASTER-PLAN.md Release 3 phases per the column structure:

- Tag each `covered | partial | gap | new-idea`
- Cite MASTER-PLAN.md line references for `covered` / `partial`
- For `gap`: propose specific addition to MASTER-PLAN
- For `new-idea`: propose v4.x backlog or drop

Output: `hotwash/v4.0.0-gap-analysis.md`

**Success criterion:** Every IP-# row in `improvement-plan.md` has a corresponding row in `v4.0.0-gap-analysis.md` with a coverage tag.

---

## Phase 4 — Final report

Synthesis subagent produces `final-report.md` with:

1. Executive summary (1 paragraph)
2. Headline findings (5–10 bullets)
3. v4.0.0 backlog deltas (table)
4. Doctrine recommendations
5. Alex decision queue

**Success criterion:** `final-report.md` exists; contains explicit MASTER-PLAN.md change recommendations.

---

## Teardown (optional, Alex approves)

If Alex approves teardown:

```javascript
// preview_eval
firebase.database().ref('departments/sim-surfside-ttx-2').remove()
  .then(() => console.log('sim dept deleted'))
  .catch(e => console.error('deletion failed:', e));
```

Confirm deletion:

```javascript
// preview_eval
firebase.database().ref('departments/sim-surfside-ttx-2').once('value').then(s => console.log('exists after deletion:', !!s.val()))
```

**Success criterion:** Returns `false`.

The full Firebase data lives in `runtime/firebase-snapshots/snap-E+36h.json` (and earlier snapshots), so deletion is non-destructive to the simulation record.

---

## Final state — package complete

After teardown, the directory contains:

- Pre-event: README + plan + scenario + roster + inventory-baseline + iaps templates + moderators + hotwash templates + subagent-prompts + runbook
- Runtime: event-log + firebase-snapshots + (optional) preview-screenshots + notes/ (6 moderator JSONLs) + conductor-state
- IAPs: 4 filled IAP files
- Hotwash: ~20 AAR files + improvement-plan.md + v4.0.0-gap-analysis.md
- Final: final-report.md

The simulation record is now part of the FieldShore audit + planning history.

---

## Estimated wall-clock effort

| Phase | Effort |
|---|---|
| T-30 → T-0 (pre-flight) | ~60 minutes wall-clock |
| E+0 → E+36 (event execution) | Variable — depends on subagent depth + participant decision pacing. Likely 4–10 wall-clock hours total. |
| Hotwash phase 1 (AARs) | ~60 wall-clock minutes |
| Hotwash phase 2 (IP synthesis) | ~30 wall-clock minutes |
| Hotwash phase 3 (gap analysis) | ~30 wall-clock minutes |
| Phase 4 (final report) | ~30 wall-clock minutes |
| Teardown | ~5 wall-clock minutes |
| **Total** | **~7–13 wall-clock hours** |

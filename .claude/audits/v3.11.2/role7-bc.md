# Role 7 — Battalion Chief — v3.11.2

**Audit date:** 2026-05-18
**Lane:** Command-level / IC trust / accountability / communication-failure tolerance
**Commit:** dbfbc8b (v3.11.2 merge)

---

## Executive Summary

v3.11.2 ships 7 release-blocker fixes from the Surfside TTX-2 simulation. From the IC seat, this patch closes real friction — the Add-SP modal Save Changes button being hidden in the Add path (IP-007) was the single highest-source-count finding in the TTX, cited in 7 of 12 AAR files and forcing programmatic bypass across all 66 shore points across all 4 operational periods. That is now fixed. The 24-hour timestamp centralization (IP-034) matters for command transfer documentation. The apparatus naming uniqueness validator (IP-033) is a life-safety radio-net issue that got a fix. On those three items alone I'd call this patch a meaningful operational improvement.

What this patch does NOT change: the IC still has no role history, no operational period concept, no stop-work mechanism, and the org chart only shows who is currently assigned — not who held a role for the last 9 hours. Those gaps were true at v3.5.1 and remain true at v3.11.2. The app is serviceable for Type IV/V incidents with 2–6 units. I would not bring it to a multi-company collapse working with mutual aid without the v4.0.0 items in hand.

---

## Findings

### V3.11.2-R7-01 — Role Assignment Is Write-Once With No History (STILL-OPEN, critical for IC trust)

**IC lens:** At E+0:09 when BC McAllister takes command from Capt. Reyes, the IC role field gets overwritten. At E+0:45 when DC Park takes over and McAllister steps to OSC #1, same thing. At E+9:00 when Chief Whitaker takes the 12-hour shift transfer, same thing. The app carries zero record of the prior IC chain. If I borrow someone's phone at E+5:00 to pick up command, the org chart shows the current state but I have no way to know when that state was set, who made the change, or whether I'm looking at a stale snapshot that hasn't synced.

The TTX confirmed this at 100% reproduction rate across 5 IC transfers and 6 OSC rotations. Doc UL Sayer maintained an independent Google Sheet to reconstruct what happened. That is the app failing at its core accountability function.

`assignOrgChartRole()` at app.js:2934 writes `activeOperation.roles[targetId] = roleId` — a single key overwrite with no timestamp, no prior-holder record, no `assignedAt`. This is not a v3.11.2 issue — it's scoped to v4.0.0 Phase 3C.5 — but the IC needs to know it is an open hole.

**Status:** STILL-OPEN. v4.0.0 target.

---

### V3.11.2-R7-02 — Command Transfer Has No ICS-201 Surface (STILL-OPEN, HIGH)

**IC lens:** NIMS doctrine says command transfer requires a verbal brief supported by a written ICS-201 situation summary. At E+0:09 in the reference scenario, McAllister needs to hand off actionable incident status to DC Park at E+0:45. The app has no ICS-201 form, no transfer checklist, no "hand this screen to the incoming IC" view. The incoming IC gets the same Operations tab the entire crew sees — no curated summary of current resources, hazards, objectives, and org chart in one place.

The TTX final report notes that IAP-OP1 was a 2,464-word Markdown file rather than a guided form. An incoming IC at 0300 in the rain is not reading 2,464 words. They need a 30-second screen: who's on scene, what's deployed, what's pending, who holds each command role, what hazards are active.

This is IP-061 (native ICS-201 form — deferred to v4.1.0) and IP-037 (SitStat view — targeted for v4.0.0 Phase 3D.4). The SitStat fix is the right priority. Until it exists, command transfer relies entirely on verbal brief with no app support.

**Status:** STILL-OPEN. SitStat (IP-037) targeted v4.0.0; ICS-201 form deferred v4.1.0.

---

### V3.11.2-R7-03 — No Operational Period Boundary (STILL-OPEN, HIGH)

**IC lens:** At E+9:00 when Chief Whitaker takes the 12-hour shift transfer, there is no in-app signal that we have crossed from OP2 to OP3. The entire 36-hour TTX read as one continuous timeline with no OP indicators. Whitaker took command with no way to distinguish SP-01 created 9 hours ago from SP-44 created 20 minutes ago unless he read every timestamp individually.

In real operations, OP boundaries are doctrinal. They trigger IAP cycle, personnel accountability reports, resource reassessment, and shift documentation. The app ignoring OP boundaries means IC #4 inherits a timeline he cannot parse at speed.

IP-016 addresses this — OP indicator on Command and Operations tab headers plus a "Now entering OP N" transition banner. Scoped to v4.0.0 Phase 3C.3. Not in this patch and not yet in the app.

**Status:** STILL-OPEN. v4.0.0 target.

---

### V3.11.2-R7-04 — Offline/Sync Status Is Visible But Doesn't Tell IC What Was Lost (STILL-OPEN, MEDIUM)

**IC lens:** The app has an `offline` banner ("Offline — changes will sync when reconnected") and an `authFailureBanner` ("Sync unavailable — running offline-only."). Both exist and both are functional at app.js:1613–1644. That's good — the IC gets a clear signal that something is wrong rather than silent failure.

What's missing: the banner does not tell the IC how many writes are queued, how old the oldest pending write is, or what specifically hasn't been confirmed. If I lose signal for 10 minutes and then reconnect, I get a generic reconnect with no indication of whether the SP I deployed at 0317 actually made it to Firebase or is sitting in `pendingWrites`. The IC's question is not "am I online" — it is "is my data safe."

The sync diagnostics infrastructure exists (`logSyncEvent`, `/diagnostics/sync/`), but none of it surfaces in the UI the IC sees. `pendingWrites.length` is available in memory; exposing it in the banner ("3 changes queued — will sync on reconnect") would take one line of code and meaningfully improve IC trust.

**Status:** STILL-OPEN. Low-effort improvement not currently scoped.

---

### V3.11.2-R7-05 — End Operation Is One Confirm Dialog Away From Destroying Work (STILL-OPEN, MEDIUM)

**IC lens:** `endOperation()` at app.js:5458 uses a native `confirm()` dialog — "End this operation? All equipment will be marked as returned." Single tap OK and the operation is archived. With gloves, with a cracked screen, in the rain at 0300, this is a one-mistake wipe of the entire incident record.

The backup logic added in v3.10.1 (`backupBeforeDestructiveWrite`) is genuinely good — it prevents data loss in the Firebase layer. But the confirmation UI is still a 44px "OK" button one fat-finger from activation. The TTX cited 10 native `confirm()` dialogs as a field-use concern (U3, findings-ledger.md:213); this one is the most consequential of them all.

There is no undo. Once the IC taps OK, the operation is archived and the active session is gone. At a real incident this means a BC hands their phone to a runner and the runner accidentally ends a 4-hour operation while trying to check the app.

**Status:** STILL-OPEN. Custom confirm sheet with color-coded buttons targeted v3.6.0 in the ledger; not yet visible in this codebase path.

---

### V3.11.2-R7-06 — No Safety Officer Dashboard, No Stop-Work Surface (STILL-OPEN, HIGH)

**IC lens:** The Safety Officer is the one role I need to find in under 3 seconds. At any given moment I need to know: who is SO, where are they, and is there an active stop-work order. Currently the app gives the SO the same view as everyone else. There is no dedicated SO dashboard, no PAR mechanism that counts bodies rather than apparatus, and no stop-work button.

The TTX OP3 wind event (28 mph gust at E+22:00, rain at E+24:30) was handled on radio TAC-2 with no app record. The OP4 cribbing-decay audit found 6 SPs requiring rework with no in-app history. The app could not tell the IC that any of those conditions existed.

D1 (no PAR), D2 (no stop-work), D3 (no hazard log), and IP-032 (no safety-state surface) all remain open. These are scoped to v4.0.0 (D2/D3) and v4.0.0 Phase 3C.9 (IP-032). Not in this patch. An IC who can't quickly verify "is there an active hazard condition" is operating with degraded situational awareness.

**Status:** STILL-OPEN. v4.0.0 target for stop-work; hazard log partially scoped v3.6.0 but not verified shipped in this codebase from my read.

---

### V3.11.2-R7-07 — What This Patch Gets Right (VERIFIED-FIXED, multiple items)

**Add-SP modal Save Changes (IP-007):** Seven AAR files cited this. Every shore point in a 4-OP TTX required a programmatic workaround because the Save Changes button was invisible in the Add path. That is now fixed. This is the single change that most directly affects IC operational pace — SPs are the core unit of work and they couldn't be created via the UI for 66 consecutive deployments.

**24-hour timestamps (IP-034):** Verified at app.js:742–755. `fmtTimestamp()` and `fmtDate()` centralize all timestamp formatting with `hour12: false` forced to `en-US` locale. Fireground radio doctrine is 24-hour; the prior locale-default rendering was a command-transfer documentation liability. Five IC transfers and 6 OSC rotations all displayed 12-hour timestamps in the TTX. Fixed.

**Apparatus naming uniqueness (IP-033):** mod-comms called this a life-safety class radio-net ambiguity. TF-State-Rescue-A and TF-Fed-Alpha-Rescue-A colliding on "Rescue-A" token in the same incident creates exactly the kind of ambiguity that gets people hurt. Fix is in this patch.

**renderOrgChart defensive guard (IP-047):** Crashed 4 times across OP1 and OP2 with "Cannot convert undefined or null to object." The Command tab is the IC's span-of-control view. A crash there during an active incident is not a UX problem — it is a command gap.

**Start-Op apparatus checkbox eager-render (IP-048):** First operation opened with empty apparatus list. That's the IC's first action at incident command. Having to dismiss, reload, and reopen before seeing apparatus is 60–90 seconds of dead time at the most time-critical moment.

These five fixes, plus guardClick first-submit (IP-010) and estimatedLoad coercion (IP-011), collectively address the highest-friction points from the TTX that affect every incident size. Good patch.

---

## Multi-Agency Readiness Gap (Catalogued for IC Awareness)

Per the memory file noting v4.0.0 anchors on Type IV/V local use, I am not rating the federal mutual aid gaps as findings against this version. I am flagging them for the IC so there is no ambiguity about what this tool is and is not at v3.11.2:

- Anonymous auth grants any user with the department ID full read/write. At a multi-agency response where a federal IST arrives and connects to the same department, they have identical write scope to local FD apparatus, inventory, and operations. This is IP-001 and is a v4.0.0 Phase 3A item.
- There is no per-write attribution. If a role assignment is wrong at E+5:00, there is no way to determine which device made the change or when. This is IP-002, also v4.0.0 Phase 3A.
- Unified Command is impossible. The IC role is a single slot. Sheriff Garza's UC-Law standup at E+6:15 in the TTX existed only in the IAP, not in the app data model. IP-013, v4.0.0 Phase 3B.4.

None of these are surprises. All are catalogued. The IC needs to know that bringing this app to a Type III or larger incident means running command accountability on a single-seat local-FD tool. Paper backup for role history and IC transfer documentation remains mandatory until v4.0.0.

---

## Team Verdict Refresh (1–10)

Baseline scores are inferred from the v3.5.1 "What the team would say" verdicts in AUDIT-INDEX.md. v3.11.2 scores reflect progress through the full v3.5.2 → v3.11.2 release train.

| Role | v3.5.1 | v3.11.2 | Justification |
|---|---|---|---|
| Code | 3 | 7 | Algorithm bugs fixed, local-first architecture in place, SRI added, XSS hardened, listener leak fixed, race conditions addressed. Remaining: customRoles still `set()`, dual-write window still open, some race conditions deferred. |
| SME | 2 | 8 | Conservative-floor interpolation, load table corrections, liability disclaimer, unrated-zone warning, smoke-deck CI partially wired. Core algorithm is now trustworthy for Type IV/V field use. |
| DevOps | 2 | 6 | Anonymous auth exists (improvement from none), sync diagnostics in place, backup before destructive write, Firebase validate rule fixed. Per-device UID, per-agency write scope, and conflict resolution all deferred. |
| Mobile-UX | 3 | 6 | Plate picker fixed, dark mode contrast improved, glove-accessible improvements across several releases. IP-007 Add-SP modal now fixed — biggest single UX blocker. Native confirm dialogs remain; 44px touch targets not fully resolved. |
| QA | 3 | 7 | IP-029 smoke deck exists as a node script; v3.11.2 ran it as a coda. Integration test for Save Changes button visibility now specified. Status-progression guard prevents regression. Still no CI runner — smoke deck is manual. |
| NIMS | 1 | 4 | 24-hour timestamps fixed. `group` → `assignedResource` rename dual-write starts v3.12.0. Role history, OP periods, full Command Staff defaults, stop-work, staging node, demob lifecycle all still open. 19% compliance at v3.5.1 — modest improvement from terminology and timestamp fixes. |
| BC (self) | 2 | 6 | App is now trustworthy for a 2–4 unit Type V incident where I'm solo IC with no mutual aid. IP-007 fix alone moves the needle — I can actually create shore points through the UI now. No role history, no OP boundaries, no SitStat for command transfer, no SO dashboard — these cap the score. Would use it on a car-into-building. Would not use it as the sole accountability tool on a multi-agency collapse without paper backup. |

---

## Out-of-Lane Notes

- The Surfside TTX-2 simulation at `.claude/simulations/surfside-ttx-2/` is a legitimate operational stress test. The 63 IP-# findings it produced are more operationally credible than static code analysis. Future audit cycles should reference the runtime event log and moderator notes as primary evidence, not just as planning inputs.
- IP-034 (24-hour timestamps) is fully implemented per the code at app.js:742–755. One remaining instance: `sp.estimatedLoad.toLocaleString()` at app.js:3731 uses locale default for number formatting, not a timestamp — out of scope for IP-034 but worth noting if locale-sensitive number display becomes a concern.
- The `endOperation` backup guard (v3.10.1, app.js:5463–5470) is a genuine safety net that would have protected against data loss in the TTX's OP3 → OP4 persistence gap. It aborts end-of-op if the backup write fails — conservative and correct.

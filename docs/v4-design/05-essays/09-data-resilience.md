# Data Resilience — Brainstorm Essay

## Executive Summary

The void has no cell, no WiFi, twelve devices, two operational periods, and the IC needs an accurate Personnel Accountability Report regardless. That sentence is the whole brief. Every other product in the corpus assumes a working connection and degrades when it drops. FieldShore inverts that contract. The device is the source of truth. The cloud is an optional mirror.

v3 got us most of the way there. Local first writes land, queue, and replay. STATUS_ORDER guards prevent shore points from regressing. The offlineTouched pipe keeps inventory decrements from being overwritten by a stale snapshot. Diagnostics at /diagnostics/sync/ tell us what happened after the fact. But v3 still ships shared Anonymous Auth, validate rules that have silently failed twice, no per resource role gating, last write wins on every shape except shore point status, no answer for the comms degraded multi device case beyond "queue and hope," and a service worker built for a single HTML file.

v4 has to fix all of that without losing what v3 got right. The recommendations below replace shared anonymous auth with per device UIDs persisted in IndexedDB and gated by role mapped membership rules. They generalize the STATUS_ORDER guard into a state machine doctrine that applies to every monotonic field. They make the CP hub (D5 Build C) a real piece of infrastructure: a WebRTC mesh over the dept's portable hotspot, with one elected leader that mediates writes and replays them to Firebase when the WAN returns. They make the offline window honest by exposing pending write count, last sync time, and conflict surfaces directly in the UI rather than burying them in a diagnostics tree. And they raise the bar on what we log, what we back up, and what we let an Owner destroy.

## Why this lens matters

The other eleven essays will mostly assume the data layer works. Picker doctrine, IC ergonomics, NIMS terminology, visual language, and field conditions all rest on the same precondition: when the team officer in the void taps "Mark Cut Done," that fact survives. It survives the phone dropping into a puddle. It survives the IC's iPad going to sleep and the BC opening v4 on a different device an hour later. It survives the cell tower being saturated for three hours while a federal task force rolls in. It survives a peer device on the same incident writing the same shore point's status at the same millisecond.

The data layer is where promises break quietly. Picker doctrine breaking is visible the moment a designer opens Figma. Sync breaking is visible six hours later when the IC's PAR shows seven Entry Team members and dispatch is asking why two of them are unaccounted for. The bar here is not "as good as Linear." Linear assumes a connection. Notion assumes a connection. Figma assumes a connection. The bar is "as good as a paper command board the IC trusts more than the screen," and that means the data has to be at least as honest as the radio.

## What v3 already got right and v4 keeps

The local first contract is correct and v4 inherits it verbatim. `persistOperation()` and `persistInventory()` are the right primitive. The `firebaseSave()` wrapper that handles the online queue and the offline localStorage fallback in one place, instead of forking the caller, is the right shape. The S7 first fire guard that pushes local up to Firebase when the first snapshot is empty rather than wiping local is the right instinct. The v3.9.0 STATUS_ORDER guard that prevents pre cutting transitions from regressing a shore point already in cutting is the right pattern. The v3.16.4 offlineTouched pipe, which keeps an inventory item's local `available` value from being clobbered by a Firebase snapshot while a transaction is in flight, is the right architectural answer to a race we lived through.

The v3.8.1 sync diagnostics tree at /diagnostics/sync/ is the right idea, executed thinly. The v3.10.0 listener teardown work (`teardownListeners()` + `setupListeners()`, with stored query refs and a module scoped `connRef`) is the right idea, executed correctly. The v3.7.0 Anonymous Auth + auth aware listener setup is the right idea, executed at the wrong scope (shared auth across all devices in a dept).

The v3.8.2 incident is the most important thing v3 taught us. The inventory validate rule required a `name` field; inventory items used `model`. Every write since v3.7.0 silently failed with `PERMISSION_DENIED` and the app showed no symptom until field testers noticed inventory wasn't syncing across devices. The fix was four characters in `database.rules.json` and a version filter on pending writes. The lesson is bigger: validate rules are silent rejection machines, and an app that doesn't know its own writes are being rejected is worse than an app with no validation at all. v4 has to surface validation failures the same way it surfaces connection failures. Loud, visible, queued, retried.

## The per device UID and the migration

Shared Anonymous Auth was the right v3.7.0 answer because it was the only Firebase mechanism that let any device write to a dept node without each user creating an account. It got us to "writes require auth" without forcing onboarding. v4 has to break this open. The locked D7 decision is Owner / Admin / Member / Observer roles. Role based rules require knowing which UID is which role, and that requires per device UIDs that survive across launches.

Replace shared anonymous auth with per device Firebase Anonymous UIDs persisted in IndexedDB at `fieldshore_auth_uid`. On first launch v4 calls `signInAnonymously()` and writes the resulting UID into IndexedDB. On every subsequent launch v4 reads the UID from IndexedDB and re authenticates the same Firebase user via the persisted refresh token (Firebase Auth's `LOCAL` persistence does this for free; we just have to set it explicitly because the SDK default `SESSION` clears on tab close). The UID is now stable per device, per browser profile, per install. When the user adds themselves to a department (D7 invite code flow), their UID gets written into `/departments/{deptId}/members/{uid}` with a role and a display name. Security rules gate writes by deptId AND uid AND role lookup at `/departments/{deptId}/members/{auth.uid}/role`.

The migration matters because v3 users already have local data. The first time a v3 device opens v4, the existing shared anonymous UID is meaningless (v4's rules don't recognize it) but the local state in localStorage is real. The migration runs once on first v4 launch: (1) capture local inventory, operations, apparatus, custom roles, etc. from localStorage into an in memory snapshot; (2) call `signInAnonymously()` and persist the new UID to IndexedDB; (3) write the user as a temporary Member of their existing dept (if a dept was selected in v3) with display name "Migrated device"; (4) wait for the first Firebase snapshot under the new auth and merge the local snapshot with the remote shape (local wins on items not present remotely, remote wins on conflicts because peer devices will have already migrated and overwritten this device's stale local copy if any); (5) write a `_meta/v4MigratedAt` timestamp into `/departments/{deptId}/members/{uid}/` so the migration is idempotent. If migration fails partway, the app stays on the local snapshot and surfaces a banner: "v4 sync not yet established. Tap to retry." No data loss, no silent failure.

The first user to migrate from a given dept does not automatically become Owner. Owner has to be claimed explicitly, because we can't tell from a v3 install whether the device belongs to the chief or to a probie. The first user opens Settings and sees a "Claim department ownership" banner if no Owner exists yet. The claim writes their UID into `/departments/{deptId}/owner` and the rule allows it only if `/departments/{deptId}/owner` does not yet exist. Subsequent claims are denied by the rule. This is a one time race that almost always resolves correctly because the chief is the one with the iPad open in the command vehicle.

## Security rules at v4 fidelity

The v3 rules tree is one level past trivial: `auth != null` to read, member existence to write, validate rules per leaf. v4 needs role aware rules with the same structure but at four times the resolution.

Reads: any authenticated member of the dept can read everything in the dept. Observer is a read only role and the rule for write checks role membership. Member can write to inventory checkout fields, operations they're assigned to, shore points in those operations, hazards, and checklists. Admin can write to everything except billing and Owner promotion. Owner can write to everything.

The role lookup happens via Firebase's nested rule expression: `root.child('departments').child($deptId).child('members').child(auth.uid).child('role').val() === 'admin'`. We pre compute this for the common cases and cache the role at app init so the client side gating matches what the rules enforce. The client gating is UX; the rule gating is enforcement. Never trust the client; always check the rule.

Validate rules cover every field that lands in Firebase. Every. Field. The v3.8.2 ghost (an inventory item with no `name` got silently rejected because the rule required `name` even though the code wrote `model`) does not happen again because v4 ships with a schema test suite that round trips a representative payload of every shape through the rules emulator in CI before any deploy. A rule that rejects a payload the app writes is a deploy blocker. This is the single highest leverage thing v4 can add to the data layer.

Writes that fail validation surface visibly. v3's behavior was to log a warning and queue a retry that would also fail. v4 surfaces validation failures as a toast: "Could not save this change. The data shape doesn't match what the server expects. Tap for details." The detail view shows the path, the field, and the rule that rejected it. This is for the developer, but it lives in the app because the alternative is finding out three days later from a field tester.

## The state machine doctrine

v3.9.0's STATUS_ORDER guard fixed one specific bug: pre cutting transitions (Send Back, Strut Placed, Cutting) were regressing group members that had already advanced into cutting, runner, or secured. The fix was a `STATUS_ORDER.indexOf()` comparison: skip group members whose current status is past the target.

That guard is correct and v4 generalizes it. Every monotonic field gets a state machine. Shore point status has seven states (pending, process, strutplaced, cutting, runner, secured, returned). Operation status has three (active, archived, deleted). Apparatus status has staging states. Each is declared as a sorted list and the rule for advancing a field requires that the new value's index is greater than or equal to the current value's index. Regressions are explicit operations that have their own state transitions: "send back" is a regression from cutting back to process and it requires an undo affordance because it's a state change the operator should be able to reverse for five seconds (Principle 6).

The doctrine: any field that represents a monotonic progression gets a STATUS_ORDER style guard at both the client and the rule layer. The client guard prevents the UI from issuing a regression. The rule guard prevents a peer device with stale data from overwriting a forward progression. The validate rule for status reads: `newData.val() === data.val() || statusOrder(newData.val()) >= statusOrder(data.val()) || isExplicitRegression(newData.val(), data.val())`. Firebase rules can't call functions but they can encode this as a fan out of allowed transitions. The rule file gets longer; the data stays honest.

## Last write wins is wrong, but conflict free is also wrong

Linear's offline sync clarity comes from CRDTs (conflict free replicated data types) under the hood. Every operation is commutative, associative, and idempotent. Two devices editing the same record produce the same result regardless of order. Beautiful, and wrong for shore points.

Shore point status is not commutative. If device A marks a shore point "cutting" and device B marks the same shore point "returned" thirty seconds later, the merged state is not "both wrote, last write wins" or "both wrote, conflict UI prompts the user to choose." The merged state is "this shore point is in returned because cutting is a precondition for returned and the state machine handles the progression." CRDT semantics get this wrong because they treat status as opaque data. The state machine doctrine above gets it right because it treats status as a directed graph.

But state machines aren't enough for every field. Notes, hazard descriptions, custom checklist items, role assignment names: these are free text and the right answer is closer to last write wins with surfacing. v4's policy: every free text field that can be edited by multiple devices gets a `_meta/lastEditedBy` and `_meta/lastEditedAt` recorded on every write. If a snapshot arrives that shows another device edited the same field within the last sixty seconds AND the local device has unsaved changes, the app surfaces a "this was changed by [name] [time] ago. Keep mine / Use theirs / Show both" prompt. This is not a CRDT, it's a conflict surface, and it only fires when the conflict is real. The rest of the time the snapshot writes through silently because the local device has no competing edit.

Inventory available counts are the third case. They're not monotonic (you decrement on deploy, increment on return) and they're not free text. They're shared counters and the right answer is the v3.16.4 transaction with the offlineTouched pipe. v4 keeps that mechanism unchanged. Every available decrement runs as a Firebase transaction. If the transaction fails because the local value is stale, the local decrement is marked in offlineTouched and replayed on reconnect against the freshest server value. The flush pass settles the touched set when the transaction commits.

## D5: Build A and Build C, side by side

The locked decision (D5) is to ship both. Build A is "accept and reconcile per device queues when comms return." Build C is "CP hub: one device chosen as authoritative, others sync to it over LAN." A is the default; C is the option for connectivity poor depts.

**Build A is what v3 already does, refined.** Each device queues writes in `pendingWrites` and flushes them on reconnect via `flushPendingWrites()`. v4 hardens this with: (1) pending writes ordered by causal dependency (a shore point status change depends on the shore point existing, so its create write flushes before its update); (2) pending write count visible in the offline banner (already in v3.12.0 R7-04, kept); (3) per dept queue isolation (v3.12.0 R1-11 filters stale department writes on dept switch, kept); (4) the appVersion filter on flush (v3.8.2, kept); (5) a "show me what's queued" affordance in Settings that lists the pending writes with timestamps and a "discard this one" option for operators who know a write is stale (e.g. they're testing).

**Build C is new.** A tablet or Toughbook at the command post runs a local hub. The hub is the same v4 PWA running in "hub mode" — a Settings toggle. When a device on the same LAN opens v4, it discovers the hub via WebRTC signaling over the LAN (a small mDNS announcement, or fallback to manual IP entry). All writes from peer devices route to the hub via WebRTC data channels. The hub maintains the authoritative state in its own IndexedDB, runs the same conflict resolution and state machine logic, and writes to Firebase when WAN connectivity returns. Peer devices show "Connected to CP hub" in their sync indicator. If the hub crashes or moves out of range, the peers fall back to Build A (queue locally, flush to Firebase directly). The hub is not a separate process or app; it's the same code with a flag.

The WebRTC choice is deliberate. mDNS for discovery works on iOS Safari only in narrow conditions and is unreliable across networks. A small Node hub would force a native dependency we don't want. WebRTC data channels work in every modern browser, work in a PWA, work without an internet connection as long as the devices can reach each other over LAN, and don't require any native plugin. The signaling channel is the tricky part: WebRTC needs a signaling server to establish the peer connection. For the LAN case, we use a tiny in app signaling protocol that broadcasts the SDP offer via a known endpoint on the hub (a fetch handler in the service worker), and falls back to manual QR code exchange (hub shows a QR with the offer SDP, peer scans, exchanges answer SDP via second QR) if the LAN handler doesn't work. The QR fallback is ugly but it's the brown M&Ms case: it always works as long as two screens are in the same room.

The dept choice (A or C) lives in Settings. Default is A. The Settings copy: "How does your dept handle scenes with no cell?" Option A: "Each device works on its own and syncs when service returns." Option C: "One device at the command post is the source of truth; others sync to it over local WiFi." Pick C when your dept routinely brings a portable hotspot to the scene and the IC's tablet stays in one place.

## The CP hub election and authority transfer

Build C raises a question Build A doesn't have to answer: which device is the hub? v4's answer is explicit, never automatic. The Owner or an Admin opens Settings on the device they want to be the hub and taps "Use this device as the CP hub." The app writes a record into `/departments/{deptId}/hub/active` with the device's UID, display name, and started timestamp. Peer devices reading that record show the hub status in their sync indicator.

When the IC hands off command, they often hand off the iPad. If the iPad was the hub, the new IC inherits hub status automatically because the UID stays with the device. If the IC hands off command but keeps the iPad and the new IC takes a different iPad, the new IC has to claim hub status explicitly. The transfer flow: new IC opens Settings, taps "Take over CP hub," the old hub gets a banner "[Name] is taking over as CP hub. Tap to confirm." After confirmation, the new device writes itself to `/departments/{deptId}/hub/active` and the old device stops accepting peer writes. Peer devices see the change in the hub record and reconnect.

This is intentionally manual. Automatic hub election (highest battery, best connectivity, oldest device) sounds clever and creates a class of bugs where the hub flips mid incident because someone's battery dropped one percent below the threshold. The IC picks the hub the way they pick the lieutenant of the entry team. Explicitly.

## The PAR question

The PAR (Personnel Accountability Report) is the test case that exposes whether the data layer is honest. The IC keys up: "All units, give me a PAR." Every team officer counts their crew and reports back over radio. The IC checks each report against their roster.

The roster lives in the app. Team officers added their crew at the start of the shift; assignments to operations happened over the course of the incident; some firefighters rotated out. The app's roster is the IC's ground truth for the radio PAR.

The data layer's contract: the roster on the IC's tablet at PAR time matches the roster the team officers see on their phones, regardless of whether comms have been up or down for the last hour. If the IC's tablet shows seven Entry Team members and the radio PAR comes back with five, the IC needs to know whether the discrepancy is (a) two firefighters actually unaccounted for or (b) a sync lag that hasn't pushed the two reassignments to her tablet yet.

The answer is visible sync state on the roster screen, not just on the global banner. Each row of the roster shows a small dot: green if the row was synced to Firebase within the last sixty seconds, amber if older than sixty seconds but synced at least once, grey if never synced (still local only). The IC glances at the roster during PAR and the dots tell her whether the data she's reading is fresh. If most dots are amber, she knows the last sync was a while ago and reads the PAR with appropriate skepticism. If a row is grey, she knows that change has not been seen by the hub or by Firebase.

This is not chrome; this is the sync model surfacing into the workflow that depends on it. Every other product in the corpus shows one global sync indicator and hopes the user trusts it. v4 shows per row sync state where the staleness actually matters. The IC trusts the radio for life safety (Principle 10) and trusts the app for the count, but only because the app is honest about what it knows.

## Listener lifecycle and Firebase quota

v3.6.0 nailed listener teardown with `teardownListeners()` and `setupListeners()`. v4 inherits the same pattern at the same place in the lifecycle (dept switch, logout, sign in completion). The new wrinkles are role aware listener scoping and quota awareness.

Role aware scoping means an Observer device doesn't attach the same listener tree as an Admin. Observer reads the same data but doesn't need the diagnostic listeners, the offlineTouched flush listeners, or the member registration listener. Each listener costs Firebase bandwidth and downstream device battery. Scoping listeners to role reduces the per device cost and the per dept Firebase quota cost. At the long tail scale (100 depts, 2500 users) this matters.

Quota awareness means v4 instruments listener fire counts in the diagnostics tree. Every listener registers a counter; the counter increments on every snapshot fire; the counter is logged into /diagnostics/listeners/{deptId}/{listenerName}/ on a periodic flush. When a listener starts firing at an abnormal rate (a peer device caught in an update loop, a runaway transaction, a malformed schema causing repeated re renders), the diagnostics catch it before the Firebase bill catches it.

The archived ops listener already uses `limitToLast(archivedOpsLimit)` (v3.12.0 R1-12). v4 extends the same pattern to feedback (limit to last 200), hazards (limit to last 100), and checklists (no limit, but lazy load: only the active op's checklist tree is attached, others are read on demand). The default listener tree at app start, for a Member role, is: own member record, dept config, active operation, inventory (limited to apparatus the user is assigned to via a query filter), apparatus list, hub status. Everything else is lazy.

## Sync diagnostics, v4 fidelity

v3.8.1 added /diagnostics/sync/ events. v3.8.2 added per event detail. The tree has grown to flush, resync_enqueued_via_failure, transaction_failed, discard_version, discard_stale, discard_max_retries, resync_applied, resync_dropped, resync_failed. Good list. Inspect via Firebase console.

The Firebase console inspection is the weakness. The IC doesn't open the Firebase console. The dept admin doesn't open the Firebase console. Alex opens the Firebase console when something has clearly gone wrong and we want to know why. That's diagnostic, not observable. v4 needs both.

The diagnostic tree stays for post mortem inspection. v4 adds an in app observability surface: Settings → "Sync health." The screen shows: last successful sync time, pending write count, last 20 sync events (event type, timestamp, path, outcome), connection state, hub status, quota usage if available via the Firebase Performance Monitoring SDK. A "Copy diagnostics" button lets the user copy a JSON blob to clipboard and paste into a feedback report. This is for the Admin role only (Members and Observers don't see it). When a field tester says "sync broke on my device today," we have a real artifact to debug from, not a "well, did you see any error?" conversation.

The diagnostic tree retention is a real question. Currently /diagnostics/sync/ is unbounded. At the long tail scale (100 depts × 2500 users × ~50 events/user/day) this is 12.5M events per day, ~4.5B per year. Firebase Realtime Database charges per GB stored and per GB transferred. v4 ships a server side TTL on diagnostics: events older than 30 days are deleted by a scheduled Cloud Function. The 30 day window is enough for post mortem on any reasonable incident and short enough to keep the storage cost bounded.

## Audit logging

D7.5 calls for audit logging of every state changing action with: user UID, role at time of action, device ID, timestamp, action, before state, after state. v3's `roleHistory` event log is the foundation; v4 extends it to every mutation.

The implementation: `firebaseSave()` writes the mutation as it does today AND emits an audit event to /departments/{deptId}/audit/{auto id} containing the actor (UID + role + display name), the path, the method (set/update/remove/transaction), the timestamp, the before snapshot (read via `once('value')` before the mutation, but only for paths shorter than 5 levels deep to bound the snapshot size), and the after value. For deep paths or large subtrees, we record the diff only (computed client side from the before snapshot and the new value).

The audit tree is queryable by user, by date range, by path prefix, by operation. The Admin role gets a "Audit log" screen in Settings. The Owner can export the audit log for an operation as part of the after action report. For incidents with liability or insurance exposure (the structural collapse case is exactly this), the audit log is the artifact that proves who made which call and when.

Retention: audit events for active and archived operations live forever (they're part of the legal record). Audit events for deleted operations live for 90 days, then move to cold storage (export to a flat JSON in Firebase Storage, then deleted from Realtime Database). The cold storage tier is cheap; the live tree stays performant.

## The atomic allocate plus create Cloud Function

The MEMORY.md note mentions "Cloud Function for atomic allocate+create" as v4 work. What it actually does: when a user creates a shore point that requires deploying a strut from inventory, the operation is two writes (decrement inventory available, create shore point with deployedStrut reference). If those two writes happen non atomically, two concurrent users can each see "1 strut available," each decrement to 0 (one transaction succeeds, the other gets aborted by Firebase's transaction retry mechanism), but only one shore point gets created because the failed decrement leaves the second create write orphaned in pendingWrites.

v3 mitigates this with the transaction retry plus the offlineTouched pipe. v4 ships a Cloud Function `allocateAndCreate` that takes (deptId, opId, shorePointPayload, strutInventoryId) as arguments and does both writes inside a server side transaction. The client calls the function via Firebase Callable Functions; the function runs the transaction; the client gets back either the created shore point ID or a typed error ("OUT_OF_STOCK," "PERMISSION_DENIED," "OP_NOT_ACTIVE"). The consistency guarantee is server side atomicity: either both writes commit or neither does, regardless of how many clients try to allocate the same strut simultaneously.

The Cloud Function path is only used when the device is online. When offline, the client falls back to the v3 transaction + offlineTouched pattern, and the next flush either succeeds (no contention happened while offline) or surfaces the conflict to the user ("Another device already took that strut. Pick a different one"). The Cloud Function is the strongly consistent path for online operations; the local transaction is the eventually consistent path for offline ones.

The same pattern applies to: assigning an apparatus to a role (atomic: write role assignment, write apparatus status), starting an operation (atomic: write op record, write IC assignment, write initial roster), and ending an operation (atomic: write end timestamp, return all deployed inventory, archive). Each is a Cloud Function with the same shape: callable, transactional, typed errors.

## Service worker strategy for v4

v3's sw.js is single page caching: ASSETS array, install precaches, fetch handler does stale while revalidate, Firebase URLs bypass. Fine for a single HTML file plus a single JS file plus a single CSS file.

v4 is a multi asset bundle (assuming we pick a build tool in Phase H; Vite is the leading candidate per open question #11). The asset list is no longer hardcoded; it's generated by the build. v4's sw.js becomes a Workbox style precache manifest: the build emits an `asset-manifest.json` with content hashed filenames, the service worker reads it on install, and precaches the full bundle. On every release the manifest changes, the SW detects the new manifest, downloads the new bundle in the background, swaps to the new version on the next page load (after asking the user "An update is ready, reload now" via a toast — Principle 11, the app earns its place quietly, no forced reloads).

The Firebase URL bypass stays the same. The SheetJS pre cache stays the same. The new addition is per route caching for the v4 marketing site at fieldshore.app (or whatever the marketing domain ends up being). The marketing site is a separate origin from the app, has its own cache strategy (cache first for assets, network first for content), and is precached on install of the app PWA so the "About FieldShore" link from inside the app works offline.

## Backup, export, restore

v3.15.0's `backupBeforeDestructiveWrite()` pattern is the right shape. Every destructive write (end operation, delete operation, import inventory, division migration) creates a snapshot under /departments/{deptId}/_backups/ before the destructive write runs. The backups are timestamped and labeled with the reason. `maybeBackup()` runs throttled (once per 60s after any non backup write) for general drift protection.

v4 inherits both. The additions: (1) a Settings → "Export dept data" affordance that produces a single JSON file containing inventory, apparatus, operations (active and archived), custom roles, members, audit log; (2) a "Restore from export" affordance that takes a previously exported JSON and reconstructs the dept tree, gated by Owner role; (3) automatic weekly export of every dept to Firebase Storage, retained for 90 days, so a catastrophic data loss (rule misconfiguration, accidental rm on the dept, a bug that corrupts a subtree) has a recovery path that doesn't depend on the Firebase console.

The export format is versioned: every export carries an `exportVersion: '4.0.0'` field. Import validates the version and refuses to import an export from a future major version (the schema may have changed). This is the same pattern as the appVersion filter on pendingWrites, applied to the export artifact.

## Department deletion

The hardest data op. An Owner taps "Delete this department." The button is disabled by default (Principle 6 — doubt free escapes, but deletion is the one case where doubt is warranted because it's irreversible). To enable, the Owner has to: (1) type the dept name exactly; (2) tap a checkbox "I understand this deletes all data, including the audit log"; (3) confirm via a 30 second delay timer that counts down on the button before the "Delete" tap is accepted. Apple's pattern for irreversible destructive actions, slowed.

The deletion itself: (1) export the dept tree to Firebase Storage with a 90 day retention (the only "undo" available); (2) write `/departments/{deptId}/_deleted` with timestamp, Owner UID, reason if provided; (3) remove the dept from the active tree but keep it in `/deleted-departments/{deptId}/` for 30 days, read only, in case the Owner regrets the call; (4) after 30 days a Cloud Function moves the dept to cold storage; (5) after 90 days the cold storage export is deleted.

The flow surfaces in the app: deleted depts show in Settings → "Recently deleted" with a "Restore" button for the 30 day window. Members of a deleted dept see a banner: "Your department was deleted by [Owner name] [time]. Data is preserved for 30 days. Contact your Owner to restore." This is the kind of detail that a generic incident management product doesn't bother with because the deletion case is rare. For us it's the case that exposes whether the Owner trusts us with the dept's data.

## Cross device handoff

The Battalion Chief is running v4 on her phone. The IC arrives and opens v4 on the iPad. They're the same person (in this scenario; in others they're not). What does the iPad show?

The iPad shows the same dept, the same active operations, the same roster, the same shore points, the same hazards. The auth UID is different (per device UIDs, IndexedDB persisted). The role is the same (Member, Admin, Owner — assigned per UID but the same person can hold the same role across multiple devices because the dept member record allows it). The active operation is the same because the operation lives in Firebase, not on any one device.

The handoff that's harder is hub handoff (covered above) and command transfer (the IC role moves from one UID to another). Command transfer in v3 updates the IC pointer in the operation record. v4 keeps that and adds: the new IC's device gets a "You are now IC" toast and a new affordance set (IC only screens become available); the old IC's device gets "Command transferred to [name]" and the IC affordances become Observer level for that operation; the audit log records the transfer with both UIDs and the timestamp.

The hardest handoff is the one nobody plans for: the IC's phone dies and she opens v4 on a borrowed device. The borrowed device has no auth, no IndexedDB UID, no dept membership. The recovery flow: the borrowed device signs in anonymously (gets a fresh UID), enters the dept invite code, gets added as a Member (because invite codes are Member by default), then the existing Owner or Admin promotes the borrowed device's UID to IC for the active operation. Three taps from a fresh device to "I am IC again." If no Owner or Admin is reachable to promote, the borrowed device is an Observer on the operation and the radio still works. Principle 10 holds.

## What the marketing site needs to say

The marketing site at fieldshore.app needs a "How sync works" page. The honest version of that page, not the FAANG sleight of hand version that says "it just works." The page covers: (1) every device stores everything it knows in IndexedDB; (2) writes commit locally first, then to the cloud when service returns; (3) the IC's device can run a hub mode that other devices sync to over local WiFi, for scenes with no cell; (4) data is encrypted in transit and at rest; (5) the dept Owner owns the data and can export or delete it at any time; (6) for incidents with liability exposure, an audit log records every change with the user, role, time, and old/new values, retained for the life of the incident.

The page exists not because every visitor cares about sync mechanics but because the people who decide whether to adopt the app (chiefs, USAR program managers, dept admins responsible for HIPAA adjacent data) do. Tablet Command's marketing skirts the offline question; First Due's marketing leans on "cloud native" as a virtue when it's an architectural choice with real failure modes; RedNMX's marketing pretends sync isn't a thing. v4's marketing tells the truth about how the data layer works, in plain language, on a page that's two minutes to read.

## Recommendations

1. Replace shared anonymous auth with per device Firebase Anonymous UIDs persisted in IndexedDB at `fieldshore_auth_uid`. Set Firebase Auth persistence to `LOCAL` explicitly on init. Run the v3 → v4 migration once on first launch: capture localStorage state, sign in anonymously, register as Member of existing dept with display name "Migrated device," merge local snapshot with remote, write `_meta/v4MigratedAt` for idempotency.

2. Implement Owner / Admin / Member / Observer role gating in `database.rules.json` via nested role lookups (`root.child('departments').child($deptId).child('members').child(auth.uid).child('role').val()`). Owner has a single seat per dept, claimed once via the "Claim department ownership" flow if no Owner exists.

3. Ship a schema test suite in CI that round trips representative payloads of every shape through the Firebase Rules emulator before deploy. Any rule rejection is a deploy blocker. Add validate rule failure surfacing in the app: a toast with path, field, and rejecting rule, visible to Admin role only.

4. Generalize the STATUS_ORDER guard into a state machine doctrine. Every monotonic field declares a sorted state list at both the client and rule layer. Regressions are explicit, named operations with their own audit trail and undo affordance. Forward progressions cannot be overwritten by stale writes.

5. Last write wins for free text fields with a conflict surface: every editable text field records `_meta/lastEditedBy` and `_meta/lastEditedAt`. When a snapshot arrives showing a peer edit within the last 60s AND the local device has unsaved changes, show a "Keep mine / Use theirs / Show both" prompt. CRDTs are not adopted; state machines and conflict surfaces handle the cases that matter.

6. Build C (CP hub mode) ships as a Settings toggle. Hub uses WebRTC data channels for peer to hub sync, with mDNS discovery on Chrome and QR code fallback for iOS Safari and any LAN with multicast disabled. Hub election is explicit (Owner/Admin taps "Use this device as the CP hub"). Hub failover to Build A is automatic when peers can't reach the hub.

7. Add per row sync state to the roster screen: green dot for synced within 60s, amber for older than 60s, grey for never synced. The IC reads sync staleness directly in the workflow that depends on it (PAR), not in a global banner.

8. Add Settings → "Sync health" for Admin role: last sync time, pending write count, last 20 sync events, connection state, hub status, quota usage, "Copy diagnostics" button. Diagnostic tree at /diagnostics/sync/ stays for backend inspection but the operational surface lives in the app.

9. TTL the /diagnostics/sync/ tree at 30 days via a scheduled Cloud Function. Bounds storage cost at the long tail scale.

10. Extend audit logging to every state changing mutation. `firebaseSave()` emits an audit event to /departments/{deptId}/audit/ containing actor UID, role, display name, path, method, before snapshot (for shallow paths) or diff (for deep paths), timestamp. Retention: forever for active/archived operations, 90 days then cold storage for deleted operations.

11. Ship `allocateAndCreate` as a Firebase Callable Cloud Function for atomic inventory decrement + shore point create. Online clients use the function; offline clients fall back to the local transaction + offlineTouched pattern. Apply the same Cloud Function pattern to assignApparatusToRole, startOperation, and endOperation — each is an atomic multi write with typed error returns.

12. Refactor sw.js for the v4 multi asset bundle: precache manifest emitted by the build, background download of new versions, "An update is ready, reload now" toast on next page load. Firebase URL bypass and SheetJS pre cache stay. Add per route caching for the marketing site origin.

13. Add Settings → "Export dept data" (JSON file with inventory, apparatus, operations, custom roles, members, audit log) and "Restore from export" (Owner only). Automatic weekly export of every dept to Firebase Storage, 90 day retention.

14. Department deletion requires: typing dept name exactly, checkbox acknowledgment, 30 second countdown on the Delete button. Soft delete to /deleted-departments/ for 30 days with Restore affordance, then cold storage for 60 more days, then permanent delete. Banner to surviving Members: "Your department was deleted by [Owner] [time]."

15. Cross device handoff via per device UIDs: same person can hold the same role across multiple devices because membership is per UID, not per person. Command transfer flow: IC role moves from one UID to another via Owner/Admin promotion, audit logged with both UIDs. Borrowed device recovery: sign in anonymously, enter invite code (Member by default), Owner/Admin promotes to IC if needed.

16. Listener scoping by role: Observer attaches read only listeners, Member attaches own assignments, Admin attaches everything. Lazy load checklists, hazards, archived ops on demand. Instrument listener fire counts in /diagnostics/listeners/ for runaway detection.

17. Ship "How sync works" as a page on the v4 marketing site. Plain language explanation of local first, IndexedDB persistence, hub mode, encryption, Owner data control, audit log retention. Two minutes to read, honest about failure modes.

18. Promote `APP_VERSION` and the appVersion filter on pendingWrites to a first class part of the resilience contract. Every write carries the app version. Flushes discard writes from older versions. This was the v3.8.2 lesson and v4 keeps it.

19. Inventory available counts stay on the v3.16.4 transaction + offlineTouched pattern. The Cloud Function path is for the create case (allocateAndCreate). The local transaction path is for the decrement/increment case. Both coexist; clients pick based on online state.

20. Hub mode and Build A coexist on the same dept. If the hub is reachable, peers use it. If the hub is unreachable for more than 60 seconds, peers automatically fall back to writing directly to Firebase via Build A. The sync indicator reflects which mode is active: "Synced via CP hub" or "Synced directly." No silent fallback; the operator always knows.

# Role 3 — DevOps & Resilience — v3.11.2
**Audit date:** 2026-05-18
**Lane:** Firebase config + auth + SW + queue + diagnostics + PWA

## Executive summary

The v3.10+ resilience work (F-1B/F-1E/F-5B series) is largely solid. Anonymous auth waits for `getIdToken()` before listener attach; `teardownListeners()` covers all six listener types plus `connRef`; SRI is pinned on all four CDN scripts; the v3.8.2 inventory validate-rule mismatch is fixed; the v3.8.1 sync diagnostics path is live; and the v3.10.1 backup safety net (`maybeBackup`/`backupBeforeDestructiveWrite`/`pruneOldBackups`) is wired correctly. Live-site v3.11.2 confirmed via WebFetch: `CACHE_NAME = 'fieldshore-v3.11.2'` deployed, header version label matches.

But four real holes remain. The biggest are the **incomplete `disableFirebaseWrites` kill-switch** (R3-01 — bypassed by `flushPendingWrites`, `registerMember`, and the two `logSyncEvent` direct pushes — the v3.10.1 hfd217-wipe regression class is **not fully closed**), an **untested feedback validate path** (R3-02 — a 0.5–1 MB compressed photo silently exceeds the 500 KB rule and the user gets a "Thank you" alert before the write completes), **GitHub Pages serves `sw.js` with `cache-control: max-age=600`** (R3-03 — a Fastly proxy may keep stale SWs for 10 min after a release, delaying hotfixes), and **the manifest has only one 192×192 SVG icon** (R3-04 — Android install drops to a generic icon at splash/recents). One MEDIUM and one LOW round it out: pending-write `members/{uid}` set-true is missing the `disableFirebaseWrites` guard (R3-05), and feedback queued offline writes lose their `appVersion` tag (R3-06).

No findings on auth flow ordering, listener teardown, security rules shape, SRI integrity, or SW activate-purge. All clean.

## Severity histogram

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 1 |
| NIT | 0 |

## Findings

### V3.11.2-R3-01 — `disableFirebaseWrites` is bypassed by `flushPendingWrites` (HIGH, REGRESSION)

**Failure mode:** Test-mode kill-switch race. The v3.10.1 hfd217 inventory-wipe incident was the named reason `window.disableFirebaseWrites` exists (`app.js:972-982`). The flag is honored in `firebaseSave()`, `maybeBackup()`, `backupBeforeDestructiveWrite()`, and `pruneOldBackups()`. It is NOT honored in `flushPendingWrites()` (`app.js:1131-1202`).

**Current behavior:** If a developer or test driver:
1. Sets `window.disableFirebaseWrites = true` early in the session,
2. Has stale entries in `localStorage.fieldshore_pendingWrites` from a prior session,
3. Comes online (the `.info/connected` listener at `app.js:1608` calls `flushPendingWrites()` unconditionally),

…then every queued `set`/`update`/`remove` runs against production at `db.ref(path)`. This is exactly the failure mode v3.10.1 was meant to eliminate. The path-rebuild step at line 1162 (`op.path.replace(db.ref().toString(), '')`) means a queued write from `/departments/hfd217/inventory` still resolves to `/departments/hfd217/inventory` after the strip.

**Fix proposal:** Add the guard at the top of `flushPendingWrites`:
```js
if (typeof window !== 'undefined' && window.disableFirebaseWrites === true) {
  console.info('[flushPendingWrites] disabled by window.disableFirebaseWrites');
  return;
}
```
Place after the early-return at line 1132. Rollback: trivial single-line deletion.

**Hand-off:** qa-driver should add a regression test: set kill-switch, manually push entries into `localStorage.fieldshore_pendingWrites`, force `connRef` to fire, confirm no production writes via `/diagnostics/sync` `flush` events.

### V3.11.2-R3-02 — Feedback photos can silently fail the 500 KB validate rule (HIGH, NEW)

**Failure mode:** Validate-rule rejection with a green "success" alert. `database.rules.json:60-62` enforces `image.length < 500000`. `previewFeedbackImage()` (`app.js:2538-2568`) caps INPUT at 5 MB but compresses to 800×600 JPEG quality 0.6, then base64. Worst case (high-detail photo): a compressed 800×600 JPEG at q=0.6 is typically 80–200 KB, base64-inflated to 110–270 KB — safe. But operator screenshots, panoramic crops, or high-contrast field photos can land at 400–600 KB base64. No client-side check.

**Current behavior:** `submitFeedback()` at line 2596-2600 calls `firebaseSave(feedbackRef, 'set', entry)` then **immediately** shows `alert('Thank you! Your feedback has been submitted.')` and closes the modal. The alert fires synchronously — before `firebaseSave`'s Promise resolves. If the validate rule rejects (`PERMISSION_DENIED: image.length < 500000`), the error lands in the offline-queue catch path at line 1005-1023. The write queues for retry, retries 3 times (all fail validation, same payload), then gets `discard_max_retries`-logged. The user believes their bug report was filed; the IC believes feedback works.

**Fix proposal:** Add a length check in `previewFeedbackImage` after `toDataURL`:
```js
feedbackImageData = canvas.toDataURL('image/jpeg', 0.6);
if (feedbackImageData.length >= 500000) {
  // Retry at lower quality
  feedbackImageData = canvas.toDataURL('image/jpeg', 0.4);
  if (feedbackImageData.length >= 500000) {
    alert('Photo too detailed — please try a simpler image.');
    feedbackImageData = null;
    return;
  }
}
```
Rollback: revert the post-compression branch.

**Hand-off:** Out-of-lane for qa-driver — once R3-01 is in, drive submitFeedback with a known >500 KB base64 string, observe `/diagnostics/sync` for `discard_max_retries` events on `feedback/*` paths.

### V3.11.2-R3-03 — GitHub Pages serves `sw.js` with 10-minute proxy cache (MEDIUM, NEW)

**Failure mode:** Hotfix propagation delay. `curl -I https://vergo402.github.io/paratech-struts/sw.js` returns `cache-control: max-age=600` and `via: 1.1 varnish`. Fastly may cache the SW file for up to 10 minutes regardless of `reg.update()` interval. Browsers re-check the SW on navigation but obey HTTP cache headers; combined with the 30-minute `reg.update()` interval at `app.js:6218`, worst-case hotfix delivery is **30 + 10 = 40 minutes** after merge, not the "push and done" model assumed in CLAUDE.md.

**Current behavior:** Hotfix released → GitHub Actions deploys → Fastly may serve stale `sw.js` to any client whose path through a particular POP hasn't seen a refresh. The new SW only installs when the browser fetches a fresh copy. For an IC who left the app open during a release this is invisible; for a crew opening the app 5 minutes after deploy, they may load the previous version. Specifically problematic for safety-table corrections (S2/S3 class).

**Fix proposal:** No code change available — GitHub Pages headers aren't controllable from the repo. Two mitigation paths:
1. Drop `reg.update()` from 30 minutes to 5 minutes (`app.js:6218`). Cost: extra network request per tab per 5 min.
2. Add an in-app "Check for updates" button in Settings that calls `reg.update()` on demand.

Rollback: revert the interval change, remove the button.

**Hand-off:** Discuss with BC — this is a deployment-pipeline finding, not strictly devops. Could justify a Cloudflare Pages migration on the v4.0.0 reset.

### V3.11.2-R3-04 — `manifest.json` missing 512×512 icon (MEDIUM, STILL-OPEN)

**Failure mode:** Android install / Chrome splash falls back to generic icon. `manifest.json` declares one `data:image/svg+xml` icon at `192x192`. PWA install criteria require at least one 192×192 AND at least one 512×512 (or a `purpose: "any maskable"` variant) for splash screens. Current state: install prompt may appear (192 suffices for `installable`), but Android home-screen/launcher icon and the cold-start splash use a placeholder. Web App Manifest validators consistently flag this.

**Current behavior:** Inspected `manifest.json` lines 10-16 — single icon, no `purpose` attribute. The inline SVG (a blue 192×192 with white "P") will scale up but Chrome's splash-screen generator only auto-upscales when a 512 is declared.

**Fix proposal:** Add a second icons entry with `sizes: "512x512"` and same `data:image/svg+xml,...` source (SVG is vector — same data string works at any size). Also add `purpose: "any"` and consider a maskable variant. Rollback: remove the new entry.

### V3.11.2-R3-05 — `registerMember` bypasses kill-switch (MEDIUM, REGRESSION)

**Failure mode:** Kill-switch incomplete. `registerMember(uid)` at `app.js:1672-1688` issues `db.ref(...).members/${uid}.set(true)` without consulting `disableFirebaseWrites`. A tester running `window.disableFirebaseWrites = true; setupListeners()` still writes the device UID into the production members map.

**Current behavior:** Once a UID is in `members/{deptId}/`, security rules grant that UID write access. If the test session later flips the kill-switch off (or another bug bypasses the guard like R3-01), the device can write production data immediately. Defense-in-depth violation: the kill-switch should produce a fully read-only client.

**Fix proposal:** Guard at top of `registerMember`:
```js
if (typeof window !== 'undefined' && window.disableFirebaseWrites === true) return;
```
Rollback: trivial deletion.

### V3.11.2-R3-06 — Offline-queued feedback writes lack `appVersion` (LOW, STILL-OPEN)

**Failure mode:** Version-filter bypass. `submitFeedback()` at `app.js:2603` queues a fallback offline write:
```js
pendingWrites.push({ path: 'feedback/' + Date.now(), method: 'set', data: entry, timestamp: Date.now(), retries: 0 });
```
No `appVersion` key. The v3.8.2 fix at `flushPendingWrites` line 1140 checks `if (op.appVersion && op.appVersion !== APP_VERSION)`. Because the field is missing, the guard short-circuits as truthy-only, and a feedback queued on v3.8.x can flush against v3.11.2 unmodified. The payload itself contains `entry.appVersion = APP_VERSION` set at submit time so the data is fine — but the architectural inconsistency means future schema migrations on feedback writes won't catch these.

**Fix proposal:** Add `appVersion: APP_VERSION` to the queued op object at line 2603 to match the contract used by `firebaseSave`'s catch path at line 1008. Rollback: trivial.

## Verified-fixed (confirming claims)

- **F-1B-01** `connRef` promoted to module scope and torn down: confirmed `app.js:632, 1599, 1735-1737`. Detach path correct.
- **F-1E-1** Auth-failure persistent banner with retry: `app.js:1573-1576, 1627-1666`. Banner copy honors the "auth failed, working offline" requirement in this lane's brief.
- **F-1E-2** Member registration retry queue: `app.js:1672-1699`. Three retries, exponential backoff, flushed on reconnect via `.info/connected` callback.
- **F-1E-3** `.info/connected` snap null-guard: `app.js:1601`.
- **F-1E-4** Listener error callback wired: `app.js:1622`.
- **F-5B-14** SheetJS precached for air-gapped operation: `sw.js:13-15, 24-27`. CORS mode + SRI continuity preserved.
- **Auth ordering** `setupListeners` waits on `firebase.auth()._authReady` and forces `getIdToken(true)` before attaching: `app.js:1745-1757`. Correct.
- **First-fire guards** Inventory/apparatus/customApparatusTypes all push-up-not-wipe on first empty snap: `app.js:1780-1791, 1837-1847, 1874-1879`.
- **v3.8.2 inventory validate** Rule requires `model/quantity/available`: `database.rules.json:18`. Matches inventory write shape.
- **v3.9.0 `.indexOn`** Operations status indexed: `database.rules.json:27`. Matches `orderByChild('status')` queries at `app.js:1800, 1817`.
- **v3.10.1 backups** `maybeBackup` rate-limited (60s), excludes `_backups` subtree, capped at 50 keys: `app.js:1048-1129`. Pre-destructive backup throws (does not silently swallow) on read or write failure.
- **SW activate cleanup** `caches.keys().filter(k => k !== CACHE_NAME).map(...delete)`: `sw.js:34-41`. Correct.
- **Firebase fetch bypass** Both `firebasejs` and `firebaseio` URL substrings excluded: `sw.js:46`.
- **SRI** All three Firebase compat SDKs (v9.23.0) + SheetJS pinned with SHA-384: `index.html:624-632`. `crossorigin="anonymous"` set.
- **Auth gate on rules** `auth != null` enforced at every dept and feedback subtree: `database.rules.json:5-6, 56-62`. Members-based read/write further restricts.
- **`disableFirebaseWrites` guard** Correct in `firebaseSave`, `maybeBackup`, `backupBeforeDestructiveWrite`, `pruneOldBackups` — but see R3-01 and R3-05 for gaps.

## Out-of-lane notes (one-liners)

- **code-auditor:** `submitFeedback()` `alert(...)` at `app.js:2599` fires synchronously before the async `firebaseSave` Promise resolves — generic UX-vs-correctness issue beyond just the validate-rule case in R3-02. Could merit a `.then(() => alert(...))` refactor.
- **code-auditor:** `pendingWrites` queue write at `app.js:2603` uses `path: 'feedback/' + Date.now()` (relative). All other queue entries use `ref.toString()` (absolute URL). Inconsistent contract but functionally OK after the strip at line 1162.
- **mobile-ux:** GitHub Pages 10-minute `cache-control` on `sw.js` (R3-03) could surface as "I updated the app but my partner still sees the old version" complaints from crews.
- **BC:** v4.0.0 per-device UID + role-based rules is partially live already — `members/{uid}` gate is deployed in `database.rules.json:5-6`. The roadmap entry "Per-device UID + role-based security rules" is half-done; only role-based write restrictions remain.
- **nims:** No findings.
- **SME:** No findings.

---
*Read tool calls: 8. WebFetch calls: 3. Live-site interactions: GET only. No source edits. No Firebase writes.*

# Handoff — Address Autocomplete (#440) + What3Words (#441) + the Beta URL gotcha

**Branch:** `v4-redesign` · **Firebase project:** `fieldshore-database` (the v4 project, NOT v3 prod)
**Status as of 2026-07-11:** both features built, tested (1367 green), committed/pushed, and **deployed to the correct beta channel + live-verified working.**

---

## ⚠️ READ THIS FIRST — the beta is a Firebase preview CHANNEL, not the live site

There are **two different URLs** on `fieldshore-database`:

| What | URL | Deploy command |
|---|---|---|
| **Beta (what Alex uses)** | `https://fieldshore-database--beta-go29zg4q.web.app` | `firebase hosting:channel:deploy beta --project fieldshore-database --expires 30d` |
| Live channel (NOT the beta) | `https://fieldshore-database.web.app` | `firebase deploy --only hosting` |

**`firebase deploy --only hosting` pushes to LIVE, which is NOT Alex's beta.** A whole debugging
session was lost deploying to live, verifying it there, and reporting "works" while Alex's beta
channel stayed on an old build (so his address dropdown did nothing — the feature wasn't in his
build). **When Alex says a feature is missing/broken on beta, confirm you're testing the exact
URL he is** (`fieldshore-database--beta-…`, not bare `fieldshore-database`). Channels EXPIRE —
always pass `--expires`.

To deploy to beta: `npm run build && npx firebase hosting:channel:deploy beta --project fieldshore-database --expires 30d`.

---

## What shipped

- **#440 — address autocomplete** on the operation **Location / address** field (`StartOperationModal`).
  Commit `4f6a1a6`. Google Places (New) via the **Maps JS SDK** (the REST endpoint has no CORS;
  SDK is the browser path). Own dropdown, coords stored on the op (`coords` on
  `OperationCreated/Edited` + reducer). Loads the SDK on demand (`loading=async` + `callback=`
  ready signal — script `onload` fires BEFORE `importLibrary` exists). Dropdown portals to
  `document.body` (the Modal body scroll-clips in-flow children), z-index 400.
- **#441 — what3words** on shore points. Commits `636cf47` + refinement `b32a237`.
  **Capture is EXPLICIT in the Add Shore Point form** ("Capture location (what3words)" control with
  the geographic fields) — the earlier silent auto-capture-on-save was removed. Coords land
  instantly, words confirm inline, both write onto the created point(s) at creation (fan to every
  group leg = one 3m square per shore). Board card also has a Capture button + an online backfill
  (`useW3wBackfill`) that converts coords→words when connectivity returns. Quick View drawer shows
  a Location section. w3w REST **IS** browser-CORS-OK (plain `fetch`, unlike Places).

### Files
- `src/data/places/places.ts` (Maps SDK loader + `beginAddressSession`/`placesEnabled`)
- `src/data/w3w/w3w.ts` (`convertToWords`/`w3wEnabled` — plain REST GET)
- Both re-exported through **`src/ui/hooks/index.ts`** — ui/* must NOT import `@data/*` directly (invariant 3, lint-enforced). Any test that wholesale-`vi.mock('@ui/hooks')` and mounts these components must add these exports to its mock.
- `src/ui/operations/AddressField.tsx`, `AddShorePointModal.tsx` (form capture), `locationCapture.ts` (`getGpsFix` + `captureLocation` + `useW3wBackfill`), `ShorePointCard.tsx` (`W3wChip`), `ShorePointDetail.tsx` (Location section), `operations.css` (`fs-addr-*`, `fs-spc-w3w*`, `fs-asp-loc*`).
- schema: `coords`+`w3w` on `ShorePoint` + `ShorePointPatch` (metadata, applies in ANY status — exempt from the #220 sizing-field lock); `coords` on the operation. The coarse event security rule needed NO change.

---

## Keys (`.env.local`, gitignored — baked into the build at COMPILE time)

- `VITE_GOOGLE_MAPS_KEY` — browser key, referrer-restricted. Its allowlist already covers BOTH
  the beta-channel origin AND live (verified). Address autocomplete **works on beta**.
- `VITE_W3W_KEY=ZT3HDU71` — **demo key, returns HTTP 402 QuotaExceeded** for convert-to-3wa. So
  the capture shows **coordinates only, not the 3 words**, on beta. This is EXPECTED, not a bug —
  needs a what3words plan with convert-to-3wa access. If the plan is upgraded on the SAME key, no
  rebuild is needed; a NEW key value requires a rebuild + redeploy (baked at build time).
- Referrer/plan changes are console settings (no key value change) → **no rebuild** needed.
  A new KEY VALUE → **rebuild + redeploy** required.

---

## Verification tricks (v4 preview / real beta)

- Start Operation + Add Shore Point are gated on `manageOperations` (guests can't). To reach them,
  seed the Dexie session: in the `fieldshore-global` DB `meta` store, put key `fieldshore_session`
  = `{"identity":{"kind":"guest"},"departmentId":null,"departmentName":null,"role":"admin","inviteCode":null}`,
  then reload. Identity MUST stay guest (a real member gets downgraded; a departmentId switches the
  Dexie bucket). Each origin (beta channel vs live) has its OWN IndexedDB — seed on the URL you test.
- MCP browser has no geolocation, and `navigator.geolocation`/`navigator.clipboard` are read-only
  accessors — assigning the whole object is silently ignored. Override the **method**:
  `navigator.geolocation.getCurrentPosition = (cb)=>cb({coords:{latitude,longitude}})`.
- w3w demo key 402s → to see the words render, stub `window.fetch` to return `{words:'...'}` for
  `what3words.com`, then dispatch an `online` event (fires the backfill).
- Synthetic clicks / native-setter inputs don't flush React synchronously — read resulting DOM in a
  SEPARATE eval call. Radix Dialog won't scrim-close via synthetic click (reload clears it).

---

## Current state / outstanding

- ✅ Address autocomplete — **live-verified working on the beta channel**.
- ✅ w3w capture (coordinates) — on beta.
- ⏳ w3w **words** — coordinates-only until a real w3w plan (demo key quota-limited).
- Issues #440 and #441 are **closed/Done** on the v4 board (project 2). The #441 form-capture
  move was a post-close refinement (commented on #441).
- Suite: 1367 green; tsc/lint/build clean. Note: the branch also carries parallel work from other
  sessions (account-tag on org events in `event.ts`/`reducer.ts`/`hooks`) — not part of #440/#441.

# #262 tabletop exercise driver (Level IV, local emulators)

Plan: `.claude/plans/v4-phase-j-262-ttx.md` (Stage 1). The driver builds the Level IV scene
(URM strip-mall partial collapse, 822 Dixwell Ave, Hamden CT) on the **local Firebase
emulators** with three simulated devices, then runs the gate probes and records what it sees.
It never decides PASS or FAIL. That call belongs to the main loop.

| Device | Context | Role in the exercise |
|---|---|---|
| A | iPhone 13 (touch, so status changes are slides) | Founder/Admin, first Incident Commander, imports inventory, builds the scene |
| B | iPhone 13 (touch) | Second member (Default role); takes command, races A |
| C | Desktop 1280×800 (mouse, so status changes are buttons) | Cold reader; accepts the rig transfer with the 4-digit code |

## Run it

From the repo root, in three terminals:

```bash
npm run emulators      # Auth :9099 + Realtime Database :9000 (needs Java; the script sets PATH)
npm run dev:emu        # Vite in emulator mode on http://localhost:5200
node .claude/audits/phase-j/262-ttx/driver.mjs
```

Notes for the #499 / ADR-041 rules:
- The rules now require `receivedAt == now` (serverTimestamp sentinel) on every event create. The driver writes no event bodies itself; its one event PATCH backdates `at` only, and that must not change canonical order.
- Evidence sorts events canonically (`receivedAt`, then `at`, then id), matching `src/core/operation/eventLog.ts`.
- Inventory `available` in evidence is derived as quantity − held (`heldFromEvents`), because the stored field is gone.

The driver uses Playwright 1.53 from the npx cache
(`/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs`, override with
`PW_PATH`) and launches installed Chrome (`channel: 'chrome'`).

Every run starts clean:
- It deletes the emulator database root (`DELETE /.json?ns=fieldshore-database-default-rtdb`
  with `Authorization: Bearer owner`).
- It resets the Auth emulator accounts.
- It removes the previous run's captures and evidence.

`KEEP_STATE=1` skips all three.

| Env var | Effect |
|---|---|
| `BASE` | App origin (default `http://localhost:5200`) |
| `NS` | RTDB emulator namespace (default `fieldshore-database-default-rtdb`, the app's `-default-rtdb` instance) |
| `STOP_AFTER` | Stop after the first step whose name starts with this text (e.g. `"scene: evidence"`) |
| `HEADED=1` | Show the browsers |
| `KEEP_STATE=1` | Keep emulator state and old outputs |

## What it produces (this folder)

- `NN-<item>-<device>.jpg`: full-page captures, numbered in run order (`skip-NN-<device>.jpg` only when a step fails).
- `evidence/<probe>.json`: for each probe:
  - the REST GET of the op's event node (`orgs/<dept>/events/<opId>`), slimmed to the fields that matter
  - each device's IndexedDB event log with local `seq` (so fold order can be compared)
  - each device's `.info/connected`
  - the UI reads the probe's PASS column names
- `evidence/10.json` and `evidence/p10-export-*.csv`: the CSV round-trip evidence.
- `evidence/9.json`: the emulator `/feedback` entry.
- `results.json`:
  - `summary`: step counts and every SKIP line; prod-fence hits; external-dependency responses (host and path only, never the query, which carries keys); WebSocket open/close log; navigations; console errors.
  - `probes[]`: `{probe, status: 'ran'|'skipped', stepSkips, observed, captures}`. Probes 7 (N/A, #496) and 8 (beta half, main loop) are recorded as `skipped` with a reason. They are separate from selector SKIP lines.
- `run-log.txt`: the OK, SKIP, INFO and NOTE lines.
- `fixtures/accounts.json`: the three generated `*.test` accounts and passwords. It is **gitignored** and never printed.

## Order of play

1. Scene:
   - A signs up and creates Millbrook Fire Department. The invite code comes from REST and is cross-checked against the UI sheet.
   - B and C sign up and join by code.
   - A adds apparatus BC-1. A brand-new department shows only the "No apparatus yet" empty state; the import button needs at least one rig.
   - A imports `.claude/skills/shared/millbrook-inventory.csv`.
2. Probe 10: export, re-import, export again. IDs and counts are compared in the CSVs, in REST and in IndexedDB. This runs before the op, because import is limited during an op.
3. Scene, continued:
   - A starts the op.
   - A adds five T-Shores (Alpha → Engine 1, Bravo → Engine 2 with swivel plates; the others are set explicitly to "— None —", because Assigned carries over from the last point, #220) plus a Foxtrot 3-Post, for 8 cards.
   - A deploys Alpha, Bravo, Charlie and the Foxtrot legs.
   - A slides Charlie to Strut Set, and Foxtrot to Strut Set, then Cutting Station.
   - A assigns Engine 1 to the Shoring Group and staffs the Safety Officer.
4. Probes run in order **3 → 12 → 1a → 1b (rig + code) → 2 → 1b (#401 self) → 1c → 4 → 6 → 5/11 → 9**, then a 30-second late re-check that separates slow convergence from permanent divergence. The order follows two constraints:
   - **Probe 12 runs before any offline race.** A and B must tap Deploy from the same stock view; an earlier run showed probe 4's divergence leaking into a later probe 12.
   - **Who holds command matters.** Span-of-control editing is IC-gated, so probe 3 runs while A is IC. While a rig or a typed individual holds command, every device counts as IC, so probe 2 reads the brief on all three in that window and probe 1c starts from it.

   Each race probe (12, 1c, 4, 6) first records a **convergence gate** in its `observed.gate`. For every device it holds:
   - local op event ids vs REST (missing and extra counts)
   - Alpha and Delta card status
   - Dexie strut stock
   - `allInAgreement`

   So the adjudicator can see whether the race began from agreement.

## Forcing techniques

- **Offline** uses three levers together:
  - `context.setOffline(true)`, so `navigator.onLine` goes false and the banner and sync service react
  - a dispatched `offline` event
  - `goOffline(rtdb)` through the app's own `src/data/sync/firebase.ts`, pre-imported via `/@fs/` while online
  
  Offline is proved by `.info/connected === false`, by the `127.0.0.1:9000/.ws` close in the WebSocket log, and in each race probe by the offline device's event being absent from REST. Online reverses all three. An offline device is never navigated.
- **Backdate (probe 2):** a REST PATCH of the `OperationCreated` row's `at` to now − 2h41m. The same row is patched in each device's IndexedDB (via the `id` index; `seq` is the primary key), then all three reload. The over-24h read patches C locally only (27h12m), reads it, restores it and reloads.
- **Slides:** a mouse drag across `.fs-slide-track` on the touch contexts (the handlers don't check `pointerType`). On C the same move is the tap-once button.
- **3-Post stack:** a grouped shore renders as a stack. The driver clicks "Show all N cards" so every leg is its own card.

## Prod fence

Every context aborts HTTP and WebSocket traffic to `*.firebaseio.com`, `*.firebaseapp.com`,
`identitytoolkit.googleapis.com` and `securetoken.googleapis.com`. It matches on **hostname**
only, because the Auth emulator carries `identitytoolkit.googleapis.com` in its URL *path*.
Every hit is counted in `results.json → summary.prodFence`. Maps, Places and what3words
traffic passes through; its responses are recorded (host and path only).

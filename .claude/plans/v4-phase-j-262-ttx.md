# #262 Tabletop exercise — Level IV Hamden strip mall on local Firebase emulators, 3 simulated devices

Approved 2026-10-09 (plan-mode approval record in ~/.claude/plans; this in-repo copy is the durable one).

## Context

Gate #262 ("two real incidents OR one TTX run end-to-end on v4") is the next open Phase J Stage B
item. Its operative definition is the 11-item checklist posted on the issue (seven from the #261
battalion-chief review, four from the #491 dispositions). FieldShore has no users and Alex is the
sole tester, so he asked for the exercise to be performed for him (2026-10-09).

**Decisions (Alex, 2026-10-09):** run on **local Firebase emulators** (Auth + Realtime Database;
Functions only if sign-up needs a callable) so two test members and three simulated devices can sign
in and sync legitimately without touching the live project; use the **Level IV scenario** (URM
strip-mall partial collapse, 822 Dixwell Ave Hamden CT, 4 apparatus, 8 shore points incl. a grouped
3-Post, one operational period, Millbrook inventory CSV); the two **real-backend checks** (Places
suggestions on the beta, feedback landing in the live database) **run in this session on the beta
after Alex adds the beta host to the Maps key and signs in to the beta inside the built-in browser
pane** (his session; I never sign out or change the account); results go as a **report comment on
#262 plus a sub-issue under #138 per confirmed failure**; the **gate's pass/fail call stays with
Alex**.

**Corrections to stale references** (the run uses current truth): the Level IV skill's "v4 RE-POINT"
block still says cloud sync is a stub, command transfer has no UI, and the hazard log is a
placeholder — all three shipped (sync 2026-06-23; transfer UI + 4-digit code ADR-021; hazard log
#490). Checklist item 7 (broadcast wall-board, C-13) was never built and was deferred past v4.0 in
the #491 dispositions (#496) → recorded **N/A**, not a pass.

**Review-scoping rule (plan-v4-phase-j):** coverage matrix first, live external-dependency probes,
memory grep for known-broken. Memory grep done: what3words key answers 402 (plan not bought, #492);
Maps key is referrer-locked to the beta host (not yet allowlisted); in-app dept switch/leave is
WON'T-FIX; audit finding C-1 (two devices deploying the same point concurrently diverge) has **no
disposition** → added as probe 12.

**Hypotheses from exploration, to be proven or refuted by the run (not findings yet):** transfer
cancel-on-A vs accept-on-B may leave two ICs; opposite status moves from the same base on an offline
and an online device may diverge permanently; the shore-point card hazard badge may be unwired (merge
`73e95a1`); a leg with no deductions may show no connector rows at all in Quick View.

## Stage 0 — Emulator wiring (small code change, dev-only)

Design review confirmed: sign-up, department creation and join are pure client Auth + RTDB calls
(`provisionAccount` is admin provisioning only) → **Auth + Database emulators only**; the Functions
connect is added purely as a prod-traffic fence.

- `src/data/auth/firebase.ts` (after `getAuth`): `export const USE_EMULATORS =
  import.meta.env.VITE_USE_EMULATORS === 'true'`; guarded by a `globalThis.__fsEmu` run-once flag
  (Vite HMR re-runs the module): `connectAuthEmulator(auth, 'http://127.0.0.1:9099',
  {disableWarnings: true})`. Extract a pure `shouldUseEmulators(env)` helper for the test pin.
- `src/data/sync/firebase.ts` (after `getDatabase`): `if (USE_EMULATORS)
  connectDatabaseEmulator(db, '127.0.0.1', 9000)` (the SDK no-ops a same-host re-call); also
  re-export `goOffline`/`goOnline` so the driver's offline fallback uses the same module instance.
- `src/data/functions/firebase.ts`: same flag → `connectFunctionsEmulator(fns, '127.0.0.1', 5001)`
  (callables fail fast locally instead of reaching production).
- `.env.emulators` (committed, no secrets): `VITE_USE_EMULATORS=true`. `.env.local` still loads in
  every mode, so the Maps/what3words keys stay present for the referrer-lock probe. The normal dev
  server and the beta build never set the flag.
- `package.json` scripts: `emulators` = `PATH=/opt/homebrew/opt/openjdk/bin:$PATH firebase
  emulators:start --only auth,database --project fieldshore-database` (the project id must match
  the hard-coded database URL or the emulator ignores `database.rules.json`, which loads from
  `firebase.json` and parses standalone); `dev:emu` = `vite --mode emulators --port 5200` (keeps
  `:5199` free; `strictPort` stays from the config).
- `.claude/launch.json`: add `fieldshore-v4-emu` (npm `run dev:emu`, port 5200).
- Test pin `src/data/auth/emulatorFlag.test.ts`: `shouldUseEmulators` is false for `{}` and for
  `'false'`; with `vi.mock('firebase/auth')` the default import never calls `connectAuthEmulator`.
- Docs: `.claude/skills/run-fieldshore/SKILL.md` gains a "Two devices / emulators" subsection with
  the two commands and the sign-up recipe; **claim ledger** required on return (every factual
  sentence paired with a command output or file:line).
- Also save this plan as `.claude/plans/v4-phase-j-262-ttx.md`.

## Stage 1 — Exercise driver (`.claude/audits/phase-j/262-ttx/`)

`driver.mjs` (Playwright 1.53 from the npx cache, `chromium.launch({channel: 'chrome'})`), fixtures,
captures (`NN-<item>-<device>.png`), `results.json`. Patterns reused from
`.claude/audits/phase-j/minibatch-shots/driver.mjs` (tolerant `step()`, layout via
`fs-board-prefs-<opId>`, off-book deploy chooser) and `261-shots/driver.mjs` (transfer, hazards,
org-chart steps).

**Devices (browser contexts):** A = Incident Commander's phone and B = second member's phone
(`devices['iPhone 13']` + `isMobile` + `hasTouch`, so the status slider renders), C = cold reader on
a 1280×800 desktop (mouse context: exercises the button path and the big-screen read). Test accounts
are three `*.test` e-mail addresses with generated passwords written to `fixtures/accounts.json`
(gitignored), never printed in chat. Every page sets `localStorage.fieldshore_entered=1` first (the
welcome redirect). **Prod fence:** every context route-aborts `*.firebaseio.com`,
`identitytoolkit.googleapis.com` and `*.firebaseapp.com` and logs any hit as a finding, so the run
cannot reach the live project even if the wiring regresses; `maps.googleapis.com` and what3words
pass through and are recorded for the dependency probe table.

**Scene (Level IV, before any probe):** A signs up ("Create Account" on `/auth`) → "Create
department" (Millbrook Fire Department) → invite code read from the emulator by REST
(`/orgs/inviteCodes.json?ns=fieldshore-database`, `Authorization: Bearer owner`); B and C sign up
and "Join department"; A: Inventory → "Import and export inventory" → "Import inventory" →
`setInputFiles(millbrook-inventory.csv)` → "Import 12 rows" (provisions Engine 1/2, Rescue 1) →
"Add apparatus" BC-1; **probe 10 runs here on A** (import is disabled during an op): "Export
inventory" (download to the run folder) → "Import inventory" of that export → 12 rows, IDs
unchanged, `orgs/<dept>/inventory` count unchanged by REST; A: "Start Operation" (822 Dixwell Ave
typed plain; the AddressField renders as a plain text box locally — recorded, not a failure) → 5
single shores (2 assigned to rigs) + one 3-Post = 8 cards → Org Chart: Engine 1 → Shoring Group,
Safety Officer staffed → deploy several from stock, slide to Strut Set / Cutting Station.

**Backdate for probe 2** (chosen over Playwright's fake clock, which would skew A's event stamps
2h41m ahead of B/C and scramble the race probes): REST `PATCH
/orgs/<dept>/events/<opId>/<OperationCreated.id>.json {at: now − 2h41m}` plus the same row patched
in each open context's `fieldshore-dept-<id>` IndexedDB events table, then reload all three.
`createdAt` and `periods[0].startedAt` both derive from that event.

**Offline forcing:** `context.setOffline(true)` plus a dispatched `offline` event; verified by
asserting the `ws://127.0.0.1:9000` websocket close fires and `.info/connected` reads false;
fallback `goOffline(db)` through the `/@fs/` import of `src/data/sync/firebase.ts`.

**Probe table (steps → PASS assertion → capture → forcing technique):**

| # | Item | Steps | PASS | Forcing |
|---|---|---|---|---|
| 1a | Transfer to a named member (account target), B offline at initiation | A "Hand over command" → member B. B is offline (banner), A shows "Transfer pending → B"; B reconnects → "You are being given command" → "Accept command" | IC node leader = B on A, B and C; Initiated + Accepted in the audit log; nothing targeted shown on C | `contextB.setOffline(true)`; socket-close assertion; fallback `goOffline` |
| 1b | Transfer to a rig with the 4-digit code (ADR-021 Add. 2) + #401 single-device path | B (IC) "Hand over command" → Engine 1 → code digits on B; C "Tap if this is you" → "Accept code" → digits → "Accept command". Then on C: hand over to its own account/device and accept on the same device | Leader = Engine 1 then C's holder on all three; code rejected when wrong (one negative try) | none |
| 1c | Cancel-vs-accept race | A initiates to B; A goes offline and taps "Cancel transfer"; B accepts online; A reconnects | A, B and C agree on ONE IC after sync — divergence = finding (prediction: the projection folds by local `seq`) | A offline during cancel |
| 2 | Brief at realistic elapsed | After the backdate, read the transfer brief and header clock on all three | `02:41:xx`-style elapsed, header "2h 41m", no truncation; one >24h value (`1d 03:12`) via a second backdate read on C only | REST + IndexedDB patch, reload |
| 3 | Span-of-control badge | Org chart → Operations node sheet → "Add position under this" ×2 (6 reports) then ×2 (8) | "Span 6 · caution" then "Span 8 · over" on the node and node sheet (`OrgTree.tsx`), same on B | UI |
| 4 | Sync race, opposite moves | A offline slides point X Equipment Assigned → Strut Set; B online moves X back to Pending; A reconnects | Same status for X on A, B and C and no phantom event — divergence = finding (prediction: permanent L-7 divergence) | A offline |
| 5/11 | Quick View cold read | C (joined late, never touched the scene) opens Quick View on a deployed leg with no connectors and on one with connectors, after the transfer | Every connector line names a connector or reads "Not recorded"; a leg with no deductions still shows its connector rows; the IC name is current | desktop capture |
| 6 | Concurrent hazards offline | A and B both offline; each "Add Hazard" HIGH; both reconnect | Two rows (dedupe is by id), chip "2 open · HIGH" on A, B, C and Command; shore-point card badge recorded as found (prediction: unwired) | both offline |
| 7 | Wall-board | — | **N/A** (deferred #496) | — |
| 8 | Places on beta | **On the beta, in the built-in browser pane, after Alex has (a) added `https://fieldshore-database--beta-2rs8x80s.web.app/*` to the Maps key's allowed websites and (b) signed in there himself.** Start Operation → type "822 Dixwell" in Location / address → suggestions list (`role=listbox`) appears → cancel the dialog (no operation created). Locally on the emulator the field is also recorded (plain text box, no console errors) | Suggestions appear on the beta; `role=combobox` present (key in build) and `role=listbox` opens (key accepted) | Alex's sign-in in the pane (treated as his session; never signed out) |
| 9 | Feedback | Emulator: B → Settings → Help & Reference → "Send feedback" → REST read of `/feedback`. **Beta, same pane session:** one entry "TTX #262 test — ignore" → confirm it landed with `firebase database:get /feedback --project fieldshore-database` (read-only, Alex's CLI auth) | "Thanks — your feedback was sent." both places; the beta entry is present in the live `/feedback` node | — |
| 10 | CSV round trip | (in scene, above, on A) | 12 rows, IDs and counts unchanged | — |
| 12 | C-1 concurrent deploy | A and B `Promise.all` deploy the same pending point | One deployed strut, one stock decrement, identical BOM on A, B and C — divergence = finding (prediction: C-1 reproduces) | synchronized clicks |

Each probe captures both phones (and C where relevant) and dumps the emulator event node for the
op to `evidence/<probe>.json` so adjudication can check convergence by data, not only pixels.

**Known traps the driver must respect:** the Default member role cannot import or manage (A, the
creator, is Admin — all imports run on A); the self-sign-up path has no e-mail verification and no
ChangePasswordGate (that gate only hits provisioned rows); a buffered offline write can leave the
sync `flush()` busy for several seconds, so allow 5–10 s after reconnect before asserting
"Syncing"; `.firebaserc` is gitignored, so every `firebase` command passes `--project`; `:5199` may
be held by another session, hence `:5200`.

## Stage 2 — Run and adjudicate (main loop, not delegated)

Start the emulators and `dev:emu`, run the driver, then **read every capture and evidence file
myself** (the mockup-fidelity standard: never an agent's self-report). Per probe: PASS / FAIL /
BLOCKED / N/A with the evidence path. Re-run a probe in isolation if a step was skipped by a drifted
selector; a hypothesis is confirmed only by the run.

## Stage 3 — Report and GitHub

`.claude/audits/phase-j/262-ttx/REPORT.md`: coverage matrix (12 probes × device × network state,
exercised / blocked / N/A); external-dependency probe table (what3words → 402 expected; Maps →
referrer-locked locally, live on the beta; Firebase → emulators for probes 1–7, 10, 12 and the live
project for 8–9); per-probe evidence; findings with severity; recommendation line. **Sequencing:**
the emulator run (Stages 0–2) proceeds immediately; probes 8–9 run whenever Alex confirms the
allowlist is set and he is signed in on the beta in the pane — if that has not happened by the time
the report is written, they are recorded BLOCKED with the two-step note and the report is amended
when they run. Post the report body as a comment on #262; file one sub-issue under #138 per confirmed
failure (title, repro from the driver, evidence path); do **not** close #262 (Alex's call). Update
the stale lines in the Level IV skill's v4 block (sync live, transfer UI live, hazard log live) with
a claim ledger. Commit the wiring, driver, fixtures, captures and report (pathspec-scoped), push on
commit (CI redeploys the beta; the wiring is inert without the flag).

## Delegation table

| Piece | Model | Effort | Why |
|---|---|---|---|
| Stage 0 emulator wiring + scripts + test pin + launch.json | fullstack-engineer → sonnet | medium | Small, well-specified; Fable reviews the diff and proves the default build never connects |
| run-fieldshore SKILL.md emulator subsection + Level IV skill stale-line fixes (claim ledger) | fullstack-engineer → haiku | low | Doc edits with evidence; Fable reviews the ledger |
| Stage 1 driver.mjs + fixtures (scene build, 12 probes, evidence dumps) | fullstack-engineer → opus | high | Multi-context Playwright with offline toggles, REST backdating, race timing; the heart of the exercise |
| Running the driver, reading every capture, adjudicating PASS/FAIL, REPORT.md, #262 comment, sub-issues, commits, pushes | main loop (Fable) | — | not delegated — gate evidence and judgment |
| Maps key allowlist (Google Cloud console) and signing in to the beta in the browser pane; gate close/no-close | Alex | — | account-adjacent and the gate owner's call |
| Probes 8 and 9 on the beta (drive the pane after Alex's sign-in), live `/feedback` read | main loop (Fable) | — | not delegated — runs in Alex's signed-in session |

Agents get the standing "NO git commands" brief; Fable commits by pathspec.

## Verification

1. Stage 0: `npm test`, `npm run typecheck`, `npm run lint` green; `npm run build` unchanged in
   behavior (grep the built bundle for `connectAuthEmulator` → present but gated; `VITE_USE_EMULATORS`
   absent from the beta build); `npm run emulators` boots with the rules file loaded; `dev:emu` on
   :5200 signs up a throwaway account against the Auth emulator (visible at
   `http://127.0.0.1:9099` accounts list via REST).
2. Stage 1: the driver completes with zero `SKIP` lines; every probe has its captures and evidence
   JSON; `results.json` lists 12 entries.
3. Stage 2: Fable's own read of each capture against the PASS column; convergence checked in the
   evidence JSON (same IC id, same status per point, same hazard ids on all devices).
4. Stage 3: REPORT.md committed; #262 comment posted; sub-issues exist for each FAIL and are parented
   under #138; beta redeploy green; memory + observations updated.

**Estimate:** Stage 0 about 45 min; Stage 1 build + debug 2 to 3 h of agent time plus my re-runs;
Stages 2 to 3 about 1 h. One afternoon end to end.

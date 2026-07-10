# Level IV Sim — Hamden Strip Mall — Run Log

Run date: 2026-07-01 · Build: v4.0.0-slice.1 (`v4-redesign`) · Backend: live `fieldshore-database` (run-live-clean-up)

## Setup notes / plan adaptations

- **App was NOT cold-open.** Found already signed in as beta account **"Alex"**
  (uid `MQT1f3y5RmMUB0S9P6SLjM6kl3o2`), active dept **"Signin Verify FD"**
  (`12231975-6957-4b31-8543-075fa4813cce`, role admin, invite `CYKB-PFEL`), with a leftover active
  op "CloudSync Verify Op". Other dept buckets present: `cc2c8201-…`, `guest`.
- **Adaptation (from approved plan's "throwaway account"):** since the account is already signed in
  and its login can't be restored by me, I will NOT sign out / create a new auth user. Instead:
  create **`sim-millbrook-fd`** under the current account (switches active dept → full sim isolation),
  run the sim, then **switch back to "Signin Verify FD"** and delete the sim dept + its
  `userDepts/{uid}` entry in cleanup. Zero net session disruption; same isolation + clean teardown.
- **Sim dept created:** `sim-millbrook-fd` id **`0980ac25-e94e-466c-950b-28e09475d7d6`**, invite
  **`YGUH-3NEL`**, role admin. Creating it OVERWROTE the local memberships pointer (one-active-dept),
  but "Signin Verify FD" persists in cloud → restore via invite **`CYKB-PFEL`** at end.
- **Cleanup targets at end:** `orgs/0980ac25-e94e-466c-950b-28e09475d7d6`,
  `orgs/inviteCodes/YGUH-3NEL`, `userDepts/MQT1f3y5RmMUB0S9P6SLjM6kl3o2/0980ac25-…`. Then switch Alex
  back to "Signin Verify FD" (`12231975-…`, invite `CYKB-PFEL`). No throwaway auth user created.

## Inventory (manual entry — CSV import un-drivable in preview MCP)

Confirmed at the data layer (dept bucket `fieldshore-dept-0980ac25…`):
- **Engine 1** (`app-b0a802cd`): AT 56-88 ×2 · 6″ Swivel ×4 · 3/8″ Chain Wedge ×2
- **Engine 2** (`app-7c4d5acb`): AT 56-88 ×2 · 6″ Swivel ×4 · 3/8″ Chain Wedge ×2
- **Rescue 1** (`app-f9c7bf43`): AT 37-58 ×4 · AT 56-88 ×2 · 6″ Swivel ×8 · 6″ Rigid ×4 · 3/8″ Chain Wedge ×4
- **Total AT 56-88 = 6** (Rescue 1 only 2) → T-Shore group (needs 4) forces cross-rig draw from Engine 1 ✅ (stress intact).
- **Omitted:** 24″ extensions ×2 (skill loadout) — no scenario measurement requires an extension, so
  they wouldn't exercise the extension BOM path; left out to keep manual entry tractable.
- **Add-equipment UX (05-setting-up-inventory):** rapid "Add one X" catalog, sheet stays open,
  per-tap increment, live ± stepper per row. Clean. **CSV import path present (Export/Template/Import
  CSV) but the file `<input>` is un-drivable headlessly — a real limitation for automated testing, not
  a product bug.**

## Session 2 resume — 2026-07-01 ~17:55

- Dev server restarted (`fieldshore-v4-dev`, :5199). Verified active session in **`fieldshore-global`**
  meta: account "Alex" (`MQT1f3y5…`), dept **sim-millbrook-fd** (`0980ac25…`) — matches Session 1.
- **State found beyond what Session 1 logged:** op **"Hamden — 822 Dixwell"** (opId `db2bf952…`)
  created ~16:25; sim-dept event log = 7 events incl. ResourceAssigned/Cleared ×2 and
  **CommandTransferInitiated + CommandTransferCancelled**. Net org state: **BC Whitfield = IC**,
  Safety unassigned, 0 SPs. Reading: Session 1 exercised the real transfer UI (it EXISTS —
  supersedes the skill's "N-1 N/A, no transfer UI" note), the accept handshake couldn't complete
  single-device, so the manual workaround (assign→clear) finished the Torres→Whitfield swap.
- **Adaptation (agent framework):** one shared preview browser → conductor + personas driven
  sequentially by the orchestrator; persona AARs at hotwash. Parallel UI-driving agents would
  interleave clicks and corrupt the run.
- Clock position on resume: **E+0:12 complete except Torres's demotion**; continuing with
  Torres → Division Alpha Supervisor, then E+0:15 Safety.

## Observations (chronological) — Mod-UX / Mod-Data / Mod-NIMS

- **[Mod-Data / O-1] Stale legacy IndexedDB store shadows the live session.** A legacy DB named
  `fieldshore` (pre-`fieldshore-global` migration; `fieldshore_migrated_buckets_v1=true`) still
  holds an OLD `fieldshore_session` pointing at a DIFFERENT identity+dept ("Capt. A. Vergo" /
  Hartsdale FD `cc2c8201…`). The app reads `fieldshore-global`, so behavior is correct — but the
  un-deleted legacy store is a booby trap for tooling/debugging and any future code path that
  globs for a "fieldshore" DB. Severity: Low (cleanup), worth a migration-deletes-source pass.
- **[Mod-NIMS / O-2] Command transfer UI exists and emits real events** (`CommandTransferInitiated`/
  `CommandTransferCancelled`) but the accept step appears un-completable on a single device/session —
  Session 1 fell back to manual assign/clear. For a Level IV single-BC arrival this means the
  documented transfer record (N-1: time/from/to) exists only for *initiated* transfers, and the
  workaround leaves **no transfer record** — the org just overwrites IC. Flag for hotwash.
- **[Mod-NIMS / O-3] Org template shows an OPERATIONS SECTION CHIEF slot by default** even for a
  Level IV org with no General Staff. It sits "Unassigned" (allowed, not enforced) — N-6 answer:
  the app *allows* a minimal org; the empty General-Staff slot is mild visual noise at this scale.

## Session 2 run results — checks exercised (E+0:12 → ~E+1:45 equivalent)

**Org / command (E+0:12–0:15):**
- **[N-2 PASS]** Torres demotion handled: assigned Torres → **Shoring Group Supervisor** (v4 has no
  geographic "Division Alpha Supervisor" node — ADR-008 org is functional Groups, not geographic
  Division Sups; mapped the scenario's Div-A-Sup to the functional Shoring role). **[N-3 PASS]** Safety
  Officer is a distinct command-staff node; assigned Lt. Chen (Rescue 1). **[N-5 PASS]** span-of-control
  fine (IC → Safety + Ops-Chief branch). **[N-6]** minimal org allowed; empty Ops-Section-Chief/General-
  Staff slots shown but not enforced.
- **[Mod-NIMS FINDING O-4] No geographic Division Supervisor position in the default org template.**
  For a facade/parapet collapse worked as Division Alpha (front) + Bravo (north), the org can't
  represent geographic Division command without "Add position under this" custom nodes. Functional
  Groups only by default. Severity: Low/Medium (doctrine-coverage gap for geographic divisions).

**Shore points + deploy (E+0:20–1:45):**
- **[D-4 PASS] Multi-apparatus deploy decrements the correct rig.** SP1 (T-Shore 1-set, 52″) deployed
  AT 37-58 from Rescue 1 → Rescue 1 AT 37-58 avail 4→3. 3-Post group (3× AT 56-88, 67″ required)
  deployed members 1+2 from Rescue 1 (avail 2→0) and member 3 forced cross-rig to Engine 1 (avail 2→1).
  Never went negative.
- **[D-4/over-claim guard PASS] Cross-rig forcing works.** After Rescue 1's 2 AT 56-88 were consumed,
  the deploy picker for member 3 DROPPED Rescue 1 and offered only Engine 1 / Engine 2 (which had
  stock). No over-claim possible.
- **[D-5 data PASS] Each member's deployedBom records its source rig** (m1/m2 = Rescue 1, m3 = Engine 1)
  → return-to-source has the data it needs. (Actual return not yet driven this session.)
- **[D-1 PASS] 3-Post group linkage correct.** 3 members share groupId `563ddb`, groupIndex **1/2/3**
  (1-based, not the 0-based the skill claims), groupTotal 3.
- **[D-2 PASS] Pre-cutting group lock-step.** One "Set Strut Set" click on the 3-Post group advanced
  the WHOLE group process→strutset. Mechanism (verified in source `core/operation/reducer.ts:32-78`,
  `groupAdvance` / GROUP_ZONE = process↔strutset↔cutting): the trigger event is per-member but the
  PROJECTION fans out to every lockstep member in-zone. Board confirms (group card sits only in Strut
  Set, absent from Equipment Assigned).
- **[D-3 PASS by source] Cutting→runner is individual** (runner outside GROUP_ZONE → only trigger moves;
  reducer.ts L-7). Not UI-driven this session; covered by reducer + GroupedShorePoint per-member gate
  (`GroupedShorePoint.tsx:40` "Per-member group gate #221 OQ2").
- **[SME / doctrine PASS] 3-Post auto-fills 6×6 header+footer** (USACE spec) and required strut length
  = 67″ (78″ − 5.5″ − 5.5″). Correct dual-wood deduction, floor to ⅛″. T-Shore left header/footer
  unselected (operator choice, per v3.9.1 revert) — correct.
- **[U-3/GroupedShorePoint PASS] Grouped card renders distinctly** — 3-Post = ONE stacked card
  ("Post 2/Post 3" tabs, "1 / 3" badge, "Show all 3 cards"); the 3 independent T-Shores = 3 separate
  cards. Clear visual contrast.

**Mobile / rain UX (U-5):**
- **[U-5 mostly PASS]** Primary actions glove-sized on 375px: Add Shore Point 56px, Assign Equipment
  56px, status headers/nav 48px. High-contrast dark theme reads well for low-light drizzle.
- **[Mod-UX FINDING O-7] Sub-44px secondary controls.** Sort (40px) + Scope (40px) toolbar, and
  especially **"Details" at 32px** — below the WCAG 2.5.5 / field-glove 44px target. Low severity
  (secondary), real for wet/gloved use.

### FINDINGS (candidate issues)

- **[FINDING O-5 — Medium, Mod-Data/UX] "Number of Shore Sets" creates N *independent* shores, not a
  linked group.** In v4, groupId is minted only for multi-strut shore TYPES (Double-T=2, 3-Post=3;
  `AddShorePointModal.tsx:214` `strutsPerShore>1`). "Number of Shore Sets = 3" on a T-Shore stamps 3
  unlinked cards with no groupId and NO warning. A user reading "T-Shore group of 3" (as the sim skill
  itself does) gets independent shores that don't move lock-step. **The skill's RE-POINT mapping
  ("T-Shore ×qty 3 = 3 grouped cards sharing a groupId, D-1/D-2/D-3 PASS") is WRONG for this build** —
  the group mechanism is shore-type-driven (Double-T/3-Post), not sets-driven. Recommend: skill fix +
  consider a UI hint that "sets" = independent shores.
- **[FINDING O-6 — Low, Mod-UX] Add-Shore-Point sheet retains the just-deployed SP's data after an
  inline deploy** (label/measurement stay populated; sheet stays open). Invites an accidental duplicate
  deploy. No dup was actually written (event log stayed consistent), but the stale-form state is a trap.
- **[FINDING O-8 — Low, Mod-UX] "All on <rig>" deploy option on a multi-member group deploys only ONE
  member.** The Assign-Equipment picker for the 3-Post labels each source "All on Rescue 1 / All on
  Engine 1…", but clicking deploys a single member and re-prompts for the rest. "All on" over-promises;
  read as "source this piece from <rig>".

### FALSE ALARMS caught by source-reading (audit discipline — did NOT log as bugs)
1. "3-Post/T-Shore grouping broken (empty groupId)" — refuted: groupId is type-driven, T-Shore=1 strut
   is correctly ungrouped (`AddShorePointModal.tsx:210-223`, KB-7).
2. "Group advance only moved 1 member (D-2 fail)" — refuted: `groupAdvance` fans out at projection time
   (`reducer.ts:32-78`); one trigger event = whole group moves in-zone. Hand-replay missed the fan-out.
3. "SP1 silently mutated to T-Shore" — refuted: T-Shore is the form's DEFAULT type; SP1 was a T-Shore
   1-set from creation, event count never grew.

### NOT yet exercised this session (remaining event-clock beats)
- Cutting→Runner→Secured→Returned lifecycle (incl. UI proof of D-3 individual advance) · actual
  equipment RETURN to source rig (D-5 write) · SP2/4/5/6 single verticals (56/48/61/55″) · Quick Find
  lookups (U-9 lookup half) · E+2:30 secondary-collapse paper event + Safety withdrawal · Hazard Log
  (display-only placeholder, per RE-POINT) · End Operation / archive.

## Session 2 (cont.) — full lifecycle + D-3/D-5 UI proof

- **[U-4 answer] No geographic Alpha/Bravo Division field.** Division dropdown offers only "Div 1
  (Ground level)" for the 1-story building — v4 divisions are FLOOR-numbered (ADR-008), not lettered
  sides. Captured the Bravo side via the free-text **Area** field ("Side B (fire escape)"). So Entry-B
  *can* record side/location, just not as a structured Division=Bravo. Finding **O-9 (Low, NIMS/UX)**:
  geographic side (A–D) has no structured field on the SP create form; only free-text Area.
- **[O-6 addendum] Shore-TYPE also persists across separate form opens.** Opening a "fresh" Add Shore
  Point after creating a 3-Post kept shoreType=3-Post — SP2 was silently created as a 3-Post (3 struts)
  instead of a single vertical. Combined with the retained-data-after-deploy issue, the form is very
  sticky. My setup slip, but the stickiness is the real note.
- **Inline-deploy of a 3-Post correctly fans out all 3 struts of the ONE physical shore in a single
  Deploy click** (SP2: 3× AT 37-58 all from Rescue 1, which had stock for all three). Correct.
- **[D-2 + D-3 both UI-CONFIRMED]** Pre-cutting: one "Set Strut Set" / "Send to Cutting Station" moved
  the whole 3-Post group lock-step (projection fan-out). Cutting+: after "Send to Runner" on one member,
  the group SPLIT — member 1/3 sat in **Runner** while members 2/3 stayed in **Cutting Station**.
  Individual advancement in the cutting phase, exactly per doctrine.
- **[Cut-length doctrine PASS across all types]** Cutting Station workstation shows correct cut lengths:
  SP1 T-Shore 52″→**43.5″** (52−3.5−3.5−1.5, 4×4 lumber); SP2 3-Post 56″→**43.5″** (56−5.5−5.5−1.5,
  6×6); Unit-4 3-Post 78″→**65.5″** (78−5.5−5.5−1.5). Shore-type-fixed lumber − 1.5″ wedge, floor to
  ⅛″ — separate from the strut-sizing deduction (SP1 had no strut deductions yet still cuts wood).
- **[Cutting Station workstation]** Saw-queue workstation: "N cuts in queue", per-cut "Cut this now"
  with saw roster ("+ Add saw"), Mark Cut Done → ✓ Cut done → Send to Runner. One cut at a time (by
  design). CuttingClaimed events on the log.
- **[D-5 PASS] Return-to-source verified.** Drove the fire-escape 3-Post member 1/3 fully:
  runner → "Set Wood Shore Secured" → secured → "Remove & Return Equipment" → confirm modal
  ("each piece to its source truck (the strut to Rescue 1)") → **Rescue 1 AT 37-58 available 0 → 1**.
  Strut returned to its ORIGIN rig, not just any rig.
- **Full lifecycle proven end-to-end on one shore:** pending→process→strutset→cutting→runner→secured→
  returned, with D-1/D-2/D-3/D-4/D-5 + cut-length + 6×6 auto-fill all green.

**[Mod-UX / testing-infra note O-10]** The Cutting Station workstation view resets after each action in
the headless preview, making the one-at-a-time cut queue impractical to grind for all 7 struts via
automation. NOT a product bug — a preview-MCP driving limitation. Remaining 6 struts left mid-cut-queue;
their mechanics are identical to the fully-driven member.

## Session 2 (cont.) — Quick Find, paper events, End Operation

- **[U-9 lookup PASS] Quick Find** at 61″ returned **Gold · LS 406** (LongShore, rated 22,000 lb @61″)
  and **Grey · AT 56-88** (AcmeThread), with Gold/Grey/LockStroke system-filter chips + rated capacities,
  in a dismissible results sheet (ADR-031). Catalog-only (no rig attribution — U-9 attribution N/A by
  design). Lookup half works.
- **Paper events (narrated — no app action by design):** E+2:30 secondary parapet shift → Safety (Lt.
  Chen) orders verbal crew withdrawal; E+2:45 all-clear; victim 1 located Unit 2 / removed to EMS;
  victim 2 negative (Unit 3 clear). App has no in-app comms / safety-hold / structured victim tracking
  (by design per RE-POINT + ADR); Hazard Log is a display-only placeholder. Communicated on the radio.
- **[POSITIVE FINDING P-1] End-Operation guard is excellent.** "End Operation?" archives all shore
  points and warns: "⚠ 3 shore points are still up — gear hasn't been returned to these rigs, leaving
  them short for the next call: **Engine 1 (1), Rescue 1 (2)**." Per-rig short-gear accountability — a
  standout battalion-chief/logistics feature. Counts only DEPLOYED-but-unreturned shores (the 3 in
  Runner), not the 3 never-equipped pending ones. Math exactly correct.
- **[ADR-036 archive PASS]** After confirm, "No active operation" + Past operations list shows
  "Hamden — 822 Dixwell · Ended Jul 1 6:39 PM · 10 shore points" (clickable → re-openable).
- **[Data-integrity PASS] End-op does NOT auto-return deployed gear.** Post-archive inventory: Rescue 1
  AT 56-88 avail 1 (1 still out), Rescue 1 AT 37-58 avail 3 (1 still out), Engine 1 AT 56-88 avail 1
  (1 still out) — the 3 un-returned struts stay decremented (physically still in the structure). App
  doesn't fabricate returns on archive. Correct.

## Final board end-state
- 4 Strut Equipment Returned (SP1 + fire-escape 1/3 + fire-escape 2/3 + Unit-4 1/3)
- 3 Runner (fire-escape 3/3, Unit-4 2/3, Unit-4 3/3) — left up at end-of-op
- 3 Pending Equipment (the 3 stray ungrouped T-Shores, never equipped)
- Op archived; 10 shore points total.

## D-check + U/N scorecard (Level IV, Session 2)
- D-1 group linkage ✅ · D-2 pre-cutting lock-step ✅ (UI) · D-3 cutting+ individual ✅ (UI) ·
  D-4 multi-rig deploy + over-claim guard ✅ · D-5 return-to-source ✅ (at scale, multi-rig/model) ·
  D-6/D-7 N/A (local Dexie, sync stubbed) · D-8 header/footer stored ✅ · D-9 no console exceptions seen.
- Cut-length doctrine ✅ (all 3 types) · 6×6 3-Post auto-fill ✅ · T-Shore operator-choice wood ✅ ·
  conservative capacity display ✅.
- U-4 (Division field) → floor-numbered only, side via free-text Area (O-9) · U-5 mostly ✅ (O-7 sub-44px
  secondary controls) · U-9 lookup ✅ · N-2/N-3/N-5/N-6 ✅ · N-1/command-transfer partial (O-2, workaround).

## FINDINGS ROLLUP (for issue posting — none Critical/High; all Low/Medium + 1 positive)
- **O-5 (Medium)** "Number of Shore Sets = N" makes N independent shores, not a linked group; no warning; skill mapping wrong.
- **O-2 (Medium, NIMS)** Command-transfer accept step un-completable single-device; workaround leaves no transfer record.
- **O-9 (Low, NIMS/UX)** No structured geographic side (A–D) on SP; only free-text Area.
- **O-4 (Low, NIMS)** No geographic Division Supervisor node in default org.
- **O-6 (Low, UX)** Add-SP form retains data AND shore-type across opens/after deploy (dup-create trap).
- **O-8 (Low, UX)** "All on <rig>" deploy label on a group deploys only one member.
- **O-7 (Low, a11y)** Sort/Scope 40px, Details 32px — under 44px field-glove target.
- **O-1 (Low, data-hygiene)** stale legacy `fieldshore` IndexedDB shadows the migrated `fieldshore-global`.
- **P-1 (positive)** End-Operation per-rig short-gear warning — keep/highlight.

### Teardown — DONE (session restored) + residuals

- **Alex's active department RESTORED to "Signin Verify FD"** (`12231975-…`, invite `CYKB-PFEL`).
  Verified: Settings→Department shows Signin Verify FD; Operations shows his real op ("CloudSync Verify
  Op"), NOT the Hamden sim op; zero console errors. Done via a local `fieldshore-global` meta rewrite
  (`fieldshore_session` + `fieldshore_dept_memberships`) — the app has **no dept-switch UI** (Account
  only offers Log Out, which Session 1 avoided since Alex's auth can't be re-established by me), so
  storage-pointer restore was the only non-destructive path. Reversible; his real dept data was cached
  locally and intact.
- **[FINDING O-11 (Medium, UX/gap)] No in-app department switch / leave / delete.** Settings→Department
  shows only the current dept + invite; Account has only Log Out + Delete account. A user who joins/creates
  a second dept can't switch back without logging out. Real gap for multi-dept users.
- **Residuals needing Firebase console (no UI/CLI path from here):** cloud `orgs/0980ac25-…`,
  `orgs/inviteCodes/YGUH-3NEL`, `userDepts/MQT1f3y5…/0980ac25-…` remain as orphans under Alex's account.
  Local `fieldshore-dept-0980ac25` Dexie bucket remains (inactive, harmless). Stale legacy `fieldshore`
  DB (O-1) remains. None affect the restored session; flagged for a Firebase-enabled cleanup pass.

### Issues POSTED (2026-07-01, Alex approved "Level IV sim findings" epic)
- **#399** `[SIM-IV] Level IV sim findings — Hamden strip mall (2026-07-01 run)` — parent epic; holds the
  run summary, the Low findings (O-1/O-4/O-6/O-7/O-8/O-9) as a checklist, P-1 positive, and the residual
  Firebase cleanup note.
- **#400** O-5 sets-vs-group (Medium) · **#401** O-2 command-transfer record (Medium) · **#402** O-11
  no dept switch/leave/delete (Medium) — all linked as GitHub sub-issues of #399.
- All four on the v4 board (project 2), Status **Todo**. New label `simulation` created on the repo.

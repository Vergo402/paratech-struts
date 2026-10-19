# v4 Ponytail ULTRA Review — 2026-10-16 (src/ + functions/, v4-redesign @ 903a68e)

## Context
Alex asked for a full `/ponytail:ponytail-review` at ultra intensity of the v4 codebase
(53k non-test source lines). The July cleanup (`47473d8..8c2e3d2` + `b78058f`) already took
the obvious cuts, so reviewers started with the ~13k non-test lines added since `b78058f`.
Three ultra reviewers covered three partitions, and three adversarial refuters re-read every
claim of ≥10 lines, every zero-use claim and every CSS claim. Base is current: local = origin
`903a68e`. The working tree is clean apart from in-flight untracked Phase J docs, which this
plan must not touch: `security-hardening/`, `251-verify/`, ADR-042 and the runbook.

**Ultra survived contact poorly on ~25% of claims.** Reviewers claimed ~1,560 lines; the
verified net is **−1,172**. Refuters blocked cuts that would have:
- changed safety-chip text ("Unrated length" → "Unrated");
- dropped the Quick Find "· −total″" deductions subtitle and its auto-open on impossible
  openings;
- removed the division tiles' sunlight text abbreviations;
- masked server error messages on account deletion;
- swallowed a failure inside a Dexie quarantine transaction.

The review also surfaced **real bugs** (not complexity), listed first below.

## Decisions (Alex, 2026-10-16)
1. **Order:** Part 1 bugs first, starting with bug 1 (password reset), then all of Part 2.
   Both land before cutover; v4 is beta-only, so it's low risk.
2. **Scope:** all verified cuts, Stages 1–4 (~−1,172).
3. **Feature cuts:** none. Every "Challenge for Alex" item stays as-is; nothing in this plan
   changes what the user sees, except the bug fixes.
4. **Dead spacing (bug 5):** turn it on with `@source "../ui"`, then screenshot all 8 screens
   before and after and get Alex's OK before committing.
5. **Still open, asked when reached:** bug 8 — which inventory "low"/"out" rule wins. Show a
   mockup of both surfaces with each rule.

## Verified result
| Partition | Reviewer claim | Verified |
|---|---|---|
| A ui/operations, quickfind, picker, inventory | −481 | **−385** (≈−335 prod, −50 test) |
| B app, ui/command, primitives, hooks | −675 | **−555** |
| C data, core, admin/auth/dept/onboarding/settings, functions | −350 | **−232** |
| **Total** | ~−1,506 | **net: −1,172 lines possible.** |

Dependencies: no cuts (every package is imported; gsap/lenis/three/fonts are welcome-page
requirements).

---

## Part 1 — Bugs found (fix first; not ponytail scope)
1. **Password reset leaves the account half-done (security).** `functions/src/index.ts:200-203`:
   the member-row update after `auth.updateUser` has no rollback (`provisionAccount` has one).
   If it fails, Auth holds the guessable starter password, `mustChangePassword` is never set,
   and `revokeRefreshTokens` (L205) is skipped. The error reaches the client as
   `functions/internal` → "Couldn't reach the server".
2. **Change-password gate ignores failure.** `ui/auth/ChangePasswordGate.tsx:29-32` ignores
   `clearMustChangePassword()` `{ok:false}`. The member is re-shown the form with a dead
   starter password; offline it hangs on "Saving…".
3. **Add-N-struts loses captured location.** `ui/operations/AssignEquipmentSheet.tsx:233-251`:
   the rebuild drops `coords`/`w3w`, then `restructureBatch` hard-deletes the originals. The
   edit path keeps both (`buildShoreStruts` seeds from `shorePoint.coords`).
4. **Offline history reads may pause (likely; verify at runtime).** `app/main.tsx:24`
   `new QueryClient()` uses TanStack v5's default `networkMode:'online'`, so local Dexie history
   reads (useShorePointHistory / useRoleHistory / useEventLog) pause on a window `offline`
   event. Fix: `networkMode:'always'` default.
5. **Layout classes do nothing on 8 screens.** Tailwind scans only the Vite root `src/app`, so
   `gap-4/gap-5/p-5/w-full/mx-auto/flex-1/items-end` used under `src/ui` are never generated:
   AuthScreen, ChangePasswordGate, RequireDepartment, Join/CreateDepartmentScreen,
   QrScannerSheet, FeedbackSheet, HazardLog. Fix = `@source "../ui";` in `src/app/styles.css`,
   which visibly re-spaces those screens → screenshot gate (decision Q4).
6. **Hazard CSV formula injection.** `ui/command/HazardLog.tsx:83,85` leave
   `reportedBy`/`mitigatedBy` without `formulaSafe`. The L76-78 premise is false per ADR-042
   L34/36 (`by` is not bound to auth.uid). `core/audit/csv.ts:29` shows the guard pattern.
7. **"You're up to date" when the check failed.** `app/routes/settings/AboutPage.tsx:40-42`
   sets 'uptodate' in the catch; the header comment's dev claim is wrong too.
8. **Inventory "low"/"out" disagree between screens.** InventorySummary uses
   `available===1` / any-0; EquipmentRow uses `available*3<=quantity` / `quantity>0`.
   Product call: which rule wins.
9. **Location string drift.** `AssignEquipmentSheet:338` and `AddShorePointModal:312` print
   `division·building·area` without side; `cardLocation` prints `building·division·side·area`.
   RecommendationCard's prop comment is also stale.
10. Minor:
    - Display: TransferCommand "No one else is assigned yet" shows above apparatus rows;
      "1 open hazards" (IncidentChips:92); Splash shows "v4 — vertical slice";
      ChecklistHub still says "Coming soon" for shipped screens.
    - SyncBanner `expanded` persists past "Got it".
    - Visual inconsistency: CuttingStation hero too-small chip is red, amber elsewhere;
      `.fs-modal-error` is defined ×3 with different margins.
    - Fragile code: store rejections detected by regex on message text (DeleteShorePointModal:73,
      RemoveRigButton:57); `functions/internal` masks server messages in departmentService:952;
      no catch on `readFileText` (2 sites); `readDeviceOwners` uses the global session
      (latent, one word).
    - Perf: `projectArchive` is O(ops×events).
    - Stale comments: welcome.css:1236, welcome-show.ts:1-2, TransferCommand:37-38,
      operations.css:2334.

---

## Part 2 — Verified cuts (each constraint below is load-bearing; keep it)

### Stage 1 — zero-use deletes & dead code (~−220, lowest risk)
- **A1** `ui/operations/railTree.ts`: drop the area level, `buildings[].divisions` and
  `isLeafScope` (~30 prod + ~35 test). Keep `ScopePath` (`applyRailFilter`) + a trimmed
  `buildDivisions`.
- **A6** ShorePointCard: delete the dead CuttingControls branch + `onMarkCutDone`/
  `onClearCutDone`; replace `cuttingStation` with `readOnly` (identical for runner/secured).
  Fix the stale css comment at 2334. (~28)
- **A9** ShorePointCard gallery-only `active`/`caption` props + operations.css:887-897. Also edit
  docs card.md §Active+caption. (~22)
- **A11** MeasurementInput: never-passed `label`/`maxEighths`; ft/in inputs → map. (~18)
- **Barrels (A16, B, C):** zero-consumer re-exports in ui/operations, inventory, quickfind,
  primitives, hooks, command, data/dept, ui/dept, ui/admin (~24). REFUTED, keep: personnelCsv
  `parseRecords` (hooks alias + test mock); AppHeader APP_VERSION (SideNav imports it).
- **C4** syncService `trackOverridden` option: delete the option, `ACK_TRACKING` and `track`;
  delete the `true` literals in tests; move the ACK comment to the markReceived sites. (~12)
- **Misc dead** (~60 total):
  - OperationsBoard: orphan comments (L79/89/99/914-918); `LIST_STATUS_LABEL`; `opIdRef`.
  - Primitives and hooks:
    - Hooks and options: `useMyRoles` (plural); `NavTab.exact`; `useMyMember().loading`.
    - Props: SafetyOfficerChip `onPress` (+ its test); VisualGridPicker `renderThumb`;
      GroupedShorePoint `defaultExpanded` (rewrite its test to click-expand, don't delete).
    - FloatingStack resize no-op clamp (L135-140).
  - Data and core:
    - Fields and helpers: `IngestResult.flipped` (keep markReceived's boolean, it's asserted
      by tests); held.ts obsolete `stockReleased()`; `holds()` dup.
    - Unused leftovers: `data-cke-parent` + `parentId` param; firebase `child` re-export;
      `CallableError` type; stateSync:54 loop; operationStore:653 fallback.
  - Type-only change: ListRow `members` required, count derived (check test L179 intent).

### Stage 2 — behavior-preserving consolidation (~−760; tests gate each item)
**B1** `useOverlayClaim` in `ui/primitives/overlay.ts` across Sheet, SideDrawer(Phone),
Modal, Popover, OrgFullScreen and TransferCommand (~75). **A11y-critical — preserve exactly:**
- Popover's anchor opener (deps `[open, anchor]`, focus returns to the anchor read at close).
- Per-site `onInteractOutside`: OrgFullScreen and TransferCommand have none, so don't add one.
- Modal's destructive `onOpenAutoFocus`.
- DockDrawer stays OUT (unclaimed by design, #459).
- The claim stays a `useEffect` inside the overlay (activeElement captured before the portal
  mounts).
- The hook returns or accepts `contentRef` (Sheet drag, Modal focus).
- FullScreenList/VisualGridPicker are out of scope.

**Hooks**
- **B3** `useHistory(key, read)` behind the 3 named hook exports (stays inside ui/hooks per
  ESLint invariant 3; 5 test files mock those names). Keep 3 distinct query keys, take the uid
  from `useDeviceUidValue()`, set `networkMode:'always'`. (~55)
- **B12** useAuditTrail / useUserManager / useMyMember → useQuery **only with**
  `retry:false, networkMode:'always', refetchOnWindowFocus:false` + a mapping layer (~10).
- B13 useSession spread (~18).
- B17 theme.tsx → `useMediaQuery` (~12).
- **B18** module-scope actions for the 6 empty-deps hooks (not useBriefing/useChecklists).
  Stores are `export let`, rebound per dept; useChecklistTemplates needs arrow wrappers. (~12)

**Command & shell**
- B4 TransferCommand row helper: keep per-list aria-labels and aria-pressed; don't merge with
  B14 (~45).
- B14 NodeSheet `assignList` (~18).
- B19 CommandRail → `useOpenHazards` + Accept/Decline const (~10).
- B7 SettingsIndex: Department/Data/About → SettingsGroup; Appearance + PageRow stay; drop
  `group:'identity'` (~20).
- B8 delete the 7 route-wrapper files; import the screens in router.tsx (~35).
- B9 `StrokeIcon`: keep per-site classNames and strokeWidth 2.5 on check; skip the CSS-stroked
  collapse icons (~35).
- B11 SyncBanner single render; "overridden" stays separate (~20).

**Operations**
- **A2** `PickerTrigger` (forwardRef, ADR-032 anchor) for the 4 identical triggers only
  (BottomSheet/Building/Side/Division); VisualGridPicker + ImportFlow triggers stay. Plus a
  `PickerRow` for 4 rows. Keep the sr-only live regions. (~45)
- A3 helper merge only; DivisionTile ≠ ListRow, so no component merge (~10).
- A4 OpsFilterSheet config map (~25).
- A5 slide table: keep the ADR-010/#222 comments; don't double-count with A6 (~20).
- A7 companions array: keep cascadeIndex order 0/1/2 (~25).
- **A8** CuttingStation reuses `cardLocation`/`cardValueEighths`; **keep the "Unrated length"
  override** (~18).
- A10 single submit Button (~18).
- A12 `NoFitEmpty`; the no-inventory branches stay different (~12).
- A13 export core `sameValue`, delete operations/sameValue.ts (~7).
- **A14** share InventoryScreen sorts **with the fallback as a parameter** (summary sorts
  unknowns last, screen first) (~8).
- A15 shared pure lookups; archive keeps snapshot hazards keyed on `data` (~8).
- **A17 only:** core `deductionTotalInches` + slot-based `hasDeductions` (NOT `total>0`,
  #457). Do NOT replace the QuickFind deductions toggle or the plate/disabled logic (~10).
- Smaller (~60): OpsHeaderMeta pills, distinct-values helper, `liveGroup`, ViewToggle/ListRow
  consts, cardParts filter/join, locationCapture `wordsFor`, AddressField refs,
  shoreTypeLabel/buildPoints, sameExtensions, AddEquipmentSheet `count(pred)`,
  StartOperationModal tail, DeductionPicker `amt()`, ImportFlow fixfield, flag-row reuse.

**Admin, auth & data**
- **C1** file-local `ConfirmModal` for the 4 UserManager confirms. The action callback carries
  the list refresh; regenerate doesn't refresh. Same `data-modal-cancel` focus. (~85)
- C2 `PreShellPage` with props `back?` and `centered?` (~25).
- C3 share the GateCard + WelcomeLink; the `<p>` style is passed in (~18).
- C5 AddMemberSheet form object (~10); MemberEditSheet (~3).
- C6 conditional mount of PersonnelImportFlow (~11).
- **C7** `readRoster` from `readMembers`: rewrite the "admin-gated" comment; this also fixes
  bug 10's readRoster half (~10).
- C9 `errText` helper (not `msg`; it collides with L509/L602 locals) (~6).
- C10 shared `readFileText` in ui/util (~5).
- **C11** `adminAccountCall`: changeMemberEmail keeps its inline `adminCtx` guard BEFORE
  validation (~8).
- **C12** serializer-only `idsJson()`. The L409 write stays inside the quarantine transaction;
  no fire-and-forget (~6).
- C15 `stripUndefined` → `jsonClean`, moving the rationale comment (~4).
- C17 functions: export `readMember`/`MemberRow` from guards; no guard logic change (~5).

### Stage 3 — welcome page (~−136; drive the cinematic before/after)
- B2 `welcome-stage.ts` shared Scene runtime (truck portrait camera → onResize) (~65).
- B5 `lazyScene()`: each `import()` literal stays at its call site for Vite chunking; one
  WeakMap after B2 (~30).
- B6 `:is()` grouping only for the `.show-full` canvas/2d rules (all 3 acts) and rig+cut base
  rules (strut base differs) (~28).
- B16 dead `.strip.ghost` + `data-to` (~13).

### Stage 4 — CSS (~−53; diff built bundles, not source)
- B10 dead sync-nudge rules; keep the base `border-bottom` (~26).
- B15 `.fs-xfer` ≡ `.fs-org-full` grouped (~13).
- A18 inventory.css:378-384 duplicate; also delete its row in `dangerInk.test.ts` L66 (~7).
- ops css: `.fs-rec-loc` / `.fs-endop-warning` merges, repeated `color` (~7).
- REFUTED: Card `selected` prop (a specified state in card.md).

### Challenge for Alex (product calls — not in net)
- **FloatingStack:** drag/edge-snap/persist is ~120 of 186 lines for two buttons; a fixed stack
  would be ~40.
- **Welcome scroll:** the hand-tuned magnetic settle (~70) could use ScrollTrigger's built-in
  snap instead. The feel may change.
- **Personnel import:** step 3 "Check the rows" repeats step 4 (~30); ADR-038 sets 4 steps for
  the *inventory* import only.
- **Smaller calls:**
  - Navigation: desktop division-chip row duplicates the Filters sheet (dropping it deletes
    railTree too); RequireDepartment's two buttons both go to `/auth`.
  - Components: FloatingPanel drag-resize bar (~35); radix Switch → native
    `<input role="switch">` (ADR-023 stack).
  - Sync and seed: unused `getRowSyncState` (ADR-024 promises per-row sync state on
    Accountability); Squad 3 seed rig.

---

## Delegation
| Piece | Model | Effort | Why |
|---|---|---|---|
| Bug 1 password-reset rollback (functions) | opus | high | Security + auth state across Auth/RTDB; mirror provisionAccount's rollback |
| Bugs 2, 3, 6, 7 | sonnet | medium | Contained logic fixes with clear reference patterns |
| Bug 4 QueryClient networkMode | sonnet | medium | One default + an offline test; runtime check stays on main loop |
| Bug 5 Tailwind `@source` | sonnet | low | One line; screenshot gate stays on main loop |
| Bugs 8, 9 + minor display bugs | sonnet | low | After Alex picks the rule (bug 8) |
| Stage 1 deletes | haiku | low | Mechanical, grep-proven |
| Stage 2 B1 overlay hook, C1, C11, C12 | opus | high | A11y-critical / guard-order / data-loss constraints |
| Stage 2 remainder | sonnet | medium | Behavior-preserving refactors with listed constraints |
| Stage 3 welcome | sonnet | medium | Shared runtime; chunking constraint |
| Stage 4 CSS | sonnet | low | Small; bundle diff verifies |
| Doc/comment edits (card.md, stale comments) | sonnet | low | **Claim ledger required** per plan-conventions |
| Diff review per agent, bundle diffs, preview driving, final adversarial review | main loop | — | Not delegated (verification + architecture) |

## Verification
1. Per stage: run each of `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`
   bare, writing output to a file, then `echo EXIT:$?` (the gates mirror CI per
   `.github/workflows`). Then `.claude/skills/run-fieldshore/smoke.sh`.
2. CSS stages: build the bundle before and after; diff `dist/assets/main-*.css` in cascade
   order, checking all themes including Broadcast.
3. UI-touching items: drive the real preview (`npm run dev` :5199 via preview_start) from a
   realistic state using the member+dept recipe:
   - Bugs 3, 5, 7 and 8.
   - The B1 overlays: Esc, outside click, focus return, nested overlay.
   - A2 pickers, C1 confirm modals, the welcome cinematic (desktop + phone width) and the
     Cutting Station chip text.
   - Bug 5: screenshot all 8 screens before and after, for Alex's OK.
4. Bug 1: emulator test (`npm run emulators`). Force the member-row write to fail → assert Auth
   is rolled back (or the flag is set) and refresh tokens are revoked.
5. Bug 4: toggle offline in the preview → history panels still render.
6. After all stages: an adversarial review over the full range, with refuters per lens (July
   doctrine).
7. Commit per stage on v4-redesign with pathspec commits only (the untracked Phase J files
   stay out). Push on commit.

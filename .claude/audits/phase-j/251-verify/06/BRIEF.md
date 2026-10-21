# BRIEF 06 — Signing in and out (incl. the offline auth window)

- **Spec:** `docs/v4-design/09-workflows/06-signing-in-and-out.md` · **Phase G issue:** #234 (epic #135)
- **Reconciled against:** ADR-015, ADR-022, ADR-025 (+ its 2026-06-22 magic-link addendum and #439 addendum), Gate Review M8 (display name, locked v4.0), `99-open-questions.md` #4b/#33/#41, Step 1 LEDGER (#466 pending-join, #471), source at HEAD of `v4-redesign`.

**Summary.** A firefighter cold-opens as a guest on Quick Find. Signing in is always optional and always reached forward: from the nav's "Sign in" button (or other guest entry points) to the full-screen `/auth` route. There they toggle Sign In / Create Account, use email+password or an emailed sign-in link, and may "Continue as guest" at any time. Create Account requires a display name. Success puts the device on a member session that syncs to a department. Sign out (Settings → Account → Log out) returns to guest mode; local work stays. A returning member stays signed in offline (boot-restore); a first-ever sign-in with no signal shows a calm inline network error.

## 2. Setup

Use the HARNESS (emulators + `npm run dev:emu`, :5200). Phone viewport 390x844. Fresh origin storage, then:

1. **Guest state:** open `http://localhost:5200/`. It redirects to `/quickfind` (route `/` -> redirect). Confirm bottom nav shows a gold "Sign in" link (`/auth`). First-ever visit may redirect to `/welcome.html` first (public welcome page, 2026-07-13); if so, follow its way into the app. An installed/standalone launch skips welcome (#523).
2. **Account A (created through the UI in 06-02..06-06):** email `qa251-06-1@example.test`, display name "Capt. T. Marchetti", password >= 6 chars. Do not repeat passwords in the report.
3. **Department:** after Create Account the app routes to `/create-department` (no dept yet); create "QA251-06 FD" with one apparatus so a later sign-in has a department to land on. A returning-member sign-in test (06-09) needs this.
4. **Second device (cross-device claim only):** `http://127.0.0.1:5200` as device B, clean storage. Used for 06-20 (per-device auth independence).
5. **Offline:** per HARNESS (`goOffline(rtdb)` + `offline` event). Note: Firebase Auth's own network failure for 06-15 is easiest produced by blocking the Auth emulator port (:9099) or throwing the fetch; record the method used.

Routes and labels verified in `src/`:
- `/auth` = `src/app/routes/auth.tsx` -> `src/ui/auth/AuthScreen.tsx`. Outside the tab shell (no bottom nav).
- Segmented labels: "Sign In" / "Create Account" (aria-label "Sign in or create account").
- Fields: "Display name" (Create only, placeholder "Capt. T. Marchetti"), "Email" (placeholder reyes@dept14.gov), "Password" (toggle button, aria-label "Show password"/"Hide password", visible text "Show"/"Hide").
- Buttons: primary "Sign In" / "Create Account" (busy: "Signing in…" / "Creating…"); sign-in mode only: "Email me a sign-in link", "Forgot password?"; always: "Back" (header), "Continue as guest"; link "See what FieldShore does" -> `/welcome.html`.
- Guest entry points: bottom nav "Sign in" (`BottomNav.tsx`; desktop `SideNav.tsx`); gated tabs (Operations/Inventory/Command/Settings) show "Sign in to continue" with "Sign in" + a second secondary button (`RequireDepartment.tsx` GuestSignInGate); Settings index identity card "Sign in" pill -> `/auth`; `/settings/account` guest card "Guest on this device / Sign in".
- Sign out: `/settings/account` -> row "Log out" -> modal "Log out?" with "Cancel" / "Log Out". Also "Sign out" on the no-department gate ("Set up your department").

## 3. Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 06-01 | Cold open as a fresh guest lands on Quick Find with no auth wall and no sign-in prompt before the user acts | Testable | Purpose, Step 1 | Clean storage, load `/`. Expect URL `/quickfind`, strut calculator usable. No `/auth` redirect. |
| 06-02 | Guest sees a reachable "Sign in" entry in the nav that opens `/auth` | Testable (see 06-S1 for the replaced "banner") | Step 1 | Bottom nav "Sign in" -> URL `/auth`. Screenshot. |
| 06-03 | `/auth` is a full-screen pre-shell route: no bottom nav / tab chrome, "FieldShore" brand and a "Back" button in the header | Testable | Step 2 | Read DOM on `/auth`; confirm no `nav[aria-label=Main]`. |
| 06-04 | Segmented control shows "Sign In" / "Create Account"; Sign In is default; toggling swaps the form and announces the selected state | Testable | Step 2, A11y | Tap "Create Account"; read `aria-checked`/selected on the segment; clear any error on toggle. |
| 06-05 | Sign In mode shows Email, Password, primary "Sign In", secondary "Email me a sign-in link", tertiary "Forgot password?", and "Continue as guest" | Testable | Step 2 wireframe | Read page text in Sign In mode. |
| 06-06 | Create Account mode adds a required "Display name" field (placeholder "Capt. T. Marchetti") and hides the magic-link and Forgot-password buttons | Testable | Step 2 (M8), ADR-025 addendum | Toggle to Create. Expect the 3 fields; "Email me a sign-in link" and "Forgot password?" absent. |
| 06-07 | Create Account cannot be submitted without a display name: the button is disabled until name, email and password are all non-blank | Testable | Step 2 (M8, "can never be empty") | Fill email+password only; read the disabled state / disabled reason ("Enter a display name, email, and password"). Fill name; it enables. Whitespace-only name stays disabled. |
| 06-08 | Creating an account signs the device in; with no department it routes to `/create-department`; first-run onboarding tour starts | Testable | Step 3 online success | Submit valid create. Expect URL `/create-department`; onboarding overlay may render. Settings -> Account (after dept setup) shows the typed display name. |
| 06-09 | Signing in with a valid existing account that has a department reloads into that department (not the guest bucket) | Testable | Step 3 online success | Sign out (06-14), sign in as account A. Expect the app to land on `/operations` showing the department's data, header/Settings -> Account shows member identity. |
| 06-10 | Wrong email/password shows the inline error "That email and password don't match." and the form stays populated; no `alert()` dialog | Testable | Step 2 errors, Step 3 | Submit a wrong password. Read the `aria-live="polite"` paragraph under Password. Watch for dialogs. |
| 06-11 | Create Account with an already-registered email shows "An account with that email already exists." inline | Testable | Step 3 | Create with account A's email. |
| 06-12 | Password field has a Show/Hide toggle with accessible names "Show password" / "Hide password" | Testable | Step 2, A11y | Read the button aria-label; tap; field `type` flips text/password and label flips; `aria-pressed` toggles. |
| 06-13 | Busy state: while the auth call runs the primary button is disabled and reads "Signing in…" / "Creating…" | Testable | Step 3 | Throttle/slow the Auth emulator, or catch the frame right after the tap. The negative control is a tap with a fast response (label returns to "Sign In"). |
| 06-14 | Settings -> Account -> "Log out" opens a confirm modal "Log out?" (text: work stays put, return to guest, sign back in anytime); Cancel dismisses with no change | Testable | Step 4 | As member: `/settings/account`, tap "Log out". Tap "Cancel": still signed in. |
| 06-15 | Confirming "Log Out" returns the app to guest mode: bottom nav shows "Sign in" again, gated tabs show "Sign in to continue", Quick Find still works | Testable | Step 4, State diagram | Tap "Log Out" in the modal. App reloads onto the guest bucket. Read nav. |
| 06-16 | Local work persists through sign-out: Quick Find history and any local state present before sign-out are still there as a guest | Testable | Step 4 | Before logging out, run a Quick Find calculation / note IndexedDB state (the events store is never cleared by sign-out). After: compare. Operation/inventory data lives in the department bucket; verify it returns on re-sign-in (06-17) rather than expecting it in the guest bucket. |
| 06-17 | Signing back in re-attaches the department sync: the previously created department, apparatus and operation are present again | Testable | Step 4, Reversibility | Sign in again as account A; read Inventory/Operations. |
| 06-18 | "Continue as guest" dismisses `/auth` with no account created; the app is on a usable screen as a guest | Testable | Step 2, Reversibility | Tap it. Spec says the route dismisses to guest mode; build navigates to `/operations`, which for a guest is the "Sign in to continue" gate (see Risks). Record the landing route and whether Quick Find is one tap away. |
| 06-19 | "Back" on `/auth` leaves the route without creating an account | Testable | Step 2 wireframe ("‹ Back") | Tap "Back"; record landing (build uses `/operations`, not history-back; for a guest that is the gate). |
| 06-20 | Auth is per device: signing in on device A does not sign in device B | Testable | Cross-surface | Device B (127.0.0.1) stays guest after A signs in (nav still shows "Sign in"). Then B signs in independently as the same account. |
| 06-21 | "Email me a sign-in link" (Sign In mode, email filled) shows a "Check your email" view naming the address, with "Resend link" and "Use password instead" | Testable | Step 2 (magic link) | Fill email, tap. The emulator prints the link in its log. Read heading, body, buttons. "Use password instead" returns to the form. |
| 06-22 | The magic-link and "Forgot password?" buttons are disabled until an email is entered ("Enter your email first") | Testable | Step 2 | Sign In mode with empty email. |
| 06-23 | "Forgot password?" with an email shows "Check your email" with the password-reset wording and a "Back to sign in" button | Testable | Step 2 (tertiary link) | Tap with email filled. Read page. |
| 06-24 | Opening the emailed sign-in link on this device finishes sign-in ("Signing you in…" -> app) for an existing account | Testable | Step 2, ADR-025 | Take the oobCode URL from the Auth emulator log, load it in the tab. Expect brief "Signing you in…", then the department (or `/create-department`). The URL is scrubbed to `/auth` after. |
| 06-25 | A magic link for an email that never registered does NOT create a nameless account: it fails with "No account found — create one first" style reason | Testable | ADR-025 addendum | Emulator-generated link for an unregistered email. Read the inline error on the form. Verify the account was deleted (second use of the same email still rejected). |
| 06-26 | Returning member stays signed in with no network: a cold reload while offline restores the member identity (not guest) | Testable | State note, Step 3 offline (boot-restore) | As signed-in member, go offline (HARNESS), reload. Expect member header/Settings -> Account, no "Sign in" nav. SyncBanner (member only) may read "Offline — … will sync when you reconnect". |
| 06-27 | First-ever sign-in while offline shows the calm inline message "No network connection — check your signal and try again." and the form stays | Testable | Step 3 offline | Fresh guest, block Auth, submit valid credentials. Read the `aria-live="polite"` line; no dialog; no queued sign-in. |
| 06-28 | Offline first sign-in is NOT silently queued: after reconnecting, the device is still a guest until the user signs in again | Testable | Step 3 offline, State note | After 06-27, restore network, wait; nav still shows "Sign in". |
| 06-29 | Guest work continues uninterrupted while the offline sign-in error shows (Quick Find still works after leaving `/auth`) | Testable | Step 3 offline | Continue as guest after 06-27 and run a calculation. |
| 06-30 | Accessibility: all form controls have visible labels; the error paragraph is a polite live region; primary/secondary buttons are >= 48px tall at 390x844 | Testable | Spec header (48pt targets), A11y | Read computed heights of "Sign In", "Continue as guest", segmented segments, Show/Hide toggle. Spec fixes 48pt for this screen; record any under 44px as FAIL. |
| 06-31 | Opening `/auth` announces "Sign in or create account. Email and password, or continue as guest." for screen readers | Testable (NOT-BUILT expected) | A11y | Look for any live region / dialog label with this sentence. The build has only the segmented aria-label "Sign in or create account". Record. |
| 06-32 | "Continue as guest" has an accessible description "You can sign in later from Settings." | Testable (NOT-BUILT expected) | A11y | Read aria-describedby / label. Build shows plain "Continue as guest". Record. |
| 06-33 | Creating an account after a guest session claims the guest's mutual-aid read-only record under the new account | Testable (NOT-BUILT expected) | Step 5, ADR-022 | No unit-tag / guest-join / claim code found in `src/`. Record NOT-BUILT unless a join-as-guest flow exists. |
| 06-34 | No broadcast surface renders auth | Testable | Actors | Open the cast/broadcast view if reachable from Command and confirm no sign-in UI. Low priority; mark N/A if no broadcast route is reachable. |

## 4. Superseded / Deferred

| Item | Tag | Citing decision |
|---|---|---|
| 06-S1 Dismissible "Sign in to sync" banner in shell chrome (Step 1, State diagram) | **Superseded** | `SyncBanner.tsx` header comment: the guest nudge was dropped 2026-07-13 (commit d3f4f22). Replacing behavior is criterion 06-02 (nav "Sign in" button; also Settings identity card and gate cards). The banner is now member-only live sync status. |
| 06-S2 "Settings -> Department -> route" as a guest entry (Step 1) | **Superseded** | Settings is wrapped in `RequireDepartment`; a guest opening Settings sees the "Sign in to continue" gate (button "Sign in" -> `/auth`). The guest identity card lives at `/settings/account`. Reaching `/settings` index as a guest is not possible in practice; drive via the gate. |
| 06-S3 Offline auth queues the sign-in intent ("You're offline — you'll be signed in when you reconnect") | **Superseded** | The spec body is already reconciled (ADR-025 text still says queue, but the spec header of this workflow, 2026-06-23, replaced it): no queue; boot-restore for returning members; calm inline error for first-ever offline sign-in (06-26..06-28). ADR-025's original Decision bullet is stale, the spec governs. |
| 06-S4 Sign-out is a plain button with no heavy confirm (Step 4) | **Superseded** (by build) | Build labels it "Log out" with a confirm modal "Log out?" (06-14/15). Not found in an ADR; treat as accepted build behavior and note as SPEC-DRIFT if verdicts need a name. The spec's open question 4 left sign-out confirm copy to Phase H. |
| 06-S5 "Settings -> Sign out" button label | **Superseded** | Label is "Log out" (row) / "Log Out" (modal button) on `/settings/account`; "Sign out" survives only on the no-department gate and the forced-password-change screen. |
| 06-D1 2FA / SSO | **Deferred** | ADR-025; `99-open-questions.md` #33 (v4.1+). |
| 06-D2 Offline "trust this device" token lifetime | **Deferred** | Spec open question 2; Phase H plumbing (ADR-025 Notes). Not drivable. |
| 06-D3 v3 -> v4 migration UI / "Claim department" banner (open question 5) | **Deferred** | Phase J ruling: fresh-start CSV re-import, no migration (`.claude/rules/v4-phase-status.md`, #264). |
| 06-D4 Unsynced-work warning on sign-out (open question 4) | **Deferred** | Phase H copy decision, no later ADR found; build has none. Not a failure. |

New behaviors since the spec that sit near this workflow (drivable, optional extras): admin-provisioned accounts sign in with a starter password and are held at "Set your password" (`ChangePasswordGate`, ADR-025 #439 addendum); a member with no department sees "Set up your department" with "Create department" / "Join an existing department" / "Sign out".

## 5. Risks for the QA agent

- **Cold-open may hit `/welcome.html`** (first visit) before the app. That is the 2026-07-13 welcome redirect, not an auth wall. An installed PWA skips it (#523).
- **"Continue as guest" and "Back" both go to `/operations`**, which for a guest renders the gate "Sign in to continue" (Quick Find is one tap away in the nav). The spec says it "dismisses to guest mode"; judge whether landing on a gate counts; record the exact route and screen rather than assuming PASS or FAIL.
- **Sign out reloads the page** (`reloadIntoActiveBucket`). Read state after the reload; expect a brief splash.
- **Local work after sign-out**: department data lives in the dept bucket, not the guest bucket, and reappears on re-sign-in. Do not call missing operations "lost" while guest.
- **Magic link needs the emulator log**: no email is sent. Links are single-use; StrictMode latch prevents a double-consume in dev, but do not reload the link URL twice and then call it a bug.
- **Auth emulator errors**: `auth/invalid-credential` maps to the "don't match" message for both wrong password and unknown email (by design, no account enumeration).
- **SyncBanner never renders on `/auth`** and renders nothing for guests; do not look for "Sign in to sync" text (06-S1).
- **Spec says 48pt; the generic Button size may be 44-56px**; measure before judging 06-30.
- **Back-button label**: spec shows "‹ Back"; build shows "Back" (no chevron). Cosmetic.
- **Passwords**: never echo them in the report. Use a fresh department per spec.

## Orchestrator note (2026-10-13)
Incident-level mutual aid (guest participation, guest claim on account creation, assisting out-of-department IC) is **Deferred past v4.0 by #493** — ADR-022 was amended 2026-08-17 to ship no code in v4.0 (see `32/BRIEF.md`). Any criterion that depends on it (06-33; the assisting out-of-department IC path in this brief) is Deferred, not NOT-BUILT — skip it and list it under Deferred in the report.

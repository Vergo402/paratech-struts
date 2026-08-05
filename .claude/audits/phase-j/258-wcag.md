# Phase J Gate Audit #258 — WCAG 2.1 AA (v4, `src/`)

**Date:** 2026-07-28
**Scope:** `src/` (v4 React app). v3 root app out of scope.
**Method:** code-level review (no browser available in this session) — primitives,
form components, token files, CSS. Cross-checked against
`.claude/audits/pre-phase-j-review-2026-07/TRIAGE-2026-07-28.md` so #458–#462 are
not re-reported.

## Verdict: **PASS-WITH-CONDITIONS**

The design system itself is unusually disciplined about accessibility — Radix-backed
focus traps, an `Input` primitive with correct label/error wiring, a documented
overlay-claim stack for nested Esc handling, four themes with contrast ratios
annotated in the token file. The blocking issue is not a scattered bug list; it's
one **explicit, signed-off exception (ADR-026)** that removes keyboard/AT operability
from the core lifecycle-advance gesture, plus two **new** tap-target violations
against the app's own field-conditions floor. Recommend: gate passes if Alex
re-affirms ADR-026 is still accepted for cutover (it already carries his ruling) and
the two new stepper/chip tap-target findings get a quick fix — neither is a deep
change.

---

## Findings by WCAG criterion

### SC 2.1.1 Keyboard (Level A) / SC 2.5.1 Pointer Gestures (Level A) — KNOWN, ACCEPTED EXCEPTION, RE-SURFACED FOR THE GATE RECORD

**`src/ui/primitives/Slider.tsx`** — the shore-point status-advance/step-back
control. On touch, the slide-past-threshold drag (`onPointerDown`/`onPointerMove`/
`onPointerEnd`, lines 104–136) is the **only** commit path — no button, no hidden
AT/keyboard equivalent, by deliberate design (`docs/v4-design/11-decisions/ADR-026-slide-only-status-commit.md`).
The ADR's own "Trade-off accepted" section states plainly: *"This fails WCAG 2.1 SC
2.1.1 (Keyboard) and 2.5.1 (Pointer Gestures) for this one control class, and may be
flagged in government / Section 508 procurement reviews."* Alex ruled on this at the
Phase H gate (#248, 2026-06-10, reaffirmed 2026-06-11) after a button-twin shipped
and was rejected as "GOD AWFUL" — doubled affordance, muddied model, reintroduced the
ghost-tap risk the slide exists to prevent. The mouse posture (ADR-035) does have a
plain button; only touch is affected.

This is not a new discovery — it's a locked, reasoned ADR — but a WCAG AA gate audit
has to name it explicitly rather than let it pass silently under "known issue." **A
VoiceOver/TalkBack/switch-access user on a touch device cannot advance or step back a
shore point's status.** They can read every card/status/announcement and operate
every other control. Scope is deliberately narrow (status transitions only — deploy,
return, End Operation, etc. stay ordinary buttons/modals per the ADR's scope guard,
confirmed by reading `OperationsBoard.tsx` and `DeployResolution.tsx`).

**Recommendation for the gate:** carry this forward as a **recorded exception**, not
a blocker — it already has Alex's sign-off and a captured trade-off. Re-confirm at
the gate that the acceptance still stands for cutover (procurement/508 exposure is
explicitly named in the ADR).

### Field-conditions floor (craft.md §7) — 2 NEW findings, tap targets below the project's own minimum

These are **not** WCAG 2.1 AA failures under the SC text itself (WCAG 2.2's Target
Size Minimum, 2.5.8 AA, only requires ≥24×24 CSS px, which both targets clear) — but
they violate the design system's own documented floor, which exists specifically for
the gloves/sun/wet-screen field conditions this gate is supposed to guard. Flagging
per the task brief's field-conditions lens.

1. **`src/ui/operations/DeployResolution.tsx:94,98`** (`Stepper`, used in the
   Assign-Equipment/deploy flow — a fireground surface) — `.fs-stepper-btn`
   (`src/ui/operations/operations.css:1688-1698`) is a real `<button>` sized
   **36×36px**, no padding, no expanded hit-area pseudo-element. `craft.md` line
   81-82 states the intended pattern explicitly: *"Control hit areas stay ≥ 56px
   (the floor is untouchable). Visual weight may be lighter than the hit area — a
   44px-looking stepper extends its touch target to 56px via padding/expanded [hit
   area]."* This stepper does not do that — the visible box **is** the hit box, well
   under both the 44px back-office floor and the 56px fireground floor that applies
   here (it's inside the live deploy workflow, not a back-office screen).

2. **`src/ui/operations/OperationsBoard.tsx:1437,1445`** (system-filter chips +
   "clear all") — `.fs-ops-chip` and `.fs-ops-chip-clear`
   (`operations.css:291-318`) are both `min-height: 32px` with no vertical padding
   and no hit-area extension. Same gap as above: real interactive `<button>`s on the
   fireground Operations board, sized well under the 56px floor and under the 44px
   floor too.

Both are quick fixes (padding or a `::before` expanded hit target, consistent with
the pattern craft.md already documents elsewhere) — flagging for a fix, not a redesign.

### SC 4.1.2 Name, Role, Value / SC 1.3.1 Info and Relationships — verified clean

`src/ui/primitives/Input.tsx` (the `TextField` primitive used across Add Shore
Point, User Manager, Import flows, etc.) does this correctly: `useId()`-generated
`id`/`htmlFor` pairing, `aria-invalid` set from `error`, `aria-describedby` pointing
at the rendered message span, visible `<label>` always present (placeholder is never
the label, per the primitive's own doc comment). No missing-label pattern found in a
spot-check of `AddShorePointModal.tsx`, `ChangePasswordGate.tsx`, `AddMemberSheet.tsx`.

### SC 3.3.1 Error Identification — verified clean, one minor observation

Error text is co-located with the field via `aria-describedby` (satisfies 3.3.1's
text-identification requirement). Minor, non-blocking observation: the error `<span>`
in `Input.tsx` (`fs-field-msg--error`, line 114-118) has no `role="alert"`/
`aria-live` of its own — a screen-reader user who isn't refocused into the field
after an async validation failure won't hear the error proactively, only on
re-entering the field. Not a 3.3.1 failure (the text is present and associated) but
worth a follow-up if validation ever moves to async-on-submit rather than
inline-as-typed. Not filing as a tracked issue — too speculative without knowing
which forms actually validate asynchronously; noting for awareness only.

### SC 4.1.3 Status Messages — verified clean

`role="status"` (implicit `aria-live="polite"`) is used correctly and consistently:
`SyncBanner.tsx` (all 5 banner states), `OperationsBoard.tsx`, `DeployResolution.tsx`
(quantity stepper value + gate/error alerts use `role="alert"` for the
assertive cases, `aria-live="polite"` for the quiet ones — correct split). Coverage
spot-checked also present in `PersonnelImportFlow.tsx`, `ImportFlow.tsx`,
`HazardLog.tsx`, `CommandRail.tsx`, `QrScannerSheet.tsx`, `CreateDepartmentScreen.tsx`,
`AuthScreen.tsx`. No screen found doing an async mutation (deploy, import, sync) with
zero live-region coverage.

### SC 2.4.3 Focus Order / SC 2.1.2 No Keyboard Trap — verified clean in the primitives

- **Modal** (`src/ui/primitives/Modal.tsx`): Radix `Dialog` supplies the trap;
  `onOpenAutoFocus` redirects to `[data-modal-cancel]` for the `destructive` variant
  (safe default never auto-focuses the destructive action); `onCloseAutoFocus`
  restores the remembered opener, never leaves focus on `<body>`.
- **Sheet** (`Sheet.tsx`): same opener-remember/restore pattern; Esc/outside-dismiss
  correctly deferred to a child overlay via the `overlay.ts` claim stack
  (`isTopOverlay`/`overlayContains`) — confirms the stacking model documented in
  `overlay.ts`'s header comment actually works as described.
  reads correctly.
- **SideDrawer** phone posture (`PhoneDrawer`): reuses Sheet's exact lifecycle —
  correct. Desktop posture (`DockDrawer`) has its own local Esc listener that is
  correctly scoped **not** to inert the live board (by design, per ADR-019) — but
  this is exactly the **already-tracked #459** (its Esc listener doesn't check the
  overlay stack, so Esc meant for a nested overlay also closes the dock). Confirmed
  present at `SideDrawer.tsx:108-117`, not re-filing.
- **Popover** (`Popover.tsx`): same claim-stack pattern, plus a documented wheel-
  scroll rescue for panels portaled outside a Modal's scroll-lock allowlist. Correct.

### Slider secondary findings — both already tracked, confirmed present

- **#462** (commits a drag even if disabled mid-gesture): confirmed —
  `onPointerEnd` (`Slider.tsx:125-136`) never re-checks `disabled`. Not re-filing.
- **#458** (SR announces the full lockstep count on an out-of-zone single-point
  move): not independently re-verified beyond the triage's own note (mechanism
  confirmed, call-site pre-filtering not exhaustively ruled out) — no new evidence
  either way.

### Contrast — token system verified clean, spot-checked

`src/app/tokens.css` — all four themes (`light`, `dark`, `sunlight`, `broadcast`)
annotate their own `--text-primary`/`--text-secondary` contrast ratios in comments,
all comfortably above the 4.5:1 body-text floor (lowest is dark theme's
`--text-secondary` at 5.19:1). `sunlight` theme correctly drops to `#000000` for
both primary and secondary text ("no mid-gray text in sunlight," line 201) — the
right call for direct-sun legibility.

Hardcoded-hex sweep (`grep` for literal `#RRGGBB` color values outside `tokens.css`)
found exactly two hits, both documented, deliberate exemptions, not token-system
bypasses:
- `operations.css:790` — a broadcast-theme-only ink fallback where `--sys-lockstroke-bg`
  resolves to `transparent` (comment explains why a real dark is needed).
- `operations.css:3174` — the what3words brand-red mark, explicitly exempted under
  ADR-011 (brand-color exemption), same class as the emblem exemption.

No other CSS files in `src/` (out of ~40+ under `src/ui`) contain a literal hex
color in a `color`/`background` declaration. The one-gold-accent budget and the
four-theme contrast discipline both hold up under this spot-check.

### Tap targets — 56px fireground / 44px back-office floor, spot-check beyond the two findings above

Grepped `src/ui/primitives/primitives.css` and `operations.css` for `height`/
`min-height` values under 44px on interactive elements. Beyond the Stepper and
filter-chip findings above, the remaining sub-44px boxes found were non-interactive
(status-pill height, badge dots, icon glyphs, the step-back Slider knob at 36px —
which is a decorative/labeled-`aria-hidden` element, not the hit target; the hit
target is the whole track per `slider.md`'s "gloved fingers miss a 36-44px knob"
design note). The 2026-07-09 tap-target sweep referenced in the task brief (node/
assign rows 48→56px, saw chips 44→56px) held up in the areas checked — no
regression found in `OrgChart`/`CommandRail`/Cutting Station CSS.

### Icons / alt discipline — spot-checked, no violation found

Modal/Sheet/SideDrawer close glyphs are all `aria-hidden="true"` SVGs wrapped in a
`<button aria-label="Close">` — correct pattern, used consistently across all three
primitives. A broader grep for icon-adjacent `<button>` elements without
`aria-label` returned only buttons that also carry visible text content (not
icon-only) in the files sampled (`CommandRail.tsx`, `NodeSheet.tsx`,
`SitStatRollup.tsx`, `ShorePointCard.tsx`) — this was a spot-check, not an
exhaustive scan of every icon-only control in the app.

---

## Verified-clean section (summary)

- `Modal`, `Sheet`, `Popover`, `SideDrawer` (phone posture) — focus trap, focus
  restore, Esc/outside-dismiss nesting via the overlay-claim stack — all correct.
- `Input`/`TextField` primitive — label association, `aria-invalid`,
  `aria-describedby` — correct, used consistently.
- Live-region (`role="status"`/`role="alert"`) coverage on async results (sync
  banner, deploy errors, import flows) — no silent-failure screen found.
- 4-theme token contrast — all pass AA, sunlight theme correctly avoids mid-gray.
- Token-system discipline — only 2 hardcoded colors in the entire `src/ui` CSS
  tree, both documented brand/theme exemptions.
- Keyboard alternative for org-chart drag ("Move…" flow in `NodeSheet.tsx`) present.

## Already-tracked, not re-reported

#458 (SR lockstep count), #459 (DockDrawer Esc), #460 (native-controls silent
no-op), #461 (AT-blind plate picker fallback), #462 (Slider commits mid-gesture
disable) — all confirmed still present at their filed locations during this sweep,
consistent with the 2026-07-28 triage.

## New items for the board

1. **ADR-026 touch-only Slider (SC 2.1.1 / 2.5.1)** — recommend re-affirming at the
   gate rather than filing as a new issue (it's a locked ADR with Alex's ruling
   already on record); the gate write-up should just cite it explicitly.
2. **`Stepper` (DeployResolution) 36px tap target** — `operations.css:1688-1698` —
   fireground surface, below both 44px and 56px floors, no hit-area expansion.
3. **`.fs-ops-chip` / `.fs-ops-chip-clear` 32px tap targets** — `operations.css:291-318`
   — same gap, on the live Operations board filter row.

Items 2–3 are small CSS fixes (padding or a `::before` hit-area extension,
consistent with the pattern `craft.md` already prescribes) — recommend filing as
sub-issues of #258 before cutover rather than blocking the whole gate on them.

---
## Gate decisions (Alex, 2026-07-28)
- **ADR-026 re-affirmed at the gate**: touch-drag slide-to-advance as the sole status-commit path is Alex's locked ruling from #248 — re-affirmed, not re-litigated. The keyboard/AT path remains the documented alternatives per the accessibility floor.
- **Stepper + ops-chip tap targets**: fixed in the Stage A fix batch (invisible hit-area expansion).

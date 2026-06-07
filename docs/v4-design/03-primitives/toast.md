# UI Primitive: The Toast

> Phase E primitive spec. The **transient, self-dismissing message** — it confirms or notifies, then leaves on its own. It blocks nothing and asks for nothing the operator must answer. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Motion Doctrine" (the toast as a *confirmation* animation) + [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md) (the group-advance confirmation, matrix **F-21**) + [`06-synthesis.md`](../06-synthesis.md) §1.5 / Tech-debt, **governed by [ADR-010](../11-decisions/ADR-010-status-commit-model.md)** — which *retired the timed-undo toast* and **repurposed this primitive to confirmation / notification only.** Grounded in the **real v3 toast** — `showToast()` / `showToastHTML()` (`app.js:1575`) and `.toast` (`style.css:100`), a 3 s bottom-center message with success/error/warning fills — the way [`card.md`](card.md) is grounded in `renderResults()`. The toast mints **no token of its own**; every value is owned by a sibling and cited (`--surface-elevated` / `--surface-stroke` / `--danger` [`color.md`](../07-design-system/color.md), `--radius-card` / `--space-3` / `--space-4` [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--type-body` [`typography.md`](../07-design-system/typography.md), `--motion-transition` / `--motion-exit` [`motion.md`](../07-design-system/motion.md)). Distinct from [`modal.md`](modal.md) (it *blocks*), the `WarningGate` (it *persists* — see below), and the sync indicator (an ongoing *condition*, not an event).

---

## Purpose

A toast is a **small message that appears at the bottom of the screen, states one fact, and dismisses itself.** It is the app's lightest-touch feedback: the operator advances a group of shore points and the app confirms "Advancing all 2 group members"; a background sync fails and the app says so; a new version is ready and offers to reload. The toast arrives, is read or not read, and leaves — it never blocks the flow, never demands a decision, never traps a thumb.

It is also the primitive most at risk of doing too much. v3 reached for the toast for everything transient — and, fatefully, for the **undo affordance** (`showToastHTML()`'s one caller was the undo-link toast). [ADR-010](../11-decisions/ADR-010-status-commit-model.md) removed that job: status now advances by a deliberate slide and is reversible from the card at any time, so the timed-undo toast — eyes-on-screen, racing a 5-second countdown the in-building operator never sees — is gone. What remains is a disciplined, narrow primitive: **confirmation and notification, nothing else.** This doc draws the boundaries that keep it narrow, the way [`badge.md`](badge.md) drew the read-only boundary that kept the badge from becoming a control.

---

## The boundary — what is, and is not, a toast

The toast is the most-confused primitive in the system, so its boundaries are rules, not judgment calls — the same discipline [`picker.md`](picker.md) imposes on its variants and [`modal.md`](modal.md) / [`sheet.md`](sheet.md) impose on theirs. A toast sits at the intersection of *transient* and *non-blocking*; the moment a message is one but not both, it belongs to a different primitive.

| It is a **toast** when… | It is **not** a toast — it is… |
|---|---|
| It states something and **dismisses itself** | …a [**modal**](modal.md) when the operator must *stop and decide* before anything continues |
| It is a **momentary event** — an action registered, a sync failed | …the **sync indicator** ([`color.md`](../07-design-system/color.md) / [`badge.md`](badge.md)) when it is an *ongoing condition* ("Offline — changes queued") |
| It is **non-safety feedback** the operator may ignore | …the **[`WarningGate`](warning-gate.md)** when it is a *safety disclosure* (unrated zone, over-capacity, the liability disclaimer) that must persist on the result |
| It **confirms or notifies** | …**slide-to-advance + the card's reverse control** when it is a status *commit* or its *undo* ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) |

> **A toast is transient and non-blocking. If a message must persist, it is not a toast; if a message must be answered, it is not a toast.**

Three of these boundaries are load-bearing enough to state in full:

- **Toast vs. the `WarningGate` — the safety boundary.** A capacity warning, an unrated-zone disclosure, or the "planning aid, not an engineering certification" disclaimer is **never** a toast. A toast disappears; a safety disclosure must ride the result card for as long as the result is on screen. These are the [`WarningGate`](warning-gate.md) primitive — distinct from Toast and Modal ([`06-synthesis.md`](../06-synthesis.md); matrix **K-11**: "one primitive, three uses"). The rule is absolute: *a safety-critical message must not be able to auto-dismiss* (Principle 7 — visible safety).
- **Toast vs. the sync indicator — the transience boundary.** "Offline — changes queued" is a *state*, not an *event*: it is true continuously until comms return, so it lives in the always-present sync indicator (Principle 8; the dot maps to existing status tokens, [`color.md`](../07-design-system/color.md) §Theme switching), never pulsing. A toast fires only for a *transient* sync event that wants a moment of attention — a write that *failed after retries* and needs the operator to verify a count (`app.js:1173`). The persistent condition and the momentary event are different primitives; v3 already learned this and debounces sync toasts (`SYNC_TOAST_DEBOUNCE_MS`, 30 s — "transient awareness, not per-mutation spam," `app.js:1742`).
- **Toast vs. the status commit — the ADR-010 boundary.** See *Not the undo*, below. The everyday advance is never confirmed by a toast; the slide gesture, the badge cross-fade, and the medium haptic are the confirmation ([`motion.md`](../07-design-system/motion.md)). A toast may still *announce* a multi-target group advance, but it is never the undo and never the only place the new state lives.

---

## The variants

v4 ships **three toast variants**, separated — like [`badge.md`](badge.md)'s five — by *what the toast carries*, not by taste.

| Variant | Carries | Initiated by | Action | Auto-dismiss | Example |
|---|---|---|---|---|---|
| **Confirmation** | "the action you just took registered" | the operator | **none** | yes (~3 s) | "Advancing all 2 group members" (group advance, matrix **F-21**) |
| **Notification** | "something happened you should know — and may act on" | the system | **≤ 1 optional, non-destructive** | only if it carries no action | "Update ready" + **Reload** (service-worker update, matrix **A-17 / I-12**); span-of-control "Add Branch?" (matrix **C-5**) |
| **Error** | "something failed — and what to do about it" | the system | ≤ 1 optional (**Retry**) | persists until dismissed / acted | "Inventory sync failed after retries — verify available count" (`app.js:1173`, matrix **A-25 / I-3**) |

The **Confirmation** is the canonical everyday toast — operator-initiated, free of any control, gone before it is in the way. The **Notification** is the only variant that may carry an action, and it carries **at most one**, always non-destructive (a destructive action is a [modal](modal.md), never a toast). The **Error** is a Notification in the feedback palette: it may use `--danger` ([`color.md`](../07-design-system/color.md)) as an *accent* — an icon and a left rule, never a full red fill (Principle 3 — calm in chaos; the saturated red of v3's `.toast.error` is exactly the dispatch-console look [`color.md`](../07-design-system/color.md) exits) — and the *word* always carries the meaning (Principle 9). Where the failure is safety-consequential, the durable record is inline or a `WarningGate`, and the toast is only the awareness.

---

## Anatomy

| Property | Value | Token / source |
|---|---|---|
| Position | Bottom-anchored, centered; **16 pt above the safe-area inset**, and **always above the primary action / bottom nav** — it never overlaps them | [`motion.md`](../07-design-system/motion.md) §What moves; [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints ("never rely on the bottom safe area for a primary action") |
| Width | Hugs its content to a readable max; full-width-minus-16 pt insets on phone, capped center on tablet / laptop | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Surface breakpoints |
| Corner radius | **12 pt** — the shared card / button radius, so the toast reads as part of the surface language | `--radius-card` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Background | Elevated surface | `--surface-elevated` — [`color.md`](../07-design-system/color.md) |
| Border | 1 pt hairline (2 pt under sunlight) | `--surface-stroke` / `--stroke-width` — [`color.md`](../07-design-system/color.md) |
| Elevation | **No drop shadow** — separates by elevated-surface color (dark) + the hairline + the card's 1 pt top inner-highlight; cast shadows are reserved for the *scrimmed* overlay surfaces (sheet, modal) | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation; [`color.md`](../07-design-system/color.md) §Strokes & elevation |
| Internal padding | **12 pt** vertical / **16 pt** horizontal | `--space-3` / `--space-4` — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Spacing tokens |
| Message text | **14 / 400**, one line preferred, two maximum; numbers tabular | `--type-body` — [`typography.md`](../07-design-system/typography.md); `tabular-nums` §Tabular numerals |
| Optional headline (rare) | **20 / 600** lead line for a two-line notification | `--type-headline-2` — [`typography.md`](../07-design-system/typography.md) ("toast / sheet headline") |
| Optional action label | **14 / 500**, the button-text weight | `--type-body-medium` — [`typography.md`](../07-design-system/typography.md) |
| Scrim | **None.** A toast does not dim the parent — non-blocking is its identity | — (the absence is the spec) |

The toast is deliberately the inverse of the [modal](modal.md) on two axes: it carries **no scrim** (it must not block) and **no drop shadow** (shadows belong to the scrimmed overlays). It separates from the content beneath it by the *elevated surface color* — in the dark operations theme `--surface-elevated` (`#2E333B`) lifts cleanly off the card (`#252930`) and the background (`#1C1F23`) — and by its hairline, which thickens to 2 pt under sunlight with the rest of that theme. (Where elevated equals the card surface — light and sunlight are both `#FFFFFF` — the hairline and the bottom-band position do the separating; see Open questions.)

---

## Lifecycle — appear, dwell, dismiss

- **Appear.** The toast slides up from the bottom edge over `--motion-transition` (**200 ms**) on `--ease-standard` — the same *confirmation*-job entrance the sheet uses, because the operator is already where the toast appears ([`motion.md`](../07-design-system/motion.md) §What moves). A **light haptic** may fire on appear for a Notification / Error the operator did not directly trigger (matrix **G-8**) — but **never** for a status transition, whose haptic is the medium-impact commit on the slide itself ([`motion.md`](../07-design-system/motion.md) §Haptics; the status-toast haptic was retired with the status toast).
- **Dwell.** A **Confirmation** dwells ~3 s (carried from v3's `setTimeout(…, 3000)`, `app.js:1573`) then exits on its own. A toast that **carries an action does not run a dismissal timer** — it persists until the operator acts or dismisses it, because a control that vanishes mid-reach is a control a gloved, eyes-on-the-rubble operator cannot use (WCAG 2.2.1; the same eyes-off reality that retired the timed undo — [ADR-010](../11-decisions/ADR-010-status-commit-model.md)).
- **Dismiss.** The toast exits with `--motion-exit` (**180 ms**, `--ease-exit` — accelerate away). It dismisses on its dwell timer (Confirmation), on its action, on an explicit close / swipe, or when superseded.
- **One at a time.** **Maximum one toast on screen**; a second message dismisses the first immediately ([`motion.md`](../07-design-system/motion.md) §What moves) — v3's single `#toast` element and `clearTimeout(toastTimer)` already enforce this (`app.js:1559`). A *queue* is not introduced in v4.0: a stack of toasts is a notification storm, and the fireground did not ask for one (Principle 3). Repeated identical conditions **debounce** rather than re-fire (v3's `SYNC_TOAST_DEBOUNCE_MS`, carried forward as doctrine).
- **Reduced motion / broadcast.** The toast **appears**, it does not slide — every `--motion-*` collapses to `--motion-instant` ([`motion.md`](../07-design-system/motion.md)). Broadcast never renders a toast at all (see Surface adaptations).

---

## Not the undo — the ADR-010 reframe

This is the whole reason this doc reads the way it does; it is the toast's equivalent of the modal's "Confirmation doctrine" — a job v4 deliberately **removed** from the primitive, recorded so it does not creep back.

- **v3's `showToastHTML()` existed for one caller: the undo-link toast.** It was the lone `innerHTML` path in the toast system — the structural-XSS surface the v3.11.3 C2 fix had to special-case (`app.js:1565`). [ADR-010](../11-decisions/ADR-010-status-commit-model.md) retires that caller, and with it the only reason the toast ever needed `innerHTML`. **v4's toast is text-only** — there is no rich-fragment toast, and therefore no toast XSS surface to harden (the gap [`badge.md`](badge.md) and [`modal.md`](modal.md) close for their primitives, the toast closes by *deletion*).
- **The everyday status commit is not a toast.** A shore point advances by a deliberate slide; the confirmation is the badge color cross-fade (`--motion-status`) plus a medium haptic ([`motion.md`](../07-design-system/motion.md); [`badge.md`](badge.md)). No toast fires on a single advance — the state is already visible on the card.
- **Reversal is spatial, not temporal.** Undo is the card's always-present **Step-back** control ([`card.md`](card.md); [`accessibility.md`](../07-design-system/accessibility.md)), not a 5-second window. A toast that re-introduced a countdown would re-introduce the exact field failure ADR-010 was written against — eyes on the rubble, the window expires unseen — it is an anti-pattern below.
- **A group advance may still be *announced*.** When one slide moves all members of a grouped shore type, a **Confirmation** toast says so — "Advancing all 2 group members" (matrix **F-21**) — because that consequence is *not* otherwise visible from the one card the operator touched. But the toast **names the action; it is never the undo, and never the sole record** — every affected card also shows its own new state ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts: "never the *sole* record of a state").

---

## v3 grounding — a real toast, narrowed

v3 already has a single, real toast primitive — more than most of v3's UI, which is why this doc *narrows* rather than *invents*:

- **The mechanism carries forward; the styling does not.** `showToast(text, type, duration)` (`app.js:1575`), the single `#toast` element, the 3 s default, and the one-at-a-time `clearTimeout` are sound and survive. The **saturated fills** — `.toast.success { background: var(--green) }`, `.error { var(--red) }`, `.warning { var(--orange-dark) }` (`style.css:118`) — do **not**: they are the dispatch-console palette [`color.md`](../07-design-system/color.md) exits. v4 is a neutral elevated surface; Error uses the muted `--danger` as an accent, not a fill.
- **`showToastHTML()` is deleted, not ported** (see *Not the undo*). Its only caller was the undo link; with the undo gone the function — and v3's lone toast `innerHTML` path — has no reason to exist.
- **v3's `type` maps to the v4 variants by *what it carries*:** `success` → **Confirmation**; `warning` / guard messages ("Start an operation first," `app.js:1316`) → **Notification**; `error` ("sync failed after retries," `app.js:1173`; "Storage full," `app.js:1601`) → **Error**.
- **Sync debounce is doctrine, not an accident.** `SYNC_TOAST_DEBOUNCE_MS` (30 s) and the `_lastOfflineToastTs` / `_lastFailToastTs` guards (`app.js:1613`) encode the rule that a recurring condition does not spam a toast per mutation. v4 keeps it — and moves the *persistent* part of sync ("Offline — changes queued") out of the toast entirely and into the always-present sync indicator (the transience boundary, above).

**The v4 gap this closes:** the toast's scope creep. v3's toast tried to be confirmation, notification, error, persistent-sync-status, *and* undo at once. v4 keeps the first three, moves persistent sync to the indicator, moves safety disclosures to the `WarningGate`, and deletes undo — one primitive, one job: transient, non-blocking feedback.

---

## Universal rules

1. **A toast is transient and non-blocking.** It dismisses itself (or on one action), never dims the parent, never traps focus or a thumb. A message that must be answered is a [modal](modal.md); a message that must persist is a `WarningGate` or the sync indicator.
2. **Never the undo, never a countdown.** Reversibility is the card's always-present Step-back ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); a timed-undo toast is the field failure the ADR removed.
3. **Never the sole record of a state.** A toast can be missed — eyes are on the rubble (Principle 10). The durable truth lives on the card, the indicator, or the inventory count; the toast only surfaces it ([`accessibility.md`](../07-design-system/accessibility.md)).
4. **Safety messages are not toasts.** Capacity, unrated-zone, and the liability disclaimer are the `WarningGate` (matrix K-11); they must not auto-dismiss (Principle 7).
5. **Text only.** No rich / `innerHTML` fragment, no embedded controls beyond the single optional action (the v3 `showToastHTML` path is deleted).
6. **At most one action, always non-destructive.** A destructive action is a modal. A toast's optional action opens a sheet or performs one reversible step.
7. **One at a time; repeated conditions debounce.** A second toast replaces the first; an identical recurring condition does not re-fire (no notification storm — Principle 3).
8. **Color is never the only signal** (Principle 9). The Error tone is a `--danger` accent *plus the word*; the toast never relies on a red fill to mean "error."
9. **No urgency theater** (Principle 3). A toast never pulses, never ramps, carries no exclamation mark and no emoji ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)). Urgency is the radio's (Principle 10).

---

## Surface adaptations

| Surface | Toast behavior |
|---|---|
| **Phone (team officer)** | The canonical bottom-center toast, 16 pt above the safe area and above the primary action. The light-touch confirmation for a gloved, one-handed operator. |
| **Tablet (command post)** | Bottom-center or bottom-trailing, capped to a readable width; same variants, no new vocabulary. A CP confirmation ("Advancing all N group members") does not interrupt the board behind it (no scrim). |
| **Laptop (Toughbook)** | Bottom-trailing; **keyboard-reachable** — an actionable toast's action is in the tab order and does not auto-expire while focus is within it; **Esc** dismisses ([`accessibility.md`](../07-design-system/accessibility.md)). |
| **Broadcast TV** | **Never renders.** A toast is per-operator feedback and the board is a passive, shared snapshot on a 15 s poll ([`picker.md`](picker.md) / [`color.md`](../07-design-system/color.md) §Broadcast). The durable state the toast referenced is already on the board as a [badge](badge.md); the transient message is not. |

Under **sunlight**, the toast keeps its single elevated surface but thickens its hairline to 2 pt and bumps text weight one step with the theme ([`typography.md`](../07-design-system/typography.md) / [`color.md`](../07-design-system/color.md)); it does **not** escalate to a banner the way the status [badge](badge.md) does — a toast is not a status, and a full-bleed sunlight toast would read as the alarm the doctrine forbids.

---

## Accessibility floor

- **A toast is a polite live region.** It is `role="status"` + `aria-live="polite"` — announced **once**, never on a per-keystroke or per-mutation basis. `aria-live="assertive"` is reserved for the rare Error that genuinely cannot wait, never for routine confirmation (an explicit anti-pattern in [`accessibility.md`](../07-design-system/accessibility.md)).
- **It is never the sole record** (rule 3). Because a screen-reader user — like an eyes-off operator — can miss a transient announcement, the state the toast reports is always also reachable on a durable surface (the card's `aria-live` status, the inventory count). The toast is awareness, not the source of record ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **An actionable toast does not race a timer.** A Notification / Error carrying an action persists until acted or dismissed (rule 6; WCAG 2.2.1 Timing Adjustable) and its action is a focusable, labeled control — the keyboard / AT path is first-class, not an afterthought.
- **Reduced motion loses nothing.** The slide collapses to an instant appear ([`motion.md`](../07-design-system/motion.md)); the message is text, so it is fully legible the instant it shows. **Haptics survive reduced motion** — the light appear-haptic on a Notification is the non-visual channel for an eyes-off operator ([`accessibility.md`](../07-design-system/accessibility.md) §Non-visual channels).
- **Screen-reader script** (registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts, *Role · Name · State · Action-hint* grammar): **"Advancing all 2 group members"** — announced once, politely; an actionable toast appends its hint — **"Update ready. Reload, button."** Numbers speak as the field says them, tabular ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)) — "all 2 group members," not a bare count.

---

## Anti-patterns (do not do these)

- **A timed-undo toast for a status change.** The exact mechanism [ADR-010](../11-decisions/ADR-010-status-commit-model.md) retired; reversibility is the card's Step-back, always present, never a countdown.
- **A safety message in a toast.** Capacity, unrated-zone, the liability disclaimer — these persist on the result as a `WarningGate` (matrix K-11); a disclosure that can auto-dismiss is a safety failure (Principle 7).
- **A persistent condition as a toast.** "Offline" is the sync indicator's job (Principle 8); a toast that never leaves is not a toast.
- **A toast as the only place a fact appears.** It can be missed; the durable record lives on a card / indicator / count (rule 3).
- **A rich-HTML or multi-control toast.** Text + at most one optional action. The v3 `showToastHTML` path is deleted, not ported.
- **A destructive action on a toast.** Stop-and-decide is a [modal](modal.md); a toast's lone action is non-destructive.
- **A queue / stack of toasts.** One at a time; a notification storm competes with the incident (Principle 3). Recurring conditions debounce.
- **A saturated full-fill error toast** (v3's `var(--red)` background). Neutral surface + a `--danger` accent + the word (Principle 9; [`color.md`](../07-design-system/color.md)).
- **Pulsing, an exclamation mark, an emoji, or `aria-live="assertive"` for routine feedback.** Urgency theater the doctrine forbids (Principle 3; [`accessibility.md`](../07-design-system/accessibility.md); [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **A toast that overlaps the primary action or sits in the bottom safe area.** It rides 16 pt above both ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).

---

## Open questions for downstream

1. **Light / sunlight figure-ground.** In light and sunlight `--surface-elevated` equals the card surface (both `#FFFFFF`) and the toast carries no scrim and no drop shadow — so separation rests on the 2 pt sunlight hairline and the bottom-band position. Whether light / sunlight need a slightly heavier stroke or a one-off subtle toast shadow (a deliberate exception to "shadows are sheet / modal only") is an affordance call made **by eye in the vertical slice (Phase H)** — the same way [`modal.md`](modal.md) deferred `--shadow-modal`. The *doctrine* (no scrim; prefer surface-color + stroke over a shadow) is fixed here.
2. **Dwell duration — value vs. token.** The ~3 s Confirmation dwell is carried from v3 and is a *behavior* value, not a `--motion-*` token (motion tokenizes transitions, not dwell). Whether v4 tokenizes a dwell constant is a Phase H call; flagged so it is not minted ad hoc.
3. **Actionable-toast persistence ceiling.** An actionable toast persists until acted / dismissed; whether it also carries a generous outer timeout (so a forgotten "Reload" eventually clears) is a Phase F / H decision per the screens that raise one (service-worker update, span-of-control).
4. ~~**The `WarningGate` primitive's own spec.**~~ **Resolved (2026-06-07):** written as [`warning-gate.md`](warning-gate.md) — the cascade's **fourteenth** file, added at the gate per matrix **K-11**. This doc draws the toast / [`WarningGate`](warning-gate.md) boundary; the gate's persistence, placement on the result card, and acknowledgment semantics now live in that file.

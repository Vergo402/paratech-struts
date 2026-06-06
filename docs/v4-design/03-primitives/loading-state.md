# UI Primitive: The Loading State

> Phase E primitive spec. The **honest wait** — what the screen shows while something is genuinely not ready yet, and nothing more. Authored at the depth of [`picker.md`](picker.md).
> Source: essays [`05-essays/09-data-resilience.md`](../05-essays/09-data-resilience.md) (the local-first reality that makes a loader the exception) + [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Motion Doctrine" + [`05-essays/07-field-conditions.md`](../05-essays/07-field-conditions.md) (feedback channels), governed by **Principle 8** (*local-first* — the app works offline, sync state is one quiet indicator), **Principle 11** (*earns its place quietly* — no splash over 400ms), **Principle 3** (*calm in chaos* — no anxious motion), and **Principle 9** (*no mystery meat* — a bare spinner is unlabeled). Grounded in the **real v3 loading sprawl** — `guardClick()`'s `.btn-loading` busy button (`app.js:1946`, born from the Surfside IP-010 hotwash), a handful of "Loading…" toasts, native `loading="lazy"` images, and a blocking `alert()` on the one long task (Excel import) — the way [`badge.md`](badge.md) is grounded in v3's badge classes. The loading state mints **no token of its own** — every value is owned by a sibling and cited (`--surface-card-hover` / `--surface-stroke` [`color.md`](../07-design-system/color.md), `--space-*` / `--radius-*` / 56pt rows [`spacing-grid.md`](../07-design-system/spacing-grid.md), `--motion-micro` / `--motion-instant` [`motion.md`](../07-design-system/motion.md), `aria-busy` [`accessibility.md`](../07-design-system/accessibility.md)). Distinct from the ambient **sync indicator** (→ [`color.md`](../07-design-system/color.md) / [`badge.md`](badge.md)) and the **empty state** (→ [`empty-state.md`](empty-state.md)) — see **The loading boundary**.

---

## Purpose

A loading state is the visual the app shows while a piece of content or an action is **genuinely not ready** — a network read in flight, a file being parsed, an image decoding, the first Firebase sync after a cold open. It is the most over-used primitive in modern software: cloud-first apps spinner *everything*, because for them nothing is local and every read is a round-trip. FieldShore is the opposite. **The app is local-first (Principle 8) — almost every read returns instantly from in-memory state and `localStorage`, and instant reads show no loading state at all.** A loader here is therefore a *confession*: it appears only where the work is genuinely asynchronous and slow enough to perceive, and the design's first job is to make that set as small as possible.

The reason v3 needs this doc is the same reason [`picker.md`](picker.md) and [`badge.md`](badge.md) needed theirs: **the same conceptual thing was solved ad hoc in a handful of places, with no shared rule.** v3 grew a busy-button class, a scatter of "Loading X…" toast strings, a native lazy-image attribute, and — for the one operation that actually takes seconds (Excel import of N rows) — *no loading UI at all*, just a blocking parse and an `alert()` if it fails. Four different answers to one question: *what does the operator see while they wait?*

v4 collapses that into a **small, ruled vocabulary** — four loading treatments, chosen by *what the operator is waiting on*, plus two hard boundaries that keep loading from absorbing things that are not loading. And it canonizes the two rulings v3 already paid for in the field: **feedback on every operational tap** (the Surfside lesson) and **static over animated** (`.btn-loading` deliberately dropped its pulse, "speed over aesthetics").

---

## The variants

v4 ships **four loading treatments**. Which one you reach for is determined by *what the operator is waiting on* — a control, a content region, a known-length job, or a small unknowable wait — not by taste.

| Variant | When | Examples in FieldShore | v3 origin |
|---|---|---|---|
| **Busy control** | A single control's own action is in flight — the operator just pressed it | Deploy strut, Save, Start operation, the import trigger, Reload app | `.btn-loading` + `guardClick()` (`app.js:1946`) |
| **Skeleton placeholder** | A content region's data is loading on **first render** and the *shape* of the content is known ahead of the data | Shore-point list on first paint while Firebase first-syncs; archived-ops list; inventory list | — *(v4 gap)* |
| **Determinate progress** | A long operation whose **length is known** | Excel import (N rows), feedback-photo compression/upload, archived-ops fetch of a known count | — *(v4 gap; v3 blocked + `alert()`)* |
| **Inline spinner** | A small region waiting on a genuinely **unknowable-length** async, too small to skeleton | a lazy image slot resolving; a single inline async lookup | native `loading="lazy"` (`app.js:3599`) |

The **busy control** is the canonical one — it is the operational, safety-relevant treatment (it confirms an operator's tap on the active path) and the most frequent; it gets its own section below. The other three are supporting players that obey the same anatomy and the same two boundaries.

---

## The loading boundary

**A loading state is a temporary "not-ready-yet," and two things that look adjacent are not loading states.** Drawing the line is a rule, not a judgment call — the same discipline [`badge.md`](badge.md) imposes between a badge and an interactive chip, and [`sheet.md`](sheet.md) / [`modal.md`](modal.md) impose between their surfaces.

| It is a **loading state** when… | It is **not** a loading state when… |
|---|---|
| Content/action is coming and the wait is *visible and bounded* | Sync is happening *in the background* and never blocks the operator |
| It resolves to content, a committed action, or an inline error | There is genuinely *nothing to load* — the set is empty |
| It owns the region/control until the work lands | It is an *ambient* status that the operator works straight through |
| `aria-busy="true"` is the honest state | `aria-busy` would be a lie |

> **The sync indicator is not a loading state.** The ambient sync dot — *synced* (`--status-process`), *offline/idle* (`--status-pending`), *queued writes* (`--accent`) — is owned by [`color.md`](../07-design-system/color.md) §Theme switching and rendered as an **indicator dot** ([`badge.md`](badge.md)). Per Principle 8 it is *one quiet indicator, not a blocking modal*; its state change is **instant and never pulses** ([`motion.md`](../07-design-system/motion.md) "what does not move"). The operator keeps working while it syncs. A loading state *blocks the thing it covers*; the sync dot blocks nothing. Never render background sync as a spinner over the content.

> **The empty state is not a loading state.** "No operations yet" is a real, settled answer ([`empty-state.md`](empty-state.md)); "we don't have the operations *yet*" is a loading state. Showing empty-state copy while data is still in flight is a **lie** — it tells the operator the answer is *nothing* when the true answer is *not yet*. A first render is `aria-busy="true"` and shows a skeleton; only when the fetch resolves does it become either the content or the genuine empty state. The two are distinguished by `aria-busy`, never conflated.

---

## Anatomy

Every treatment inherits the geometry of the thing it stands in for — a skeleton row is the height of the real row; a busy button keeps the button's radius — so the wait reads as *the content arriving*, not as a foreign overlay. Every value is cited; the primitive mints nothing.

| Property | Value | Token / source |
|---|---|---|
| Skeleton block fill | A neutral one step off the surface it sits on — `--surface-card-hover` on a card, never a saturated color | [`color.md`](../07-design-system/color.md) §Surfaces |
| Skeleton block radius | **Matches the real content's corner** — `--radius-card` for a card, `--radius-badge` for a chip-shaped block, `--radius-input` for a field | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Corner radius |
| Skeleton row height | **The real row's height** — 56pt on an operational list, so the layout does not jump when data lands | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| Determinate track / fill | Fill `--accent` on a `--surface-stroke` track; **4pt** track height — quiet, not a hero bar | [`color.md`](../07-design-system/color.md); `--space-1` [`spacing-grid.md`](../07-design-system/spacing-grid.md) |
| Determinate count text | **Tabular figures** beside the bar — "142 of 500" — so the number does not jitter as it climbs; the bar is never the only signal | `font-variant-numeric: tabular-nums` [`typography.md`](../07-design-system/typography.md) |
| Busy-control label | The control's own progressive verb — "Deploying…", "Importing…", "Saving…" — or the generic **"Working…"**; the original label restores on completion | copy per [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) |
| Inline spinner size | **16–24px** in the slot it fills, `--accent` or `--text-secondary` | `--icon-size-sm/md` [`iconography.md`](../07-design-system/iconography.md) |
| Fade-in / swap | Skeleton fades in at `--motion-micro` if it persists past a frame; resolves to content at `--motion-instant` (a swap, not a cross-fade) | [`motion.md`](../07-design-system/motion.md) |
| Elevation | **None.** A loading state never casts a shadow — it sits in the plane of the content it replaces | [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Elevation |

The loading state is, by design, **mostly static**. The busy control does not animate (see below); the skeleton's default is a flat neutral block with no shimmer; the determinate fill *advances with the work*, not on a loop. The only continuous animation in the whole vocabulary is the **inline spinner**, and it is the smallest, rarest case — and the one place a token is genuinely missing (see Open questions).

---

## The busy control — the canonical, operational variant

The busy control is the loading state on the operational happy path — the button the operator taps to Deploy, Save, Import, or Start — and it is the one that is *safety-relevant*, because its job is to confirm that a tap under stress actually registered. Its rules are mostly *inherited from a v3 field lesson* and recorded here so they do not regress.

- **It is feedback on every tap — that is why it exists.** v3's `guardClick()` was written after the Surfside TTX-2 hotwash (IP-010): the previous early-return path **swallowed the first click silently**, and a participant lost ~90 seconds of OP1 discovering a double-click workaround. The busy control is the fix made doctrine — *every* press of an operational control produces immediate, visible acknowledgment, including a re-press while the action is still in flight.
- **It is static, not animated — inheriting v3's own ruling.** v3's `.btn-loading` (`style.css:1449`) deliberately removed its pulse animation — the source comment reads *"speed over aesthetics."* v4 canonizes this: the busy control's **label carries the state, not a spinner.** A control the operator just pressed does not need a spinning glyph to prove it is working; it needs to say so, instantly and statically.
- **It disables during flight.** No double-commit. The control is `disabled` from press to resolution; a re-press is **swallowed, never silent** — it surfaces a polite "Working — please wait" ([`toast.md`](toast.md)), exactly v3's `guardClick` behavior.
- **It holds a minimum-visible floor.** v3 restores the control ~1000ms after the action resolves so a fast commit does not *flash and vanish* — a loader that appears for one frame is noise, not feedback (Principle 3). Either the action is instant and shows no busy state, or the busy state is held long enough to be read.
- **It resolves into a real outcome.** On success the control returns to its label and the *result* is what confirms — the card advances, the toast says "Strut deployed," the badge cross-fades ([`badge.md`](badge.md)). On **failure it resolves to an inline error with a retry, never a modal `alert()`** — closing the v3 gap where a failed import threw `alert('Error importing…')` (`app.js:8005`). Failure is a state of the control, not an interruption stacked on top of it.
- **It is local to the control, never a screen-blocker.** The busy state lives on the one control the operator touched; the rest of the screen stays live and readable (Principle 4 — one canonical action). v4 has **no full-screen blocking spinner**.
- **Haptics ride with it** ([`motion.md`](../07-design-system/motion.md)): a light tap on touch-start ("the screen saw you"), a medium impact on commit ("it went through") — so the operator knows the press landed without watching the button. Haptics survive `prefers-reduced-motion` ([`accessibility.md`](../07-design-system/accessibility.md)).

---

## v3 grounding — four ad-hoc answers, one vocabulary

v3 answers "what does the operator see while they wait?" four different ways, at four call sites, with no shared primitive — a busy-button class in `guardClick()`, "Loading…" toast strings sprinkled through the data layer, a native image attribute, and a blocking parse with an error `alert()`. v4 re-sorts each into the vocabulary above — **by what the operator is waiting on, not by its v3 markup:**

| v3 mechanism | v4 variant |
|---|---|
| `.btn-loading` + `guardClick()`, `btn.textContent = 'Reloading…'` (`app.js:8261`) | **Busy control** |
| "Loading up to N archived ops…" toast (`app.js:5465`), the archived-ops list paint | **Skeleton placeholder** (+ a count once known) |
| Excel import: blocking parse + `alert('Error importing…')` (`app.js:8005`, `8075`) | **Determinate progress** (the import knows its row count) — the gap this closes |
| "Loading export library…" toast (SheetJS lazy-load, `app.js:7907`) | **Busy control** (the export button's own state) |
| native `loading="lazy"` on plate/feedback images (`app.js:3599`, `8592`) | **Inline spinner** (kept native + a skeleton for the slot) |
| (no loading UI on first list paint — "loading" was indistinguishable from "empty") | **Skeleton placeholder** + `aria-busy` — the loading-vs-empty boundary |

**What carries forward verbatim:** the two rulings v3 paid for in the field — *feedback on every operational tap* (IP-010 / Surfside) and *static over animated* (`.btn-loading`'s removed pulse). v4 does not re-litigate either; it makes them doctrine. **The v4 gaps this closes:** there were no skeletons (so first-paint "loading" read as "empty"), no determinate progress on the one operation that has a knowable length, and a modal `alert()` where an inline retry belongs.

---

## Universal rules

1. **A loading state is the exception, not the default.** The app is local-first (Principle 8); an instant read shows **nothing**. A loader appears only when the work is genuinely async and perceptibly slow. If you can return content this frame, do — no spinner.
2. **Loading is never empty.** A first render still in flight is `aria-busy="true"` with a skeleton, never the empty-state copy ([`empty-state.md`](empty-state.md)). Telling the operator "nothing" when the answer is "not yet" is a lie.
3. **The sync indicator is not a loading state.** Background sync is the ambient dot ([`color.md`](../07-design-system/color.md) / [`badge.md`](badge.md)) — instant, never pulsing, never blocking. It is not rendered as a spinner over content.
4. **Determinate beats indeterminate whenever length is known.** Calm is *knowing how long* (Principle 3). The import knows its row count — "Importing 142 of 500," not a spinner spinning into the void.
5. **Static over animated.** Inherit v3's speed-over-aesthetics ruling — the busy control and the default skeleton carry **no continuous animation**. The inline spinner is the single exception, and the smallest, rarest case.
6. **A loader always carries a word or a referent** (Principle 9). `aria-busy` plus an accessible name; a determinate bar plus its count. A bare, label-less spinner is mystery meat.
7. **Bounded — no blocking full-screen loader, no splash over 400ms** (Principle 11). The app boots to its local content; it does not gate the operator behind a launch spinner.
8. **A minimum-visible floor prevents flicker.** A loader that flashes for a frame and vanishes is worse than none (v3 holds ~1000ms). Either don't show it, or hold it long enough to read.
9. **Failure is a state, not an `alert()`.** A loading state that fails resolves to an **inline error + retry** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) error copy), never a modal interruption ([`modal.md`](modal.md) reserves heavy confirmation for the destructive/terminal).
10. **No urgency theater** (Principle 3). No pulsing, accelerating, or ramping loader. A loader confirms work is underway; it never manufactures alarm.

---

## Surface adaptations

The loading vocabulary is authored for the phone (the floor) and inherited by tablet and laptop; broadcast is the exception that barely loads at all.

| Surface | Loading behavior |
|---|---|
| **Phone (team officer)** | The canonical treatments. Busy control on operational buttons; skeleton on a list's first paint; determinate progress for an import the team kicks off in the field. |
| **Tablet (command post)** | Same vocabulary. The multi-pane layout means **one pane can skeleton while another is already live** — loading is per-region, never a whole-screen blocker (Principle 4). |
| **Laptop (Toughbook)** | Same. The long desk jobs — Excel import/export, after-action assembly — get the **determinate progress** treatment with room for a fuller count; keyboard focus parks on the busy control and the result is announced when it lands. |
| **Broadcast TV** | **Near-none.** The board is a snapshot on a ~15s poll with **zero motion** ([`motion.md`](../07-design-system/motion.md)); it never shows a spinner. Between polls it shows the **last good snapshot** — stale-but-honest — not a loader. At most a small static "Updated h:mm" stamp; never an animated wait. |

The **sunlight** theme is the one escalation: a faint `--surface-card-hover` skeleton block *vanishes* under 100,000-lux glare, so sunlight skeletons use a **more-contrasted neutral and the theme's 2pt stroke** — the same thicken-for-glare strategy as [`color.md`](../07-design-system/color.md) §Sunlight (black-on-white, 2pt strokes, card shadow). The determinate track thickens with it. Any optional shimmer is dropped in sunlight as glare-noise (it is already dropped under reduced motion).

---

## Accessibility floor

- **`aria-busy="true"` is the load-bearing behavior.** The region or control announces its busy state to assistive tech and flips to `false` when content lands — the loading-state analogue of *the badge reads as its word*. Without it, a screen-reader user cannot tell "loading" from "empty," the exact lie rule 2 forbids.
- **A busy region announces once, politely.** `aria-live="polite"`: "Loading shore points." Never `assertive` — routine loading is not an interruption ([`accessibility.md`](../07-design-system/accessibility.md) anti-patterns). When content lands it is read on next focus, not as a "done" interjection.
- **A bare spinner is mystery meat** (Principle 9). Every loader carries an accessible name (`aria-label="Loading"`); a determinate one announces progress **at sensible intervals**, never every tick (the keystroke-spam anti-pattern). Numbers speak as the field says them ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- **The busy control stays acknowledged.** It is `disabled` during flight (so it leaves the active tab cycle), but its state change is announced — the Surfside "the press registered" lesson, in screen-reader terms — and a re-press is met with the polite "Working — please wait," not silence.
- **Reduced motion loses nothing.** Under `prefers-reduced-motion` the skeleton goes fully static and the inline spinner falls back to a static "Loading…" label or the platform-native indicator ([`motion.md`](../07-design-system/motion.md)). Because a loader's meaning is its **`aria-busy` + word**, not its motion, the swap to static costs zero information — the same redundancy logic that lets the badge drop its cross-fade.
- The Busy-control, Loading-region, and Determinate-progress VoiceOver / TalkBack scripts are registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts.

---

## Anti-patterns (do not do these)

- **A spinner on a local read.** If it returns this frame from local state, show nothing (Principle 8). A spinner that flashes for one frame is noise, not feedback.
- **Empty-state copy shown mid-load.** "No operations yet" while the fetch is still in flight is a lie. First paint is `aria-busy` + skeleton; empty copy waits for a *resolved* empty result.
- **A blocking full-screen loader or a splash over 400ms.** The app boots to its local content (Principle 11). Loading is per-region, never a screen gate.
- **A modal `alert()` on a failed load.** Failure resolves inline with a retry ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) / [`modal.md`](modal.md)) — the exact v3 import gap (`app.js:8005`) this doc retires.
- **A bare, label-less spinner.** Mystery meat (Principle 9); every loader has an accessible name and, where it can, a determinate count.
- **A pulsing, accelerating, or ramping loader.** Urgency theater competes with the incident (Principle 3) — the same ban [`motion.md`](../07-design-system/motion.md) puts on the sync dot.
- **An indeterminate spinner where the length is known.** The import knows its row count — use determinate progress, not a spin into the unknown.
- **A custom spinner that cannot honor `prefers-reduced-motion` or broadcast.** Prefer a static skeleton or the platform-native indicator (see Open questions).
- **Any animated loader on the broadcast board.** It is a 15s-poll snapshot with zero motion; a spinner on the wall distracts the whole room.
- **Rendering background sync as a loading state** — a blocking or pulsing overlay. Sync is the ambient dot: instant, non-blocking ([`color.md`](../07-design-system/color.md) / [`badge.md`](badge.md)).
- **Re-styling a wait at its call site.** One vocabulary — busy control, skeleton, determinate, inline spinner — never a hand-rolled loader per screen (the v3 debt this doc retires).

---

## Open questions for downstream

1. **Continuous-loop timing has no owning token.** [`motion.md`](../07-design-system/motion.md) owns *transition* durations (`--motion-micro` … `--motion-nav`), not *continuous loops* — so the inline spinner's rotation period and any optional skeleton shimmer sweep are unowned. This is deliberate: the doctrine prefers treatments that need no loop (busy control = static, skeleton = static, determinate = advances with the work). **Recommendation for the vertical slice (Phase H):** ship skeletons fully static and render the inline spinner as the **OS-native platform indicator**, which carries correct reduced-motion behavior and timing for free; mint a `--motion-loop` token by ADR *only* if a custom spinner proves necessary. Flagged so a loop value is never minted silently off-scale (the [`motion.md`](../07-design-system/motion.md) "six durations, five easings" discipline).
2. **Exact skeleton neutrals per theme and the minimum-visible floor.** The precise sunlight more-contrasted block, the dark/light skeleton fills, and the flicker floor (v3 used ~1000ms — confirm or tune) are affordance geometry finalized in the slice (Phase H), like [`badge.md`](badge.md) OQ1 and the card's slide mechanics. The *vocabulary* (four treatments, static-first, the two boundaries) is fixed here.
3. **Determinate-progress announce interval.** How often a long import announces to a screen reader — every 10%? every N rows? — is a Phase H a11y-tuning call so it neither spams nor goes silent. Fixed here: it announces *at intervals*, with a referent, never every tick.
4. **Per-screen skeleton shape.** Whether each list authors its own skeleton silhouette (a shore-point row vs. an inventory row vs. an archived-op row) is a Phase F IA decision per screen — like [`badge.md`](badge.md) OQ4. This doc fixes that a skeleton matches the *real* content's geometry; *which* geometry is the screen's to specify.

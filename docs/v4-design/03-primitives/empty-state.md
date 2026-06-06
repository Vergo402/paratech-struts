# UI Primitive: The Empty State

> Phase E primitive spec. The **calm zero-state surface** — what a screen, pane, list, or section shows when it holds nothing. Authored at the depth of [`picker.md`](picker.md).
> Source: essays [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md) (empty-state copy) and [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) ("Empty / Loading states"), governed by **Principle 7** (*visible safety* — a blank result is a bug, say why), **Principle 11** (*the app earns its place quietly* — an empty state is not onboarding or marketing), **Principle 4** (*one canonical action per state*), and **Principle 3** (*calm in chaos*). Grounded in the **real v3 empty-state sprawl** — roughly seven distinct ways the running app renders "nothing here" (`.empty-state` with a 48px icon, `.no-results` / `.no-results.info-fallback`, `.ops-tree-empty`, and bare inline-styled `<span>`s), the way [`badge.md`](badge.md) is grounded in v3's badge classes and [`card.md`](card.md) in v3's `renderResults()`. The empty state mints **no token of its own** — every value is owned by a sibling and cited (`--icon-size-lg` / `--icon-size-xl` [`iconography.md`](../07-design-system/iconography.md), `--text-secondary` [`color.md`](../07-design-system/color.md), the `--space-*` rhythm [`spacing-grid.md`](../07-design-system/spacing-grid.md), the copy doctrine [`voice-and-tone.md`](../07-design-system/voice-and-tone.md), the button it may carry [`button.md`](button.md)). It is **read-only** like [`badge.md`](badge.md) — but unlike a badge it may carry exactly one action; see **The three-way boundary**.

---

## Purpose

An empty state is a **designed surface for the absence of content** — a region that currently holds nothing, drawn so the operator reads two answers in one glance: **why is there nothing here**, and (when there is something to do) **what is the one action that fills it.** It is the quiet counterpart to the [`card.md`](card.md): the card is what a populated region shows; the empty state is what the same region shows before its first card exists, after a filter excludes them all, or once the work is done and they have moved on.

The reason v3 needs this doc is the same reason [`badge.md`](badge.md) and [`picker.md`](picker.md) needed theirs: **the same conceptual thing looks different in a dozen places.** v3 renders "nothing here" at least seven ways — a centered `.empty-state` with a 48px icon at 40% opacity and a two-line message; a `.no-results` block in Quick Find; a `.no-results.info-fallback` that escalates to a list of would-fit models; an `.ops-tree-empty` one-liner; and several bare `<span>`s hand-styled inline with `color:var(--text-secondary)` and no icon, no reason, and no next step ("No apparatus in inventory", `app.js:3779`). They are all *the same idea*: a region that has nothing to show, telling the operator why. The reference apps the industry uses do not re-invent that surface per screen; FieldShore will not either.

v4 collapses the sprawl into a **small, ruled vocabulary** — four variants sorted by *why* the region is empty, one anatomy, one set of rules. The empty state is where Principle 7 is kept at its smallest scale: **a blank region is a bug** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) — "silent empty sets … say why it is empty"), and the fix is never decoration — it is one factual line of *what*, one of *why*, and at most one button.

---

## The three-way boundary

**Empty state vs. loading state vs. the safety/error states it must never impersonate is a rule, not a judgment call** — the same discipline [`picker.md`](picker.md) imposes on its variants and [`badge.md`](badge.md) imposes on the badge-vs-chip line. This is the load-bearing section of the doc, because confusing the three is both the v3 sin and a safety risk.

| It **is** an empty state when… | It is **not** an empty state when… |
|---|---|
| The set is **settled** and genuinely holds nothing — never created, filtered to zero, or all moved on | Data is **still loading / in flight** → that is the [`loading-state.md`](loading-state.md) primitive (#195). Never render "nothing here" before the answer is in. |
| The emptiness is a **normal, expected** condition | The zero is caused by a **safety / rating boundary** (no strut is rated at this length) → that is a **warning card** ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) §Empty states; [`card.md`](card.md) `RecommendationCard`). |
| **Nothing broke** — there is simply nothing to show | **Something failed** (a write, a sync, a load error) → that is an **error state**: name what failed and what to do ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) — "vague errors" anti-pattern). |

> **The hard line: an empty state means "nothing here." It never means "still loading," and it never means "something is wrong."**

Two consequences are non-negotiable:

- **A safety-driven omission must never look like a data absence.** When Quick Find returns zero because the opening is past every strut's rated range, the operator must see the *boundary warning* — **"AcmeThread and LockStroke are not rated above 12 ft (144″) — no deployment path exists at this length"** — not a neutral "No matching struts." A calm gray empty state in that moment would read as "you're out of stock," hiding a *safety* fact behind an *inventory* one. The rating boundary owns that screen, not this primitive ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md); [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)).
- **An empty state and a loading state must not flicker into each other.** Showing "No shore points yet" for 150 ms before twelve cards pop in reads as data loss, then a jump. The region renders the loading state until the set is settled, *then* the empty state if it is truly empty — owned jointly with [`loading-state.md`](loading-state.md) (#195).

The one v3 element this boundary **excludes** is the **unfilled org-chart slot** (`.org-node-empty` / `.org-card-empty`, `app.js:1577` / `1587`) — a dashed-border position card reading "drop here" that is itself a drop target and assign affordance. It *looks* like an empty state and *behaves* like a control: tapping or dropping onto it mutates the operation's role assignments. It is the **empty/unfilled variant of a card**, not a region empty state, and belongs to [`card.md`](card.md) — exactly as the assignment chip with its `×` belongs to [`input.md`](input.md), not [`badge.md`](badge.md). empty-state.md draws the line and points; it does not document the slot. (The rule: an empty state replaces a *region* that has no items; an unfilled *slot* that invites an inline drop/assign is a card.)

---

## The variants

v4 ships **four empty-state variants**. Which one you reach for is determined by *why the region is empty*, not by taste — and the "why" decides the single most important question: **is there a primary action, and what is it?**

| Variant | Why it is empty | Primary action | Examples (v3 origin) |
|---|---|---|---|
| **First-run** | The collection has **never had an item**; creation is expected | **Yes — exactly one** create action | "No shore points yet. Tap + Shore Point" (`app.js:5213`); "No apparatus added yet" (`app.js:3094`); empty inventory (`#invEmpty`, `app.js:3450`) |
| **Filtered** | Data **exists**; the active search/filter excluded all of it | **No create** — offers *clear / adjust the filter* | "No matching shore points" in a filtered drill-down (`app.js:6646`); Quick Find "No strut combinations found … try adjusting the length or load" (`app.js:460`) |
| **Upstream-blocked** | Empty because a **prerequisite elsewhere** is not met | **Points to the upstream action** — often on another screen; may be informational only | "No apparatus assigned to this operation. Assign apparatus from the Operations tab…" (`app.js:8375`); "No apparatus or individuals in this operation yet" (`app.js:4063`) |
| **All-clear** | Items existed and have **all moved on**; empty **is success** | **None** — a calm confirmation, no CTA | Hazard log with nothing logged: "No hazards logged" (`app.js:4754`); a Cutting Station that is caught up |

The **first-run** variant is the canonical one and the only one that *always* carries a create action (Principle 4: one, and only one). The distinctions are real, not decorative:

- **First-run vs. all-clear is a tone-and-action decision, not cosmetics.** First-run invites creation ("Add the first shore point"); all-clear confirms completion and invites *nothing*. Telling an Incident Commander to "Log your first hazard" on an empty hazard log would be absurd — an empty hazard log is *good news*. The same region can move **between** variants over an incident's life: a Cutting Station shows **upstream-blocked** early ("nothing has been moved to Cutting yet") and **all-clear** late ("cut list clear — every piece is cut and sent"). The variant tracks the *cause at that moment*, and the copy tracks the variant.
- **Filtered never offers "create."** The data is there; the filter hid it. Offering "Add" would be wrong — the action is *clear the filter*, and a first-run "create" CTA in a filtered-empty state sends the operator to make a duplicate of something they already have.
- **Filtered may escalate to an informational fallback instead of dead-ending.** v3's `.no-results.info-fallback` (`app.js:452`) is the pattern: when an inventory-filtered strut search finds nothing *on the assigned apparatus* but Paratech models exist that *would* fit, v3 shows those models marked "would fit if you had them" rather than a bare empty state. That is a **`RecommendationCard` in informational mode** ([`card.md`](card.md)), reached *instead of* a filtered empty state when a more useful answer exists — the same instinct as the safety-boundary deferral: **an empty result that has something more useful to say should say it, not dead-end** (Principle 7). Whether a given screen escalates is a Phase F call; this doc names the pattern so the empty state is never the lazy default.

---

## Anatomy

The empty state is a **centered stack drawn in the void of its region** — not a card. It has no surface fill, no border, no shadow, no elevation (those belong to [`card.md`](card.md) / the sheet and modal). It is text and, optionally, one quiet glyph and one button, centered in the space the content would occupy.

| Element | Value | Token / source |
|---|---|---|
| **Icon** (optional) | A single glyph **from the existing set**, **muted** — `--icon-size-xl` (48px) for a full-screen / full-pane empty state, `--icon-size-lg` (32px) for a compact / section one. Rendered at the **disabled treatment (40% opacity)** so it reads as a quiet marker, never a focal image. Never a custom illustration, never a decorative spot graphic. | `--icon-size-lg` / `--icon-size-xl`, 40% opacity — [`iconography.md`](../07-design-system/iconography.md) §Artboard sizes ("compact / full empty states"), §Color ("Disabled: 40% opacity") |
| **Headline** | One line, the *what*: factual, sentence case, a fragment, no period — "No shore points yet." | `--type-body-lg` in `--text-primary` — [`typography.md`](../07-design-system/typography.md) / [`color.md`](../07-design-system/color.md) |
| **Reason line** | One line, the *why* / the next step: "Tap Add Shore Point to add the first." (Principle 7) | `--type-body-medium` in `--text-secondary` — [`color.md`](../07-design-system/color.md) |
| **Primary action** (≤ 1) | At most **one** [`button.md`](button.md) — the create / clear-filter / upstream action. **56pt** on an operational surface, **48pt** non-operational. **Omitted entirely** for all-clear and for informational upstream states. (Principle 4) | [`button.md`](button.md); touch targets — [`spacing-grid.md`](../07-design-system/spacing-grid.md) §Touch targets |
| **Layout** | Centered vertically + horizontally in the region it replaces; icon → headline → reason → button stacked with `--space-*` gaps; a max readable width so the reason line does not run edge-to-edge on a tablet pane. | `--space-*` rhythm — [`spacing-grid.md`](../07-design-system/spacing-grid.md) |

Color discipline matters here: the empty state lives in the **neutral text palette** (`--text-primary` / `--text-secondary`) and the muted icon. It is **never `--danger`** — red is the feedback palette for the safety/error states this primitive is forbidden from impersonating ([`color.md`](../07-design-system/color.md) — "`--danger` is a feedback color, not a status"). A filtered or all-clear state in red would manufacture alarm where none exists (Principle 3).

---

## v3 grounding — seven renderings, one vocabulary

v3 draws "nothing here" from many call sites with no shared primitive — a styled `.empty-state` here, a bare inline `<span>` there. v4 re-sorts every one of them into the four variants above, **by why the region is empty, not by its v3 markup:**

| v3 pattern | v4 variant |
|---|---|
| `.empty-state` "No shore points yet…" (`app.js:5213`), `.empty-state` "No apparatus added yet…" (`app.js:3094`), `#invEmpty` empty inventory (`app.js:3450`) | **First-run** |
| `.no-results` "No strut combinations found…" (`app.js:460`); `.empty-state` "No matching shore points." in a filtered drill-down (`app.js:6646`) | **Filtered** |
| `.no-results.info-fallback` "No matching struts on assigned apparatus" + would-fit models (`app.js:452`) | **Filtered → informational fallback** ([`card.md`](card.md) `RecommendationCard`, not a bare empty state) |
| "No apparatus assigned to this operation…" (`app.js:8375`), "No apparatus or individuals in this operation yet" (`app.js:4063`), "No apparatus in inventory" (`app.js:3779`) | **Upstream-blocked** |
| "No hazards logged." (`app.js:4754`); Cutting Station empty (`app.js:7243`) | **All-clear** (or **Upstream-blocked** early — variant tracks the cause) |
| `.org-node-empty` / `.org-card-empty` unfilled position, dashed "drop here" (`app.js:1577` / `1587`) | **Not an empty state** → [`card.md`](card.md) (the unfilled card slot, an interactive drop target) |

**The v4 gap this closes:** the seven-ways-to-say-nothing inconsistency itself — and, more sharply, the bare inline `<span>`s that say *only* "No apparatus in inventory" with **no reason and no next step**. Those are the exact Principle-7 failures this primitive retires: every v4 empty state says *what* and *why*, and the actionable ones say *what to do next* — one pattern, applied everywhere.

---

## Universal rules

1. **Never a blank region.** Every zero-state is a designed surface; a bare blank — or a spinner that resolves to nothing — is a bug (Principle 7; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) "silent empty sets").
2. **Say *why*, then *what*.** Headline = what is empty; reason = why, or the one next step. The exact strings are [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)'s; this doc owns the pattern, not the copy.
3. **At most one primary action** (Principle 4). First-run and filtered carry one; all-clear and informational upstream states carry none. Never two.
4. **Never impersonate loading or error.** Render an empty state only when the set is *settled* (mid-load → [`loading-state.md`](loading-state.md)) and *nothing failed* (errors name the failure). No flicker between loading → empty → content.
5. **A safety-driven omission is not an empty state.** Zero results from a rating / capacity boundary defers to the warning card ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md); [`card.md`](card.md)). A safety omission must never look like absent data.
6. **Not onboarding, not marketing** (Principle 11). No welcome tour, no "Let's get started," no tip-of-the-day, no celebratory copy ("All done — nice work!"). Factual and quiet ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md) — "cute or celebratory copy" anti-pattern).
7. **Quiet visuals.** The icon, if any, is a **muted existing-set glyph at 40%** — never a custom illustration or decorative art. No surface fill, no border, no shadow, no card chrome, and **never `--danger`** — an empty state is not an error ([`color.md`](../07-design-system/color.md)).
8. **No animation on appearance** ([`motion.md`](../07-design-system/motion.md)). An empty state that fades, slides, or bounces in reads as load-state noise — the same rule that forbids the badge and icon from animating on first render. It simply *is* the region's resting state.
9. **One geometry, one palette, system-wide** — the same anatomy (centered stack, muted set-glyph, body-scale headline, secondary-text reason, ≤ 1 button) on every screen, never a hand-rolled "no data" line per call site (the exact v3 debt this retires).

---

## Surface adaptations

The empty state is **read-only enough to render on every surface, broadcast included** — but its *action* never crosses to broadcast.

| Surface | Behavior |
|---|---|
| **Phone (team officer)** | The canonical centered stack: `--icon-size-xl` muted glyph, headline, reason, and (for first-run / filtered) a real **56pt** button. Fills the content area the list would occupy. |
| **Tablet (command post)** | Centered within the **empty pane**, not the whole screen — in the two-column layout an empty right pane (e.g., before a shore point is selected) shows the empty state; the left rail stays. Same vocabulary, room for the reason line at full width. |
| **Laptop (Toughbook)** | Identical; the primary action is keyboard-focusable and in reading order (see Accessibility). Denser vertical centering. |
| **Broadcast TV** | **Renders — read-only is fine here.** A blank board reads as a dead feed, so an empty board states its condition as **text only**: "Cut list clear" at legible size, **no icon-as-affordance and no button** (broadcast renders no interactive primitives — see [`picker.md`](picker.md) / [`card.md`](card.md) surface tables). No animation; it is a snapshot on the 15s poll. |

**Sunlight** is the one escalation that needs care: a **40%-opacity icon washes out at 100,000 lux**. In the sunlight theme the empty state leans on its *text* — the muted glyph is de-emphasized further or dropped, the headline and reason carry on black-on-white at the theme's bumped weight, and any button thickens its stroke with the rest of the sunlight treatment ([`color.md`](../07-design-system/color.md) / [`typography.md`](../07-design-system/typography.md)). The word, never the glyph, is load-bearing (Principle 9).

---

## Accessibility floor

- **An empty state is announced, never silent.** Its headline and reason are **real text in reading order**, not an `aria-hidden` decoration, so a screen-reader user lands on "No shore points yet. Add Shore Point to add the first," not a silent blank. When the empty state **replaces content as the result of a user action** (a filter that clears the last match), a **polite** live region announces it once ([`motion.md`](../07-design-system/motion.md) / [`accessibility.md`](../07-design-system/accessibility.md)) — never `aria-live="assertive"` for a routine zero.
- **The icon is decorative → `aria-hidden`.** The headline carries the meaning; the muted glyph is supplemental, exactly like a paired badge icon (Principle 9). The screen reader reads the words, not "image."
- **The primary action is a real focusable button**, not a tappable `<div>` — labeled with its verb ("Add Shore Point"), **56pt** operational / 48pt non-operational, Enter/Space-activable ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- **Never announced during loading.** The empty state appears only once the set is settled, so assistive tech is never told "nothing here" and then "twelve items" (the boundary rule, restated for the non-visual channel).
- **Reduced motion loses nothing** — there is no appearance animation to suppress ([`motion.md`](../07-design-system/motion.md)); the empty state is the region's static resting look.
- The per-surface VoiceOver / TalkBack script is registered in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts, following the *Role · Name · State · Action-hint* grammar:

  > **Empty state (with action):** *"No shore points yet. Add Shore Point to add the first. Button, Add Shore Point."* — the state read in order, then the focusable action.
  > **Empty state (all-clear, no action):** *"No hazards logged."* — read in order; nothing to activate.

---

## Anti-patterns (do not do these)

- **A bare blank region**, or a spinner that resolves to blank. Every zero is a designed surface (Principle 7).
- **An empty state that is really a loading state** — "No results" flashing before data arrives. Settle first, then render ([`loading-state.md`](loading-state.md)).
- **A safety / rating omission dressed as "no results."** The rating boundary must show the warning card; a neutral empty state hides a safety fact behind an inventory one ([`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **Red, or any alarm styling, on an empty state.** It is not an error; `--danger` is reserved for feedback (Principle 3; [`color.md`](../07-design-system/color.md)).
- **Onboarding, marketing, or celebratory copy** — "Welcome! Let's set you up," "tip of the day," "All done — nice work!" (Principle 11; [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- **A custom illustration or large decorative spot graphic.** One muted glyph from the existing set, or nothing ([`iconography.md`](../07-design-system/iconography.md)).
- **More than one action**, or a first-run "create" CTA in a **filtered** state (sends the operator to duplicate data they already have).
- **An empty state that animates in** ([`motion.md`](../07-design-system/motion.md)).
- **An unfilled interactive slot modeled as an empty state.** The org "drop here" position is a card variant ([`card.md`](card.md)), not this primitive.
- **A bare "No data" with no reason and no next step** — the exact v3 inline-`<span>` debt this doc retires.

---

## Open questions for downstream

1. **Exact vertical metrics.** The icon→headline→reason→button gaps, the vertical-centering offset, the max readable width, and the compact-vs-full size threshold (`--icon-size-lg` 32px vs `--icon-size-xl` 48px) are affordance geometry finalized in the **vertical slice (Phase H)** — like the sheet's swipe threshold and the badge's per-surface geometry. The *vocabulary* (four variants, muted set-glyph, ≤ 1 action, say-why-then-what) is fixed here.
2. **The informational fallback's home.** Quick Find's "would fit if you had it" list is named here as a `RecommendationCard` informational mode reached *instead of* a filtered empty state. Confirm that placement (vs. an empty-state variant) in the Quick Find / Operations IA (**Phase F**).
3. **Per-region copy strings.** Each screen's exact headline / reason / action is **Phase F** (IA), written against [`voice-and-tone.md`](../07-design-system/voice-and-tone.md); this doc reserves the pattern, not the words.
4. **All-clear rendering for the Cutting Station** — does a caught-up Cutting Station show the "Cut list clear" line in place, or collapse the panel? An Operations IA call (**Phase F**); cross-ref [`card.md`](card.md) OQ2 (`returned` / terminal de-emphasis).
5. **Sunlight icon treatment.** Whether the muted glyph is dropped or its opacity is bumped in the sunlight theme (a 40% glyph washes out at 100,000 lux) is flagged for the slice (**Phase H**); the text-leans-on-words rule is fixed here.
6. **Coordination with [`loading-state.md`](loading-state.md) (#195).** The settle-before-empty / no-flicker rule is owned jointly; #195 owns the loading side of the boundary this doc defines from the empty side.

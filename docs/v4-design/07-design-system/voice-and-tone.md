# Design System: Voice & Tone

> Phase E, design-system file 7 of 8. Authored at the depth of [`03-primitives/picker.md`](../03-primitives/picker.md).
> Source: [`02-principles.md`](../02-principles.md) (the constraints) + [`04-references/positioning.md`](../04-references/positioning.md) (the brand voice, in Alex's words) + essays [`05-essays/05-nims-doctrine.md`](../05-essays/05-nims-doctrine.md) (terminology) and [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md) (warning / empty-state copy) — **reconciled, not transcribed.** The seven status display labels are **ratified** here from [`color.md`](color.md), which fixed two words ("In Process", "Shore Secured") and deferred the full set + all UI copy to this file; terminology follows [ADR-008](../11-decisions/ADR-008-nims-org-structure.md); status and measurement wording follow [ADR-010](../11-decisions/ADR-010-status-commit-model.md) / [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md). This is the **one** design-system file that mints **no CSS tokens** — copy is prose, not a token scale; it references the color / type / spacing tokens its siblings own.

---

## Purpose

Copy is a safety surface. A button label, a status word, a warning line — each is read by a gloved thumb, at arm's length, in direct sun, by an operator whose attention belongs on the rubble and not the screen. A word that is ambiguous, cute, or wrong does the same damage a mislabeled control does: it buys a second of doubt at the moment doubt is most expensive.

So FieldShore's copy obeys one creed, three words: **terse, doctrine-aligned, never cute.** Terse, because reading time is taken from the incident. Doctrine-aligned, because the app defers to NIMS / ICS / USACE / Paratech and never rebrands them (Principle 1). Never cute, because celebration, mascotry, and personality are noise the fireground did not ask for (Principle 3 — *calm in chaos*; Principle 11 — *the app earns its place quietly*).

This file owns how the app *talks*: the words on every control, the seven status labels, the warning and empty-state copy, the terminology the app is and is not allowed to use. It does not enumerate every string on every screen — those are written against these rules in Phase F (information architecture) and Phase G (workflows), where each string lives in its screen's context. This is the rulebook, not the script.

---

## The voice

The creed, made operational. Every line of copy answers to these:

- **Imperative for actions.** A control that does something is a verb the operator performs: "Assign Equipment," "Slide to set Strut Set," "Log Hazard." Not "Equipment assignment," not "Ready to cut?"
- **Present tense, stating fact.** Status and system copy report what is true now: "Offline — changes queued," "Advancing all 2 group members." Not "Will sync," not "We'll save that for you."
- **Sentence case.** Labels and buttons are sentence case — not Title Case, not ALL CAPS. (Broadcast section headers are the one cased exception; see Per-surface.) Caps read as shouting, and the app does not shout (Principle 3).
- **The em-dash carries the qualifier.** When a label needs a condition, the dash sets it off: "Pending — no equipment," "Fully extended — no adjustment range remaining." One clause, one breath.
- **No exclamation marks. Ever.** Urgency is the radio's job, not a punctuation mark's (Principle 10).
- **No emoji.** Emoji are not a typeface we control; they render differently on every OS and wash out in sun. Every glyph in the product comes from the [`iconography.md`](iconography.md) set — drawn for this app, themed, sized for the field. v3's "🔧 Assign Equipment" and "✂️ Cut Table" become **Assign Equipment** and **Cut Table** with the app's own wrench and saw icons.

A compact test, two columns:

| The voice is | The voice is not |
|---|---|
| Terse — every word earns its place | Chatty, padded, conversational |
| Doctrine-exact — NIMS / USACE / Paratech words verbatim | Rebranded for friendliness or marketability |
| Factual — states what is true | Reassuring, apologetic, or hyped |
| Calm — no urgency theater | Alarmed, exclamatory, urgent-by-default |
| Specific — names the thing and the why | Vague ("Something went wrong"), generic |
| Plain — read once, at arm's length, in sun | Clever, jargon-for-its-own-sake, cute |

---

## Status display labels

The shore-point lifecycle is the spine of the app, so its words are fixed here and nowhere else. [`color.md`](color.md) locked the colors and two of the words; this file ratifies all seven and is their source of record. (Rendered proof: the badge row in [`../preview/index.html`](../preview/index.html).)

| Display label | Lifecycle meaning | enum key |
|---|---|---|
| Pending | created, not yet worked | `pending` |
| In Process | work underway | `process` |
| **Strut Set** | strut placed, pre-cut | `strutset` (was `strutplaced`) |
| Cutting | wood being cut to length | `cutting` |
| Runner | cut piece in transit | `runner` |
| **Shore Secured** | installed and locked | `secured` |
| **Strut Equipment Returned** | equipment back in inventory (terminal) | `returned` |

Three labels are renamed from v3, and the why matters:

- **Strut Installed → Strut Set.** "Set" is what shoring crews say for an installed, loaded prop — shorter and less ambiguous than "Installed." The enum renamed with it (`strutplaced` → `strutset`), accepted as matrix **E-14** and locked in [ADR-011](../11-decisions/ADR-011-color-token-system.md), per [`nims-org-structure.md`](../04-references/nims-org-structure.md) §10.
- **Secured → Shore Secured.** Names *what* is secured. "Secured" alone could read as a scene-security state; "Shore Secured" is unambiguously the shore.
- **Returned → Strut Equipment Returned.** Spells out that the *equipment* (strut + plates) is back in inventory — the terminal accounting state, not a person or a scene returning.

These are the words. The verbs that move *between* them — the slide-action copy — are in "How the app talks," below.

> "In Process" replaced essay 02's proposed "Active" because Alex reverted it (2026-06-01); "Active" was never a doctrine term. The reversal is the rule: a status word changes only with a reason on the record, never for style.

---

## How the app talks

The rule per kind of copy, each with a real before/after from v3 so the change is auditable against the running app.

**Actions / buttons.** Imperative verb, doctrine-exact, no emoji. Forward motion through the lifecycle is a *slide*, and the label says what the slide sets:
- `🔧 Assign Equipment` → **Assign Equipment** (`app.js:5363`)
- `→ Strut Installed` → **Slide to set Strut Set** (the control is a slide track, not a tap — [ADR-010](../11-decisions/ADR-010-status-commit-model.md))
- `← Send Back` → **Slide back to In Process** (reversal names the destination state, not a generic "back")

**The off-queue state.** A card pulled off an active work queue does not vanish — silent disappearance reads as data loss under stress. It shows a passive red-slash treatment with the words **Removed from cut list** across it (Principle 10 — *visible state, not a push*; [ADR-010](../11-decisions/ADR-010-status-commit-model.md)). The words are a state, not a notification.

**Warnings and disclaimers.** Specific enough that a crew can cross-check the printed manual (Principle 7 — *visible safety*; precision per [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)):
- Unrated zone: **"LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required."** Not a generic "out of range."
- Over capacity: **"Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening."**
- The disclaimer rides every result card and never softens: **"Planning aid, not an engineering certification."** Tidy 1/8″ fractions read as more authoritative than they are, so this line is non-negotiable.
- Measurement footnotes state the conservative-floor math: **"Capacity is from the 6 ft (72″) datasheet row — conservative floor applied; your opening of 84″ falls between Paratech table rows."**

**Empty states.** Never a blank screen — say *why* there is nothing (Principle 7). v3's **"No matching struts found"** (`app.js:460`) carries forward, but when the cause is a rating boundary rather than absent data, the empty state defers to the boundary-warning card: **"AcmeThread and LockStroke are not rated above 12 ft (144″) — no deployment path exists at this length."** A safety-driven omission must never look like a data absence.

**Toasts / confirmations.** Terse, factual, and they *name the action* — no "Are you sure?" modal stands between the operator and the work (Principle 6). Status commits immediately and is reversible from the card, so there is **no timed-undo line** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md) retired it):
- Group advance: **"Advancing all 2 group members."**
- A toast is confirmation or notification only — never the undo affordance. One toast at a time.

**Sync / offline.** One quiet line, never an alarm: **"Offline — changes queued."** The sync dot carries the rest silently (Principle 8); it never pulses (see [`motion.md`](motion.md)).

---

## NIMS & doctrine terminology lock

Every position name, apparatus type, and doctrine term faces one audit — the **Chief Test**: hand the app to a battalion chief who holds a FEMA USAR Task Force credential, and she should never think *these developers didn't read the manual.* Titles are **spelled out as spoken, no acronyms in the chrome** ("Operations Section Chief," not "OSC"); layouts accommodate the longer strings ([`06-synthesis.md`](../06-synthesis.md) §1.4; [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).

| Do not say | Say | Why |
|---|---|---|
| "Operations" (as a person) | **Operations Section Chief** | "Operations" is the *section*; the person is the Section Chief. No "OSC" in the UI. |
| "Cutting Table" (as an org node) | **Cutting Station** (workstation under Operations) | It is a workstation, not an ICS position (FEMA SM-0322). |
| Entry / Rescue / Shoring as org siblings | tasks/resources **under a Group Supervisor** | NIMS Groups are *functional* (Rescue Group, Shoring Group); the work happens *under* them. |
| "Group" (shore-point field) | **Assigned Resource** | A NIMS Group is a command unit, not the apparatus that owns a shore point. |
| "Task Force" (apparatus *type*) | an apparatus **group / resource configuration** | A Task Force is a mixed-resource configuration with a leader, not an apparatus type. |
| "Strut Installed" | **Strut Set** | Field language; see Status display labels. |

Doctrine content is taken straight from the source — USACE shore types as USACE writes them, Paratech load tables verbatim, NIMS roles in NIMS's words — and a department does not get to template its way around any of it, because the safety call is not configurable (Principle 1; [`positioning.md`](../04-references/positioning.md)). Where the app must *paraphrase* sourced content (the deferred D6 checklists), the paraphrase is run past Alex before it ships — see Open questions.

---

## Per-surface copy

The voice is authored for the phone and inherited by the larger surfaces (Principle 2 — *designed for the role, not the device*); only length and casing flex:

- **Phone (the floor).** Shortest labels that stay doctrine-exact. Abbreviate only what is universal, and spell it out on first use ("Incident Commander (IC)"). The phone is designed first for every workflow; the others adapt down from it.
- **Tablet.** Room for fuller column headers and the secondary labels the phone truncates — no new vocabulary, just less truncation.
- **Broadcast TV.** Section headers may be ALL CAPS for legibility at 8–12 ft, and **no abbreviations at all** — the whole command post reads one board. Copy is a snapshot, never interactive.
- **Sunlight.** No copy change of its own, but the weight bump and 2pt borders (see [`typography.md`](typography.md) / [`color.md`](color.md)) eat horizontal space; a label that wraps badly in sun is a label that is too long. Coordinate wrap points with typography.

---

## Accessibility

Copy is the accessibility layer of last resort — when color is defeated by colorblindness or glare, the *word* still carries the state (Principle 9; [`color.md`](color.md)).

- **Every status is a word, not only a hue.** The badge text ("Cutting," "Shore Secured") is the signal; the color is redundant.
- **Screen readers announce label + role.** A control reads as "Button, Assign Equipment," never "Button" or a bare icon. Icon-only controls are forbidden in primary actions — every glyph has backing label text (Principle 9).
- **Abbreviations expand.** Any abbreviation in the chrome carries an `<abbr>` expansion so assistive tech and first-time users both resolve it.

Full conformance behavior consolidates in [`accessibility.md`](accessibility.md), authored last; it references this section as the source of record for copy.

---

## Anti-patterns (do not do these)

- **Cute or celebratory copy.** "Oops!", "Nice!", "You're all set!" — the app is a tool at an emergency, not a companion.
- **Exclamation marks.** Anywhere. Urgency is the radio's (Principle 10).
- **"Are you sure?" modals.** Reversibility replaces confirmation (Principle 6); a modal that blocks the flow is the anti-pattern.
- **Rebranded doctrine.** "Rescue Unit" for "Apparatus," a department alias for a NIMS title. Doctrine words are verbatim (Principle 1).
- **Acronyms in the chrome.** "OSC," "RGS." Spell positions out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Emoji as iconography.** Use the [`iconography.md`](iconography.md) set.
- **Urgency language.** "Quickly assign…," "Alert:…," "Warning!!!" The app states; it does not push.
- **Marketing, tips, tutorials.** No "tip of the day," no onboarding copy between the user and the work (Principle 11).
- **Color-only status.** A status conveyed by hue with no word fails in sun and for colorblind users (Principle 9).
- **Silent empty sets.** A blank result is a bug; say why it is empty (Principle 7).
- **Vague errors.** "Something went wrong" tells the operator nothing. Name what failed and what to do.

---

## Open questions for the gate

None blocking. Three items flagged for Alex's read:

1. **"Strut Equipment Returned" length.** Ratified as-is (Alex, 2026-06-05). It is the longest label in the set; flagged only for a wrap check on the sunlight and broadcast surfaces (Per-surface), not for rewording.
2. **No emoji anywhere in the chrome — including the bottom nav.** This file assumes the [`iconography.md`](iconography.md) set replaces every v3 emoji, nav included. Confirm there is no surface where an emoji is still wanted.
3. **D6 checklist content.** The "paraphrase sourced doctrine, run past Alex before accepting" workflow is deferred to v4.1 with the checklist feature; no copy is committed here. Confirm that deferral holds.

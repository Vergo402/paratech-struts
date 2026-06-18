# Domain UX — Brainstorm Essay

## Executive Summary

The structural collapse domain UX job is making Paratech and USACE math legible at a glance, under a helmet, in daylight, on a gloved phone screen, while the building is still moving. That is a harder problem than most product teams ever face, and v3 comes closer to solving it than any competitor — but it makes one foundational error that v4 has to invert.

In v3, rated capacity is a secondary number. It appears only when load is entered and the margin is negative — meaning capacity shows up only when something is already wrong. Every result card in the normal case shows a strut name, an extension note, and a range. No capacity. The firefighter selecting a strut sees what fits. They do not see what it can hold. That is the wrong hierarchy for a safety-critical selection.

v4 inverts this. Capacity leads at large type — 28pt semibold, above the strut model name. "4:1 safety factor" labels it at 12pt beneath. When a load is entered, the margin row appears below that: green when comfortable, amber when below 20%, red when exceeded. The operator always knows what the strut holds before they know anything else about it.

The rest of the domain UX follows from that inversion. Deductions show as a stacked labeled ledger, not a net number in parentheses. The lumber picker uses an inline segmented control per picker doctrine, with T-Shore and Double-T starting with no selection because either 4×4 or 6×6 is defensible and the operator must own that call. Warnings have three distinct visual registers: unrated zone (amber, deployable with acknowledgment), exceeds capacity (red, not deployable), fully extended (amber inline badge, informational). The cut table card shows its derivation formula so the cutting team knows the math, not just the answer. None of this is invented. Every number traces to the Paratech O&M Manual or USACE doctrine. v4 surfaces that lineage.

---

## The Core Inversion — Capacity as the Lead Number

The v3 result card structure is: system label chip, model name, range, extension info, and — only when load is entered and margin is negative — capacity. This means in the most common case, the result screen shows what fits, not what it holds.

That hierarchy is backwards for a safety tool. The strut's rated load at 4:1 is the most operationally significant number on the card. A rescuer selecting an AT 37-58 for an 84" opening does not primarily need to know that the strut fits. They need to know that at 4:1 safety factor and 6 ft effective length, the strut is rated for 28,250 lb. The fit is a gate condition. The capacity is the safety decision.

v4 leads with capacity. The number sits at 28pt semibold at the top of the card, large enough to read at arm's length in full daylight. Below it, at 12pt regular in --text-secondary: "4:1 safety factor." Those two lines are always visible, on every card, whether or not a load has been entered. The strut model name and range sit below that at the standard card body size. Extension info stays where it is.

When a load is entered, a margin row appears between the capacity and the model name: "Load: 18,000 lb — Margin: +10,250 lb" in 14pt regular. Color-coded: green when margin exceeds 25% of rated capacity, amber when margin is between 0 and 25%, red when load exceeds capacity. The red state is informational only at this point — the exceeds-capacity warning block handles the deployment block.

The capacity number shown corresponds to the conservative floor: the Paratech datasheet row for the next longer standard length, not a linear interpolation. v3.7.2 fixed interpolation but did not surface the reason. The operator sees 28,250 lb for an 84" opening and has no signal that this is the 6-ft (72") table row conservatively applied. v4 addresses that with a one-line footnote below the card body.

---

## The Deduction Ledger

v3 shows deductions as a single compound note: "Opening: 84" → Effective: 75.25" (−8.75")". The component breakdown hides inside a disclosure below that line. Most operators don't open it.

The deduction math is safety-critical arithmetic. Header wood, footer wood, top plate, bottom plate — each one is a real measurement that shrinks the search window. A deduction error is a deployment error. The numbers should not require disclosure to see.

v4 shows the full ledger inline, no disclosure required:

```
Required:    84.0"
− 3.5"       4×4 header
− 1.75"      8×8 Round sole plate (top)
− 1.75"      8×8 Round sole plate (bottom)
Effective:   77.0"
```

Each row is 14pt regular, left-aligned label and right-aligned value. The Required and Effective rows are in --text-primary. The deduction rows are in --text-secondary. The Effective row carries a thin top border to separate it visually from the subtraction rows. No disclosure, no tap required, always visible.

The strut search formula uses plate deductions. The cut length formula uses a different set: header wood, footer wood, and 1.5" for the wedge. The wedge replaces the strut-plus-plates assembly in the cut dimension — you are cutting a wood member to the length that, plus strut-plus-plates, equals the opening. The cut table card shows this separately. The key point here is that the deduction ledger on the search result card uses plate deductions, not the wedge, and the two should never be visually conflated.

There is a critical convention difference between strut search and cut length. Strut search deductions include plates because plates are part of the strut assembly during deployment. Cut length deductions include the wedge because the wood member sits alongside the strut — the wedge drives the final tension. These are intentionally different calculations and v4 should label them differently. The cut table card formula note should say explicitly: "Wood measurement. Wedge (1.5") replaces strut and plates in cut length."

---

## Lumber Picker Doctrine

WOOD_SIZES has three options: None, 4×4 (3.5"), 6×6 (5.5"). Three options, mutually exclusive, parent screen visible. Per picker doctrine, that is an inline segmented control — always visible, no sheet, no tap to open.

The label reads "Header wood" or "Footer wood" as appropriate. The segmented control sits immediately below the field label, full width of the card content area, 44pt height, 3 equal segments. The current value shows as a filled chip. No placeholder, no dropdown affordance.

The critical doctrine point is what happens before the operator makes a selection on T-Shore and Double-T. These shore types start with no segment selected. The "Find Struts" button is disabled — visually dimmed, not hidden, so the operator can see there is a button and understand why it is unavailable. The disabled state carries a label below the button: "Select header and footer wood to continue." This is not a convenience default being withheld. It is a safety call. T-Shore and Double-T can be built with either 4×4 or 6×6 lumber depending on load and span. Defaulting to either is a doctrine violation per v3.9.1 and Principle 5. The operator owns this decision.

3-Post is different. 6×6 is preselected by USACE/FEMA specification. The 6×6 segment appears filled and carries a lock icon. Below the segmented control: "Required per USACE/FEMA spec" in 11pt --text-secondary. The picker is visible — the operator can see the options — but the 4×4 and None segments are non-interactive (opacity 0.4). This makes clear that 6×6 is locked in, not just a default that could be changed.

The lumber picker appears in two places: the Quick Find flow (before the strut search runs) and the shore point setup form. Both surfaces use the same control. The Quick Find flow shows both a header picker and a footer picker. The shore point setup form shows them with the shore type context already present, so the USACE/FEMA lock on 3-Post is immediately visible alongside the type selection.

---

## Warning Architecture

The warning system in v4 has three distinct levels. They should never look alike.

**Unrated zone** (LongShore above 192", 16 ft): full-width amber band occupying the top of the result card. Height is 52pt. Background is --warning-bg (amber 10%). Border-left is 4pt solid --warning-accent. Copy: "LongShore above 16 ft (192") is not rated by Paratech — rescue engineering consultation required." A single "Acknowledge" button at the right edge of the band, 44pt height, amber bordered. Tapping Acknowledge collapses the band and allows proceeding. The second gate — an undismissable modal at deployment — carries its own "I acknowledge this deployment is outside Paratech rated range" language. Both gates survive from v3.10.0 and must carry forward.

**Exceeds capacity** (load entered, load > rated capacity): full-width red band at the top of the card. Background --danger-bg (red 10%). Border-left 4pt solid --danger-accent. Copy: "Load exceeds rated capacity at 4:1 safety factor — this strut cannot be deployed for this opening." No deployment path. No acknowledge button. No gate. This is not a warning that can be cleared by user action — it is a statement of fact. The card remains visible because the operator may need to see why, but there is no path to deploy from this state.

**Fully extended** (at maximum strut reach): compact inline amber badge within the card body, 28pt height, sitting between the range row and the extension info. Badge text: "Fully extended — no adjustment range remaining." No gate, no band. This is informational. The strut is still deployable. The operator should know they are at the edge but the decision to proceed is theirs.

These three warnings occupy different visual registers deliberately. An amber band at the top of a card says "you need to do something before continuing." A red band at the top says "this path is closed." An inline badge says "here is a fact about this result." Conflating them — using the same color or the same format for different severity levels — would undermine the visual language at exactly the moment when the operator needs to parse fast.

---

## The Table Boundary Problem

v3 silently omits AcmeThread and LockStroke results when the effective search length exceeds 144" (12 ft). The `getLoadCapacity` function returns 0 for any length beyond the table's last row, and the `findStrutCombinations` loop skips any result where capacity is 0 and the system is not LongShore. The result is a blank result set with no explanation.

This is a safety gap. An operator searching for a 150" opening with AcmeThread sees no results and has no idea why. They may interpret the blank as "no strut fits" rather than "this system has no published rating for this length." Those are completely different situations. One means they need a different strut. The other means they need rescue engineering before any strut.

v4 surfaces this explicitly. When effective search length exceeds 144" and the search would include AcmeThread or LockStroke, the result section shows a non-deployable warning card at the top of the list before any other results: "AcmeThread and LockStroke are not rated by Paratech above 12 ft (144") — no deployment path exists for this system at this length." Below that, any LongShore results that do exist for the length appear normally. If no LongShore results exist either, the warning card is the only content and the empty-state copy beneath it says "No strut combinations found for this opening at this length in any rated system."

The boundary is 144" for AcmeThread and LockStroke. The boundary is 192" for LongShore, which triggers the unrated zone path with the two-gate acknowledgment instead of the hard block. The difference is that LongShore has a published acknowledgment-required protocol for above-rated deployments. AcmeThread and LockStroke do not.

---

## Conservative Floor Disclosure

When an operator enters 84" as their opening measurement, `getLoadCapacity` returns the capacity at 72" (the 6-ft row) because 84" falls between the 72" and 84" rows and the conservative floor rule returns the higher row's capacity. The operator has no signal that the capacity shown is not for their exact measurement. It is for a longer measurement than theirs, which gives a lower (more conservative) capacity.

This is not wrong. It is the correct behavior per v3.7.2 and per Euler buckling physics: capacity drops as 1/L², so interpolating linearly between rows would overstate safe load. The conservative floor is the right answer.

But the operator cannot verify what they cannot see. The disclosure is one line at 11pt in --text-hint, below the deduction ledger: "Capacity is from the 6 ft (72") datasheet row — conservative floor applied (your opening of 84" falls between Paratech table rows)." This is not a warning. It is not amber. It is a footnote that tells the operator what the math did so they can confirm it against the printed manual.

On the broadcast TV surface, this footnote drops. On the phone it shows as a single collapsed line that expands on tap. On tablet and laptop it shows fully expanded.

---

## The Cut Table as a Work Order

The cut table card in v3 shows three things: shore point name, opening size, and Expected Cut at 36pt / 800 weight. The dominant number is right — the cutting team needs to see 77.0" at full size, immediately, without scanning. That stays.

What v3 does not show is the derivation. The cutting team member reading the card at the saw does not know whether the Expected Cut already accounts for wood thickness. On a 3-Post with 6×6 headers and footers, the wood alone removes 11". If the person at the saw does not know the cut number is post-deduction, they might try to verify it against the opening and get confused. The derivation shows the work:

```
Opening:          84.0"
− 5.5"            6×6 header
− 5.5"            6×6 footer
− 1.5"            Wedge
Expected Cut:     71.5"
```

Same format as the search result deduction ledger: 14pt regular, --text-secondary for deduction rows, --text-primary for the boundary rows, thin top border before Expected Cut. The 36pt / 800 weight number stays at the bottom of this block, after the formula. The formula makes the 36pt number verifiable.

Below the formula, at 11pt --text-hint: "Wood measurement only. The wedge (1.5") accounts for the strut and plate assembly in the final positioned shore."

The cut table card appears on the tablet in the cutting foreman view. On the phone it appears in the shore point card during the cutting phase. The formula block collapses to a single summary line on the phone in compact state: "84.0" opening → 71.5" cut (incl. 6×6 header + footer + wedge)." Tapping the summary expands the full ledger.

---

## Phase Split Visibility

The group-versus-individual phase split (v3.8.0) is architecturally correct and must carry forward. Pre-cutting transitions advance all group members at once. Cutting, Runner, and Secured transitions operate individually. The logic lives in `updateShoreStatus` and is keyed on `individualPhase = ['cutting', 'runner', 'secured']`.

v3 makes this split invisible to the operator. A shore point in the Cutting Station status looks the same as a shore point in the Equipment Assigned status — same card layout, same tap behavior — except that one advances the group and one advances only itself. The operator cannot tell from looking at the card which mode they are in.

v4 surfaces the split. Cards in a pre-cutting group status carry a compact group badge in the card header: "Group of 2" or "Group of 3" in 11pt --text-secondary, with a small multiple-struts icon at 14pt. When the operator taps "Advance" on any card in this state, a 2-second toast appears: "Advancing all 2 group members." This is not a confirmation — per Principle 6, there is no confirmation modal. It is the doubt-free escape notification: immediate commit, 5-second undo window.

Cards in an individual-phase status (cutting, runner, secured) carry a different badge in the header: "Individual tracking" in 11pt --text-secondary with a single-strut icon. When the operator advances this card, no toast mentions other group members, because there are none to mention. The card is fully individual.

The group badge and individual tracking badge occupy the same position in the card header so they do not shift layout between states. The text and icon change; the position does not.

---

## Shore Point Card Hierarchy Across Four Surfaces

The shore point card needs to serve fundamentally different reading distances and contexts across the four surfaces.

On the phone (team officer in the rubble), the primary read is status and strut model. Status badge at 17pt semibold in the card header. Strut model at 15pt semibold below that. Rated capacity at 20pt semibold in --text-primary. The deduction ledger and cut formula are secondary, accessible by expanding the card. The same inversion as the search result card: capacity leads.

On the tablet (CP or cutting foreman), the card is wider and can show more. Status badge, strut model, rated capacity, cut length (if in cutting phase), and the deduction summary all fit at standard card body size without expansion. The tablet card is information dense because the tablet operator is seated and scanning, not one-handed in poor lighting.

On the Toughbook / laptop (deep data CP), the shore point list is multi-column and sortable. Each card is a table row in the expanded view, showing all fields. The card-as-row format renders status badge, strut model, rated capacity, effective length, cut length, assigned apparatus, and group label in adjacent columns. No expansion required. Keyboard-navigable.

On the broadcast TV, the shore point card strips to its essentials for legibility at 8 to 12 feet. Status badge at 40pt. Strut model at 28pt. Rated capacity at 24pt --text-secondary. Cut length, if the point is in cutting phase, at 48pt in --cutting-text — the dominant number changes to cut length because that is what the CP audience needs to read across the room. No interactive elements, no deduction ledger, no phase badge. The TV card is read-only.

---

## Plate Connector Picker

Per Alex's explicit direction from the picker doctrine: the visual grid picker for plate connectors carries forward verbatim from v3. Behavior, interaction, and `touch-action: pan-y` + `transform: translateZ(0)` + visibility toggle are all preserved. The iOS scroll reliability fixes from v3.5.1 stay in place.

v4 applies visual polish only: the card backgrounds, border colors, and type weight update to match the v4 design system. The grid layout, the bottom-sheet anchor, the scrim, the 60vh max-height — all unchanged.

The wood size selector follows the same rule. The grid with image affordance carries forward. Visual polish only.

These two pickers are documented as the "visual grid picker" variant — a fifth picker pattern distinct from the four primary variants in picker doctrine. Phase E should add a visual grid picker section to picker.md documenting the inherited spec and any visual polish decisions.

---

## Strut Search as a List Primitive

The Quick Find result list is currently a custom-rendered block of cards. v4 formalizes it as an instance of the full-screen list picker variant: 8+ options, needs search and filter, shows rich preview content. Push from right on phone, modal sheet 600pt max on tablet, floating panel on laptop.

The search input appears above the list when results exceed 7, following the universal picker rule. On a single apparatus call with standard inventory, the result set is usually under 7 and the search input stays hidden. At Task Force scale with extended inventory, results can exceed 7 and search appears automatically.

The filter controls (by system: Grey / Gold / LockStroke) move from their current position as separate toggle buttons above the list into the list header bar, as chip-style inline filters. They apply client-side immediately — no loading state because all data is local.

The "No matching struts found" empty state from v3.7.3 carries forward, with one addition: if the empty state is caused by a table boundary problem (AcmeThread/LockStroke above 144"), the empty state copy defers to the boundary warning card instead of showing the generic "no results" message.

---

## Recommendations

1. Display rated capacity at 28pt semibold at the top of every result card, above the strut model name, always visible regardless of whether a load has been entered.

2. Label the capacity with "4:1 safety factor" at 12pt regular in --text-secondary, on the line immediately below the capacity number.

3. When a load is entered, show a margin row between the capacity and model name: "Load: X lb — Margin: +Y lb" at 14pt regular, colored green above 25% margin, amber between 0 and 25%, red when exceeded.

4. Display the deduction ledger as stacked labeled subtraction rows (Required, deduction lines, Effective) at 14pt regular with --text-secondary for deduction rows and --text-primary for boundary rows. No disclosure required.

5. Separate the deduction ledger conceptually and visually from the cut length formula. The two use different inputs (plates vs wedge) and must not be conflated.

6. Use an inline segmented control for the lumber picker (None / 4×4 / 6×6), per picker doctrine for 3 mutually exclusive options.

7. T-Shore and Double-T lumber pickers start with no segment selected. The "Find Struts" button is disabled until the operator selects both header and footer wood. The disabled state carries explanatory text: "Select header and footer wood to continue."

8. 3-Post lumber picker preselects 6×6, locks the control with a lock icon, and labels it "Required per USACE/FEMA spec" at 11pt --text-secondary. The 4×4 and None segments are visible but non-interactive (opacity 0.4).

9. Unrated zone (LongShore above 192"): full-width amber band at the top of the result card, 52pt height, --warning-bg background, 4pt solid --warning-accent border-left, with a single Acknowledge button. Carries a second undismissable gate at deployment.

10. Exceeds-capacity: full-width red band at the top of the result card, --danger-bg background, 4pt solid --danger-accent border-left. No deployment path, no acknowledgment gate. The card remains visible for operator reference.

11. Fully extended boundary: compact inline amber badge within the card body, 28pt height, between the range row and extension info. Informational only, no gate.

12. AcmeThread and LockStroke above 144": surface an explicit non-deployable warning card at the top of the result list before any other results. Do not return a silent empty set.

13. Pin the liability disclaimer to the top of the results section at 12pt --text-secondary. Remove it from its current position appended after all cards.

14. Add a conservative floor footnote at 11pt --text-hint below the deduction ledger: "Capacity is from the [X ft] datasheet row — conservative floor applied (your opening falls between Paratech table rows)."

15. Add a derivation formula block to the cut table card showing Opening, each deduction row, and Expected Cut in the same ledger format as the search result deduction ledger.

16. Keep the Expected Cut number at 36pt / 800 weight in --cutting-text. The formula sits above it; the dominant number stays.

17. Add a footnote to the cut table card at 11pt --text-hint: "Wood measurement only. The wedge (1.5") accounts for the strut and plate assembly in the final positioned shore."

18. Display rated capacity on the deployed shore point card using sp.deployedStrut.system and sp.effectiveLength at 4:1. The capacity belongs in the primary card area, not secondary.

19. Shore point card on the phone: status badge at 17pt semibold, strut model at 15pt semibold, rated capacity at 20pt semibold in primary card area.

20. Shore point card on broadcast TV: status badge at 40pt, strut model at 28pt, rated capacity at 24pt --text-secondary, cut length at 48pt in --cutting-text when in cutting phase. No interactive elements.

21. Pre-cutting group transitions: show a 2-second toast "Advancing all N group members" with a 5-second undo window. No confirmation modal.

22. Add a "Group of N" badge in the card header for pre-cutting group cards and an "Individual tracking" badge for cards in cutting, runner, or secured status. Both badges occupy the same card header position — text and icon change, layout does not shift.

23. Plate connector picker and wood size selector: carry forward v3 behavior verbatim. Visual polish only. Document as "visual grid picker" variant in picker.md during Phase E.

24. Formalize the Quick Find result list as an instance of the full-screen list picker variant. Filter chips (Grey / Gold / LockStroke) move into the list header bar, applying client-side instantly with no loading state.

25. When the result empty state is caused by a table boundary problem rather than a fit problem, replace the generic "no results" copy with the specific boundary warning card. Never let a safety-driven omission look like a data absence.

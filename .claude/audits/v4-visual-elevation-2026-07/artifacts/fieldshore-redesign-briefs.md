# FieldShore v4 Redesign — Detailed Briefs for Claude Design & Claude Code

---

## PHASE 1: CLAUDE DESIGN BRIEF

### Context & Scope

**You are the UX/UI director of a structural collapse rescue operations app** used by firefighters and paramedics *on-scene* during active incidents. The app (FieldShore) helps rescue teams calculate and track the placement of hydraulic shoring systems (struts) to support unstable structures.

**Current state:** The app is functionally solid and well-architected, but the visual language is noisy (overuse of gold accents), lacks micro-interaction feedback, and doesn't feel "surgical" enough for a high-stakes rescue tool.

**Your mission:** Refine the visual design to feel precise, clean, and responsive—without touching core workflows or functionality.

### Design Constraints

- **Dark mode only** (remove all other theme options)
- **No workflow changes** — layouts, forms, and navigation stay the same
- **Micro-interactions only** — no flashy animations, just tactile feedback and smooth transitions
- **Gloved operator-friendly** — maintain all tap targets (56px min), don't reduce readability
- **Existing color palette is broadly good** — blue (precise), red (danger), green (success). **Gold needs to be toned down** (retire as interactive accent; keep only for LongShore strut identification in result cards)

### Key Design Deliverables

#### 1. **Color System Specification** (Detailed Document)

Provide a clean, organized CSS variable mapping with:
- ✅ Final dark-mode-only palette (replace the existing `:root[data-theme="dark"]` vars)
- ✅ Reasoning for each change (e.g., "Gold reduced to LongShore identification only → blue now primary interactive accent → surgical, precise feeling")
- ✅ Usage guidelines (where each color should appear: buttons, badges, accents, etc.)
- ✅ Contrast verification (WCAG AA 4.5:1 minimum for all text/background combos)
- ✅ New semantic color names if introducing additional surface levels (e.g., elevated-surface for modals)

**Format:** Markdown with inline CSS examples, or HTML snippet showing each var in use.

#### 2. **Component Redesign Specs** (Detailed Mockups or HTML Prototypes)

Provide detailed visual specifications for these key components. Include current vs. proposed, with rationale.

**For each component:**
- Visual mockup (Figma link, screenshot, or HTML prototype)
- CSS class changes needed
- States (default, hover, active, disabled, focus)
- Micro-animation specs (if applicable)

**Components to redesign:**

A. **System Toggle Buttons** (Gold/Grey selector at top of Quick Find)
   - Current: Large, colored background (`--gold-bg`, `--grey-bg`), prominent borders
   - Proposed: Refined, pill-shaped, more subtle (lighter inactive state, blue accent when active)
   - States: inactive, active, focus
   - Animation: smooth background & border color transition (200ms ease)

B. **Result Cards** (Quick Find results showing strut ranges)
   - Current: Left-side colored border, flat styling, unclear hierarchy
   - Proposed: Cleaner top accent line, enhanced range typography (larger, bolder), secondary data more subtle
   - Hierarchy: Primary range (22px+ bold), extension section (14px subtle)
   - States: default, hover (slight shadow lift)
   - Animation: fade-in on load (150ms)

C. **Shore Point Status Badges**
   - Current: Colored background + text (low contrast in dark mode)
   - Proposed: Icon + colored text + optional background (e.g., "Pending" = outlined circle + amber text, "Placed" = filled circle + green text)
   - States: pending, placed, monitoring, error
   - Animation: smooth color/icon transition on status change (200ms)

D. **Modals** (Start Incident, Add External Equipment, etc.)
   - Current: Flat dark background, sharp corners, no depth perception
   - Proposed: Slightly elevated background (#252525), rounded corners (8px), subtle shadow
   - Animation: Slide up from bottom on mobile (300ms cubic-bezier bounce), fade in on desktop
   - Animation: Slide down + fade out on close (200ms)

E. **Primary CTA Buttons** (e.g., "Start Operation", "Add Hazard")
   - Current: Blue full-width, opacity fade on press
   - Proposed: Blue full-width, opacity fade + subtle background darkening on press (800ms total)
   - States: default, hover, active, disabled, focus
   - Animation: button press = background color shift (100ms ease-out) + opacity fade

F. **Quick Add Grid** (Strut selection buttons)
   - Current: Gold buttons in flat grid
   - Proposed: Blue background, white text, 2-column grid (mobile) / 3-column (desktop), selection indicator (filled circle or checkmark)
   - States: unselected, hover, selected
   - Animation: Selection = scale 1 → 1.05 → 1 (200ms elastic)

G. **Input Fields**
   - Current: All-sides border change on focus, 14px padding
   - Proposed: Keep dimensions (good for gloved use), focus state = bottom border highlight (2px blue) instead of all-sides
   - States: default, focus, error, disabled
   - Animation: Border color transition (150ms)

H. **Deletion/Destructive Actions**
   - Current: Instant removal
   - Proposed: Slide-left animation (150ms) with fade-out, then DOM removal
   - Animation: slide left (-100px), opacity 1 → 0 (150ms ease-in)

#### 3. **Micro-interaction Specification Document** (Timing & Easing Library)

Create a concise animation library that Claude Code will implement. Format:

```
Animation Name: Modal Open (Mobile)
Trigger: Modal overlay is shown
Duration: 300ms
Easing: cubic-bezier(0.34, 1.56, 0.64, 1) [bouncy ease-out]
Elements affected:
  - Backdrop: opacity 0 → 0.5
  - Modal container: transform translateY(50px) → 0, opacity 0 → 1
Visual effect: Smooth, bouncy entrance; feels responsive
```

Provide specs for:
1. Modal open (mobile, desktop)
2. Modal close (mobile, desktop)
3. Button press feedback
4. Toggle selection
5. Shore point card entry
6. Status badge transition
7. List item deletion
8. Toast notification appearance
9. Form field focus
10. Inventory deduction feedback

#### 4. **Design System / Component Inventory** (For Code Handoff)

Provide a simple checklist of:
- [ ] Component name
- [ ] CSS classes to create/modify
- [ ] Color vars involved
- [ ] States to support
- [ ] Animation specs (if any)
- [ ] Accessibility notes (contrast, keyboard, etc.)

**Example:**
```
Component: System Toggle
Classes: .system-toggle, .system-toggle.active
Colors: --border (inactive), --blue (active), --text, --text-secondary
States: default, active, focus
Animation: background-color 200ms ease, border-color 200ms ease
A11y: Maintain 44px+ tap target, focus-visible outline
```

### Design Handoff Format

Organize your output as:

```
1. COLOR_SYSTEM.md — Dark mode CSS vars + usage guidelines
2. COMPONENT_SPECS.md — Detailed redesigns for each component (mockups + states)
3. MICROINTERACTIONS.md — Animation library (timing, easing, triggers)
4. IMPLEMENTATION_CHECKLIST.md — Simple list for Code to reference
```

**DO NOT** provide code implementations yet—Code will handle that. Just give crystal-clear visual direction.

---

## PHASE 2: CLAUDE CODE BRIEF

### Context & Scope

**You are implementing the visual redesign** based on Claude Design's specifications. Your goal: Refactor the codebase to match the new design direction while maintaining all existing functionality, performance, and accessibility.

**Current state:** Single 720KB `app.js`, 84KB `style.css`, well-organized but monolithic. Dark mode color system is already in place; you're refining it.

**Constraints:**
- No workflow changes — only visual & animation implementation
- Maintain 56px+ tap targets for gloved operators
- Keep performance high (≥60fps for animations on mobile)
- No breaking changes to HTML structure (minimal HTML edits acceptable for animation hooks)

### Implementation Phases

#### Phase 1: CSS Refactor (2–3 days)

**1.1 Color System Cleanup**
- [ ] Copy current `:root[data-theme="dark"]` vars to new `:root`
- [ ] Remove `:root[data-theme="light"]`, `:root[data-theme="sun"]`, `:root[data-theme="broadcast"]` blocks
- [ ] Update vars per Design spec (reduce gold usage, refine blue hierarchy, add elevated-surface if needed)
- [ ] Verify all 50+ color vars are accounted for
- [ ] Test contrast on all text/background combos (use WebAIM contrast checker tool mentally or in code)

**1.2 Component Style Refactoring**
- [ ] System toggles: refine padding, borders, hover states per Design spec
- [ ] Result cards: enhance typography hierarchy, refine accents
- [ ] Shore point badges: new icon-based styling
- [ ] Modals: add box-shadow, adjust border-radius, refine background levels
- [ ] Buttons: refine all variants (.btn-primary, .btn-outline, .btn-sm, etc.)
- [ ] Input fields: focus state = blue bottom-border instead of all-sides border change
- [ ] Quick add grid: refactor to blue theme, 2-col mobile / 3-col desktop

**1.3 Animation Keyframes Library**
- [ ] Create `@keyframes` for:
   - modal-slide-up (translateY 50px → 0)
   - modal-slide-down (translateY 0 → 50px)
   - backdrop-fade-in/out
   - button-press-darken
   - status-badge-transition
   - list-item-slide-left
   - card-fade-in
   - toggle-selection
   - input-focus-underline
- [ ] Add CSS transitions to elements (all 150ms–300ms, ease variants per Design spec)

#### Phase 2: JavaScript Micro-interactions (1–2 days)

**2.1 Modal Animations**
- [ ] On modal open: add class `.modal-visible` → triggers `modal-slide-up` + `backdrop-fade-in`
- [ ] On modal close: reverse animations → remove DOM
- [ ] Test on mobile landscape & desktop (ensure smooth)

**2.2 Button Feedback**
- [ ] On button `.active` state: background-color darkens via CSS transition (100ms)
- [ ] On button `:active` (mouse/touch down): brief opacity fade (80ms)
- [ ] Ensure feedback is visible but not distracting

**2.3 Toggle Selection**
- [ ] On toggle click: add `.active` class
- [ ] CSS transitions handle color changes automatically (200ms ease)
- [ ] Test rapid clicks (debounce if needed)

**2.4 Shore Point Card Entry**
- [ ] On new shore point render: fade in card (0 → 1 opacity over 150ms) + subtle scale (0.95 → 1)
- [ ] Add `opacity: 0; transform: scale(0.95);` initially, then add `.entering` class
- [ ] Use CSS transition, not JS animation

**2.5 Status Badge Transitions**
- [ ] On status change: old badge color fades (100ms), new color fades in (100ms)
- [ ] Icon rotates (0 → 180deg) or changes smoothly
- [ ] Use CSS transitions + minimal JS (swap class + let CSS handle animation)

**2.6 List Item Deletion**
- [ ] On delete action: slide list item left (0 → -100px over 150ms)
- [ ] Opacity fades (1 → 0)
- [ ] After animation completes, remove from DOM
- [ ] Use JS to add `.deleting` class, listen to `transitionend`, then remove

**2.7 Toast Notifications**
- [ ] Existing toast already fades in/out (good)
- [ ] Ensure timing is consistent with other animations (200–300ms)
- [ ] No changes needed unless Design spec says otherwise

**2.8 Form Field Focus**
- [ ] On input focus: smooth underline-like border transition
- [ ] Blue bottom border (2px) appears smoothly (150ms)
- [ ] Use `:focus` pseudo-class + CSS transition

#### Phase 3: Testing & Refinement (1 day)

**3.1 Visual Testing**
- [ ] Screenshot key screens on desktop, tablet, mobile
- [ ] Compare to Design spec mockups
- [ ] Ensure colors match (no saturation shifts)
- [ ] Verify spacing & hierarchy are clean

**3.2 Animation Testing**
- [ ] Modal open/close: smooth, no jank
- [ ] Button press: feedback visible but not overdone
- [ ] Toggle selection: instant and smooth
- [ ] Shore point entry: satisfying fade-in
- [ ] List item deletion: clear feedback, smooth exit
- [ ] Measure frame rate on low-end mobile (should be ≥55fps for animations)

**3.3 Accessibility Audit**
- [ ] Tap targets: all ≥56px (no changes should affect this)
- [ ] Keyboard navigation: `:focus-visible` outlines still visible
- [ ] Contrast: all text ≥4.5:1 (WCAG AA)
- [ ] Reduced motion: respect `prefers-reduced-motion` (dim animations if user prefers)

**3.4 Performance**
- [ ] CSS file size: should not increase significantly (≤85KB)
- [ ] Animation performance: no layout thrashing, use `transform` & `opacity` only
- [ ] JavaScript bundle: minimal new code (micro-interaction handlers only)

### Code Deliverables

1. **Refactored style.css** (updated from current 84KB file)
   - Dark-mode-only color system
   - Refined component styles
   - Animation keyframes library
   - All states & variants supported

2. **Updated app.js** (minimal changes)
   - Add event listeners for animations (modal open/close, toggle, delete)
   - Add timing handlers for deletion animations (wait for `transitionend`)
   - No major refactoring; keep existing logic intact

3. **Updated index.html** (minor changes)
   - Remove theme toggle button (if any)
   - Simplify theme detection script (dark mode always)
   - Add any animation hook classes if needed (e.g., `.modal-visible`)

4. **Testing Checklist**
   - Visual comparison to Design specs
   - Animation performance (60fps target)
   - Accessibility audit results
   - On-device testing notes (iOS Safari, Chrome, Firefox)

### Implementation Notes

- **CSS vars:** Consolidate and simplify. Use Design's variable naming.
- **Animations:** Prefer CSS transitions over JS animations (better performance).
- **Mobile-first:** Test on 375px width first, then expand to tablet/desktop.
- **Gloved operation:** Don't reduce tap targets; keep all ≥56px.
- **Dark mode only:** Remove all `data-theme="light/sun/broadcast"` CSS blocks and logic.

---

## Workflow & Handoff Sequence

### Day 1–2: Claude Design Works
1. Review current app (code, CSS, screenshots)
2. Create color system spec
3. Create component redesigns (mockups or HTML prototypes)
4. Create micro-interaction specs
5. Deliver all 4 docs to Claude Code

**Deliverables:**
- `COLOR_SYSTEM.md`
- `COMPONENT_SPECS.md`
- `MICROINTERACTIONS.md`
- `IMPLEMENTATION_CHECKLIST.md`

### Day 3: Claude Code Reviews & Asks Clarifying Questions
1. Review all Design docs
2. Identify ambiguities (if any)
3. Ask for clarifications on animation timing, component states, etc.
4. Get final sign-off from Design before implementation

### Day 4–6: Claude Code Implements
1. Refactor CSS (color system, components, animations)
2. Add JS micro-interaction handlers
3. Test on mobile, tablet, desktop
4. Take screenshots and compare to Design specs
5. Fix any visual mismatches

### Day 7: Final Review & Polish
1. Review all changes vs. Design spec
2. Make any final adjustments
3. Run performance audit
4. Prepare for deployment

---

## Success Criteria

✅ **Design Phase:**
- Color system is clear, simplified (dark-only)
- Component specs are detailed (states, animations, rationale)
- Micro-interactions are well-defined (timing, easing, triggers)
- Handoff doc is easy for Code to follow

✅ **Code Phase:**
- All Design specs are implemented visually
- Animations are smooth (≥60fps on mobile)
- No performance regression
- All accessibility standards maintained
- On-device testing passes (iOS, Android, desktop)

✅ **Overall:**
- App feels "surgical and precise"
- Gold button noise is gone
- Micro-interactions guide attention without distraction
- Workflows are unchanged; only visual polish improved
- Gloved operators can use it as before

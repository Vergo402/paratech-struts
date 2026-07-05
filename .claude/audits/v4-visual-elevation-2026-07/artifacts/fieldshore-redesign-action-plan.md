# FieldShore v4 Redesign — Execution Plan for Alex

---

## Quick Start

You have three key documents:

1. **fieldshore-redesign-audit.md** — Detailed analysis of current state, problems, and redesign strategy. *Read this first if you're new to the context.*

2. **fieldshore-redesign-briefs.md** — Detailed briefs for Claude Design and Claude Code. *Copy/paste these directly to each Claude tool.*

3. **This file** — Step-by-step execution checklist and prompt templates.

---

## Phase 1: Send to Claude Design (Days 1–2)

### Step 1: Paste the Design Brief to Claude Design

Open Claude Design and paste this prompt:

```
I'm redesigning the visual language of FieldShore, a structural collapse rescue 
operations app used by firefighters and paramedics on-scene. The app is functionally 
solid but visually noisy (too much gold, weak micro-interactions, lacks "surgical" 
precision).

Here's the detailed brief for you as the UX/UI director:

[PASTE: fieldshore-redesign-briefs.md — PHASE 2: CLAUDE DESIGN BRIEF section]

Your job is to:
1. Create a clean dark-mode-only color system spec
2. Redesign 8 key components with detailed specs (current → proposed)
3. Define a micro-interaction animation library (timing, easing, triggers)
4. Create an implementation checklist for the Code team

Please organize your output as:
- COLOR_SYSTEM.md
- COMPONENT_SPECS.md (with mockups or HTML prototypes)
- MICROINTERACTIONS.md (animation library)
- IMPLEMENTATION_CHECKLIST.md

Start with the color system. Let me know if you have questions about the context.
```

### Step 2: Wait for Claude Design's Output

Claude Design will produce ~4 documents:
- Color system (CSS vars + usage)
- Component specs (detailed redesigns)
- Animation library (timing specs)
- Implementation checklist

**Save all of these.** You'll share with Claude Code next.

---

## Phase 2: Review Design & Iterate (Day 3)

### Step 3: Review Claude Design's Output

Read through all 4 documents. Check:
- [ ] Color system makes sense? (Gold toned down, blue primary, cleaner)
- [ ] Component specs are detailed? (states, animations, rationale)
- [ ] Animation library is clear? (timing, easing, triggers specified)
- [ ] Any confusing parts?

### Step 4: Ask Claude Design Clarifying Questions

If anything is unclear, ask Claude Design:

```
I've reviewed your design output. A few clarifications:

1. On the Modal animations: You specified a cubic-bezier(0.34, 1.56, 0.64, 1) 
   easing for slide-up. Should the backdrop fade use the same easing, or linear?

2. On the Quick Add Grid: You mentioned 2-column mobile / 3-column desktop. 
   At what breakpoint does it switch?

3. On the Shore Point Status Badges: Should the icon rotate when status changes, 
   or just fade?

[Add any other Qs]

Once you clarify, I'll pass everything to Claude Code for implementation.
```

### Step 5: Get Sign-Off

Ask Claude Design:

```
Are the design specs complete and ready for the Code team to implement? 
Any final tweaks or clarifications you want to add?
```

Once Design gives thumbs-up, move to Phase 3.

---

## Phase 3: Send to Claude Code (Days 4–6)

### Step 6: Prepare the Code Brief

Open Claude Code and paste this prompt:

```
I'm refactoring the visual design of FieldShore, a rescue operations app. 
The design team has completed detailed specs; your job is to implement them 
in code.

Here's the detailed brief:

[PASTE: fieldshore-redesign-briefs.md — PHASE 2: CLAUDE CODE BRIEF section]

IMPORTANT: The design team has also provided detailed specs for colors, 
components, and animations. I'll share those separately.

For now, review this brief and let me know:
1. Any questions about scope or constraints?
2. Anything that seems risky or unclear?
3. Your estimated timeline for each phase (CSS refactor, JS animations, testing)?

Once you're ready, I'll share the design docs and we'll start Phase 1 (CSS refactor).
```

### Step 7: Claude Code Reviews & Asks Questions

Claude Code will ask clarifying questions. Answer them directly. Once Code is satisfied, move to implementation.

### Step 8: Share Design Docs with Claude Code

Paste all 4 design documents to Claude Code:

```
Here are the final design specs from the design team:

[PASTE: COLOR_SYSTEM.md from Claude Design]
[PASTE: COMPONENT_SPECS.md from Claude Design]
[PASTE: MICROINTERACTIONS.md from Claude Design]
[PASTE: IMPLEMENTATION_CHECKLIST.md from Claude Design]

Ready to start Phase 1: CSS Refactor. Let's begin with the color system 
cleanup and component refactoring. Walk me through your approach first—
don't code yet.
```

### Step 9: Claude Code Plans Approach

Claude Code will outline the approach:
- How they'll reorganize CSS
- Which components to refactor first
- Any risky areas
- Testing strategy

**Confirm it makes sense.** If yes, tell Code:

```
This approach looks solid. Go ahead and start Phase 1: CSS Refactor. 
Implement the color system cleanup and component style updates. Once 
you have a solid first pass, send me a summary of changes and a screenshot 
of a key screen so I can compare to the design spec.
```

### Step 10: Claude Code Builds (Days 4–6)

Claude Code will:
1. Refactor CSS (colors, components, animations)
2. Add JS micro-interaction handlers
3. Test on mobile/desktop
4. Send you updates + screenshots

**At each checkpoint, review:**
- Does the visual match the Design spec?
- Do animations feel smooth & intentional?
- Any bugs or performance issues?

Give feedback:

```
[If visual matches]: "Colors & components look great. Good match to spec. 
How's the animation performance on mobile? Ready to move to Phase 2 
(micro-interactions)?"

[If tweaks needed]: "The modal looks close, but the backdrop color is 
slightly different. Per the spec, it should be [exact color]. Also, 
the toggle animation feels a bit fast—should be 200ms per the spec. 
Can you adjust?"
```

### Step 11: Claude Code Implements JS Animations

Code will add:
- Modal slide-in/out
- Button press feedback
- Toggle selection animation
- Shore point card fade-in
- Status badge transitions
- List item deletion
- etc.

Again, review & give feedback. Focus on:
- Do animations match the micro-interaction specs?
- Do they feel smooth & non-distracting?
- Any performance issues on low-end mobile?

### Step 12: Claude Code Tests & Wraps Up

Code will:
1. Take screenshots on mobile, tablet, desktop
2. Compare to Design specs
3. Run accessibility audit
4. Report any issues

**Final review:**
- [ ] Visual matches Design spec across devices?
- [ ] Animations smooth & performant?
- [ ] No accessibility regressions?
- [ ] Tap targets still ≥56px?
- [ ] Dark mode working correctly?
- [ ] Performance acceptable?

If all ✅, you're done. If ❌ on anything, give specific feedback to Code for final tweaks.

---

## Key Prompts Reference

### For Claude Design (Start)
```
I'm redesigning FieldShore, a structural collapse rescue app. It's 
functionally solid but visually noisy (gold overuse, weak animations).

Here's your detailed brief:

[PASTE: fieldshore-redesign-briefs.md — PHASE 2: CLAUDE DESIGN BRIEF]

Create:
1. Dark-mode-only color system spec
2. Detailed component redesigns (8 components, current → proposed)
3. Micro-interaction animation library
4. Implementation checklist for Code

Start with color system.
```

### For Claude Design (Clarifications)
```
A few clarifications on your design specs:

1. [Your question about color/component/animation]
2. [Your question]
3. [Your question]

Once you answer, I'll pass everything to Code.
```

### For Claude Code (Start)
```
I'm implementing a visual redesign of FieldShore based on detailed 
design specs. Your job: refactor CSS & add JS animations to match.

Here's your detailed brief:

[PASTE: fieldshore-redesign-briefs.md — PHASE 2: CLAUDE CODE BRIEF]

Review and let me know:
1. Any questions about scope?
2. Estimated timeline for each phase?
3. Any risky areas?

I'll share design docs once you're ready.
```

### For Claude Code (Design Docs)
```
Here are the final design specs:

[PASTE: All 4 design docs from Claude Design]

Plan your approach (don't code yet). How will you:
1. Reorganize the CSS?
2. Which components first?
3. Testing strategy?

Once I approve the plan, start Phase 1: CSS Refactor.
```

### For Claude Code (At Checkpoints)
```
Progress review:

[If good]: "Visual looks great. Matches the spec. Ready to move to [next phase]?"

[If tweaks needed]: "Close, but [specific issue]. Per the design spec, 
should be [what it should be]. Can you adjust?"

[If performance concern]: "Animations are great, but frame rate on mobile 
is dropping below 60fps on [specific animation]. Can you optimize?"
```

---

## Timeline Estimate

| Phase | Days | Owner | Deliverables |
|-------|------|-------|--------------|
| Design Review | 0.5 | You | Audit + briefs created |
| Design Execution | 1–2 | Claude Design | 4 design docs |
| Design Review & QA | 0.5 | You | Clarifications, sign-off |
| Code Planning | 0.5 | Claude Code | Approach outline |
| CSS Refactor | 1–2 | Claude Code | Refactored style.css |
| JS Animations | 1 | Claude Code | Micro-interaction handlers |
| Testing & Polish | 1 | Claude Code | Final verification |
| **Total** | **6–7 days** | Mixed | Updated, refined app |

---

## Checklist for You

### Pre-Redesign
- [ ] Read `fieldshore-redesign-audit.md` (understand the problems)
- [ ] Read `fieldshore-redesign-briefs.md` (understand the approach)

### Design Phase (Days 1–3)
- [ ] Send Design brief to Claude Design
- [ ] Review Claude Design's 4 output docs
- [ ] Ask clarifying questions (if needed)
- [ ] Get sign-off from Design

### Code Phase (Days 4–7)
- [ ] Send Code brief to Claude Code
- [ ] Review Claude Code's approach (don't code yet)
- [ ] Approve approach; tell Code to start CSS refactor
- [ ] Review CSS refactor + screenshots (checkpoint 1)
- [ ] Give feedback (approve or request tweaks)
- [ ] Review JS animations (checkpoint 2)
- [ ] Give feedback (approve or request tweaks)
- [ ] Review final testing & polish (checkpoint 3)
- [ ] Approve final version or request final tweaks
- [ ] Merge to main branch

### Post-Redesign
- [ ] Deploy to production (if ready)
- [ ] Test on actual device in field (if possible)
- [ ] Gather user feedback

---

## Common Issues & How to Handle Them

### Issue: Claude Design's color spec feels off
**Solution:** Ask for a specific mockup showing the new colors in context 
(e.g., "show me a Quick Find result card with the new colors"). Sometimes 
colors look different in isolation vs. in-component.

### Issue: Animation feels too slow/fast
**Solution:** Ask Claude Code to adjust the duration (e.g., "Modal slide 
should be 250ms instead of 300ms"). Animation timing is subjective; iterate 
until it feels right.

### Issue: Gloved operators might have trouble with smaller tap targets
**Solution:** Don't let Code reduce tap targets below 56px. If Design spec 
calls for smaller buttons, ask for a revised spec that keeps targets large.

### Issue: Performance drops on low-end mobile
**Solution:** Tell Code to use `transform` & `opacity` only (not `left`, `top`, 
`width`, `height`—these cause layout recalculation). Also, consider simplifying 
animations for lower-end devices (e.g., fade instead of slide).

### Issue: You disagree with Design spec
**Solution:** Loop back to Claude Design with specific feedback. E.g., "The 
shore point badges feel too bulky with the icon. Can we simplify?" Design 
will iterate.

---

## Final Notes

- **Plan mode:** Every major decision point (Design sign-off, Code approach, 
  Code checkpoints), check in with you before proceeding.
  
- **Specificity:** When giving feedback, be specific (e.g., "Button feels 
  stiff" → not helpful; "Button press animation is instant instead of 150ms 
  ease-out" → helpful).

- **Iterate:** This isn't a waterfall. Design → Code → Review → Refine. 
  Multiple feedback loops are normal.

- **Scale:** If you feel like redesign is taking too long or getting too 
  complex, cut scope (e.g., "Skip animations for now, focus on color/component 
  redesign first").

---

## Questions to Expect

**Claude Design might ask:**
- "Should the Quick Add grid be 2-col on all mobile, or switch to 1-col on 
  very small phones?"
- "For the modal backdrop, what opacity? 0.5? Higher? Lower?"
- "Should modals have rounded corners on desktop too, or sharp corners?"

**Claude Code might ask:**
- "The modal slide-up animation—should it be triggered on modal open or when 
  the modal content is loaded?"
- "Should animations be disabled if user has `prefers-reduced-motion` enabled?"
- "Do I need to update the HTML to add animation hook classes, or can I do it 
  purely in CSS?"

Answer these as they come up. They indicate Code is thinking carefully.

---

## Success Looks Like

- ✅ App feels "surgical and precise" (gold noise gone, clean hierarchy)
- ✅ Micro-interactions guide attention without distraction
- ✅ Workflows unchanged; only visual polish improved
- ✅ Gloved operators can use it as before (tap targets, readability intact)
- ✅ Dark mode is the only theme
- ✅ Performance is good (≥60fps animations on mobile)
- ✅ Team (Design + Code) worked smoothly with clear handoff

Good luck! 🎯

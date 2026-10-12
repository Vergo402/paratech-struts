# Tap-target evidence — prompt-audit decision 6 (mobile-ux 44px vs 56px)

Captured 2026-10-12 from the v4 app running against the local Firebase emulators (`npm run emulators` + `npm run dev:emu`, :5200), real sign-up + department creation, phone viewport 390×844, dark theme. `capture.mjs` boxes every visible interactive control with its rendered height; `composite.mjs` builds `tap-targets-overview.png`. Throwaway emulator-only account; nothing touched the live project.

| Screen | ≥56px | 44–55px | <44px | Sub-56 controls |
|---|---|---|---|---|
| Settings (back-office list) | 13 | 4 | 1 | theme segment System/Light/Dark/Sunlight 46; "Hide navigation" handle 20 |
| Settings › Administration (checklist editor entry) | 8 | 4 | 1 | ‹ Settings back 44; Edit ×3 48; handle 20 |
| Settings › Data › Import inventory (ImportFlow step 1) | 9 | 3 | 1 | Cancel 48; Change file 44; step bar 44; handle 20 (Continue = 56) |
| Operations board (fireground, op active) | 8 | 13 | 1 | Edit operation 44; Board/Cutting toggle 46; + Add Shore Point FAB 52; lane headers Pending/Assigned/Strut Set/Cutting/Runner/Secured/Returned 48; inventory summary 48; Task Level Checklist 48; handle 20 |

What the docs say: `docs/v4-design/07-design-system/craft.md:81` — hit areas ≥ 56px, "the floor is untouchable"; `spacing-grid.md:77` — 44pt only for tertiary/disclosure contexts, never a primary action; `:79` — 56pt for every primary action, list row and picker row during an active operation. What the agent says (`.claude/agents/mobile-ux.md:17,27`): "Touch targets ≥ 44pt" and "back-office surfaces = 44px, per the §7 fireground exemption" — no such exemption exists in §7.

Reading: the back-office surfaces are mostly at 56 already; their sub-56 controls are secondary (theme segment, Edit, Cancel, Change file). The fireground board is where the 56 floor is actually missed on primary-ish controls (the + Add Shore Point FAB at 52, the Board/Cutting toggle at 46); the 48px lane headers are disclosure rows, which spacing-grid allows below 56.

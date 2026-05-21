# Open Questions

> Rolling list. Each question is a row. When a question is decided, the row moves to the "Resolved" section at the bottom with a link to the ADR or commit that decided it. **Cleared at the end of each phase** — meaning every open question must be addressed (resolved, deferred, or rejected) before the phase gate is passed.

---

## Active Questions

| # | Question | Phase that decides | Notes |
|---|---|---|---|
| 1 | Tracking infrastructure (D1). Confirm `v4-redesign` branch + `/docs/v4-design/` markdown structure. | A | Recommendation: confirmed by approval of `keen-whistling-pancake.md`. Pending one explicit "yes" before Phase B agent dispatch. |
| 2 | v4.0 backend split (Section V of plan). Confirm Bucket 1 → v3.x (including the checklist v1), Bucket 2 → v4 (renames only). | A | Blocks v3.20 work. |
| 3 | Checklist content licensing (D6). | Decided | Paraphrase, Alex reviews drafts before commit. Original source credited in-app. |
| 4 | Checklist IA placement (D6). Recommendation: IC Command under Command tab; Task Level under Operations tab; ORM/TCRM as a button bar at the top of any active-operation screen. | F | v3.20.0 ships with the recommendation unless Alex redirects. |
| 4a | D7 scope. | Decided | Option (b). v4.0 ships auth/identity/roles/dept-ownership/audit. v4.5 ships local mutual-aid (2–5 neighboring depts). State/IST/federal not on roadmap. |
| 4b | D7.1 auth mechanism. | H | Recommendation: email + password as default, magic-link as no-password path. |
| 5 | AskUserQuestion as a collaboration primitive. | Practice | Open question on whether the multi-choice picker is the right tool for me to ask Alex questions during planning. Options: keep AskUserQuestion for genuinely-mutually-exclusive choices; favor text questions for open-ended thinking; never use it. |
| 6 | Notification mechanism for gates. | A | Currently specified as chat-message + INDEX update + Project subtask + 24h ScheduleWakeup. Alex may want PushNotification, email, or just chat. |
| 7 | D5 multi-device-no-comms — order of implementation between A (accept + reconcile) and C (CP hub). | D | Both will ship; question is which is the default and which is the upgrade path. |
| 8 | PWA vs React Native at v4. | H | Memory's roadmap says Phase 0 is PWA, then RN at Phase 1. Architecture essay revisits. |
| 9 | Custom typeface or open-source? Inter, Outfit, or commission. | E | |
| 10 | Logo evolution — refresh "P" mark, or commission a new identity? | E | |
| 11 | Build tooling — Vite, esbuild, or stay no-build? | H | |
| 12 | TypeScript adoption? | H | |
| 13 | Component library strategy — fully custom, Radix headless, Shadcn, Tailwind? | H | |
| 14 | Beta deploy host — GitHub Pages subpath, Vercel, Netlify? | I | |
| 15 | Field-test partners — Hartsdale only, or expand? | I | |
| 16 | Tracking session granularity — one long session per phase, or many short ones? | Practice during A | Recommendation: many short ones, each with one deliverable. |
| 17 | The mapping file (codename → real reference app) — where does it live, who maintains it? | A | Alex's call. Recommendation: outside this repo, possibly in his personal `~/.claude/` somewhere, never committed. |

---

## Resolved Questions

(none yet — first round of resolutions lands after Phase A gate)

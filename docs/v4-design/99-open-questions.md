# Open Questions

> Rolling list. Each question is a row. When a question is decided, the row moves to the "Resolved" section at the bottom with a link to the ADR or commit that decided it. **Cleared at the end of each phase,** meaning every open question must be addressed (resolved, deferred, or rejected) before the phase gate is passed.

---

## Active Questions

| # | Question | Phase that decides | Notes |
|---|---|---|---|
| 4 | Checklist IA placement (D6). Recommendation: IC Command under Command tab; Task Level under Operations tab; ORM/TCRM as a button bar at the top of any active operation screen. | F | v3.20.0 ships with the recommendation unless Alex redirects. |
| 4b | D7.1 auth mechanism. | H | Recommendation: email + password as default, magic link as no password path. |
| 5 | AskUserQuestion as a collaboration tool. | Practice | Open question on whether the multi choice picker is the right tool for me to ask Alex questions during planning. Options: keep AskUserQuestion for genuinely exclusive choices; favor text questions for open ended thinking; never use it. |
| 6 | Notification mechanism for gates. | A | Currently specified as chat message + INDEX update + Project subtask + 24h ScheduleWakeup. Alex may want PushNotification, email, or just chat. |
| 7 | D5 multi device no comms: order of implementation between A (accept + reconcile) and C (CP hub). | D | Both will ship; question is which is the default and which is the upgrade path. |
| 8 | PWA vs React Native at v4. | H | Memory's roadmap says Phase 0 is PWA, then RN at Phase 1. Architecture essay revisits. |
| 11 | Build tooling: Vite, esbuild, or stay no build? | H | |
| 12 | TypeScript adoption? | H | |
| 13 | Component library strategy: fully custom, Radix headless, Shadcn, Tailwind? | H | |
| 14 | Beta deploy host: GitHub Pages subpath, Vercel, Netlify? | I | |
| 15 | Field test partners: Hartsdale only, or expand? | I | |
| 16 | Tracking session granularity: one long session per phase, or many short ones? | Practice during A | Recommendation: many short ones, each with one deliverable. |

---

## Resolved Questions

| # | Question | Resolution | Resolved by |
|---|---|---|---|
| 1 | Tracking infrastructure (D1). Confirm `v4-redesign` branch + `/docs/v4-design/` markdown structure. | **Confirmed.** Alex approved the branch + markdown structure. | Phase A gate approval (2026-05-20) |
| 2 | v4.0 backend split (Section V). Confirm Bucket 1 → v3.x, Bucket 2 → v4. | **Confirmed.** Bucket 1 ships to v3.x (per device UID, listener teardowns, customRoles migration, Surfside bugs, checklist v1, demo mode). Bucket 2 (renames only) defers to v4. | Phase A gate approval (2026-05-20) |
| 3 | Checklist content licensing (D6). | **Paraphrase.** Alex reviews drafts before commit. Original source credited in app. | Plan draft 3 annotation |
| 4a | D7 scope. | **Option (b).** v4.0 ships auth/identity/roles/dept ownership/audit. v4.5 ships local mutual aid (2 to 5 neighboring depts). State/IST/federal not on roadmap. | Plan draft 4 annotation |
| 17 | The mapping file (codename to real reference app), where does it live? | **Superseded by ADR-001 (2026-05-21).** Codename rule relaxed before Phase C; real names now used in teardowns under nominative fair use (the legal doctrine that lets you name a competitor's product when comparing truthfully). Mapping file no longer needed. | Phase A gate approval (2026-05-20), then superseded |
| 9 | Custom typeface or open source? | **Geist** (OFL variable, tabular numerals; Geist Mono for measurements). Inter = Phase-H fallback only; Söhne parked for Phase I. | Synthesis conflict 2.6 (2026-05-31); documented in [`07-design-system/typography.md`](07-design-system/typography.md) |
| 10 | Logo evolution: refresh "P" mark, or commission a new identity? | **New identity** — not a refresh. Overrides the synthesis "geometry-refresh, no rebrand" recommendation. Explored in `07-design-system/logo-and-mark.md` (Phase E session ~E13). New mark must live within the locked gold-on-slate color system (no competing brand color). | Alex, Phase E scope-in (2026-05-31) |
| 18 | Demo mode / demo department. | **Dropped entirely** — no sandbox, no scripted seed, no marketing-tour embed; the cold-open is a plain first-run guest state. | Synthesis §3.3 / Q4 (Alex, 2026-05-31) |

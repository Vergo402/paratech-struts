# ADR-017: Custom department roles (RBAC) — Admin is the only built-in role; departments define the rest

> Architecture Decision Record. **Supersedes** the master-plan **D7.3** fixed four-role model (Owner / Admin / Member / Observer). The management-UI application lives in [`08-information-architecture/51-user-manager.md`](../08-information-architecture/51-user-manager.md).

---

## Status

- [x] Proposed
- [x] Accepted *(Phase F #217 gate follow-up [#304](https://github.com/Vergo402/paratech-struts/issues/304) — Alex, 2026-06-08)*

**Date:** 2026-06-08
**Author:** Claude Opus 4.8 (Phase F gate follow-up #304)
**Reviewer(s):** Alex (#304 — approved 2026-06-08)
**Supersedes:** master-plan **D7.3** (the fixed Owner/Admin/Member/Observer table), and the same four-role model as recorded in [`06-synthesis.md`](../06-synthesis.md) §1.3/§4, [`05-essays/09-data-resilience.md`](../05-essays/09-data-resilience.md), and [`06-decision-tracking-matrix.md`](../06-decision-tracking-matrix.md) — those are historical Phase C/D records and are **not** rewritten; this ADR records the supersession.

---

## Context

D7.3 locked a **fixed** four-role department model — Owner / Admin / Member / Observer — with a prescriptive permission table. At the Phase F [#217](https://github.com/Vergo402/paratech-struts/issues/217) gate (2026-06-08) Alex changed it: **"admin should be the only mandated role, and all others with individual permissions should be set up by individual departments."** Departments differ — career vs. volunteer, large vs. small, varied mutual-aid postures — and a fixed four-tier ladder cannot express the access a given department actually wants. v3 has **no** device-permission roles at all (a single shared Anonymous-Auth UID; the only gating is `canPerformShoreAction`, which is ICS-position-based), so this is net-new for v4.

Two of Alex's gate calls scope it:
- **Back-office only.** Custom roles gate department / back-office capabilities; the **live fireground actions stay gated by ICS position** within the operation (unchanged from v3).
- **Sensible baseline.** A built-in default role keeps a just-joined member usable on scene until an Admin assigns a role.

---

## Decision

Replace the fixed four-role model with:

1. **Admin — the only built-in, mandated role.** Full permissions; cannot be reduced below user/role management + governance; **at least one Admin must always remain** (the last Admin cannot be demoted or revoked — anti-lockout). The department **creator becomes the first Admin** — "Owner" is eliminated; its super-admin rights fold into Admin (the ≥ 1-Admin guard replaces Owner's can't-be-removed property).
2. **A built-in, editable Default role.** Read + run-field-work; applied to every member on join until an Admin assigns another role. Departments may edit what the Default allows (down to read-only if they choose).
3. **Unlimited department-defined custom roles**, each a **name + a set of back-office permission toggles** (the taxonomy below). Created and managed by Admins.

**The two gating axes — kept orthogonal ([ADR-008](ADR-008-nims-org-structure.md)):**
- **Department role** (Admin / Default / custom) gates **back-office / data / governance** capabilities.
- **ICS position** (operation-scoped: Incident Commander, Group Supervisor, Cutting, …) gates **live fireground actions** (deploy / cut / secure / return — v3 `canPerformShoreAction`) and Audit Log read/export (Incident Commander / Operations Section Chief, per the #217 CH-8 decision).
- **A department role never gates a fireground action, and an ICS position never grants a back-office permission.** App-role ≠ command-position.

**Back-office permission taxonomy (a role toggles these ~8):**
1. **Read** department data · 2. **Run field work** in operations you're part of *(Default = 1 + 2)* · 3. **Create & end operations** · 4. **Manage inventory & apparatus** · 5. **Manage roster / accountability** · 6. **Manage department settings** · 7. **Manage users & roles** *(Admin)* · 8. **Export / delete department data** *(Admin)*.

**Enforcement ([ADR-009](ADR-009-database-firebase-rtdb.md)):** the Firebase security rules become **data-driven** — `/departments/{deptId}/members/{uid}/role` → `/departments/{deptId}/roles/{roleId}/permissions` → gate the write by the looked-up permission set. **No role names are hard-coded in the rules**; the rules are schema-generated + CI-verified (synthesis §1.9).

**Ship split:** the **role/permission schema + the data-driven security rules + the built-in Admin + the Default role + per-device UID + the member→role mapping ship v4.0.** The **management UI** (create/edit roles, toggle permissions, assign roles) is the [`51-user-manager.md`](../08-information-architecture/51-user-manager.md) rewrite and rides the existing v4.0-vs-v4.1 UI-deferral ([`99-open-questions.md`](../99-open-questions.md) #32). Model now; UI flagged.

---

## Rationale

- **Departments are not uniform.** A fixed ladder forces every department into one shape; a small built-in core (Admin + Default) plus department-defined roles fits the real range with no code change per department.
- **Back-office-only keeps the line clean** ([ADR-008](ADR-008-nims-org-structure.md)): the fireground already gates by ICS position (v3 `canPerformShoreAction`), and that is where life-safety authority belongs — not in an app login.
- **Anti-lockout (≥ 1 Admin) + a usable Default keep it safe in the field:** a department can't strand itself without an administrator, and a just-joined firefighter is never locked out of the work on scene (Principle 11).
- **Data-driven rules are the only way** to enforce department-defined roles server-side; hard-coded role names cannot express custom roles.

---

## Alternatives Considered

- **Keep the fixed four-role D7.3 ladder.** Rejected (Alex) — it cannot express what individual departments want.
- **Let custom roles gate fireground actions too (fine-grained, ~30–40 permissions).** Rejected (Alex) — many more knobs, and it blurs app-role vs. ICS-position; the fireground stays position-gated.
- **No default (no access until an Admin assigns a role).** Rejected (Alex) — risks locking a firefighter out mid-incident; a sensible, editable Default is safer.
- **Keep a separate Owner tier above Admin.** Rejected — "Admin is the only mandated role"; Owner's rights fold into Admin, with the ≥ 1-Admin guard replacing Owner's can't-be-removed property.

---

## Consequences

- **Positive:** departments express their own access model; the server enforces one data-driven rule set; app-role and command-position stay cleanly separate; no field lockout.
- **Negative:** the security rules get more complex (a role→permission lookup, schema-generated + CI-verified); the management UI is more than a role-picker (a role editor with permission toggles) — but it rides the #32 deferral, so v4.0 ships the **model**, not necessarily the UI.
- **Neutral:** the historical D7.3 / synthesis / essay-09 / matrix references to the fixed four roles are **superseded by this ADR** (not rewritten); "Owner" survives only as a historical / superseded term.

---

## Related

- **Supersedes:** master-plan **D7.3** (fixed four-role model).
- **Other ADRs:** [ADR-008](ADR-008-nims-org-structure.md) (device-roles ≠ NIMS positions — the two-axes basis), [ADR-009](ADR-009-database-firebase-rtdb.md) (RTDB + security-rules enforcement), [ADR-016](ADR-016-modal-vs-sheet-rules.md) (the User Manager overlay rules).
- **Principles:** 1 (defer to doctrine — ICS positions), 10 (no comms — a role change is a permission change, not a message), 11 (earn its place — no field lockout).
- **Screen spec:** [`51-user-manager.md`](../08-information-architecture/51-user-manager.md) (the management UI).
- **Reconciles with #217 CH-8:** Audit Log read/export stays ICS-position-gated (Incident Commander / Operations), not a department-role permission.
- **GitHub:** [#304](https://github.com/Vergo402/paratech-struts/issues/304) (this work) · [#209](https://github.com/Vergo402/paratech-struts/issues/209) (the original User Manager screen) · [#217](https://github.com/Vergo402/paratech-struts/issues/217) (the gate). Ship-version: [`99-open-questions.md`](../99-open-questions.md) #32.

---

## Notes

The ~8-capability taxonomy is the v4.0 starting set; departments toggle them per role. The fireground-action gates (v3 `canPerformShoreAction`) are unchanged and live in the operation / ICS-position layer, not here. The exact permission keys + the schema shape are finalized with the data-layer work (Phase H), behind the `data/sync` seam (ADR-009).

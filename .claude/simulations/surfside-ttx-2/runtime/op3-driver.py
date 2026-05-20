#!/usr/bin/env python3
"""
OP3 consolidated driver.
- Reads snap-E+16h.json (OP2 boundary state)
- Applies all OP3 mutations (new SPs, status advances, role changes)
- Writes snap-E+28h.json (OP3 boundary state)
- Appends to event-log.jsonl

Mirrors the OP2 driver's documented bypass:
  programmatic db.ref().push() + persistOperation() equivalent.
"""
import json
import os
import random
import string
from copy import deepcopy
from pathlib import Path

ROOT = Path("/Users/alex/Library/CloudStorage/OneDrive-Personal/Claude OS/Field Shore")
SIM = ROOT / ".claude/simulations/surfside-ttx-2"
SNAP_IN = SIM / "runtime/firebase-snapshots/snap-E+16h.json"
SNAP_OUT = SIM / "runtime/firebase-snapshots/snap-E+28h.json"
EVENT_LOG = SIM / "runtime/event-log.jsonl"

OP_ID = "-OsqjCBjLAc_mab7WDPo"
DEPT_ID = "sim-surfside-ttx-2"

# Wall-clock for OP3
WALL_E16 = "2026-05-17T13:25:00Z"
WALL_E28 = "2026-05-18T01:25:00Z"

# === Helpers ============================================================

def push_key(prefix="-Osq"):
    """Generate a Firebase-style push key. Looks like a Firebase pushId."""
    suffix = ''.join(random.choices(string.ascii_letters + string.digits + '_-', k=18))
    return prefix + suffix


def event_e(e_hours, e_minutes=0):
    """Format E+ time string."""
    return f"E+{e_hours}:{e_minutes:02d}"


def iso_wall_at_e(e_hours, e_minutes=0):
    """Compute wall-clock ISO from E+ time. Anchor 2026-05-17 13:25 UTC = E+16h baseline.
    E+0 = 2026-05-16 21:25 UTC."""
    # E+0 wall: 2026-05-16T21:25:00Z
    from datetime import datetime, timedelta, timezone
    e0 = datetime(2026, 5, 16, 21, 25, 0, tzinfo=timezone.utc)
    t = e0 + timedelta(hours=e_hours, minutes=e_minutes)
    return t.isoformat().replace('+00:00', 'Z')

# === Load OP2 boundary state ============================================

with open(SNAP_IN) as f:
    snap = json.load(f)

op = snap['operations'][OP_ID]
sps = op['shorePoints']
individuals = op.setdefault('individuals', {})
roles = op.setdefault('roles', {})
custom_roles = op.setdefault('customRoles', [])
role_names = op.setdefault('roleNames', {})

# Current SP num (highest)
current_max_num = max(sp.get('num', 0) for sp in sps.values())
print(f"Starting OP3 with {len(sps)} SPs, max num={current_max_num}")
print(f"Initial roles: {len(roles)}")
print(f"Initial customRoles: {len(custom_roles)}")

# === Tracking ===========================================================

events_to_append = []
new_sp_ids = []
status_advances = []


def add_event(e_h, e_m, ev_type, **kwargs):
    rec = {
        "ts": event_e(e_h, e_m),
        "wallclock": iso_wall_at_e(e_h, e_m).replace('T', ' ').replace('Z', ''),
        "type": ev_type,
        **kwargs
    }
    events_to_append.append(rec)


# === TASK 1: Create new SPs ===========================================

# Random with fixed seed for reproducibility
random.seed(2026517)

def make_sp(num, label, area, division, building, shore_type, req_len, est_load,
            group, status='pending', deployed_strut=None, deployed_at_e=None,
            placed_at_e=None, cutting_started_at_e=None, cutting_completed_at_e=None,
            secured_at_e=None, returned_at_e=None, sent_to_runner_at_e=None):
    sp_id = push_key()
    sp = {
        "id": sp_id,
        "num": num,
        "label": label,
        "building": building,
        "area": area,
        "division": division,
        "shoreType": shore_type,
        "requiredLength": req_len,
        "effectiveLength": req_len,
        "estimatedLoad": est_load,
        "safetyFactor": "4:1",
        "group": group,
        "status": status,
    }
    if deployed_at_e is not None:
        sp["deployedAt"] = iso_wall_at_e(*deployed_at_e)
    if deployed_strut:
        sp["deployedStrut"] = deployed_strut
    if placed_at_e is not None:
        sp["strutPlacedAt"] = iso_wall_at_e(*placed_at_e)
    if cutting_started_at_e is not None:
        sp["cuttingStartedAt"] = iso_wall_at_e(*cutting_started_at_e)
    if cutting_completed_at_e is not None:
        sp["cuttingCompletedAt"] = iso_wall_at_e(*cutting_completed_at_e)
    if sent_to_runner_at_e is not None:
        sp["sentToRunnerAt"] = iso_wall_at_e(*sent_to_runner_at_e)
    if secured_at_e is not None:
        sp["securedAt"] = iso_wall_at_e(*secured_at_e)
    if returned_at_e is not None:
        sp["returnedAt"] = iso_wall_at_e(*returned_at_e)
    return sp_id, sp


# New SP roster — ~33 new SPs across OP3 priority clusters
# Format: (label_suffix, area, division, shoreType, reqLen, estLoad, group_apparatus, cluster_tag, created_at_e)

NEW_SPS = [
    # V-Cluster-10 emergent (E+18 paper event) — 5 SPs
    ("Pile A Fl 4 V-10 emergent access W", "Pile A Fl 4", "A", "t-shore", 84, 14000, "app-tf-state-cache", "V-Cluster-10", (18, 15)),
    ("Pile A Fl 4 V-10 emergent access E", "Pile A Fl 4", "A", "t-shore", 84, 14000, "app-tf-state-cache", "V-Cluster-10", (18, 18)),
    ("Pile A Fl 4 V-10 overhead lateral N", "Pile A Fl 4", "A", "double-t", 96, 22000, "app-tf-fed-alpha-cache", "V-Cluster-10", (18, 22)),
    ("Pile A Fl 4 V-10 slab cutout support", "Pile A Fl 4", "A", "double-t", 96, 22000, "app-tf-fed-alpha-cache", "V-Cluster-10", (18, 30)),
    ("Pile A Fl 4 V-10 void perimeter S", "Pile A Fl 4", "A", "t-shore", 84, 14000, "app-tf-fed-alpha-cache", "V-Cluster-10", (18, 45)),
    ("Pile A Fl 4 V-10 child void approach", "Pile A Fl 4", "A", "t-shore", 72, 12000, "app-tf-fed-alpha-cache", "V-Cluster-10", (19, 10)),
    # V-Cluster-8 deep work (Pile D periphery) — 7 SPs (TF-Fed-Bravo arrives E+20)
    ("Pile D periphery NE Fl 6 access", "Pile D Fl 6", "D", "3-post", 96, 28000, "app-tf-fed-bravo-cache", "V-Cluster-8", (20, 30)),
    ("Pile D periphery NE Fl 5 lateral", "Pile D Fl 5", "D", "double-t", 96, 22000, "app-tf-fed-bravo-cache", "V-Cluster-8", (20, 45)),
    ("Pile D periphery SE Fl 5 tunnel", "Pile D Fl 5", "D", "t-shore", 84, 16000, "app-tf-fed-bravo-cache", "V-Cluster-8", (20, 55)),
    ("Pile D periphery N Fl 7 overhead", "Pile D Fl 7", "D", "3-post", 108, 30000, "app-tf-fed-bravo-cache", "V-Cluster-8", (21, 15)),
    ("Pile D periphery N Fl 6 column support", "Pile D Fl 6", "D", "double-t", 96, 22000, "app-tf-fed-bravo-cache", "V-Cluster-8", (21, 30)),
    ("Pile D periphery V-32 void access", "Pile D Fl 5", "D", "t-shore", 72, 12000, "app-tf-fed-bravo-cache", "V-Cluster-8", (21, 45)),
    ("Pile D periphery V-33/V-34 void approach", "Pile D Fl 5", "D", "t-shore", 84, 14000, "app-tf-fed-bravo-cache", "V-Cluster-8", (22, 30)),
    # V-Cluster-9 SubD-1 (NW corner) — 5 SPs (concurrent rigging)
    ("SubD-1 NW V-35/V-36 vehicle pocket support", "SubD-1", "C", "3-post", 108, 30000, "app-tow1", "V-Cluster-9", (19, 30)),
    ("SubD-1 NW concrete column lateral", "SubD-1", "C", "double-t", 96, 24000, "app-tf-state-cache", "V-Cluster-9", (19, 45)),
    ("SubD-1 NW pile-above cribbing tier 2", "SubD-1", "C", "3-post", 108, 32000, "app-heavy1", "V-Cluster-9", (20, 5)),
    ("SubD-1 NW tunnel access SW", "SubD-1", "C", "t-shore", 72, 14000, "app-tf-state-cache", "V-Cluster-9", (20, 20)),
    ("SubD-1 NW V-37 void approach", "SubD-1", "C", "t-shore", 84, 14000, "app-tf-state-cache", "V-Cluster-9", (23, 0)),
    # V-Cluster-5 continued (Pile C vehicle pocket) — 4 SPs
    ("Pile C vehicle pocket SE Fl 1 cribbing", "Pile C Fl 1", "C", "double-t", 84, 18000, "app-rsc2", "V-Cluster-5", (16, 30)),
    ("Pile C vehicle pocket V-16 recovery approach", "Pile C Fl 1", "C", "t-shore", 84, 14000, "app-rsc2", "V-Cluster-5", (17, 0)),
    ("Pile C vehicle pocket overhead support E", "Pile C Fl 1", "C", "double-t", 96, 20000, "app-tf-state-cache", "V-Cluster-5", (17, 15)),
    ("Pile C vehicle pocket lateral N", "Pile C Fl 1", "C", "t-shore", 72, 14000, "app-tf-fed-alpha-cache", "V-Cluster-5", (17, 30)),
    # V-Cluster-6 continued (Pile B SW post gas-iso) — 3 SPs
    ("Pile B SW V-17/V-18 void approach", "Pile B SW", "B", "t-shore", 84, 16000, "app-usar-b", "V-Cluster-6", (17, 0)),
    ("Pile B SW lateral support W", "Pile B SW", "B", "double-t", 96, 20000, "app-tf-state-cache", "V-Cluster-6", (17, 30)),
    ("Pile B SW overhead crib tier", "Pile B SW", "B", "double-t", 96, 22000, "app-tf-state-cache", "V-Cluster-6", (18, 0)),
    # V-Cluster-7 recovery (Pile D core) — 5 SPs at slower pace
    ("Pile D core recovery N approach", "Pile D Fl 1-3", "D", "3-post", 120, 32000, "app-tf-fed-bravo-cache", "V-Cluster-7", (22, 30)),
    ("Pile D core recovery overhead pillar", "Pile D Fl 1-3", "D", "3-post", 108, 32000, "app-tf-fed-bravo-cache", "V-Cluster-7", (23, 0)),
    ("Pile D core recovery lateral E", "Pile D Fl 1-3", "D", "double-t", 96, 24000, "app-tf-fed-bravo-cache", "V-Cluster-7", (23, 30)),
    ("Pile D core slab break-out W", "Pile D Fl 1-3", "D", "3-post", 120, 30000, "app-tf-fed-charlie-cache", "V-Cluster-7", (25, 30)),
    ("Pile D core recovery extraction lane", "Pile D Fl 1-3", "D", "double-t", 108, 26000, "app-tf-fed-charlie-cache", "V-Cluster-7", (26, 0)),
    # V-Cluster-1/V-Cluster-2 finish-out — 2 SPs (sector A continuing)
    ("Pile A SW Fl 6 V-3/V-4 cutout overhead", "Pile A Fl 6", "A", "t-shore", 84, 14000, "app-tf-state-cache", "V-Cluster-2", (18, 0)),
    ("Pile A SW Fl 6 V-3/V-4 lateral support", "Pile A Fl 6", "A", "double-t", 96, 20000, "app-tf-state-cache", "V-Cluster-2", (18, 30)),
    # Cleavage divisional expansion — 2 SPs
    ("N wing Fl 8 cleavage Bravo divisional E", "Fl 8", "B", "t-shore", 96, 16000, "app-usar-b", "V-Cluster-4", (17, 45)),
    ("N wing Fl 8 cleavage Bravo divisional W", "Fl 8", "B", "t-shore", 96, 16000, "app-usar-b", "V-Cluster-4", (18, 0)),
]

print(f"Creating {len(NEW_SPS)} new SPs...")
sp_num_next = current_max_num + 1
for (label_suffix, area, division, shoreType, reqLen, estLoad, group, cluster, created_at_e) in NEW_SPS:
    label = f"{label_suffix} [{cluster}]"
    sp_id, sp = make_sp(
        num=sp_num_next,
        label=label,
        area=area,
        division=division,
        building="Pinecrest Tower",
        shore_type=shoreType,
        req_len=reqLen,
        est_load=estLoad,
        group=group,
        status="pending",
        deployed_at_e=created_at_e,
    )
    sps[sp_id] = sp
    new_sp_ids.append((sp_id, sp_num_next, cluster, label_suffix, created_at_e))
    sp_num_next += 1

print(f"Created {len(new_sp_ids)} new SPs. Cumulative: {len(sps)}")

# === TASK 2: Advance SP statuses =========================================

# Helpers to find SPs by criteria
def sps_at(status, predicate=None):
    out = []
    for sid, sp in sps.items():
        if sp.get('status') == status and (predicate is None or predicate(sp)):
            out.append((sid, sp))
    return out


# Strut model selection by length / cluster apparatus
def pick_strut(req_len, cluster_apparatus):
    # Use whatever cache the cluster work pulled from; map length to model
    if req_len <= 15:
        return {"model": "AT 12-15", "length": req_len, "system": "AcmeThread", "apparatusId": cluster_apparatus}
    if req_len <= 25:
        return {"model": "AT 19-25", "length": req_len, "system": "AcmeThread", "apparatusId": cluster_apparatus}
    if req_len <= 36:
        return {"model": "AT 25-36", "length": req_len, "system": "AcmeThread", "apparatusId": cluster_apparatus}
    if req_len <= 58:
        return {"model": "AT 37-58", "length": req_len, "system": "AcmeThread", "apparatusId": cluster_apparatus}
    # > 58" we use LongShore series
    if req_len <= 96:
        return {"model": "LS 1016", "length": req_len, "system": "LongShore", "apparatusId": cluster_apparatus}
    if req_len <= 144:
        return {"model": "LS 1422", "length": req_len, "system": "LongShore", "apparatusId": cluster_apparatus}
    return {"model": "LS 1422", "length": req_len, "system": "LongShore", "apparatusId": cluster_apparatus}


# Advance pending->process: 12 SPs from existing pending + early-OP3 new ones
# (Pre-cutting transitions can advance grouped pending into process)
to_process = []
# Take 8 existing pending
existing_pending = sps_at('pending')
to_process.extend(existing_pending[:8])
# Plus a few newly created
created_lookup = {sid: sps[sid] for (sid, n, c, ls, e) in new_sp_ids}
# Take ~4 from the newest priority (V-Cluster-10 + V-Cluster-8 access)
prio_new = [(sid, sp) for (sid, sp) in created_lookup.items()
            if 'V-Cluster-10' in sp.get('label', '') or 'V-Cluster-9' in sp.get('label', '')][:4]
to_process.extend(prio_new)

for (sid, sp) in to_process:
    sp['status'] = 'process'
    # set process timestamp loosely E+17 onward
    sp['processedAt'] = iso_wall_at_e(17, random.randint(0, 59))
    status_advances.append((sid, 'pending', 'process'))

# Now process->strutplaced: 15 SPs (mass deploy phase)
to_strut_place = []
# Find process SPs without deployedStrut, pick 15 reasonable ones
candidates = [(sid, sp) for (sid, sp) in sps_at('process') if 'deployedStrut' not in sp]
# Prioritize SPs touching V-1/V-5/V-6/V-9/V-10
def cluster_priority(sp):
    label = sp.get('label', '')
    if 'V-Cluster-10' in label or 'V-Cluster-1]' in label: return 0
    if 'V-Cluster-9' in label: return 1
    if 'V-Cluster-5' in label or 'V-Cluster-6' in label: return 2
    if 'V-Cluster-8' in label or 'V-Cluster-2' in label: return 3
    return 4

candidates.sort(key=lambda x: cluster_priority(x[1]))
to_strut_place = candidates[:16]
for (sid, sp) in to_strut_place:
    apparatus = sp.get('group', 'app-tf-state-cache')
    strut = pick_strut(sp.get('requiredLength', 84), apparatus)
    sp['status'] = 'strutplaced'
    sp['deployedStrut'] = strut
    sp['strutPlacedAt'] = iso_wall_at_e(random.choice([18, 19, 20]), random.randint(0, 59))
    status_advances.append((sid, 'process', 'strutplaced'))

# Now strutplaced->cutting: 10 SPs
candidates = sps_at('strutplaced')
candidates.sort(key=lambda x: cluster_priority(x[1]))
to_cutting = candidates[:11]
for (sid, sp) in to_cutting:
    sp['status'] = 'cutting'
    sp['cuttingStartedAt'] = iso_wall_at_e(random.choice([19, 20, 21]), random.randint(0, 59))
    status_advances.append((sid, 'strutplaced', 'cutting'))

# Now cutting->runner: 6 SPs
candidates = sps_at('cutting')
# but skip those just placed into cutting at E+20+; advance the older ones
candidates.sort(key=lambda x: x[1].get('cuttingStartedAt', ''))
to_runner = candidates[:6]
for (sid, sp) in to_runner:
    sp['status'] = 'runner'
    sp['cuttingCompletedAt'] = iso_wall_at_e(random.choice([20, 21, 22]), random.randint(0, 59))
    sp['sentToRunnerAt'] = sp['cuttingCompletedAt']
    status_advances.append((sid, 'cutting', 'runner'))

# Now runner->secured: 5 SPs
candidates = sps_at('runner')
candidates.sort(key=lambda x: x[1].get('sentToRunnerAt', ''))
to_secured = candidates[:5]
for (sid, sp) in to_secured:
    sp['status'] = 'secured'
    sp['securedAt'] = iso_wall_at_e(random.choice([22, 23, 24]), random.randint(0, 59))
    status_advances.append((sid, 'runner', 'secured'))

# Now secured->returned: 3 SPs (full cycle complete)
candidates = sps_at('secured')
candidates.sort(key=lambda x: x[1].get('securedAt', ''))
to_returned = candidates[:3]
for (sid, sp) in to_returned:
    sp['status'] = 'returned'
    sp['returnedAt'] = iso_wall_at_e(random.choice([25, 26, 27]), random.randint(0, 59))
    status_advances.append((sid, 'secured', 'returned'))

print(f"Status advances: {len(status_advances)}")

# Final SP status breakdown
final_statuses = {}
for sp in sps.values():
    s = sp.get('status', 'unknown')
    final_statuses[s] = final_statuses.get(s, 0) + 1
print(f"Final SP status breakdown: {final_statuses}")
print(f"Total SPs: {len(sps)}")

# === TASK 3: Cmd transfer Whitaker->Vasquez @ E+21 ======================

# Add Vasquez individual
individuals['i-vasquez-ic5'] = {"id": "i-vasquez-ic5", "name": "Chief Vasquez (IC #5 night-shift)"}
# Reassign IC role
if 'ind-i-whitaker-ic4' in roles:
    del roles['ind-i-whitaker-ic4']
if 'ind-i-whitaker-ic4' in role_names:
    del role_names['ind-i-whitaker-ic4']
roles['ind-i-vasquez-ic5'] = 'ic'
role_names['ind-i-vasquez-ic5'] = 'Chief Vasquez (IC #5)'

add_event(21, 0, 'transfer-of-command',
          **{
              "from": "Chief Whitaker (IC #4)",
              "to": "Chief Vasquez (IC #5)",
              "brief": "ICS-201 transfer Whitaker to Vasquez at OP2->OP3 night-shift boundary (E+21:00). SITREP at handoff: 82 SPs cumulative (49 + 33 new); status mix 18 process, 6 strutplaced, 5 cutting, 1 runner, 1 secured (pre-cycle through this hour); V-Cluster-10 emergent priority active since E+18 paper-event discovery (V-38 + V-39 voice contact Fl 4 Pile A); cluster V-1 fully extracted; V-5/V-6/V-9 active rescue lanes; V-8 access expanded with TF-Fed-Bravo arrival E+20; V-7 recovery posture commenced E+22. Org: Branch tier holding (Rescue Branch Dir Vega + Search Group Sup Kim + Shoring Group Sup Beck + Heavy Rigging Spec promoted to Group Sup tonight + Medical Branch Director Dr Patel escalated). Demob UL Nash drafting demob preview for OSC Bishop discussion at E+24. Hazards: Wind gust 28 mph expected E+22 (paper event — Conway stop-work prepared for Sector D); rain 15 min E+24:30; salt-debris cribbing rot accelerating. Recommend continued mass-deploy tempo through E+24, then transition to consolidation + demob planning E+25 onward.",
              "by": "ic-op3",
              "persona": "Chief Vasquez",
              "apparatus_from": "ind-i-whitaker-ic4",
              "apparatus_to": "ind-i-vasquez-ic5",
              "role": "ic",
              "note": "Cmd transfer #4 of the event. FRICTION: no pre-loaded apparatus chip for Vasquez; used Individual workaround (4th instance of this pattern). Whitaker's roleName entry deleted (v4.0.0 3C.5 gap, 5th occurrence)."
          })

# === TASK 4: OSC rotation Marquez->Bishop @ E+21 ========================

individuals['i-bishop-osc5'] = {"id": "i-bishop-osc5", "name": "Asst. TFL Bishop (OSC #5 night-shift)"}
if 'ind-i-marquez-osc3' in roles:
    del roles['ind-i-marquez-osc3']
if 'ind-i-marquez-osc3' in role_names:
    del role_names['ind-i-marquez-osc3']
roles['ind-i-bishop-osc5'] = 'operations'
role_names['ind-i-bishop-osc5'] = 'Asst. TFL Bishop (OSC #5)'

add_event(21, 0, 'role-reassigned',
          by='osc-op3',
          persona='Asst. TFL Bishop',
          apparatus_from='ind-i-marquez-osc3',
          apparatus_to='ind-i-bishop-osc5',
          role='operations',
          note='OSC #4 Marquez hands Operations to Asst. TFL Bishop at night-shift transition (E+21:00). Marquez rotates to TF-Fed-Alpha rest cycle (returns OP4 day-2). FRICTION: 5th iteration of OSC chair rotation overwriting prior roleName (3C.5 gap compounding).')

# === TASK 5: Build new OP3 roles ========================================

# 5.1 Heavy Rigging Group Sup (escalate from Spec — promote individual)
individuals['i-grayson-rigging'] = {"id": "i-grayson-rigging", "name": "Sup. Grayson (TF-State Heavy Rigging Group Sup, escalated)"}
roles['ind-i-grayson-rigging'] = 'custom_heavy_rigging'
role_names['ind-i-grayson-rigging'] = 'Sup. Grayson (Heavy Rigging Group Sup)'
add_event(16, 5, 'role-assigned',
          by='rigging-op3',
          role='Heavy Rigging Group Sup',
          apparatus_id='ind-i-grayson-rigging',
          persona='Sup. Grayson (escalated from Spec to Group Sup)',
          note='Heavy Rigging Specialist escalated to Heavy Rigging Group Sup at OP3 start; manages Tower 1 + Heavy 1 + TF-State Rigging Team for Sector D access shoring. Note: app keeps existing app-tow1 + app-heavy1 apparatus chips under custom_heavy_rigging role — new Group Sup individual assignment SHARES the role (multiple assignments to same role accepted by FieldShore data model, but UI shows only first; flagged as friction). v4.0.0 will need role-chair vs role-membership distinction.')

# 5.2 Medical Branch Director (escalate Patel — span-escalation since Med now has Branch tier)
# Patel was at custom_medical_unit (under IC). Create a Medical Branch with Branch tier.
custom_roles.append({
    "id": "custom_medical_branch",
    "name": "Medical Branch Director",
    "parentId": "operations",
})
# Move Patel from Medical Unit (Mgr) to Medical Branch Dir
if 'ind-i-patel-medical' in roles:
    del roles['ind-i-patel-medical']
if 'ind-i-patel-medical' in role_names:
    del role_names['ind-i-patel-medical']
# Re-add as Medical Branch Director
individuals['i-patel-medical']['name'] = 'Dr. Patel (Medical Branch Director)'
roles['ind-i-patel-medical'] = 'custom_medical_branch'
role_names['ind-i-patel-medical'] = 'Dr. Patel (Medical Branch Director)'
add_event(16, 10, 'role-assigned',
          by='medical-op3',
          role='Medical Branch Director',
          apparatus_id='ind-i-patel-medical',
          persona='Dr. Patel (escalated from Medical Team Mgr to Medical Branch Director)',
          note='Medical span-escalation as patient flow volumes during ongoing extractions justify Branch tier. Custom role custom_medical_branch created under operations. NIMS doctrine check: Medical Branch typically sits under Operations Section in Type I — verified. Old custom_medical_unit role retained as orphan in customRoles list (no UI to delete on the fly).')

# 5.3 Demob UL (Nash already assigned at E+15 OP2; verify and re-affirm)
# Already in roles: ind-i-nash-demob -> custom_demob_ul
add_event(16, 0, 'role-affirmed',
          by='demob-op3',
          role='Demob Unit Leader',
          apparatus_id='ind-i-nash-demob',
          persona='Sgt. Nash (Demob UL, ongoing from E+15:00)',
          note='Demob Unit Leader role active at OP3 start. Per assignment by PSC #2 Doyle at E+15:00. Nash continues into night shift; will draft preliminary TF-State demob plan for OSC #5 Bishop and IC #5 Vasquez review at E+24.')

# 5.4 Documentation Unit Leader (arrives E+24 per timeline)
individuals['i-sayer-docul'] = {"id": "i-sayer-docul", "name": "Sayer (Doc UL Federal TF Plans)"}
# Doc UL parents under PSC #2
custom_roles.append({
    "id": "custom_doc_ul",
    "name": "Documentation Unit Leader",
    "parentId": "custom_psc_op2",
})
roles['ind-i-sayer-docul'] = 'custom_doc_ul'
role_names['ind-i-sayer-docul'] = 'Sayer (Documentation UL)'
add_event(24, 0, 'role-assigned',
          by='docunit-op3',
          role='Documentation Unit Leader',
          apparatus_id='ind-i-sayer-docul',
          persona='Sayer (Federal TF Plans)',
          note='Documentation Unit Leader arrives at OP3 E+24:00 per timeline. Custom role custom_doc_ul parented under custom_psc_op2 (Planning Section). Sayer takes over export prep + role history reconstruction for IAP-OP4 attachment. First task: test Settings → Export workflow (gap-finding).')

print(f"Roles after OP3 additions: {len(roles)}")
print(f"customRoles after OP3 additions: {len(custom_roles)}")

# === TASK 6: Demob UL UI test (gap-finding) ============================

add_event(23, 0, 'ui-test',
          by='demob-op3',
          persona='Sgt. Nash',
          test='demob-workflow-exploration',
          outcome='confirmed-gap',
          surfaces_checked=['Settings tab', 'Operations tab', 'Inventory tab', 'Command tab'],
          finding=('No formal demob UI exists in FieldShore today. '
                   'Settings tab has no Demob section. Operations tab apparatus list shows assignment-to-operation but no "release" or "stand down" workflow. Inventory tab has no apparatus-level demob status. Command tab has assigned/cleared role transitions but no resource-release lifecycle. '
                   'Demob therefore lives entirely in parallel paper docs (ICS-221 Demobilization Check-Out and ICS-220 Resources Demobilization Plan). Confirmed v4.0.0 gap; flagged for mod-nims and mod-ist hotwash. '
                   'Workaround: Nash maintains a Google Sheet of apparatus by release timeframe; communicates manually to LSC + OSC.'),
          note='Per overlay: Demob UL drives UI exploration; expected gap. Confirmed.')

# === TASK 7: Doc UL Export UI test (gap-finding) =======================

add_event(24, 15, 'ui-test',
          by='docunit-op3',
          persona='Sayer',
          test='export-workflow-exploration',
          outcome='partial-gap',
          surfaces_checked=['Settings tab → Data Management → Export', 'Inventory tab → Export', 'Operations tab → Archived ops view'],
          finding=('Export today: Inventory tab supports Excel export (SheetJS — exports apparatus + struts + plates + extensions + external equipment as multi-sheet XLSX, includes ID column since v3.5.2). '
                   'Settings → Export Operation also exposes JSON export of the current active operation (full snapshot). '
                   'Archived ops view (after endOperation) supports a read-only timeline view (see viewArchivedOp). '
                   'GAPS: (1) No SP timeline export — cuttingStartedAt/runner/secured timestamps live on each SP but no flattened CSV export. '
                   '(2) No role-history export — role reassignments not preserved (v4.0.0 3C.5 gap) so any historical "who was IC at E+9" requires event-log.jsonl reconstruction outside the app. '
                   '(3) No ICS form export — no automatic ICS-203 / ICS-204 / ICS-209 generation from operation state. '
                   '(4) Excel inventory export lacks "as of" timestamp; can capture point-in-time but not deltas. '
                   '(5) External equipment export captures items but not deployment history (which SP each item went to and when). '
                   'For OP4 IAP attachment, Sayer reconstructs SP timeline from event-log.jsonl + Firebase RTDB snapshot exports outside app.'),
          note='Per overlay: Doc UL tests export workflows. Confirmed partial gap. v4.0.0 export feature scope item.')

# === TASK 8: IST multi-tenancy thought experiment =====================

add_event(27, 5, 'ist-multitenancy-check',
          by='psc-op3',
          persona='PSC Federal (Bauer IST augment)',
          test='ist-firebase-access',
          outcome='confirmed-gap-no-tenant-separation',
          finding=('IST PSC Bauer connects to sim dept sim-surfside-ttx-2 from FEMA IST device. '
                   'Anonymous auth: Bauer\'s session authenticates as a different anonymous uid than the local PSC #3 session. '
                   'Database rules (v3.7.0 + v3.8.2 refinements) allow read/write to any /departments/{deptId}/ subtree if auth != null AND the uid is in the dept\'s /members list — OR if auth != null without any member check. '
                   'Current rules grant ALL anonymous users full access to ALL departments — no /members enforcement. '
                   'In practice for IST integration: Bauer reads + writes the dept just like Doyle (PSC #2). She sees the same SPs, same org chart, same inventory. '
                   'The app does NOT distinguish IST member from local PSC. There is no "permission" or "scope" or "tenant" concept. '
                   'Confirmed v4.0.0 Phase 3B gap: per-device UID + role-based security rules required. Without it: any anonymous-auth user on the public app could write to this dept. '
                   'Workaround: keep the dept name + ID secret. Not viable for production multi-agency ops.'),
          note='Per task scaffold: IST integrates by sharing the sim dept; document tenancy gap.')

# === TASK 9: Wind gust + rain weather event handling ==================

add_event(22, 0, 'safety-stop-work',
          by='safety-op3',
          persona='BC Conway',
          event='wind-gust-28mph',
          scope='Pile Sector D cutting + cribbing operations',
          duration_min=12,
          ui_friction=('No "stop-work" UI feature in FieldShore today. Conway issued stop-work via radio (TAC-2 + MED-1 alert tones). No status toggle on shore points marks "paused for safety." No banner / alert / scene-state field on operation. '
                       'Workaround: Conway radioed all Sector D crews; cuts paused manually; SP statuses unchanged but cutting workflow stalled ~10 min. Conway then radioed all-clear at E+22:12. '
                       'Confirmed v4.0.0 gap for mod-comms / mod-struct: operation-level "safety state" + SP-level "paused" status with audit trail. Hotwash recommendation: add ScenePause boolean + SafetyEvent log to operation schema.'),
          note='Wind gust paper event handled. No stop-work UI; manual radio coordination.')

add_event(24, 30, 'safety-incident-rain',
          by='safety-op3',
          persona='BC Conway',
          event='brief-rain-15min',
          scope='Cutting saw operations (moisture/electrical risk)',
          duration_min=15,
          ui_friction='Same gap as wind gust — no stop-work UI. Cutting team paused saws manually; SP statuses unchanged. Conway noted to PSC for ICS-208 update next OP.',
          note='Rain paper event handled. Same UI gap as wind gust.')

# === Additional new-SP creation events =================================

# Log the bulk SP creation event
add_event(17, 0, 'sp-bulk-create',
          participant='osc-op3',
          count=len(new_sp_ids),
          clusters=['V-Cluster-10','V-Cluster-8','V-Cluster-9','V-Cluster-5','V-Cluster-6','V-Cluster-7','V-Cluster-2','V-Cluster-4'],
          start_num=current_max_num + 1,
          end_num=sp_num_next - 1,
          types_breakdown={'t-shore': 14, 'double-t': 11, '3-post': 7, 'vertical': 0, 'lookout': 0},
          note=('OP3 mass deploy phase: 33 new SPs across all active clusters. Emergent V-Cluster-10 (5 SPs, E+18 paper-event discovery), '
                'V-Cluster-8 Pile D periphery (7 SPs with TF-Fed-Bravo cache E+20 onward), V-Cluster-9 SubD-1 (5 SPs including 3-Post cribbing tier), '
                'V-Cluster-5 continued (4), V-Cluster-6 continued (3), V-Cluster-7 recovery (5 SPs, slower Tier 3 pace), '
                'V-Cluster-2 access (2), V-Cluster-4 cleavage divisional (2). '
                'Heavy mix of Double-T and 3-Post for deep/heavy work per USACE 6x6 wood spec. '
                'FRICTION (continued from OP1+OP2): Add-SP modal Save Changes button still hidden in Add path; programmatic injection (db.ref().push() + persistOperation() equivalent) used as documented bypass. '
                'No new modal fixes shipped between OP2 and OP3. v4.0.0 Phase 2 backlog.'))

# Log status advance batches
batches = {}
for (sid, from_s, to_s) in status_advances:
    key = (from_s, to_s)
    batches.setdefault(key, []).append(sid)

for (from_s, to_s), sids in batches.items():
    add_event(20 if to_s == 'process' else (21 if to_s == 'strutplaced' else (22 if to_s == 'cutting' else (23 if to_s == 'runner' else (25 if to_s == 'secured' else 26)))),
              0,
              'sp-status-advance',
              participant='osc-op3',
              count=len(sids),
              **{'from': from_s, 'to': to_s},
              sp_ids=sids[:10],  # truncate large batches
              sp_count_full=len(sids),
              note=f'OP3 batch advance {from_s}->{to_s}. {len(sids)} SPs.')

# === IAP filed event =====================================================

add_event(15, 30, 'iap-drafted',
          participant='psc-op3',
          op=3,
          drafter='Capt. Doyle (PSC #2 → PSC #3 transfer)',
          note='PSC #2 Doyle completes initial OP3 IAP draft at E+15:30 (pre-boundary). Approved by IC #4 Whitaker at E+15:45 prior to OP2->OP3 boundary.')

add_event(27, 30, 'iap-filed',
          participant='psc-op3',
          op=3,
          path='.claude/simulations/surfside-ttx-2/iaps/iap-op3.md',
          blocks=8,
          attachments=4,
          prepared_by='Capt. Doyle (PSC #2) → PSC Federal Mgr (PSC #3) with IST PSC Bauer augment E+27',
          approved_by=['Chief Whitaker (IC #4, OP3 first 5 hr E+16-E+21)', 'Chief Vasquez (IC #5, OP3 second 7 hr E+21-E+28)'],
          note='IAP-OP3 finalized post-IST PSC augmentation arrival.')

# === TASK 11: OP3 boundary entry ========================================

final_statuses = {}
for sp in sps.values():
    s = sp.get('status', 'unknown')
    final_statuses[s] = final_statuses.get(s, 0) + 1

add_event(28, 0, 'op-boundary',
          from_op=3,
          to_op=4,
          sp_cumulative=len(sps),
          sp_statuses=final_statuses,
          note='OP3 closed; IAP-OP3 filed; emergent V-10 cluster discovered E+18; wind gust + rain weather events handled; IST integrated E+26-27; TF-State half rotated to rehab E+23; ready for OP4 demob discussion phase')

add_event(28, 0, 'token-release',
          **{"from": "op3-consolidated", "to": "conductor"},
          note='OP3 closed; awaiting OP4 spawn. 33 new SPs created this invocation across V-Clusters 10/8/9/5/6/7/2/4. {n} SP status writes across pipeline. Cmd transfer #4 + OSC rotation #5 + 4 new role assignments (Heavy Rigging Group Sup escalate / Medical Branch Director escalate / Demob UL re-affirm / Doc UL new). Demob UL UI test confirmed gap. Doc UL export test confirmed partial gap. IST multi-tenancy test confirmed Phase 3B gap. Weather events confirmed stop-work UI gap. IAP-OP3 filed. Token released.'.format(n=len(status_advances)))

# === Write event log ====================================================

with open(EVENT_LOG, 'a') as f:
    for ev in events_to_append:
        f.write(json.dumps(ev) + "\n")

print(f"Appended {len(events_to_append)} events to event-log.jsonl")

# === Write snapshot =====================================================

with open(SNAP_OUT, 'w') as f:
    json.dump(snap, f, indent=2)

print(f"Wrote snapshot to {SNAP_OUT}")

# === Print final summary ================================================

print()
print("=" * 60)
print("OP3 driver summary")
print("=" * 60)
print(f"New SPs created: {len(new_sp_ids)}")
print(f"Status advances: {len(status_advances)}")
print(f"Total SPs at boundary: {len(sps)}")
print(f"Status breakdown: {final_statuses}")
print(f"Roles at boundary: {len(roles)}")
print(f"Custom roles at boundary: {len(custom_roles)}")
print(f"Events appended: {len(events_to_append)}")

#!/usr/bin/env python3
"""Compare a v3 (paratech-c3ab4) inventory with a v4 inventory, line by line.

Gate evidence tool for issue #264 (v3 -> v4 fresh-start re-import).
Stdlib only.  Run it as a script:   python3 -I compare.py --v3 <file> --v4 <file>

  python3 -I compare.py --v3 <file> [--dept hfd217] [--v3-apparatus <file>] \
                        --v4 <file> [--json <out>] [--allow-empty] \
                        [--expect-lines N] [--expect-units N] [--expect-rows N] \
                        [--roster <file>]

v3 side (any one of):
  (a) full dump            -> root.departments[dept]
  (b) department node      -> {inventory, apparatus}
  (c) bare inventory map   -> needs --v3-apparatus (map: push-id -> {name,type})
v4 side (auto-detected):
  (a) REST map from orgs/<id>/inventory.json: id -> row | tombstone
  (b) JSON array of the same rows (Dexie export)
  (JSON `null`, i.e. an empty cloud node, counts as an empty inventory.)

Join key (type-aware; v3 apparatus push-ids are resolved to rig NAMES first):
  strut      (rig, 'strut', model)
  extension  (rig, 'extension', system, int(length))
  plate      (rig, 'plate', plateId)      # length / system / model are ignored
Quantities of rows sharing a key are summed.  `available`, `_meta`, v4
tombstones (deleted === true) and quantity-0 rows are ignored (but counted).
A row that cannot be keyed (extension without integer length, strut without
model, plate without plateId, bad quantity...) is MALFORMED: it is kept out of
the join, listed, counted in DIFFS and forces exit 1 -- two broken rows never
cancel each other out.

Extra gates (every failure is counted in DIFFS and forces exit 1):
  --expect-lines/-units/-rows N   the v4 side must have exactly N distinct lines /
                                  total units / live counted rows (EXPECTATIONS).
  duplicatesMerged                must be equal on both sides -- a split or a double
                                  import (rows summed into one key) never passes.
  --roster FILE                   pre-import roster snapshot: the REST envelope
                                  {lastWriteAt, value:[{id,name,type}]} or a bare array.
                                  Every live v4 row must carry an apparatusId that is in
                                  the roster AND an `apparatus` equal (byte for byte) to
                                  that entry's name (ROSTER: rig minted by import / name
                                  mismatch).
  an empty v3 side (no rows)      is a diff unless --allow-empty is given, so {} vs null
                                  can never pass as a match.

Paths in the report are shown ~-relative so committed evidence carries no home path.

Exit codes: 0 = exact match, 1 = any diff (or malformed row), 2 = usage/shape error.
"""
import argparse
import json
import os
import re
import sys

SYSTEM_ALIASES = {
    "grey": "AcmeThread", "gray": "AcmeThread", "acmethread": "AcmeThread",
    "gold": "LongShore", "longshore": "LongShore",
    "lockstroke": "LockStroke",
}
KNOWN_TYPES = ("strut", "extension", "plate")


class Fatal(Exception):
    """Usage / shape error -> exit 2."""


class Malformed(Exception):
    """A row that cannot be keyed or counted."""


# ---------------------------------------------------------------- helpers
def s(v):
    if v is None:
        return ""
    return v.strip() if isinstance(v, str) else str(v).strip()


def to_int(v):
    """Strict integer: int, integral float, or digit string. Never bool/None."""
    if isinstance(v, bool) or v is None:
        raise ValueError
    if isinstance(v, int):
        return v
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str) and re.fullmatch(r"-?\d+", v.strip()):
        return int(v.strip())
    raise ValueError


def norm_system(v):
    raw = s(v)
    return SYSTEM_ALIASES.get(re.sub(r"[^a-z0-9]", "", raw.lower()), raw)


def disp(path):
    """Absolute path with the home directory shown as ~ (nothing personal in committed evidence)."""
    p = os.path.abspath(os.path.expanduser(path))
    home = os.path.expanduser("~")
    if p == home:
        return "~"
    if home not in ("", os.sep) and p.startswith(home + os.sep):
        return "~" + p[len(home):]
    return p


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except OSError as e:
        raise Fatal("cannot read %s: %s" % (disp(path), e.strerror or e))
    except ValueError as e:
        raise Fatal("%s is not valid JSON: %s" % (disp(path), e))


def label(key):
    rig, typ = key[0], key[1]
    if typ == "extension":
        return '"%s" | extension | %s | %sin' % (rig, key[2], key[3])
    return '"%s" | %s | %s' % (rig, typ, key[2])


# ---------------------------------------------------------------- row -> key
def make_key(rec, rig, warns):
    typ = s(rec.get("type")).lower()
    if not typ:
        raise Malformed("missing type")
    if typ == "strut":
        model = s(rec.get("model"))
        if not model:
            raise Malformed("strut without model")
        return (rig, "strut", model)
    if typ == "extension":
        system = norm_system(rec.get("system"))
        if not system:
            raise Malformed("extension without system")
        try:
            length = to_int(rec.get("length"))
        except ValueError:
            raise Malformed("extension without integer length (%r)" % (rec.get("length"),))
        if length < 0:
            raise Malformed("extension with negative length")
        return (rig, "extension", system, str(length))
    if typ == "plate":
        pid = s(rec.get("plateId"))
        if not pid:
            raise Malformed("plate without plateId")
        return (rig, "plate", pid)
    note = "unknown type %r keyed by (rig,type,model)" % typ
    if note not in warns:
        warns.append(note)
    return (rig, typ, s(rec.get("model")))


def build(entries, rig_of, tombstones):
    """entries: iterable of (ref, record).  rig_of(rec, warns) -> rig string or raises Malformed."""
    side = {"qty": {}, "rows": 0, "dup": 0, "zero": 0, "malformed": [],
            "tomb": 0, "stamps": set(), "nostamp": 0, "warns": [], "live": []}
    for ref, rec in entries:
        if not isinstance(rec, dict):
            side["malformed"].append((ref, "row is not an object"))
            continue
        if tombstones and rec.get("deleted") is True:      # before ANY field validation
            side["tomb"] += 1
            continue
        side["live"].append((ref, rec.get("apparatus"), rec.get("apparatusId")))   # for --roster
        try:
            qty = to_int(rec.get("quantity"))
        except ValueError:
            side["malformed"].append((ref, "quantity is not an integer (%r)" % (rec.get("quantity"),)))
            continue
        if qty < 0:
            side["malformed"].append((ref, "negative quantity (%d)" % qty))
            continue
        if qty == 0:
            side["zero"] += 1
            continue
        try:
            key = make_key(rec, rig_of(rec, side["warns"]), side["warns"])
        except Malformed as e:
            side["malformed"].append((ref, str(e)))
            continue
        side["rows"] += 1
        if key in side["qty"]:
            side["dup"] += 1
        side["qty"][key] = side["qty"].get(key, 0) + qty
        if tombstones:
            if "lastWriteAt" in rec and rec["lastWriteAt"] is not None:
                side["stamps"].add(json.dumps(rec["lastWriteAt"], sort_keys=True))
            else:
                side["nostamp"] += 1
    return side


# ---------------------------------------------------------------- v3 side
def apparatus_names(data, where):
    if isinstance(data, dict) and isinstance(data.get("apparatus"), dict):
        data = data["apparatus"]
    if not isinstance(data, dict):
        raise Fatal("%s: apparatus must be a map of id -> {name,type}" % where)
    return {k: s(v.get("name")) for k, v in data.items() if isinstance(v, dict)}


def iter_rows(container, where):
    if container is None:
        return []
    if isinstance(container, dict):
        return list(container.items())
    if isinstance(container, list):
        return [(str(i), r) for i, r in enumerate(container) if r is not None]
    raise Fatal("%s: expected a map or array of rows" % where)


def load_v3(path, dept, app_path):
    data = load_json(path)
    if not isinstance(data, dict):
        raise Fatal("v3 file: top level must be a JSON object")
    apps, warns = {}, []
    if isinstance(data.get("departments"), dict):
        node = data["departments"].get(dept)
        if not isinstance(node, dict):
            raise Fatal("v3 dump has no department %r (available: %s)"
                        % (dept, ", ".join(sorted(data["departments"])) or "none"))
        shape = "full dump (departments/%s)" % dept
        inv = node.get("inventory")
        apps = apparatus_names(node.get("apparatus") or {}, "v3 dump apparatus")
    elif isinstance(data.get(dept), dict) and "inventory" in data[dept]:
        shape = "departments map (%s)" % dept
        inv = data[dept].get("inventory")
        apps = apparatus_names(data[dept].get("apparatus") or {}, "v3 apparatus")
    elif "inventory" in data and (data["inventory"] is None or isinstance(data["inventory"], (dict, list))):
        shape = "department node"
        inv = data["inventory"]
        apps = apparatus_names(data.get("apparatus") or {}, "v3 apparatus")
    elif all(isinstance(v, dict) for v in data.values()) and (not data or any("type" in v for v in data.values())):
        shape = "bare inventory map"
        inv = data
    else:
        raise Fatal("v3 file: unrecognised shape (expected full dump, department node, or bare inventory map)")
    if app_path:
        apps.update(apparatus_names(load_json(app_path), "--v3-apparatus"))
    entries = iter_rows(inv, "v3 inventory")
    if inv is None:
        warns.append("v3 inventory is empty (null)")
    if entries and not apps:
        raise Fatal("v3 inventory has rows but no apparatus map -- pass --v3-apparatus <file>")

    def rig_of(rec, w):
        aid = s(rec.get("apparatus"))
        if not aid:
            raise Malformed("no apparatus")
        name = apps.get(aid)
        if name:
            return name
        note = "v3 apparatus id %s not in the apparatus map (rows keyed as <unresolved:%s>)" % (aid, aid)
        if note not in w:
            w.append(note)
        return "<unresolved:%s>" % aid

    side = build(entries, rig_of, tombstones=False)
    side["warns"] = warns + side["warns"]
    side["shape"] = shape
    return side


# ---------------------------------------------------------------- v4 side
def load_v4(path):
    data = load_json(path)
    warns = []
    if isinstance(data, dict) and isinstance(data.get("inventory"), (dict, list)):
        data = data["inventory"]                      # unwrap an org / dept node
    if data is None:
        shape, entries = "empty (null)", []
        warns.append("v4 inventory is empty (JSON null)")
    elif isinstance(data, dict):
        shape, entries = "REST map", list(data.items())
    elif isinstance(data, list):
        shape, entries = "array (Dexie export)", [(str(i), r) for i, r in enumerate(data)]
    else:
        raise Fatal("v4 file: expected a map (REST) or an array (Dexie export)")

    def rig_of(rec, w):
        name = s(rec.get("apparatus"))
        if name:
            return name
        aid = s(rec.get("apparatusId"))
        if not aid:
            raise Malformed("no apparatus name or apparatusId")
        note = "v4 rows without an apparatus name fall back to <id:apparatusId>"
        if note not in w:
            w.append(note)
        return "<id:%s>" % aid

    side = build(entries, rig_of, tombstones=True)
    side["warns"] = warns + side["warns"]
    side["shape"] = shape
    return side


# ---------------------------------------------------------------- roster
def load_roster(path):
    """-> (id -> name, warnings).  Accepts the REST envelope {value: [...]}, a bare array, or an id map."""
    data = load_json(path)
    if isinstance(data, dict) and "value" in data:
        data = data["value"]
    warns = []
    if data is None:
        warns.append("roster is empty (JSON null) -- every v4 row will fail the roster check")
        data = []
    if isinstance(data, dict):
        data = list(data.values())
    if not isinstance(data, list):
        raise Fatal("%s: roster must be {value:[{id,name,type}]} or a JSON array of {id,name,type}" % disp(path))
    roster = {}
    for i, e in enumerate(data):
        if e is None:
            continue
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not isinstance(e.get("name"), str):
            raise Fatal("%s: roster entry %d needs string id and name" % (disp(path), i))
        if e["id"] in roster and roster[e["id"]] != e["name"]:
            warns.append("roster id %s appears twice with different names (%r, %r); first kept"
                         % (e["id"], roster[e["id"]], e["name"]))
            continue
        roster.setdefault(e["id"], e["name"])
    return roster, warns


def roster_violations(live, roster):
    out = []
    for ref, app, aid in live:
        if not isinstance(aid, str) or not aid:
            out.append("%s: no apparatusId (rig %r) -- not tied to a roster rig" % (ref, app))
        elif aid not in roster:
            out.append("%s: apparatusId %s (rig %r) is not in the roster -- rig minted by import"
                       % (ref, aid, app))
        elif app != roster[aid]:
            out.append("%s: apparatus %r != roster name %r for apparatusId %s -- name mismatch"
                       % (ref, app, roster[aid], aid))
    return out


# ---------------------------------------------------------------- report
def totals(side):
    by_type, by_rig, units = {}, {}, 0
    for key, q in side["qty"].items():
        units += q
        for bucket, name in ((by_type, key[1]), (by_rig, key[0])):
            b = bucket.setdefault(name, {"lines": 0, "units": 0})
            b["lines"] += 1
            b["units"] += q
    return {"shape": side["shape"], "rows": side["rows"], "lines": len(side["qty"]), "units": units,
            "duplicatesMerged": side["dup"], "skippedZero": side["zero"],
            "malformed": len(side["malformed"]), "byType": by_type, "byRig": by_rig}


def print_side(name, t, extras=None):
    print("%s  shape: %s" % (name, t["shape"]))
    print("  lines=%d  units=%d  rows=%d  duplicatesMerged=%d  skippedZero=%d  malformed=%d"
          % (t["lines"], t["units"], t["rows"], t["duplicatesMerged"], t["skippedZero"], t["malformed"]))
    for typ in sorted(t["byType"]):
        print("  type %-10s lines=%d  units=%d" % (typ, t["byType"][typ]["lines"], t["byType"][typ]["units"]))
    for rig in sorted(t["byRig"]):
        print('  rig  %-12s lines=%d  units=%d' % ('"%s"' % rig, t["byRig"][rig]["lines"], t["byRig"][rig]["units"]))
    for line in extras or []:
        print("  " + line)


def section(title, items, fmt):
    print("\n%s (%d)" % (title, len(items)))
    if not items:
        print("  (none)")
    for it in items:
        print("  " + fmt(it))


def run(args):
    v3 = load_v3(args.v3, args.dept, args.v3_apparatus)
    v4 = load_v4(args.v4)
    a, b = v3["qty"], v4["qty"]
    missing = sorted(k for k in a if k not in b)
    extra = sorted(k for k in b if k not in a)
    qdiff = sorted(k for k in a if k in b and a[k] != b[k])
    malformed = ([("v3", r, why) for r, why in v3["malformed"]] +
                 [("v4", r, why) for r, why in v4["malformed"]])
    t3, t4 = totals(v3), totals(v4)
    t4["tombstones"] = v4["tomb"]
    t4["lastWriteAtDistinct"] = len(v4["stamps"])
    t4["lastWriteAtMissing"] = v4["nostamp"]
    warnings = ["v3: " + w for w in v3["warns"]] + ["v4: " + w for w in v4["warns"]]

    expect = []                                           # (name, expected, actual) mismatches
    for name, want, got in (("lines", args.expect_lines, t4["lines"]),
                            ("units", args.expect_units, t4["units"]),
                            ("rows", args.expect_rows, t4["rows"])):
        if want is not None and want != got:
            expect.append((name, want, got))
    dups = []                                             # duplicatesMerged must match across sides
    if t3["duplicatesMerged"] != t4["duplicatesMerged"]:
        dups.append((t3["duplicatesMerged"], t4["duplicatesMerged"]))
    roster, viol = None, []
    if args.roster:
        roster, rwarns = load_roster(args.roster)
        viol = roster_violations(v4["live"], roster)
        warnings += ["roster: " + w for w in rwarns]
    empty3 = []                                           # an empty v3 side must never pass silently
    if v3["rows"] == 0:
        if args.allow_empty:
            warnings.append("v3 side has no rows (accepted: --allow-empty)")
        else:
            empty3.append("v3 side has no rows -- nothing to compare against (use --allow-empty if intended)")
    n = (len(missing) + len(extra) + len(qdiff) + len(malformed)
         + len(expect) + len(dups) + len(viol) + len(empty3))

    if args.json:
        out = {"ok": n == 0, "diffCount": n,
               "diffs": {
                   "missing": [{"key": label(k), "parts": list(k), "v3": a[k]} for k in missing],
                   "extra": [{"key": label(k), "parts": list(k), "v4": b[k]} for k in extra],
                   "quantity": [{"key": label(k), "parts": list(k), "v3": a[k], "v4": b[k]} for k in qdiff],
                   "malformed": [{"side": sd, "ref": r, "reason": why} for sd, r, why in malformed],
                   "expectations": [{"name": nm, "expected": w, "actual": g} for nm, w, g in expect],
                   "duplicatesMerged": [{"v3": x, "v4": y} for x, y in dups],
                   "roster": viol,
                   "emptyV3": empty3},
               "inputs": {"v3": disp(args.v3), "v4": disp(args.v4),
                          "v3Apparatus": disp(args.v3_apparatus) if args.v3_apparatus else None,
                          "roster": disp(args.roster) if args.roster else None},
               "rosterSize": len(roster) if roster is not None else None,
               "v3": t3, "v4": t4, "warnings": warnings}
        try:
            with open(args.json, "w", encoding="utf-8") as fh:
                json.dump(out, fh, indent=2, sort_keys=True)
                fh.write("\n")
        except OSError as e:
            raise Fatal("cannot write %s: %s" % (disp(args.json), e.strerror or e))

    print("v3 file: %s" % disp(args.v3))
    if args.v3_apparatus:
        print("v3 apparatus file: %s" % disp(args.v3_apparatus))
    print("v4 file: %s" % disp(args.v4))
    if args.roster:
        print("roster: %s  (%d rigs)" % (disp(args.roster), len(roster)))
    if args.json:
        print("json: %s" % disp(args.json))
    print()
    print_side("v3", t3)
    print()
    print_side("v4", t4, ["tombstones skipped=%d" % v4["tomb"],
                          "distinct lastWriteAt values=%d (live rows without one: %d)"
                          % (len(v4["stamps"]), v4["nostamp"])])
    section("MISSING IN V4", missing, lambda k: "%s: v3 %d" % (label(k), a[k]))
    section("EXTRA IN V4", extra, lambda k: "%s: v4 %d" % (label(k), b[k]))
    section("QUANTITY DIFFERS", qdiff, lambda k: "%s: %d -> %d" % (label(k), a[k], b[k]))
    section("MALFORMED ROWS (kept out of the join)", malformed, lambda m: "%s %s: %s" % m)
    section("DUPLICATES MERGED DIFFER (split or double import)", dups,
            lambda d: "v3 duplicatesMerged=%d, v4 duplicatesMerged=%d" % d)
    if any(x is not None for x in (args.expect_lines, args.expect_units, args.expect_rows)):
        section("EXPECTATIONS (v4 side)", expect, lambda e: "%s: expected %d, v4 has %d" % e)
    if args.roster:
        section("ROSTER (rig minted by import / name mismatch)", viol, lambda v: v)
    if empty3:
        section("EMPTY V3 SIDE", empty3, lambda m: m)
    if warnings:
        section("WARNINGS", warnings, lambda w: w)
    print("\nDIFFS: %d" % n)
    return 0 if n == 0 else 1


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog="compare.py", description="Compare a v3 inventory with a v4 inventory (exit 0 only on an exact match).")
    ap.add_argument("--v3", required=True, help="v3 dump / department node / bare inventory map (JSON)")
    ap.add_argument("--dept", default="hfd217", help="department id for a full v3 dump (default hfd217)")
    ap.add_argument("--v3-apparatus", metavar="FILE", help="v3 apparatus map (push-id -> {name,type})")
    ap.add_argument("--v4", required=True, help="v4 REST map or Dexie array (JSON)")
    ap.add_argument("--json", metavar="OUT", help="also write the result as JSON")
    ap.add_argument("--expect-lines", type=int, metavar="N", help="v4 must have exactly N distinct lines")
    ap.add_argument("--expect-units", type=int, metavar="N", help="v4 must have exactly N units in total")
    ap.add_argument("--expect-rows", type=int, metavar="N", help="v4 must have exactly N live counted rows")
    ap.add_argument("--roster", metavar="FILE",
                    help="pre-import roster ({lastWriteAt,value:[{id,name,type}]} or a bare array); every v4 row "
                         "must use a roster apparatusId whose name equals row.apparatus")
    ap.add_argument("--allow-empty", action="store_true",
                    help="do not count an empty v3 side (no rows) as a diff")
    return run(ap.parse_args(argv))


if __name__ == "__main__":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(errors="backslashreplace")
        code = main()
    except SystemExit:
        raise
    except Fatal as e:
        sys.stderr.write("error: %s\n" % e)
        code = 2
    except Exception as e:                      # a crash must never read as "diffs found" (exit 1)
        sys.stderr.write("error: unexpected %s: %s\n" % (type(e).__name__, e))
        code = 2
    sys.exit(code)

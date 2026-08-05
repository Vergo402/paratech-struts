# Paratech Rescue Struts — Complete Reference

> **Purpose:** Data source for a strut selection program. Input a required length and load, get recommended strut + extension combinations.
>
> **Data gaps are marked with `[TBD]`.** Verify against your physical copies of the Paratech Operation & Maintenance Manual and the 2025 Paratech Catalog.

---

## Color Coding System

| Color | Strut System | Tube Diameter | Shaft Diameter | Thread Type |
|-------|-------------|---------------|----------------|-------------|
| **Grey** | AcmeThread | 3" (7.62 cm) | 2.5" | Acme square thread |
| **Gold** | LongShore | 3.5" (8.89 cm) | 3" | Square thread |
| *(Black)* | LockStroke | 3" (7.62 cm) | 2.5" | Grooved (ball-bearing lock) |
| *(Hybrid)* | HydraFusion | 3.5" (8.89 cm) | 3" | Hydraulic + AcmeThread collar |

- **Grey (AcmeThread):** Lighter duty, smaller diameter. Manual or pneumatic extension with Acme threaded locking collar.
- **Gold (LongShore):** Heavy duty, larger diameter. Same pneumatic capability, higher load capacity, longer reach. Hard-coat anodized finish, knurled locking collar.
- **LockStroke:** Auto-locking ball-bearing collar. Same 3" tube as AcmeThread, shares extensions. Non-reversible extension (must release collar to retract).
- **HydraFusion:** Hydraulic lift + LongShore-style shoring. Dual Shaft End Adapter compatible with LongShore, LockStroke, or AcmeThread extensions.

All struts can extend pneumatically (air, CO2, or nitrogen) except the AcmeThread 12-15" model (manual only). All default to the locked position.

---

## AcmeThread Struts (Grey)

3" diameter aluminum tube, 2.5" Acme threaded aluminum shaft.

| Model | Part Number | Collapsed | Extended | Stroke |
|-------|------------|-----------|----------|--------|
| AT 12-15 | 22-796200 | 12" | 15" | 3" |
| AT 19-25 | 22-796202 | 19" | 25" | 6" |
| AT 25-36 | 22-796204 | 25" | 36" | 11" |
| AT 37-58 | 22-796206 | 37" | 58" | 21" |
| AT 56-88 | 22-796208 | 56" | 88" | 32" |

> **Note:** AT 12-15 is manual-only (no pneumatic). All others have recessed air nipple for pneumatic extension.
> **Note:** Part numbers above follow the standard 22-7962xx pattern. Verify exact part numbers against catalog. `[TBD - verify]`

### AcmeThread / LockStroke Extensions

These extensions attach to the solid shaft end of any AcmeThread or LockStroke strut.

| Extension | Part Number | Length |
|-----------|------------|--------|
| Strut Extension 06 | 22-796006 | 6" (15 cm) |
| Strut Extension 12 | 22-796012 | 12" (30 cm) |
| Strut Extension 24 | 22-796024 | 24" (61 cm) |
| Strut Extension 36 | 22-796036 | 36" (91 cm) |

---

## LongShore Struts (Gold)

3.5" diameter aluminum alloy tube, 3" threaded aluminum shaft. Hard-coat anodized, non-sparking brass fittings.

| Model | Part Number | Collapsed | Extended | Stroke |
|-------|------------|-----------|----------|--------|
| LS 203 | 22-796710 | 26" | 36" | 10" |
| LS 304 | 22-796720 | 36" | 50" | 14" |
| LS 406 | 22-796730 | 48" | 73" | 25" |
| LS 610 | 22-796360 | 72" | 116" | 44" |
| LS 1016 | 22-796390 | 114" | 198" | 84" |

> **Model naming:** The numbers (e.g. "610") represent the approximate range in feet (6-10 ft).

> **LS 812 (92"–147") is NOT a stocked size — do not re-add it to this table.**
> An older brochure/part-number trail (22-796370, 53 lb) and a Fire Apparatus
> Magazine article list a sixth 92–147" LongShore. Paratech's **live website** and
> **Product Catalog v.19** both list the line as exactly the five sizes above, and
> those current sources outrank the older ones. v3 removed LS 812 in **v3.22.3**
> (2026-07-03); v4 followed on **2026-07-28** (Phase J gate #256/#260). Carrying it
> let the strut finder recommend equipment no rig stocks. A department that does own
> one tracks it as external equipment. Pinned absent by `src/core/load/struts.test.ts`;
> full reasoning in the header comment of `src/core/load/struts.ts`.

### LongShore Extensions

These extensions attach to the solid shaft end of any LongShore strut. **Not interchangeable with AcmeThread/LockStroke extensions** (different diameter).

| Extension | Part Number | Length |
|-----------|------------|--------|
| LS Extension 135 | 22-7963`[TBD]` | 12" (30.5 cm) |
| LS Extension 235 | 22-7963`[TBD]` | 24" (61 cm) |
| LS Extension 435 | 22-7963`[TBD]` | 48" (122 cm) |
| LS Extension 635 | 22-7963`[TBD]` | 67" (170 cm) |

Additional accessory: **Strut Converter** (22-796037) — adapts LongShore extensions to AcmeThread/LockStroke struts.

### LongShore Adjustable Braces

| Brace | Range |
|-------|-------|
| Short Brace | 26-36" |
| Long Brace | 60-85" |

---

## LockStroke Struts

3" diameter aluminum tube, 2.5" grooved aluminum shaft. Ball-bearing filled auto-locking collar.

| Model | Part Number | Collapsed | Extended | Stroke |
|-------|------------|-----------|----------|--------|
| LS 19-25 | 22-796006 | 19" | 25" | 6" |
| LS 25-36 | 22-796000 | 25" | 36" | 11" |
| LS 37-58 | 22-796002 | 37" | 58" | 21" |
| LS 55-89 | 22-796004 | 55" | 89" | 34" |

> Uses the same extensions as AcmeThread struts (6", 12", 24", 36").

---

## HydraFusion Struts

3.5" diameter aluminum tube, 3" threaded shaft. Hydraulic lift with AcmeThread collar for shoring lock. Compatible with LongShore, LockStroke, and AcmeThread extensions via Dual Shaft End Adapter.

| Model | Part Number | Stroke | Lift Height |
|-------|------------|--------|-------------|
| HFS 04 | 22-79HA04 | 4" (10.2 cm) | ~4" |
| HFS 10 | 22-79HA10 | 10" (25.4 cm) | ~10" |
| HFS 16 | 22-79HA16 | 15.9" (40.4 cm) | ~15.9" |

**Capacities:**
- **Lift:** 10 US tons (20,000 lbs) with 2:1 safety factor
- **Shore:** 20,000 lbs with 4:1 safety factor

**Pump:** Hand-operated, dual-stage single action, up to 10,000 psi, 10-foot non-conductive hose with quick-connect.

> Maximum lift height is slightly more than maximum stabilizing height to prevent system lockout.

---

## Load Capacity Tables

### AcmeThread (Grey) / LockStroke — Working Load (lbs)

| Total Length | 2:1 Safety Factor | 3:1 Safety Factor | 4:1 Safety Factor |
|-------------|-------------------|-------------------|-------------------|
| 2 ft (24") | 43,500 | 29,000 | 21,750 |
| 4 ft (48") | 40,000 | 26,667 | 20,000 |
| 6 ft (72") | 28,250 | 18,830 | 14,125 |
| 8 ft (96") | 24,050 | 16,030 | 12,025 |
| 10 ft (120") | 10,725 | 7,150 | 5,360 |
| 12 ft (144") | 7,660 | 5,000 | 3,830 |

> Ultimate load = 2:1 value x 2. Example: at 4ft, ultimate load is 80,000 lbs.

### LongShore (Gold) / HydraFusion — Working Load (lbs)

| Total Length | 2:1 Safety Factor | 3:1 Safety Factor | 4:1 Safety Factor |
|-------------|-------------------|-------------------|-------------------|
| 2-7 ft (24-84") | 44,000 | 29,333 | 22,000 |
| 8 ft (96") | 40,000 | 26,666 | 20,000 |
| 10 ft (120") | 24,000 | 16,000 | 12,000 |
| 12 ft (144") | 20,000 | 13,333 | 10,000 |
| 16 ft (192") | 6,000 | 4,000 | 3,000 |

> LongShore maintains full 44,000 lb capacity from 2-7 ft — significant advantage over AcmeThread which begins dropping at 4 ft.

---

## Selection Logic (for Program Design)

### Input Parameters
1. **Required distance** (inches) — the gap to span
2. **Estimated load** (lbs) — the weight to support
3. **Safety factor** (2:1, 3:1, or 4:1) — default to 4:1 for rescue operations

### Step 1: Find Struts That Cover the Distance

For each strut system (AcmeThread, LongShore, LockStroke):
- Check if `collapsed <= required_distance <= extended`
- If yes, the strut alone covers the distance

### Step 2: Try Strut + Extension Combinations

If no single strut covers the distance:
- For each strut, calculate `max_reach = extended + sum(extension_lengths)`
- Try combinations of extensions (prefer fewer extensions)
- The effective collapsed length with extensions = `strut_collapsed + extension_length`
- The effective extended length with extensions = `strut_extended + extension_length`

**AcmeThread/LockStroke extension combos:** 6", 12", 24", 36" (can stack multiples)
**LongShore extension combos:** 12", 24", 48", 67" (can stack multiples)

### Step 3: Check Load Capacity

Using the load capacity tables above:
- Determine total length of strut assembly (strut + extensions) at the required distance
- Interpolate between table values if needed
- Verify `load_capacity_at_length >= estimated_load` at the selected safety factor

### Step 4: Rank and Recommend

Priority order:
1. Fewest components (strut alone > strut + 1 extension > strut + 2 extensions)
2. Lightest total weight
3. Highest remaining load capacity margin
4. Gold (LongShore) preferred over Grey (AcmeThread) for loads > 20,000 lbs at length

### Example

**Input:** 100" distance, 15,000 lbs load, 4:1 safety factor

**AcmeThread options:**
- AT 56-88 alone: max 88" — too short
- AT 56-88 + 12" extension: 56-100" range — covers it! Load at ~8ft: 12,025 lbs (4:1) — **NOT ENOUGH**
- AT 56-88 + 12" extension at 2:1: 24,050 lbs — sufficient but lower safety

**LongShore options:**
- LS 610: 72-116" — covers 100" directly! Load at ~8ft: 20,000 lbs (4:1) — **SUFFICIENT**

**Recommendation:** LS 610 (Gold LongShore, 72-116"), no extensions needed. Load capacity 20,000 lbs at 4:1 with 5,000 lbs margin.

---

## Data Gaps to Verify

The following values could not be confirmed from online sources and should be verified against the physical Paratech Operation & Maintenance Manual or 2025 catalog:

- [ ] AcmeThread exact part numbers (22-7962xx pattern assumed)
- [ ] LongShore extension exact part numbers
- [x] ~~LongShore LS 812 part number~~ — **closed 2026-07-28: LS 812 is not a current
  size.** Resolved against the live Paratech site + Product Catalog v.19 (five sizes),
  which outrank the older brochure/magazine trail. Removed from the catalog in both
  apps; do not reopen this line item on the strength of the 22-796370 part number.
- [ ] LockStroke load capacity table (assumed same as AcmeThread — verify)
- [ ] HydraFusion collapsed/extended lengths (only stroke confirmed)
- [ ] Whether load tables apply to strut+extension combos the same as bare struts
- [ ] Maximum number of extensions that can be stacked on one strut
- [ ] Low Clearance strut specifications (mentioned in manual title but no specs found)

---

## Sources

- [Paratech Structural Shoring](https://paratech.com/products/structural/structural-shoring/) — load capacity tables, model listings
- [Air One Equipment — Paratech Shoring](https://www.aoe.net/product/paratech-structural-shoring/) — load capacity tables, part numbers
- [Feldfire — AcmeThread Strut](https://www.feldfire.com/Paratech-Acmethread-Strut_p_10559.html) — AcmeThread sizes and weights
- [Feldfire — LongShore Extensions](https://www.feldfire.com/Paratech-Longshore-Struts-Extension_p_10563.html) — extension weights
- ~~[Feldfire — LongShore 812](https://www.feldfire.com/Paratech-Longshore-Strut-812_p_10397.html)~~ — **superseded** (see the LS 812 note under LongShore Struts); a dealer listing for a discontinued size, outranked by the live Paratech lineup + Catalog v.19
- [Fire Apparatus Magazine — Strut Systems](https://www.fireapparatusmagazine.com/magazine/strut-systems-versatility-enhances-technical-rescue-equipment-caches/) — color coding, model ranges
- [Curtis — HydraFusion Kit](https://lncurtis.com/paratech-hydrafusion-strut-kit/) — HydraFusion specs
- [ManualsLib — HydraFusion Manual](https://www.manualslib.com/manual/3423985/Paratech-22-79ha04k.html) — HFS stroke/weight specs
- [NAFECO — Strut Extension 36"](https://nafeco.com/products/paratech-strut-extension/22-796036) — extension part number
- Paratech Operation & Maintenance Manual (PDF) — `[user-provided, blocked from web fetch]`
- Paratech HydraFusion Manual (PDF) — `[user-provided, blocked from web fetch]`

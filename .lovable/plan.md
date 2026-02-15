

# Enterprise-Grade NSPIRE Compliance Module -- Full Implementation Plan

## Current State Assessment

The existing implementation has a solid foundation but covers roughly **30% of what the book requires**. Here is what exists today vs. what the book mandates:

| Area | Current | Book Requirement |
|------|---------|-----------------|
| Outside defects | 10 items | ~35+ inspectable items |
| Inside defects | 8 items | ~45+ inspectable items |
| Unit defects | 13 items | ~55+ inspectable items |
| Severity levels | 3 (severe/moderate/low) | 4 (severe-LT/severe/moderate/low) |
| Scoring engine | None | Full weighted scoring with sample size calc |
| Point values per defect | None | Per-defect point deductions from book |
| HUD sample size table | None | Required for accurate scoring |
| Priority Pyramid | None | 12-tier ranking system |
| Seasonal HVAC rules | None | Oct 1-Mar 31 heating / Apr 1-Sep 30 cooling |
| GFCI 6-foot rule hints | None | Detailed exemption logic |
| Smoke/CO detector placement | Basic | Detailed placement rules per room |
| Fire door logic | None | Tag-based inference rules |
| Duplicate defect deduction | None | Only 1 deduction per defect type per unit |
| Unit Performance Score | None | Separate score; >=30 = auto-fail |
| 3-year retention | Mentioned in UI | Not enforced in DB |
| Proof of repair | Basic | Required only for Severe/LT defects |
| Unscored items (Smoke/CO) | Treated as scored | Must be unscored H&S items with 24hr fix |
| Regulatory hints per item | None | Detailed inspector guidance from book |

---

## Phase 1: Life-Threatening Severity + Database Schema

**Goal**: Add the "Life-Threatening" (LT) sub-category and point-value columns to support the scoring engine.

### Database Migration

1. Add `life_threatening` (boolean, default false) column to the `defects` table -- LT is a sub-type of "severe" that scores differently and triggers emergency protocols
2. Add `point_value` (numeric, nullable) column to the `defects` table -- stores the calculated point deduction for this specific defect instance
3. Add `nspire_score` (numeric, nullable) and `unit_performance_score` (numeric, nullable) columns to the `inspections` table for computed scores
4. Add a `data_retention_until` (date) column to `inspections` -- auto-set to inspection_date + 3 years via trigger
5. Create a `nspire_scoring_weights` reference table to store the 12 defect category weights from the book (page 2)
6. Create a `hud_sample_size` reference table with the unit-count-to-sample-size mapping from the book

### Code Changes

- Update `src/types/modules.ts` to add `life_threatening` flag to `InspectionDefect`
- Update `src/components/ui/severity-badge.tsx` to show "LT" indicator on severe+LT defects
- Update `src/hooks/useDefects.ts` to include `life_threatening` and `point_value` in queries

---

## Phase 2: Complete Defect Catalog Expansion (80+ Items)

**Goal**: Expand `src/data/nspire-catalog.ts` to match every inspectable item from the book with exact conditions, severity levels, point values, and regulatory hints.

### Outside Defects (expand from 10 to ~35 items)

Add all missing items from the book pages 3-11:
- Litter (small items / large items)
- Garage doors
- General hardware/surface damage
- Electrical enclosures, outlets/switches, GFCI/AFCI
- Electrical wires/conductors (unshielded, open breaker, missing knockout, missing covers)
- Chimney/fireplace
- Egress (obstructed exits, exit signs, fire escapes)
- Fire extinguisher (expired, missing, blocked)
- Flammable/combustible items
- Sprinkler assembly (75% blockage rule, corrosion, escutcheon)
- Guardrails (30-inch rule, height requirements)
- Infestation (evidence vs. extensive)
- Sharp edges (within normal path of travel)
- Wall covering (penetrating holes, structural failure, peeling paint)
- Leaks and wastewater (hose bib, sewer cleanout, gas/oil)
- Lighting (missing, not secure)
- Site drainage
- Handrails (4+ risers, ramp rules, 28-42 inch height)
- Parking lot / roads (4-inch pothole rule)
- Walks and ramps (clear path of travel)
- Steps (tread, nosing 1" deep / 4" wide, stringer)
- Trip hazards (3/4 inch vertical, 2-inch horizontal)
- Address and signage
- Dryer vent (clogged = severe)
- Retaining walls (24-inch minimum)
- Erosion (footer exposure)
- Security fencing (48-inch, lockable)
- Guttering/downspouts
- Roofing material (25sf threshold)
- Soffit/fascia
- Foundation/structural defects
- Lead-based paint (pre-1978)

### Inside Defects (expand from 8 to ~45 items)

Add all missing items from pages 12-23:
- Bath ventilation, cabinets, countertops
- Dryer vent (non-metal duct = severe, improvised filter = severe)
- Grab bars, refrigerator, kitchen ventilation
- Range/oven (burner rules, microwave as primary)
- Tub/shower hardware (diverter, drain, discoloration rules)
- Sink (stopper, leak, won't hold water)
- Toilet (running, base loose, doesn't flush)
- Doors: general, fire-rated (manufacturer docs), secondary entry
- Electrical enclosures, outlets/switches, GFCI
- Conductors/wires (all severe sub-conditions with point values)
- Floor drain, HVAC (seasonal rules with date ranges)
- Leaks and wastewater, light fixtures, water heater (TPR rules)
- Foundation/basement, stairs/steps, elevator
- Litter, structural defects, trash chute
- Windows, guardrails, handrails
- Infestation, lead-based paint, mold-like substance
- Sharp edges, trip hazards, ceilings, walls
- Carbon monoxide detector, smoke detector (unscored)
- Exit signs, fire escapes, fire extinguisher
- Flammable items, sprinkler assembly, auxiliary lights, call-for-aid

### Unit Defects (expand from 13 to ~55 items)

Add all missing items from pages 24-35:
- All items from Inside that also apply to Unit (most do)
- Dryer vent (condensing dryer exemption)
- Egress (sleeping rooms need 2 points of egress)
- Fire extinguisher (not required unless prior installation evidence)
- HVAC with 64-degree LT threshold
- CO detector (fuel-fired appliance rule, attached garage rule)
- Smoke detector (per bedroom, 21ft rule, 4/12 inch mounting, 3ft/10ft clearance rules)
- Stairs, structural defects, windows
- All point values from the book tables

### Data Structure Enhancement

Each catalog item will be enhanced with:
```typescript
interface DefectItem {
  // ... existing fields
  pointValue: {
    outside: number | null;
    inside: number | null;
    unit: number | null;
  };
  isLifeThreatening: boolean;
  isUnscored: boolean;  // Smoke/CO detectors
  regulatoryHint: string;  // Inspector guidance from the book
  conditionalRules?: {
    type: 'seasonal' | 'proximity' | 'structural' | 'pre1978';
    description: string;
  }[];
}
```

---

## Phase 3: NSPIRE Scoring Engine

**Goal**: Implement the complete HUD scoring logic from pages 2 and 18 of the book.

### New file: `src/lib/nspire-scoring.ts`

1. **HUD Sample Size Calculator**
   - Input: total units in property
   - Output: sample size from the book's lookup table (page 2)
   - Covers 1 unit through 921+ units

2. **Point Deduction Calculator**
   - 12 defect categories, each with a "weight" value
   - Point loss = Weight / Sample Size
   - Duplicate defect deduplication: same defect type in same unit counts once

3. **Property Score Calculator**
   - Start at 100 points
   - Subtract cumulative point deductions across Outside, Inside, and Unit areas
   - No caps on any area (unlike old UPCS)

4. **Unit Performance Score Calculator**
   - Separate score: cumulative unit defect points across all inspected units
   - If >= 30 points, the entire inspection is an automatic failure regardless of overall score

5. **Priority Pyramid Ranking** (page 34)
   - 12-tier system from highest to lowest impact:
     1. Unit | Severe-LT (highest impact)
     2. Inside | Severe-LT
     3. Outside | Severe-LT
     4. Unit | Severe
     5. Inside | Severe
     6. Outside | Severe
     7. Unit | Moderate
     8. Inside | Moderate
     9. Outside | Moderate
     10. Unit | Low
     11. Inside | Low
     12. Outside | Low (lowest impact)

### New hook: `src/hooks/useNspireScoring.ts`

- `usePropertyScore(propertyId)` -- computes real-time score
- `useUnitPerformanceScore(propertyId)` -- computes UPS with auto-fail detection
- `useSampleSize(propertyId)` -- returns HUD sample size

---

## Phase 4: Enhanced Inspection Wizard

**Goal**: Upgrade the wizard with regulatory intelligence from the book.

### Regulatory Hints System

Add contextual guidance that appears when inspecting each item:
- GFCI: "Required within 6 feet of water source. Exemptions: dedicated appliance outlets, below-counter cabinet outlets, outlets technically in a different room"
- Handrails: "Required for 4+ risers. Must be 28-42 inches tall, graspable, continuous from top to bottom riser. Two rails required for ramps >72 inches or >6 inch rise"
- Fire extinguisher: "Non-chargeable units valid for 12 years from manufacturer date"
- Smoke detectors: "Required in each bedroom, outside each bedroom within 21ft, on every level. Ceiling mount: no more than 4 inches from wall. Wall mount: 4-12 inches from ceiling. Not within 3ft of windows/doors/vents, not within 10ft of stove"
- Lead paint: "Only for properties built before 1978. All painted surfaces assumed lead. Large surfaces: >2sf per room. Small surfaces: >10% per component"

### Seasonal HVAC Logic

- Between Oct 1 - Mar 31: heating system must be inspected, must maintain 68 degrees (64 degrees = Life Threatening)
- Between Apr 1 - Sep 30: cooling system must be inspected
- The wizard auto-detects the current date and shows the correct HVAC inspection fields

### Photo Proof Enforcement

- Severe and LT defects: photo upload is mandatory (cannot submit without)
- Moderate and Low: photo upload is optional but recommended
- Visual indicator showing "Proof required for HUD compliance"

### Life-Threatening Toggle

- When severity is set to "Severe", show a toggle: "Is this Life-Threatening?"
- LT examples auto-suggested based on catalog item (e.g., gas leak, structural collapse risk, 64-degree temperature)

### Unscored Items Handling

- Smoke detectors and CO detectors are flagged as "Unscored H&S" 
- They still generate 24-hour work orders but do not affect the REAC score
- Visual distinction in the UI (different badge color)

---

## Phase 5: Compliance Dashboard + Scoring Display

**Goal**: Add scoring visualization and compliance readiness tracking.

### Updates to `InspectionsDashboard.tsx`

1. **Property REAC Score Card**
   - Large circular gauge showing current estimated score (0-100)
   - Color coding: green (>80), yellow (60-80), red (<60)
   - Unit Performance Score with auto-fail warning if approaching 30

2. **Priority Pyramid Visual**
   - Interactive pyramid showing defect counts at each of the 12 tiers
   - Click a tier to see the specific defects

3. **Scoring Breakdown Table**
   - 12 defect categories with weight, sample size, and calculated point loss
   - Per-category drill-down

4. **3-Year Retention Tracker**
   - Visual timeline showing inspection data retention status
   - Warning when approaching retention expiry

5. **HUD Readiness Checklist**
   - Pre-inspection checklist based on common fail points from the book
   - Smoke/CO detector compliance status per unit
   - GFCI compliance status
   - Guardrail/handrail compliance status

### Updates to Area-specific pages

- Each inspection area page (Outside, Inside, Unit) shows its contribution to the overall score
- Defect list enhanced with point value column

---

## Phase 6: Duplicate Defect Deduction Logic

**Goal**: Implement the NSPIRE rule that duplicate defects only count once.

Per the book (page 18): "If bedroom 1 and bedroom 2 are both missing outlet covers, the points will be deducted only once for that unit. If an Outside tripping hazard was recorded in front of Unit 1 and another in front of Unit 3, points deducted only one time."

### Implementation

- In `nspire-scoring.ts`, group defects by `nspire_item_id` per unit (for unit defects) or per property (for outside/inside)
- Only count the first occurrence for point deduction
- Show "duplicate (not scored)" badge on subsequent occurrences in the UI
- The defect is still recorded for tracking/repair purposes

---

## Phase 7: Enhanced Reporting

### Printable NSPIRE Inspection Report

Update `InspectionReportDialog.tsx` to include:
- Property REAC score with breakdown
- Unit Performance Score
- Priority Pyramid summary
- All defects sorted by severity tier with point values
- Photo evidence for severe/LT defects
- Repair deadline tracking
- 3-year retention notice
- HUD sample size used

### Defects Analysis Report Enhancement

Update `DefectsAnalysisReport.tsx`:
- Trend analysis showing score improvement/decline over time
- Category-level analysis (which of the 12 categories are losing the most points)
- Comparison across properties

---

## Technical Implementation Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/nspire-scoring.ts` | Scoring engine (sample size, point calc, UPS, priority pyramid) |
| `src/hooks/useNspireScoring.ts` | React hooks for scoring data |
| Migration SQL | Schema changes for LT, point values, scores, retention, reference tables |

### Files to Modify
| File | Changes |
|------|---------|
| `src/data/nspire-catalog.ts` | Expand from 31 to 130+ items with point values, LT flags, regulatory hints |
| `src/types/modules.ts` | Add LT flag, point values, unscored flag, conditional rules to types |
| `src/components/inspections/InspectionWizard.tsx` | Regulatory hints, seasonal HVAC, LT toggle, photo enforcement |
| `src/components/ui/severity-badge.tsx` | LT badge variant |
| `src/hooks/useDefects.ts` | Include new columns in queries |
| `src/hooks/useInspections.ts` | Include score columns |
| `src/hooks/useInspectionStats.ts` | Add scoring statistics |
| `src/pages/inspections/InspectionsDashboard.tsx` | REAC score card, priority pyramid, HUD readiness |
| `src/pages/inspections/UnitInspections.tsx` | UPS display, enhanced catalog view |
| `src/pages/inspections/OutsideInspections.tsx` | Score contribution display |
| `src/pages/inspections/InsideInspections.tsx` | Score contribution display |
| `src/components/inspections/InspectionReportDialog.tsx` | Full NSPIRE-compliant report |
| `src/components/reports/DefectsAnalysisReport.tsx` | Scoring trend analysis |

### Implementation Order

Due to dependencies, the phases must be implemented sequentially:

1. **Phase 1** (Database) -- everything depends on the schema
2. **Phase 2** (Catalog) -- the wizard and scoring need the full catalog
3. **Phase 3** (Scoring Engine) -- dashboard and reports need scoring
4. **Phase 4** (Wizard Enhancement) -- needs catalog + schema
5. **Phase 5** (Dashboard) -- needs scoring engine
6. **Phase 6** (Duplicate Logic) -- refinement of scoring
7. **Phase 7** (Reporting) -- final layer using all previous work

Each phase will be implemented as a separate step, testing and verifying before moving to the next.


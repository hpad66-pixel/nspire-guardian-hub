# Water Intelligence and Site-Photo Intelligence Implementation Plan

**Status:** Approved for implementation by the product owner  
**Prepared:** September 3, 2026  
**Scope:** Proj OS Water Intelligence and property-wide Field Accountability  
**Primary property:** Glorieta Gardens, with tenant-safe patterns reusable by every property and project

## 1. Outcome

Deliver two connected, role-aware workflows:

1. Water Intelligence must let authorized decision-makers analyze every available bill or any chosen period, understand every metric in plain English, see the evidence and math behind benchmark statements, and immediately see which billing data is missing.
2. Field Accountability must turn the 153 already-imported Glorieta site photographs—and future photo libraries—into editable, human-reviewed, actionable observations that can be summarized into a scope-of-work report without changing the original image or the photographer's testimony.

This release changes presentation, workflow, analytics, and supporting data controls. It does not alter historical source documents or silently treat AI suggestions as verified facts.

## 2. Non-negotiable operating rules

- Source bills, source photographs, and original uploader captions remain immutable evidence.
- AI output is always labeled as a draft until a person reviews or accepts it.
- Only the photograph uploader may change their own caption; an authorized administrator edits a separate review record.
- Property managers may upload new source bills and see a limited operational trend, but may not edit meter mappings, unit counts, calculated bills, benchmarks, or executive analysis.
- Administrators and platform super administrators retain the full Water Intelligence workspace.
- Every query remains tenant- and project/property-scoped. Database row-level security remains authoritative.
- Benchmark statements are management comparisons, not regulatory or compliance findings.

## 3. Role and experience matrix

| Capability | Platform super admin / account admin | Property manager / operations user | Magic-link executive guest |
|---|---:|---:|---:|
| Upload bill PDFs/images | Yes | Yes | No |
| See missing-data checklist | Yes | Yes, emphasized | No |
| See simple spend/consumption trend | Yes | Yes | Yes, read-only |
| Choose all-time/preset/custom dates | Yes | Yes | Yes |
| See full KPIs, meter detail, savings, QA, ledger | Yes | No | Yes, read-only |
| Edit meter population/mapping | Yes | No | No |
| Ask analytical chat / issue instructions | Yes | No | Existing guest behavior only |
| Analyze/review all site photographs | Yes | No unless separately authorized | No |
| Edit own photo caption | Yes, for own uploads | Yes, for own uploads | Yes, for own uploads |
| Edit reviewed finding/action fields | Yes | No | No |
| Generate scope report | Yes | Read-only if shared later | Read-only if shared later |

The code will introduce an explicit `property_manager` Water Intelligence mode instead of allowing the existing `ops` mode to inherit staff controls.

## 4. Water Intelligence design

### 4.1 Date-range control

Add one shared period selector above the interactive analysis:

- **All data**: inception through the most recent bill.
- **Last 12 months**.
- **Year to date**.
- **Previous year**.
- **Custom**: inclusive start and end dates.

Behavior:

- The spend-versus-consumption chart, annual chart, service-account chart, and bill ledger use the selected period.
- The screen shows the exact included date range, bill count, account count, total spend, and gallons.
- Invalid custom ranges are blocked; empty ranges display an explanatory empty state.
- The account filter and date filter compose predictably.
- Executive KPIs that keep statutory meanings such as YTD and T12 remain labeled as such; selected-period totals are displayed beside the filter so a user never mistakes a filtered total for YTD.
- Comparison analytics retain the prior-year source rows needed for an apples-to-apples baseline while making the visible reporting period explicit.

### 4.2 Plain-English terminology

Create a reusable explanatory label/tool-tip component and Water Intelligence glossary. Explanations will be available by keyboard, touch, and mouse. Initial terms:

- **gal** — gallons.
- **gal/unit/day** — total metered gallons divided by connected units and service days.
- **GPCD** — gallons per capita per day; in this dashboard, population may be modeled until verified.
- **GC** — gallons consumed, when used as a compact chart label.
- **PD** — per day, when used as a compact chart label.
- **YTD** — January 1 through the as-of date.
- **T12** — trailing twelve months through the as-of date.
- **Estimated read** — usage estimated by the utility rather than supported by an actual meter reading.
- **Normalized baseline** — the same meter and month one year earlier, adjusted for different service-day counts.
- **Avoided gallons/cost** — the modeled difference from the matched baseline, valued using current-period water and sewer rates.
- **Water use intensity** — consumption normalized by a physical operating unit, here gallons per apartment unit per year/day.
- **Source-backed pair** and **meter mapping coverage**.

Avoid unexplained abbreviations in headings. Tooltips supplement, rather than replace, readable labels.

### 4.3 EPA / ENERGY STAR evidence and math

Replace unsupported “EPA range” language with a transparent point comparison:

- Reference: **43,600 gallons per apartment unit per year**, the multifamily median property-specific metric in the June 2023 ENERGY STAR/WaterSense *U.S. Water Use Intensity by Property Type* technical reference.
- The evidence card shows:
  - source name and publication date;
  - a link to the official technical reference;
  - the property's measured gallons;
  - connected units and measured service days;
  - the benchmark calculation `43,600 × connected units × service days ÷ 365`;
  - the numeric difference and percentage difference;
  - data-quality coverage and exclusions.
- Change “below EPA range” to “below the national multifamily median reference” because a median is a point, not a range.
- EPA's current public residential fact of **82 gallons/person/day at home** may be shown only as contextual residential information. It must not be presented as a multifamily compliance threshold.
- Remove or clearly retire the unexplained 58.6/36.7 GPCD comparison from the UI unless the exact underlying source and population basis are displayed. The product's primary property comparison will use the documented multifamily per-unit median.

Official source records:

- ENERGY STAR / WaterSense, *U.S. Water Use Intensity by Property Type*, June 2023: https://www.energystar.gov/sites/default/files/tools/National%20WUI%20Technical%20Reference%202023_0719b.pdf
- EPA WaterSense, *Statistics and Facts* (context only): https://www.epa.gov/watersense/statistics-and-facts

### 4.4 Missing-data control center

Derive a deterministic checklist from the actual account and bill ledger:

- latest complete property billing month;
- service accounts missing that cycle;
- missing monthly cycles within the available history;
- statements without source documents;
- estimated readings that need replacement with actual statements;
- accounts missing meter number, connected units, occupied units, resident count, or verified mapping;
- the next expected cycle and whether it is due/upcoming based on observed monthly cadence.

Each item states what is missing, which account/building it concerns, why it matters, and the appropriate next action. The checklist is computed from stored records; no AI is needed for completeness decisions.

### 4.5 Property-manager dashboard

Build a calm, mobile-first upload workspace containing only:

- property and “what to do next” heading;
- missing-data checklist, with the highest-priority upload first;
- large drag/drop and phone file-upload target;
- account auto-match progress and per-file success/failure feedback;
- a simple spend and consumption trend with date selector;
- a compact recent-upload history.

Do not render executive savings claims, meter-configuration forms, full ledger editing, account diagnostics, internal QA, notes, or chat in this mode.

## 5. Site-photo intelligence design

### 5.1 Existing library baseline

The imported archive contains **153 photographs**, IMG_1209 through IMG_1361, captured August 31, 2026 and already assigned to the dedicated property-wide **Glorieta Gardens — Site Accountability** project. They must remain there rather than under the sewer-extension project.

The existing intake assessment groups all 153 files into ten field-condition ranges. This release will preserve those starting observations and make every photograph individually reviewable. The UI will display the actual database count rather than a hard-coded user estimate.

### 5.2 Review data model

Add review fields to the project-photo link, separate from the original `photos.caption`:

- `ai_status`: not analyzed, queued, analyzing, drafted, failed.
- `review_status`: unreviewed, AI drafted, needs clarification, confirmed.
- reviewed category and severity.
- plain-English observed condition.
- recommended action / scope requirement.
- location clarification.
- reviewer, review date, and analysis timestamp/model metadata.

All review changes are auditable. The original file, EXIF, GPS, uploader, and caption remain unchanged.

### 5.3 Analyze-all workflow

Add a library-level **Analyze all photos** action:

- processes only pending/failed photos by default, with an explicit reanalyze choice;
- uses a small concurrency queue to protect the AI service and browser;
- persists each result immediately so the run is resumable;
- shows analyzed, remaining, failed, and confirmed counts;
- allows cancellation without losing completed results;
- provides retry for failed images;
- never auto-confirms a finding.

For the existing 153-photo import, the already-prepared range assessment becomes the starting draft for every included photo. Image-level AI analysis can then refine each draft through the same Analyze All control.

### 5.4 Photo review interface

Add a **Photo intelligence** workspace beside the accountability board:

- gallery/list toggle and responsive card grid;
- filters for review status, category, severity, location, accountability item, and text;
- image viewer with zoom, GPS/time, annotations, uploader caption, AI draft, and administrator review fields;
- clear `Observed`, `Needs clarification`, and `Recommended action` language;
- voice/type/polish support for the uploader's own caption;
- fast next/previous navigation and review/confirm action;
- explicit indication of which words came from the uploader, AI, and reviewer.

The user may correct the review narrative/action for any project photo they are authorized to manage. They may only edit the original caption when they uploaded the photograph.

### 5.5 Deterministic scope report

Add **Generate scope report** using current stored and reviewed data:

- property/project, source visit/date range, and generation timestamp;
- total photos, reviewed/confirmed/pending counts;
- issue counts by category, severity, status, location, and ball-in-court;
- grouped actionable scope items with responsible party and supporting photo count;
- unresolved clarification questions;
- representative evidence thumbnails/identifiers;
- explicit distinction between confirmed facts and AI-drafted observations;
- print/PDF-ready presentation.

Confirmed review fields are used first. AI drafts may be included only in a separately labeled “Draft observations requiring review” section. Report generation does not change item status or approve findings.

## 6. Security and permissions

- Add database functions/policies for authorized staff review updates; do not rely solely on hidden UI controls.
- Require authentication for AI analysis and verify the caller can access the photograph's project.
- Preserve owner-portal visibility rules and uploader-only caption updates.
- Disallow property-manager mutation of water accounts and bill rows at the database permission layer wherever the existing schema supports role checks; the UI must never offer those controls.
- No cross-tenant bulk analysis or reporting.

## 7. Technical delivery sequence

1. Add water period-filter, glossary, benchmark-evidence, and missing-data utilities with unit tests.
2. Refactor Water Intelligence into full/executive and property-manager presentations using shared source data.
3. Add date filters and selected-period summaries to charts and ledger.
4. Add photo review schema/RLS/RPC migration and TypeScript types/hooks.
5. Add photo review workspace, resumable Analyze All, editing, filtering, and progress.
6. Add deterministic scope-report builder and print/download UI.
7. Backfill the 153 imported photos with their existing documented starting assessments.
8. Run lint/typecheck/unit tests and production build.
9. Apply migrations and deploy edge functions/site through the repository's established deployment path.
10. Verify live role behavior, historical range filtering, benchmark disclosure, actual photo count, review save, batch progress, and report output.

## 8. Acceptance criteria

### Water

- A user can switch between All Data, T12, YTD, previous year, and any valid custom dates.
- Spend/consumption and ledger visibly respond to both date and account filters.
- Selected-period dollars, gallons, bills, and included dates are displayed.
- Every acronym/technical metric has a touch- and keyboard-accessible plain-English explanation.
- The benchmark card proves the comparison with visible inputs, formula, difference, percentage, official source, and caution.
- Missing-cycle/source/reading/meter-profile data appears as an actionable checklist.
- Property managers see only upload, missing-data tasks, simple trends, and recent upload status.
- Property managers cannot reach meter-edit controls from their dashboard.

### Photographs

- The site-accountability project reports the actual 153 imported-photo baseline when the migration data is present.
- Every imported photo has a starting draft or a visible pending-analysis state.
- Analyze All is resumable, progress-aware, and does not auto-confirm.
- Authorized staff can edit category, severity, observed condition, recommended action, and review status.
- Original uploader captions remain separately owned and audited.
- Filters and mobile navigation work across the full library.
- The generated report distinguishes confirmed findings from AI drafts and summarizes actionable scope.

### Release

- Automated checks and production build pass.
- Changes are committed on a focused branch, pushed to GitHub, merged through the repository's required process, and deployed.
- The live URL is smoke-tested after deployment.

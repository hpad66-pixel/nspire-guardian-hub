# Water Intelligence — Meter Normalization and Savings Method

## Objective

Turn the water ledger into an owner-grade performance system that answers four questions without mixing facts and assumptions:

1. How much water and money did the property use?
2. Which meter is responsible after adjusting for the number of units and people it serves?
3. What is the appropriate management reference for multifamily water performance?
4. How many gallons and dollars were avoided after an efficiency measure, using a consistent baseline?

## Data model

Every water service account stores:

- connected units;
- occupied units;
- resident count, when verified;
- the date of the occupancy count;
- meter use: indoor, mixed indoor/outdoor, outdoor, or common area;
- mapping confidence: verified, unit roster, inferred, or unmapped;
- a verification note identifying the roster, plan, field check, or other source.

The client-facing interface receives only aggregate counts. It never exposes unit or resident identities.

## Reporting period

The performance period is the trailing 12 statement months ending with the latest month containing an actual meter read. The immediately preceding 12 months form the baseline period.

Duplicate bills and estimated reads remain visible as billing exposure but are excluded from performance and savings.

## Normalized metrics

### Gallons per connected unit per day

`actual gallons ÷ connected units ÷ service days`

This is the primary meter-comparison metric because it accounts for meters serving different numbers of apartments.

### Gallons per capita per day (GPCD)

`actual gallons ÷ residents ÷ service days`

Verified resident counts are preferred. When they are unavailable, the dashboard uses a transparent planning assumption of 2.0 residents per occupied unit and labels the result **modeled**.

### Annualized cost per unit

`reporting-period charges ÷ connected units × 365 ÷ service days`

### Cost per 1,000 gallons

`(water charges + sewer charges) ÷ actual gallons × 1,000`

Other fees are excluded when itemized because they may be fixed, non-volumetric, or unrelated to consumption.

## “What it should be” references

- The June 2023 ENERGY STAR/WaterSense technical reference reports a multifamily median property-specific metric of **43,600 gallons per unit per year**, equivalent to about **119.5 gallons per unit per day**.
- EPA WaterSense currently reports **82 gallons per person per day at home** as broad national residential context. Proj OS does not use that number as a multifamily threshold or compliance limit.

The dashboard uses the documented per-unit multifamily median as its primary property comparison and shows the complete calculation. It no longer presents the prior 58.6/36.7 GPCD figures as an unexplained “EPA range.” These are management references, not regulatory limits or a substitute for an ENERGY STAR Portfolio Manager Water Score. Mixed-use meters can include irrigation, common-area, construction, or process water and should be interpreted accordingly.

## Rate-normalized savings

Savings are calculated only when an actual reporting bill has an actual bill for the same meter and calendar month one year earlier.

1. Normalize the prior bill for service days:
   `expected gallons = prior-year gallons × current service days ÷ prior service days`
2. Calculate avoided gallons:
   `avoided gallons = expected gallons − actual gallons`
3. Calculate the reporting-period volumetric rate:
   `rate = (water charges + sewer charges) ÷ actual gallons`
4. Convert avoided gallons to dollars:
   `avoided cost = avoided gallons × reporting-period rate`

Positive values indicate avoided cost. Negative values indicate consumption-driven excess cost. Current rates are deliberately used so tariff changes are not mislabeled as operational savings.

This follows whole-meter measurement-and-verification logic consistent with DOE FEMP/IPMVP Option C concepts. Occupancy, operating changes, meter scope, and non-routine events still require documented review before a modeled result is called verified.

## Confidence rules

- **Verified:** at least 90% non-estimated coverage, at least 90% statement/source-document coverage, at least 90% matched prior-year coverage, and every active meter has a verified unit and resident count.
- **Modeled:** enough comparison data exists, but one or more meter/population inputs are roster-derived, inferred, or modeled.
- **Insufficient:** fewer than 50% of expected meter-months have actual reads or prior-year matches.

The dashboard always displays non-estimated, source-backed comparison-pair, comparison, and meter-mapping coverage so the owner can see the strength of the conclusion. Seeded historical rows can support planning analysis but cannot produce a **Verified** label.

## Glorieta starting point

The current property roster contains 330 non-demo units. Four meter relationships are explicit in the existing service-account labels and are initialized from that roster:

- Building 3;
- Buildings 5 and 6;
- Building 7;
- Building 8.

The remaining address-based meter relationships are intentionally left unmapped. An administrator must verify the served buildings or unit ranges rather than allowing the software to guess. The dashboard retains all gallons and dollars for those meters while leaving their per-unit and per-capita values blank.

## Authoritative references

- [EPA WaterSense at Work — Benchmarking](https://www.epa.gov/system/files/documents/2024-03/ws-commercial-bmp-watersenseatwork_section2.3_benchmarking.pdf)
- [ENERGY STAR/WaterSense — U.S. Water Use Intensity by Property Type (June 2023)](https://www.energystar.gov/sites/default/files/tools/National%20WUI%20Technical%20Reference%202023_0719b.pdf)
- [EPA WaterSense — Statistics and Facts](https://www.epa.gov/watersense/statistics-and-facts)
- [DOE FEMP Measurement and Verification Options](https://www.energy.gov/cmei/femp/measurement-and-verification-options-federal-energy-and-water-saving-projects)
- [DOE FEMP M&V Guidelines, Version 5.0](https://www.energy.gov/cmei/femp/articles/mv-guidelines-measurement-and-verification-performance-based-contracts-version-0)

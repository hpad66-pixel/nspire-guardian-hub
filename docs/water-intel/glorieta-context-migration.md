# Glorieta Water Analysis Context Migration

Status: internal Proj OS context record

Date: September 18, 2026

This note preserves Glorieta Gardens water billing context that was accidentally discussed in a separate C COOL task. The work belongs in Proj OS because the active application, data model, client evidence package, and generated billing deliverables are all in this repository.

## What Happened

Some Glorieta Gardens water analysis direction was routed through the wrong task context. No C COOL repository changes should be made for this work. This file records the moved context so future Proj OS work can continue from the correct repository and avoid recreating the discussion from memory.

## Correct Proj OS Location

Use these Proj OS anchors for future work:

1. `src/lib/water-intel/glorietaDispute.ts`
   Core facts, dispute model, account references, summary text, draft letter text, and application data for the Glorieta analysis.

2. `src/components/water-intel/GlorietaWaterAdvocacy.tsx`
   Client facing analysis experience, navigation, analytics panels, evidence presentation, letter view, question bank, and comment workflow.

3. `scripts/water-intel/build_glorieta_dispute_deliverables.py`
   Current PDF and Word evidence package generation for the Building 7 and Building 8 water billing analysis.

4. `docs/water-intel`
   Internal documentation home for source notes, migration records, and report scaffolds.

5. `deliverables/r4-glorieta`
   Local generated PDF, Word, and image deliverables. Large generated artifacts should be reviewed before committing.

## Context Moved Here

The Glorieta scope is a water billing analysis for R4, focused on Building 7 and Building 8. The user wants the work presented in plain English, in chronological order, with clear pre vacancy, vacancy, and post rehab comparisons. The central issue is not a broad speculative claim. The central issue is the documented water billing dispute in the order of one hundred thousand dollars, supported by billing records and fact based analysis.

Current fact anchors in the repository include:

1. Formal retroactive rebill: `$95,017.57`
2. Formal unpaid balance: `$113,874.41`
3. Building 8 indexed dispute support: `$100,386.80`
4. Indexed Building 8 gallons: `4,764,000`
5. Indexed water charges: `$39,229.56`
6. Indexed sewer charges: `$55,474.80`
7. Building 8 account: `2745714336`
8. Building 8 meter: `61302354`

The analysis must explain where each number comes from. If a number is not supported by indexed bills, it should be labeled as a source gap, not filled with an assumption.

## Letter Report Requirements

A separate APAS Consulting letter report to Chris Sullivan is needed. That report should be professional, clear, and direct. It should explain:

1. Executive summary
2. Scope of what was done
3. Key numbers and what they mean
4. Takeaways
5. Action items
6. The monthly continuation process

The monthly continuation process should say that the system is now set up, and if the Glorieta Gardens property management team sends monthly invoices, APAS can continue tracking trends, dashboard impacts, and operating effects on the bottom line.

The Chris Sullivan letter report may use APAS Consulting letterhead because the user specifically requested that for this report. Public or neutral client deliverables should not automatically use Proj OS, AI, or APAS Consulting branding unless the user requests it for that specific artifact.

## Water Application Requirements

The Proj OS Water analysis experience should continue to support:

1. A clear top graphic comparing pre vacancy, vacancy, and post rehab periods.
2. Separate Building 7 and Building 8 views where data exists.
3. Brackets or visual bands around the disputed vacancy period.
4. Chronological flow from history to dispute period to current status.
5. Plain English explanations for every metric.
6. A client safe magic link view when requested.
7. A portal connected comment or note workflow so client comments can be saved and reviewed later.
8. A city letter view that can be reviewed and edited where appropriate.
9. Email or copy ready outputs for client and agency communication.

## Boundaries

1. Do not touch the C COOL repository for Glorieta water billing work.
2. Treat Proj OS as the application and evidence system of record for this feature.
3. Do not present draft reports as final client deliverables until reviewed by the user.
4. Do not claim legal, regulatory, or agency approval.
5. Do not use unsupported claim targets or speculative amounts.
6. Keep staff private work separate from client visible views.
7. Keep neutral client facing deliverables neutral unless the user explicitly requests APAS Consulting branding.

## Open Questions

1. Confirm the exact APAS Consulting letterhead address and sender block for the Chris Sullivan report.
2. Confirm whether the final Chris Sullivan report should be generated from Markdown, HTML, or the existing Python document generator.
3. Confirm whether the client magic link should allow comments only, letter edits only, or both.
4. Confirm whether City correspondence should remain internal draft work or be editable through the external link.
5. Confirm the final review owner before any report is treated as ready to send.

## Next Development Location

Use `docs/water-intel/chris-sullivan-letter-report-draft.md` as the immediate writing scaffold for the APAS Consulting letter report. After user review, move the approved content into the chosen PDF and Word generation workflow.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — core regulatory analysis IP
// ─────────────────────────────────────────────────────────────────────────────
const REGULATORY_SYSTEM_PROMPT = `You are a senior regulatory compliance consultant and licensed Professional Engineer (P.E.) with over 30 years of direct field experience reviewing regulatory enforcement cases, inspections, compliance orders, and technical submittals across multiple regulatory domains including:

Environmental/Petroleum: FDEP (Florida Department of Environmental Protection), EPA Region 4, DERM (Miami-Dade Department of Regulatory and Economic Resources), Chapter 24 Miami-Dade County Code, FAC Chapters 62-780 (Contaminated Site Cleanup), 62-761/762 (UST compliance), BTEX/MTBE/PAH/TRPH petroleum contamination, SAR/SSAR/MOP/NFAC/ECP regulatory pathways

Building & Zoning: IBC, Florida Building Code, local municipal codes, Certificate of Occupancy, zoning variances, code enforcement liens, demolition orders

Fire & Life Safety: NFPA, local fire authority having jurisdiction (AHJ), fire inspection citations, sprinkler/suppression system compliance

Environmental/Stormwater: EPA MS4 NPDES permits, stormwater management plans, consent orders, corrective action requirements

Health & Safety: OSHA citations, abatement orders, serious/willful violations, penalty negotiation, HAZCom, PSM

HUD/Housing: HUD inspection protocols, REAC inspections, NSPIRE standards, UPCS violations, exigent health and safety deficiencies

FDA/Healthcare: FDA warning letters, 483 observations, consent decrees, corrective action plans

Local Code Enforcement: Municipal code violations, NOVs (Notice of Violation), liens, compliance schedules, code board hearings

You think and write like a senior partner who has just received the field file from a junior engineer or inspector. You know what a complete, defensible regulatory file looks like. You know what is missing from an incomplete one. You know the enforcement posture of every type of agency, and you know how to read between the lines of regulatory correspondence to assess the real risk level.

YOUR CRITICAL DISCIPLINE — FACTUAL ACCURACY:
You ONLY analyze and discuss information that appears in the uploaded documents. You do NOT fabricate dates, names, regulatory citations, lab results, measurements, deadlines, or case numbers. You do NOT generalize or speculate about what "probably" happened if it is not in the files. If a section of your analysis lacks data from the files, you explicitly state: "The uploaded files do not contain information regarding [topic]. This is a gap that should be addressed because [regulatory reason]." You clearly distinguish between: (a) facts found in the files, (b) regulatory context you are providing from expertise, and (c) gaps in the record. A reader must always know which category they are reading.

YOUR WRITING STYLE:
You write as a 30-year senior consultant who has reviewed hundreds of these cases. Your tone is direct, authoritative, and clear. You write for two audiences simultaneously: (1) the non-technical client or property owner who needs to understand what is happening and what it means for them, and (2) the engineer, attorney, or regulator who needs precise technical accuracy. When you use a regulatory term, acronym, or technical concept, you define it in plain English immediately after. You write in paragraphs and sentences, not just bullet lists. You tell the story of the case — what happened, in what order, why it matters, and what comes next. You do not hedge or soften enforcement risk; clients need to understand what they face.`;

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS PROMPT — drives the 14-section analysis
// ─────────────────────────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `You are reviewing the following regulatory case files on behalf of a client. Your job is to produce a comprehensive, factually grounded regulatory case analysis. You will analyze ONLY what is in these documents.

REGULATORY CASE FILES SUBMITTED FOR REVIEW:
{FILE_MANIFEST}

--- BEGIN CASE FILE CONTENT ---
{CASE_CONTENT}
--- END CASE FILE CONTENT ---

STEP 1 — FIRST, identify the regulatory domain(s) present in these files. Determine:
- Which regulatory agency or agencies are involved (name them specifically from the documents)
- Which regulatory code, statute, or standard governs this matter (cite the actual code sections found in the documents)
- What type of facility, property, or operation is subject to regulation
- What type of enforcement action or compliance matter this is (inspection, NOV, consent order, permit issue, etc.)
State the detected regulatory domain clearly at the beginning of your analysis.

STEP 2 — Then produce a COMPREHENSIVE CASE ANALYSIS with the following sections. For each section, work ONLY from information found in the uploaded files. When you cite a fact, it must come from a specific document. When you provide regulatory context (what a regulation requires, what an agency normally does), clearly label it as your professional expertise, not a document fact.

---

SECTION 1 — CASE & PROPERTY IDENTIFICATION
Extract from the documents: full facility/property name, physical address, parcel/folio number if present, owner name(s), operator(s), responsible party contact information, all assigned case numbers and file numbers (from every agency involved), type of facility or operation, regulatory permit numbers if any. If any of this is missing from the files, name the gap.

SECTION 2 — REGULATORY AGENCIES & KEY PERSONNEL
Identify every agency, department, and individual named in the documents: their title, role in this case, phone, email, and mailing address if present. Explain in plain English what jurisdiction each agency has and what authority they are exercising in this specific case.

SECTION 3 — COMPLETE CASE CHRONOLOGY (Year-by-Year, Event-by-Event)
Write a detailed narrative timeline of every event documented in the files. For each event: the specific date (or date range if only a range is stated), what happened, who took the action, what was required or communicated, whether deadlines were met or missed. Write this as a professional narrative that reads like a case history — not just a list. Include every letter, inspection, submittal, approval, rejection, phone call log, email, and field report that is documented. Do not omit minor events; in regulatory cases, minor events often become important later. If documents have dates missing or unclear, note this as a record-keeping gap.

SECTION 4 — WHAT THE REGULATORS HAVE FOUND
Summarize every finding documented in the files: inspection results, lab results, field measurements, photographic documentation, violation determinations, NOVs, deficiencies, citations. State the findings as documented — do not reinterpret or soften them. Explain what each finding means for the property owner or responsible party in plain language.

SECTION 5 — ENFORCEMENT ACTIONS & REGULATORY HISTORY
Summarize every formal enforcement action documented: Notices of Violation (NOVs), compliance orders, consent orders, administrative orders, fines, penalties, rejected submittals, failed inspections. For each: the specific date, issuing official, legal basis (cite the code section from the document), the violation described, and the required corrective action. Explain the legal significance of each in plain English.

SECTION 6 — SUBMITTAL HISTORY & AGENCY RESPONSES
Track every document submitted by the responsible party or their consultant and every agency response: submission dates, document titles, agency reviewers, outcomes (approved/rejected/commented). Flag every submission that was rejected or received comments and summarize the specific reasons. Track whether required submittals are overdue based on deadlines stated in the documents.

SECTION 7 — OPEN ITEMS & COMPLIANCE GAPS (MOST CRITICAL SECTION)
List EVERY requirement, comment, condition, or corrective action that appears in the documents and has NOT been demonstrably resolved based on the documents provided. For each open item:
- Source: which document, which agency, which date
- Exact requirement: quote the language from the document where possible
- Status: whether any response has been documented
- Priority: CRITICAL (triggers escalating enforcement or legal action if not addressed immediately), HIGH (required before next regulatory milestone), MEDIUM (required for eventual closure), LOW (administrative/housekeeping)
- What is needed to close this item, based on what the documents say
If there is NO documentation that an item has been addressed, it is OPEN. Do not assume it was addressed off-record.

SECTION 8 — ENFORCEMENT POSTURE & RISK ASSESSMENT
Based on the correspondence tone, the pattern of agency responses, the number of missed deadlines, and the severity of findings documented, assess:
- Is the responsible party currently in compliance or non-compliance, based strictly on the documents?
- What enforcement escalation path does this agency typically follow for this type of violation (from your professional expertise)?
- What is the realistic enforcement risk — fines, injunctions, permit revocation, mandatory remediation — if the open items are not addressed?
- What does the pattern of correspondence tell you about the agency's patience level?
Be direct and honest about risk. Do not soften this for the client.

SECTION 9 — PATH TO CLOSURE
Based on what the documents show, describe the realistic path from current status to regulatory closure:
- What specific technical deliverables are required (based on what the agency has requested in the documents)?
- What regulatory approvals or milestones are needed?
- What site conditions or monitoring results need to be demonstrated?
- What is a realistic timeline to closure, given the current state of the file?
- Are there any closure options that appear viable based on the documents?

SECTION 10 — IMMEDIATE ACTION PLAN
Specific, actionable steps in three time horizons, based strictly on what the documents demand:

WITHIN 7 DAYS:
[List specific tasks tied to documented deadlines or urgent findings. Name who should do each task.]

WITHIN 30 DAYS:
[List specific tasks. If agency deadlines are documented, reference them explicitly.]

WITHIN 60-90 DAYS:
[List specific tasks required for next regulatory milestone.]

RECURRING OBLIGATIONS:
[List any ongoing monitoring, reporting, or maintenance requirements documented in the files.]

SECTION 11 — TECHNICAL OBSERVATIONS & RECOMMENDATIONS
From a PE/professional perspective, what technical gaps, quality issues, or deficiencies do you observe in the submitted documents and data? What specific technical work needs to be done based on what the agency has requested? What quality standards (site map accuracy, PE seal requirements, lab QA/QC, chain of custody, report format) are documented as being required?

SECTION 12 — PROFESSIONAL FEE & TIMELINE ESTIMATE
Provide a realistic estimate for the remaining professional work required to bring this case to closure, based on what the documents show needs to be done. Use ranges ($X,000–$Y,000) and be transparent about assumptions and what could increase costs. Include a realistic timeline from today to regulatory closure.

SECTION 13 — STRATEGIC COMMUNICATION GUIDANCE
Based on the tone and pattern of the documented correspondence, advise the client:
- How to respond to the most recent outstanding agency communication
- Whether to request a meeting or teleconference
- How to present extension requests if needed
- What to put in writing and what to handle by phone
- Whether to involve legal counsel based on what the documents show
- What actions demonstrate good faith and reduce escalation risk

SECTION 14 — EXECUTIVE SUMMARY
Write this last, after completing all sections above. 3-4 paragraphs in plain English:
- What this case is about and what type of regulatory matter it is
- The current compliance status in plain language
- The single most important action the client must take, and when
- The realistic outcome if action is taken vs. if it is not
This section must be completely grounded in the documents. No speculation.

DOCUMENT APPENDIX: List every document reviewed, organized chronologically, with the document title/description, date, and originating party.

FINAL INSTRUCTION: After your analysis, output one line formatted exactly like this (for the system to parse):
REGULATORY_DOMAIN: [detected domain, e.g. "Environmental/Petroleum - FDEP/DERM UST Case" or "Building Code - Municipal NOV" or "OSHA - General Industry Citation"]`;

// ─────────────────────────────────────────────────────────────────────────────
// AURUM DARK REPORT PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const AURUM_REPORT_PROMPT = `Format your complete analysis as a self-contained HTML document using the APAS.AI AURUM design system. Output ONLY the HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation before or after.

CRITICAL RULE: Every fact, date, name, case number, and regulatory citation in the HTML MUST come from the analysis you just produced. Do not add, invent, or assume any information.

Use this exact HTML structure and CSS:

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[FACILITY NAME] — Regulatory Case Review | APAS.AI</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap');
:root{--gold:#C8962E;--gold-light:#E8C875;--gold-bg:rgba(200,150,46,0.08);--dark:#0D0D1A;--dark2:#141428;--dark3:#1C1C35;--slate:#8B8FA3;--text:#C8CAD4;--white:#EEEEF2;--blue:#2E6BA6;--blue-light:#4A9FD9;--green:#2E8B57;--green-light:#3CB371;--red:#C0392B;--red-light:#E74C3C;--orange:#D4782F;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--dark);color:var(--text);font-family:'DM Sans',sans-serif;line-height:1.6;}
.page{max-width:1400px;margin:0 auto;padding:40px 60px;}
.alert-banner{background:linear-gradient(135deg,rgba(192,57,43,0.2) 0%,rgba(192,57,43,0.05) 100%);border:2px solid var(--red);border-radius:12px;padding:24px 32px;margin-bottom:48px;display:flex;align-items:center;gap:24px;}
.alert-icon{font-size:36px;flex-shrink:0;}
.alert-title{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--red-light);letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;}
.alert-text{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);margin-bottom:8px;}
.alert-sub{font-size:14px;color:var(--text);}
.alert-deadline{margin-left:auto;text-align:center;background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.4);border-radius:10px;padding:16px 24px;flex-shrink:0;}
.alert-deadline-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red-light);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;}
.alert-deadline-date{font-family:'Playfair Display',serif;font-size:22px;color:var(--white);font-weight:900;}
.header{text-align:center;padding:60px 0 40px;border-bottom:1px solid rgba(200,150,46,0.2);margin-bottom:60px;}
.header-label{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);letter-spacing:4px;text-transform:uppercase;margin-bottom:20px;}
.header h1{font-family:'Playfair Display',serif;font-size:52px;color:var(--white);font-weight:900;letter-spacing:-1px;margin-bottom:16px;line-height:1.1;}
.header h1 span{color:var(--gold);}
.header-subtitle{font-family:'DM Sans',sans-serif;font-size:18px;color:var(--slate);max-width:800px;margin:0 auto 20px;line-height:1.6;}
.header-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--slate);letter-spacing:2px;}
.header-meta span{color:var(--gold);margin:0 8px;}
.section{margin-bottom:80px;}
.section-label{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;}
.section-heading{font-family:'Playfair Display',serif;font-size:32px;color:var(--white);margin-bottom:16px;}
.section-desc{font-size:15px;color:var(--slate);max-width:900px;line-height:1.7;margin-bottom:40px;}
.narrative{background:var(--dark2);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;padding:32px;margin-bottom:32px;font-size:15px;color:var(--text);line-height:1.8;}
.narrative h3{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);margin-bottom:16px;}
.narrative p{margin-bottom:14px;}
.narrative strong{color:var(--white);}
.narrative em{color:var(--gold-light);font-style:normal;}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;}
.card{background:var(--dark2);border:1px solid rgba(200,150,46,0.12);border-radius:12px;padding:28px;transition:all 0.3s ease;position:relative;overflow:hidden;}
.card:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 8px 32px rgba(200,150,46,0.12);}
.card-icon{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;}
.card h4{font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:var(--white);margin-bottom:8px;}
.card p{font-size:13px;color:var(--slate);line-height:1.65;}
.status-matrix{width:100%;border-collapse:collapse;}
.status-matrix th{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);padding:14px 20px;text-align:left;border-bottom:1px solid rgba(200,150,46,0.2);}
.status-matrix td{padding:16px 20px;font-size:13px;color:var(--text);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:top;}
.status-matrix tr:hover td{background:rgba(200,150,46,0.04);}
.status-badge{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px;white-space:nowrap;}
.badge-critical{background:rgba(192,57,43,0.2);color:var(--red-light);border:1px solid rgba(192,57,43,0.4);}
.badge-warning{background:rgba(212,120,47,0.15);color:#E8924A;border:1px solid rgba(212,120,47,0.4);}
.badge-ok{background:rgba(46,139,87,0.15);color:var(--green-light);border:1px solid rgba(46,139,87,0.4);}
.badge-pending{background:rgba(74,159,217,0.12);color:var(--blue-light);border:1px solid rgba(74,159,217,0.3);}
.deploy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;}
.deploy-card{background:var(--dark2);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;}
.deploy-card h4{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;}
.deploy-card .tier{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;}
.deploy-card ul{list-style:none;padding:0;}
.deploy-card li{font-size:13px;color:var(--text);padding:8px 0 8px 16px;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.5;position:relative;}
.deploy-card li::before{content:'→';position:absolute;left:0;color:var(--gold);}
.timeline{position:relative;padding-left:0;}
.timeline-item{display:grid;grid-template-columns:60px 1fr;gap:24px;margin-bottom:28px;}
.timeline-dot{width:40px;height:40px;border-radius:50%;border:2px solid var(--gold);background:var(--dark);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--gold);font-weight:700;flex-shrink:0;}
.timeline-content{background:var(--dark2);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;}
.timeline-date{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
.timeline-content h4{font-size:15px;font-weight:700;color:var(--white);margin-bottom:8px;}
.timeline-content p{font-size:13px;color:var(--slate);line-height:1.6;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.info-block{background:var(--dark2);border:1px solid rgba(200,150,46,0.08);border-radius:12px;padding:24px;}
.info-block h3{font-family:'Playfair Display',serif;font-size:18px;color:var(--white);margin-bottom:16px;}
.info-row{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;}
.info-row:last-child{border-bottom:none;}
.info-label{color:var(--slate);}
.info-val{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold-light);}
.domain-badge{display:inline-block;background:rgba(200,150,46,0.1);border:1px solid rgba(200,150,46,0.3);border-radius:6px;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;}
.gap-notice{background:rgba(74,159,217,0.06);border:1px solid rgba(74,159,217,0.2);border-radius:8px;padding:14px 18px;font-size:13px;color:var(--blue-light);margin:12px 0;font-style:italic;}
.gap-notice::before{content:'⚠ RECORD GAP: ';font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;display:block;margin-bottom:4px;}
.footer{text-align:center;padding:60px 0 40px;border-top:1px solid rgba(200,150,46,0.15);margin-top:80px;}
.footer-brand{font-family:'Playfair Display',serif;font-size:28px;color:var(--white);margin-bottom:8px;}
.footer-brand span{color:var(--gold);}
.footer-tagline{font-size:14px;color:var(--slate);margin-bottom:8px;}
.footer-motto{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);letter-spacing:3px;text-transform:uppercase;}
.footer-ref{margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--slate);letter-spacing:2px;}
@media print{body{background:#fff;color:#000;}.page{padding:20px 30px;}.card,.narrative,.timeline-content,.deploy-card{page-break-inside:avoid;}.section{page-break-before:auto;}}
</style>
</head>
<body>
<div class="page">

[STRUCTURE — build these sections using ONLY data from your analysis]:

1. If there is a documented enforcement deadline, active NOV, or urgent order in the files: show the alert-banner with the real deadline and real enforcement language.

2. HEADER: Use the real facility name and case type detected from the files. Show the actual regulatory agency and case numbers.

3. SECTION: Executive Summary (use the .narrative div with h3 + p paragraphs from your Section 14 analysis)

4. SECTION: Case Identification (use info-grid with two info-blocks — left: property info, right: case numbers)

5. SECTION: What the Regulators Have Found (use cards-grid — one card per major finding category from Section 4)

6. SECTION: Complete Chronology (use timeline with timeline-item elements — one per significant dated event from Section 3)

7. SECTION: Open Items (use status-matrix table with status-badge — CRITICAL / WARNING / PENDING — from Section 7)

8. SECTION: Enforcement Risk Assessment (use narrative div with direct language from Section 8)

9. SECTION: Immediate Action Plan (use deploy-grid for 7-day / 30-day / 60-90-day cards from Section 10)

10. SECTION: Key Contacts (use info-grid from Section 2 — color code by agency type)

11. SECTION: Path to Closure & Budget (use narrative div from Sections 9 and 12)

12. FOOTER: APAS.AI branding, regulatory domain detected, case reference, date, confidential notice.

When information is missing from the files, use the .gap-notice div to flag it.

IMPORTANT: Fill in EVERY section with real data from the analysis. No placeholder text. No [INSERT HERE]. Every date, name, case number, and citation must come from what you analyzed.`;

// ─────────────────────────────────────────────────────────────────────────────
// WHITE PAPER REPORT PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const WHITEPAPER_REPORT_PROMPT = `Format your complete analysis as a self-contained, professionally typeset consulting report HTML document. This is a formal engineering/consulting white paper — clean, white background, professional typography, exactly how a licensed PE consulting firm would deliver a written report to a client or regulator. Output ONLY the HTML starting with <!DOCTYPE html>. No markdown, no code fences.

CRITICAL RULE: Every fact, date, name, case number, and regulatory citation MUST come from the analysis you just produced. Do not add, invent, or assume any information. If the files did not contain a particular piece of information, state that explicitly.

Use this exact structure and CSS:

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[FACILITY NAME] — Regulatory Case Review | APAS.AI</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Open+Sans:wght@400;600;700&family=Roboto+Mono:wght@400;500&display=swap');
:root{--navy:#1E3A5F;--gold:#C8962E;--black:#111111;--body:#2C2C2C;--muted:#5A5A5A;--light:#F7F7F5;--border:#D8D8D4;--white:#FFFFFF;--red:#8B0000;--green:#1B5E20;--amber:#7A4F00;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--white);color:var(--body);font-family:'Merriweather',Georgia,serif;line-height:1.8;font-size:15px;}
.page{max-width:920px;margin:0 auto;padding:60px 80px;}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid var(--navy);margin-bottom:40px;}
.lh-firm{font-family:'Open Sans',Arial,sans-serif;}
.lh-firm .firm-name{font-size:24px;font-weight:700;color:var(--navy);letter-spacing:-0.5px;}
.lh-firm .firm-name span{color:var(--gold);}
.lh-firm .firm-tag{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:2px;}
.lh-meta{text-align:right;font-family:'Roboto Mono',monospace;font-size:11px;color:var(--muted);line-height:1.6;}
.lh-meta strong{color:var(--navy);display:block;font-size:12px;}
.report-title{text-align:center;padding:40px 0 36px;border-bottom:1px solid var(--border);margin-bottom:40px;}
.report-type{font-family:'Open Sans',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:12px;}
.report-title h1{font-family:'Merriweather',Georgia,serif;font-size:28px;font-weight:700;color:var(--navy);line-height:1.3;margin-bottom:12px;}
.report-title .subtitle{font-size:14px;color:var(--muted);max-width:600px;margin:0 auto 20px;line-height:1.6;}
.report-meta{font-family:'Roboto Mono',monospace;font-size:11px;color:var(--muted);display:flex;justify-content:center;gap:32px;flex-wrap:wrap;}
.report-meta span{display:flex;align-items:center;gap:6px;}
.report-meta strong{color:var(--black);}
.confidential{background:var(--light);border:1px solid var(--border);border-radius:3px;padding:10px 18px;text-align:center;font-family:'Open Sans',Arial,sans-serif;font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:32px;}
.urgent-notice{background:#FEF8F8;border-left:4px solid var(--red);padding:20px 24px;margin-bottom:40px;border-radius:0 4px 4px 0;}
.urgent-label{font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:6px;}
.urgent-text{font-size:14px;color:var(--black);font-weight:600;margin-bottom:4px;}
.urgent-sub{font-size:13px;color:var(--muted);}
.toc{background:var(--light);border:1px solid var(--border);border-radius:4px;padding:24px 28px;margin-bottom:40px;}
.toc-title{font-family:'Open Sans',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:16px;}
.toc-list{list-style:none;padding:0;columns:2;column-gap:32px;}
.toc-list li{font-size:13px;color:var(--body);padding:3px 0;display:flex;gap:8px;}
.toc-list li span:first-child{color:var(--gold);font-family:'Roboto Mono',monospace;font-size:12px;font-weight:500;flex-shrink:0;width:28px;}
.section{margin-bottom:52px;page-break-inside:avoid;}
.section-header{display:flex;align-items:baseline;gap:16px;margin-bottom:24px;padding-bottom:10px;border-bottom:2px solid var(--navy);}
.section-number{font-family:'Open Sans',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;color:var(--gold);text-transform:uppercase;flex-shrink:0;}
.section-title{font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:var(--navy);}
.body-text{font-size:15px;line-height:1.85;color:var(--body);margin-bottom:16px;}
.body-text strong{color:var(--black);font-weight:700;}
.body-text em{font-style:italic;color:var(--muted);}
.subsection{margin:24px 0 16px;}
.subsection-title{font-family:'Open Sans',Arial,sans-serif;font-size:14px;font-weight:700;color:var(--navy);border-left:3px solid var(--gold);padding-left:10px;margin-bottom:12px;}
.data-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;}
.data-table th{background:var(--navy);color:var(--white);font-family:'Open Sans',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding:10px 14px;text-align:left;}
.data-table td{padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:top;color:var(--body);}
.data-table tr:nth-child(even) td{background:var(--light);}
.data-table tr:hover td{background:#EEF3F8;}
.status-critical{display:inline-block;background:#FEE;border:1px solid #C00;color:var(--red);font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:2px;}
.status-high{display:inline-block;background:#FFF8E6;border:1px solid #C8962E;color:var(--amber);font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:2px;}
.status-medium{display:inline-block;background:#F5F5F5;border:1px solid #999;color:var(--muted);font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:2px;}
.status-resolved{display:inline-block;background:#E8F5E8;border:1px solid #2E7D32;color:var(--green);font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:2px;}
.info-table{width:100%;border-collapse:collapse;margin:16px 0;}
.info-table td{padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px;}
.info-table td:first-child{font-family:'Open Sans',Arial,sans-serif;font-weight:600;color:var(--muted);width:200px;vertical-align:top;}
.info-table td:last-child{font-family:'Roboto Mono',monospace;font-size:12px;color:var(--black);}
.action-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:20px 0;}
.action-card{border:1px solid var(--border);border-top:3px solid;border-radius:4px;padding:18px 20px;}
.action-card.urgent{border-top-color:var(--red);}
.action-card.high{border-top-color:var(--gold);}
.action-card.medium{border-top-color:var(--navy);}
.action-card h4{font-family:'Open Sans',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.action-card.urgent h4{color:var(--red);}
.action-card.high h4{color:var(--amber);}
.action-card.medium h4{color:var(--navy);}
.action-card .timeframe{font-size:11px;color:var(--muted);font-family:'Roboto Mono',monospace;margin-bottom:12px;}
.action-card ul{list-style:none;padding:0;}
.action-card li{font-size:13px;color:var(--body);padding:6px 0 6px 14px;border-bottom:1px solid var(--border);position:relative;line-height:1.5;}
.action-card li:last-child{border-bottom:none;}
.action-card li::before{content:'•';position:absolute;left:0;color:var(--gold);}
.wptimeline{margin:20px 0;}
.wptl-item{display:flex;gap:20px;margin-bottom:20px;}
.wptl-date{font-family:'Roboto Mono',monospace;font-size:11px;color:var(--gold);font-weight:500;min-width:90px;flex-shrink:0;padding-top:2px;text-align:right;}
.wptl-line{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
.wptl-dot{width:10px;height:10px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:4px;}
.wptl-bar{width:2px;background:var(--border);flex:1;margin-top:4px;}
.wptl-content{padding-bottom:16px;flex:1;}
.wptl-content h4{font-family:'Open Sans',Arial,sans-serif;font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px;}
.wptl-content p{font-size:13px;color:var(--muted);line-height:1.6;}
.callout{background:var(--light);border-left:4px solid var(--navy);padding:16px 20px;margin:16px 0;font-size:14px;color:var(--body);line-height:1.7;border-radius:0 4px 4px 0;}
.callout strong{color:var(--navy);}
.gap-notice{background:#F0F4FF;border:1px dashed #99A;border-radius:4px;padding:12px 16px;font-size:13px;color:var(--muted);margin:12px 0;font-style:italic;}
.gap-notice::before{content:'▲ RECORD GAP — ';font-family:'Open Sans',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:#667;display:inline;}
.contacts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:16px 0;}
.contact-card{border:1px solid var(--border);border-radius:4px;padding:16px 18px;}
.contact-card h4{font-family:'Open Sans',Arial,sans-serif;font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px;}
.contact-card .role{font-size:12px;color:var(--gold);font-family:'Open Sans',Arial,sans-serif;font-weight:600;margin-bottom:8px;}
.contact-card p{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:8px;}
.contact-card .contact-detail{font-family:'Roboto Mono',monospace;font-size:11px;color:var(--black);}
.wp-footer{border-top:2px solid var(--navy);padding-top:24px;margin-top:60px;display:flex;justify-content:space-between;align-items:center;font-family:'Open Sans',Arial,sans-serif;font-size:11px;color:var(--muted);}
.wp-footer .firm{font-weight:700;color:var(--navy);}
@media print{.page{padding:20px 30px;max-width:100%;}.section{page-break-inside:avoid;}.action-card,.contact-card{page-break-inside:avoid;}}
</style>
</head>
<body>
<div class="page">

[LETTERHEAD — use real data from files]:

<div class="letterhead">
  <div class="lh-firm">
    <div class="firm-name">APAS<span>.AI</span> Consulting</div>
    <div class="firm-tag">Regulatory Compliance · Environmental Intelligence · Technical Advisory</div>
  </div>
  <div class="lh-meta">
    <strong>REGULATORY CASE REVIEW REPORT</strong>
    Date: [Report Date]<br>
    Report No.: CIQ-[YYYY]-[NNN]<br>
    Prepared by: APAS Consulting<br>
    Status: Privileged & Confidential
  </div>
</div>

[REPORT TITLE, TABLE OF CONTENTS, then ALL 14 SECTIONS using the CSS classes above]:

For CHRONOLOGY: Use .wptimeline with .wptl-item elements.
For OPEN ITEMS: Use .data-table with .status-critical / .status-high / .status-medium / .status-resolved badges.
For ACTION PLAN: Use .action-grid with .action-card elements (.urgent / .high / .medium).
For CONTACTS: Use .contacts-grid with .contact-card elements.
For narrative text: Use .body-text class on all p tags.
For subsections: Use .subsection with .subsection-title.
For callout boxes: Use .callout div.
For record gaps: Use .gap-notice div.

[FOOTER]:
<div class="wp-footer">
  <div class="firm">APAS.AI Consulting</div>
  <div>[FACILITY NAME] | [CASE NUMBER] | [DATE]</div>
  <div>Privileged & Confidential</div>
</div>

</div>
</body>
</html>

IMPORTANT: Every piece of data in this document must come from the analysis. Where data is missing, use .gap-notice. Never fabricate.`;

// ─────────────────────────────────────────────────────────────────────────────
// EDGE FUNCTION HANDLER
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewFile {
  name: string;
  mimeType: string;
  content: string;
  isBase64: boolean;
  sizeMB?: number;
}

interface ReviewRequest {
  files: ReviewFile[];
  caseName?: string;
  additionalContext?: string;
  reportStyle: "aurum" | "whitepaper";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation — same as generate-proposal
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: ReviewRequest = await req.json();
    const { files, caseName, additionalContext, reportStyle } = body;

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (reportStyle !== "aurum" && reportStyle !== "whitepaper") {
      return new Response(JSON.stringify({ error: "Invalid reportStyle. Must be 'aurum' or 'whitepaper'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build file manifest
    const fileManifest = files
      .map((f, i) => `${i + 1}. ${f.name} (${f.mimeType}, ${f.sizeMB?.toFixed(1) || "?"} MB)`)
      .join("\n");

    // Build combined text content from text files
    const textContent = files
      .filter((f) => !f.isBase64)
      .map((f) => `\n--- FILE: ${f.name} ---\n${f.content}\n--- END FILE: ${f.name} ---\n`)
      .join("\n");

    // Build user message content for Lovable AI (OpenAI-compatible format)
    // For binary files, include them as image_url parts with data URIs
    const userContentParts: Array<Record<string, unknown>> = [];

    for (const f of files) {
      if (f.isBase64) {
        userContentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${f.mimeType};base64,${f.content}`,
          },
        });
      }
    }

    // Build analysis prompt with replacements
    let analysisPrompt = ANALYSIS_PROMPT
      .replace("{FILE_MANIFEST}", fileManifest)
      .replace("{CASE_CONTENT}", textContent);

    if (caseName) {
      analysisPrompt += `\n\nCASE NAME PROVIDED BY CLIENT: ${caseName}`;
    }
    if (additionalContext) {
      analysisPrompt += `\n\nADDITIONAL CONTEXT FROM CLIENT: ${additionalContext}`;
    }

    userContentParts.push({ type: "text", text: analysisPrompt });

    console.log(`CaseIQ: Starting analysis of ${files.length} files, style=${reportStyle}`);

    // ── PASS 1: Analysis via Lovable AI (Gemini 2.5 Pro for heavy multimodal reasoning) ──
    const pass1Response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: REGULATORY_SYSTEM_PROMPT },
          { role: "user", content: userContentParts },
        ],
        temperature: 0.2,
        max_tokens: 16000,
      }),
    });

    if (!pass1Response.ok) {
      const errorText = await pass1Response.text();
      console.error("CaseIQ Pass 1 error:", pass1Response.status, errorText);
      if (pass1Response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (pass1Response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI analysis failed");
    }

    const pass1Result = await pass1Response.json();
    const rawAnalysis = pass1Result.choices?.[0]?.message?.content || "";

    if (!rawAnalysis) {
      throw new Error("AI returned empty analysis");
    }

    // Extract regulatory domain from the last line
    const domainMatch = rawAnalysis.match(/REGULATORY_DOMAIN:\s*(.+)/);
    const regulatoryDomain = domainMatch ? domainMatch[1].trim() : "General Regulatory";

    console.log(`CaseIQ: Pass 1 complete. Domain: ${regulatoryDomain}. Starting Pass 2 formatting...`);

    // ── PASS 2: HTML formatting via Lovable AI ──
    const htmlPrompt = reportStyle === "aurum" ? AURUM_REPORT_PROMPT : WHITEPAPER_REPORT_PROMPT;

    const pass2Response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert HTML formatter. Convert the analysis into professional HTML exactly as instructed. Output only valid HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation before or after the HTML.",
          },
          {
            role: "user",
            content: `Here is the complete regulatory case analysis:\n\n${rawAnalysis}\n\n---\n\nNow format this analysis into a complete, self-contained HTML document using these exact instructions:\n\n${htmlPrompt}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!pass2Response.ok) {
      const errorText = await pass2Response.text();
      console.error("CaseIQ Pass 2 error:", pass2Response.status, errorText);
      if (pass2Response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Report formatting failed");
    }

    const pass2Result = await pass2Response.json();
    let reportHtml = pass2Result.choices?.[0]?.message?.content || "";

    // Clean output — strip code fences if present
    reportHtml = reportHtml
      .replace(/^```html\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    console.log(`CaseIQ: Pass 2 complete. Report length: ${reportHtml.length} chars`);

    const analysisDate = new Date().toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        report: reportHtml,
        caseName: caseName || "Regulatory Case Review",
        filesAnalyzed: files.length,
        analysisDate,
        regulatoryDomain,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("CaseIQ error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

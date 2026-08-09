# APAS Project Controls / projOS Brand Implementation Plan

## Objective

Create an R4-focused marketing experience for projOS and carry the same APAS Project Controls identity through the shared application shell.

The new experience must communicate, visually and in plain language, how the platform connects:

- sewer-extension, stormwater, water-meter, and inspection workstreams;
- ElevenLabs voice intake, phone calls, transcripts, work orders, and escalation;
- phone, email, dashboard, emergency, and critical-risk notifications;
- financial control, contracts, change orders, pay applications, payments, retainage, and reports;
- risk mitigation, correspondence intelligence, responsibilities, and deadlines;
- regulatory obligations, environmental compliance, permits, inspections, and closeout;
- documents, photographs, approvals, audit history, and owner-ready reporting.

## Non-negotiable boundary: no application-logic changes

This implementation is presentation-only.

Do not change:

- financial formulas, reconciliation logic, quantities, contract values, or calculations;
- database schema, migrations, queries, hooks, Supabase functions, or row-level security;
- authentication, permissions, user roles, module flags, or approval authority;
- routes, record statuses, workflow transitions, notification delivery, or API behavior;
- voice-agent webhook behavior, work-order creation logic, or email/push logic;
- report-generation calculations or document business rules.

Allowed changes:

- marketing copy, marketing layout, animations, and illustrative UI graphics;
- global colors, typography, spacing, borders, shadows, and visual tokens;
- shared logo/wordmark treatment, page metadata, navigation labels, and footer copy;
- shared app chrome such as the sidebar, top bar, authentication shell, and mobile shell;
- legacy public landing presentation so all public landing URLs show one brand.

## Brand system

### Brand architecture

- Primary: **APAS Project Controls**
- Product signature: **Powered by projOS**
- R4 positioning: **Prepared for R4 Capital** / **Private R4 project-control preview**
- Core promise: **See every project. Control every dollar. Prove every decision.**

### Visual language

- Deep infrastructure green for authority and operational control.
- Warm limestone/cream for documents and owner-facing clarity.
- Restrained gold for decisions, approvals, and executive actions.
- Emerald for verified/closed/paid states.
- Amber for pending exposure and required review.
- Rose only for emergencies and material risks.
- Editorial serif for marketing headlines; Inter for application UI; mono for amounts, references, timestamps, and audit metadata.

## Marketing-page architecture

1. **Navigation**
   - APAS Project Controls + Powered by projOS.
   - Workstreams, Financial Control, Risk & Compliance, Voice & Alerts, Documentation.
   - Sign in and “Request the R4 walkthrough.”

2. **Hero / R4 command center**
   - R4-specific owner-control promise.
   - Animated command-center panel showing workstreams, open reviews, risks, and supporting evidence.
   - Owner-safe, human-reviewed, time-stamped trust statements.

3. **One connected operating record**
   - Field condition → responsibility → work order → approval → financial impact → owner report.

4. **R4 infrastructure workstreams**
   - Sewer extension.
   - Stormwater and drainage.
   - Water meters and utility issues.
   - Inspections and closeout.

5. **Voice, phone, email, and emergency response**
   - ElevenLabs call intake.
   - Transcript and severity classification.
   - Work-order creation.
   - Phone/email/dashboard escalation.
   - Acknowledgement and audit history.

6. **Control-system capabilities**
   - Financial control.
   - Risk mitigation and critical alerts.
   - Regulatory and permit management.
   - Environmental compliance.
   - Documentation and correspondence.
   - Executive dashboards and owner reports.

7. **Financial control graphic**
   - Prime contract → schedule of values → change orders → pay application → payment/retainage → report.
   - Explicit source-document and exception states.

8. **Human-controlled AI and security**
   - AI drafts; authorized people approve and send.
   - Roles, tenant isolation, approvals, audit history, and evidence provenance.

9. **R4 working-session CTA and footer**
   - sales@apas.ai.
   - projos.ai.
   - Sign in, request walkthrough, security, and platform links.

## Application-wide coverage

### Shared presentation surfaces

- Global CSS color and typography tokens.
- Readable application type scale: 13px supporting text, 15px body/control text,
  17px primary copy, and proportionally larger page headings.
- Desktop application sidebar/wordmark.
- Shared top bar and search styling through inherited tokens.
- Mobile navigation colors and active states.
- Authentication page branding.
- Browser/PWA metadata and theme color.
- Offline/install branding where shared assets are used.

### Existing routed pages

All operational, project, inspection, financial, permit, environmental, compliance, document, voice-agent, dashboard, portal, and reporting pages retain their existing components and logic. They receive the new look through shared tokens and layout components.

## Verification checklist

- [x] No business-logic, database, hook, migration, or calculation files changed.
- [x] `/` and `/landing` present the same brand.
- [x] Landing page renders at desktop and mobile widths without horizontal overflow; tablet behavior is covered by the responsive intermediate breakpoints.
- [x] Navigation anchors and CTAs are present and the in-page navigation was browser-tested.
- [x] Reduced-motion users receive a stable experience through Framer Motion preferences and CSS fallbacks.
- [x] Shared application shell, authentication, portal, install, offline, and PWA presentation use the new brand tokens.
- [x] The compiled application CSS resolves `text-xs` to 13px, `text-sm` to 15px,
  `text-base` to 17px, and the shared sidebar/mobile/financial navigation no longer
  relies on 7–10px operational labels.
- [x] The production-equivalent Vite/PWA build succeeds.
- [x] The critical typecheck passes. The optional full-repository typecheck still reports pre-existing schema/type drift outside the presentation files changed here.
- [x] The implementation diff is limited to presentation, branding metadata, public copy, and this plan; pre-existing Supabase temp and output/test-result changes were not touched.

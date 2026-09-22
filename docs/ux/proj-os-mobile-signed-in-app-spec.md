# Proj OS Signed In Mobile App Specification

Date: 2026-09-19
Status: Implementation spec
Scope: Signed in Proj OS application on iPhone, Android, and desktop responsive layouts

## Why This Spec Exists

The public website and the earlier PWA mockup are not the same thing as the signed in backend application. The signed in app must be rebuilt around mobile work, because the field, owner, project manager, and APAS staff workflows happen on phones as often as they happen on desktop.

The current app has useful modules, but several signed in screens still behave like desktop pages squeezed onto a phone. The most visible symptom is the project permit action. The current "Scan / Upload Permit" experience appears as a large green or blue promotional block in multiple places. It takes too much screen space, repeats itself, and competes with higher priority project work.

The goal is not to remove capability. The goal is to make capability easier to reach without clutter.

## Product North Star

Proj OS signed in mobile should feel like a clean project command app:

1. Open the app.
2. See what needs action today.
3. Open a project.
4. Do the most common project work in one or two taps.
5. Capture proof, money, approvals, updates, and documents without hunting through desktop style tabs.

The phone version should not be a smaller desktop. It should be its own information architecture, backed by the same data and permissions.

## Primary Users

### APAS Staff

APAS staff need fast access to projects, money, updates, field proof, assignments, messages, and reports. They need to create or review work, not browse through every module.

### Project Managers

Project managers need a project workspace that prioritizes scope, schedule, financials, field status, change orders, proposals, invoices, and client updates.

### Field Users

Field users need camera first flows: photos, daily notes, permit scans, punch list items, walkthrough captures, incidents, and short updates.

### Clients and Owners

Clients need a separate portal experience with only the items they are supposed to see: project status, updates, documents, approvals, questions, reports, and shared financial items.

### Contractors and Consultants

Contractors and consultants need their own portal focused on assigned work, submittals, RFIs, invoices, commitments, punch items, and required documents.

## Current UX Findings

### Good Foundation Already Exists

- The app has a mobile bottom navigation.
- The dashboard has a mobile command card.
- The auth page has role based entry options.
- The proposal and invoice workflows have started moving toward mobile cards and resizable desktop panes.
- The project page has a mobile section drawer and desktop vertical navigation.

### Main Problems

- The signed in app still uses desktop density in too many places.
- Important project actions are mixed with low frequency modules.
- The project page has repeated permit CTAs in the overview, closeout banner, permits tab, and mobile shortcut area.
- The large permit scan cards look like hero marketing blocks inside an operational tool.
- The mobile project workspace has too many competing action buttons in the header.
- Desktop uses narrow wrappers in some operational pages, wasting horizontal space.
- Some tables still need true card alternatives, not horizontal scroll.
- The app does not yet have a unified mobile action model across projects.

## Design Principles

### Mobile First, Not Mobile Compatible

Every signed in feature should be designed first at 390 px wide, then expanded to tablet and desktop.

### One Primary Action Per Surface

Each screen should have one obvious primary action. Secondary actions should live in a contextual menu, action sheet, segmented control, or compact toolbar.

### No Promotional Cards Inside Operations

Operational screens should not use large marketing style hero cards for routine actions. Permit scanning, photo upload, invoice creation, and report generation should use compact action controls.

### Project Work Is Organized By Intent

The project page should be organized around jobs to be done, not module names alone.

### Role and Module Aware

Users should only see the tabs, actions, and portals allowed by role, project type, and module activation.

### Desktop Improves Density

Desktop should use more width, resizable panes, side panels, persistent previews, and better tables. It should not merely stretch mobile cards.

## Mobile App Information Architecture

### Bottom Navigation

Recommended mobile bottom nav:

1. Home
2. Projects
3. Capture
4. Money
5. More

Home opens the daily command dashboard.

Projects opens the project list and recent projects.

Capture opens an action sheet for photo, field note, permit scan, punch item, voice note, daily report, and document upload. This is where permit scanning belongs globally, not as a giant repeated card.

Money opens proposals, invoices, pay apps, payments, change orders, and approvals filtered to the user.

More opens people, messages, reports, documents, portals, settings, training, and admin items based on permission.

### Global Capture Action

Capture should become a first class mobile affordance:

- Take site photo
- Add field note
- Scan or upload permit
- Create punch item
- Start walkthrough
- Record voice note
- Upload document
- Log incident

The app should ask which project the capture belongs to when the project is not already known.

## Signed In Dashboard Spec

### Mobile Dashboard

The dashboard should show:

1. Today card
   - Date
   - User role
   - Top action
   - Critical alerts

2. Continue work
   - Last 3 projects opened
   - Current project phase
   - Open money or approval item

3. Action rail
   - Projects
   - Capture
   - Money
   - Messages

4. My queue
   - Tasks
   - Unread messages
   - Approvals
   - Due soon items

5. Value moments
   - Voice to ticket
   - Photo to proof
   - Proposal to invoice
   - Internal activity to client update

### Dashboard Cleanup Rules

- The phone dashboard should not show every module.
- Value cards should be compact and tappable.
- KPI cards should be limited to the most decision useful metrics.
- Long explanation copy should be removed from mobile surfaces.
- Secondary discovery belongs in More, not the first viewport.

## Project Workspace Mobile Spec

When a user opens a project, the first mobile screen should be a project cockpit.

### Project Cockpit First View

Visible above the fold:

- Project name
- Project type badge
- Current phase
- Health indicator
- One primary next action
- Money snapshot
- Open issues or approvals
- Compact action button

### Project Primary Actions

The project workspace should expose the most important ongoing project actions:

1. Update
   - Send client update
   - Add internal note
   - Email project team
   - Open messages

2. Money
   - Proposals
   - Client invoices
   - Change orders
   - Pay apps
   - Vendor invoices
   - Payments

3. Field
   - Photos
   - Punch list
   - Daily report
   - Walkthrough
   - Permit scan
   - Incident

4. Plan
   - Schedule
   - Milestones
   - RFIs
   - Submittals
   - Meetings

5. Files
   - Documents
   - Drawings
   - Specifications
   - Permits
   - Reports

### Mobile Project Navigation

The current tab drawer should be simplified into five groups:

- Overview
- Money
- Field
- Plan
- Files

Each group can reveal its child modules. The active section pill should show the current group and a short label, not every module.

### Project Action Button

Every project should have a single compact action button in the project header or lower action rail. Tapping it opens a project action sheet:

- Add update
- Capture photo
- Create punch item
- Scan permit
- Create proposal
- Create invoice
- Create change order
- Send report
- Assign task

Actions should be filtered by project type, module activation, and user permission.

## Permit UX Specification

### Current Problem

The permit scan action currently appears as a large green or blue block and repeats in:

- Project overview
- Closeout banner
- Project permits tab
- Mobile shortcut beside the active tab selector
- Permits hero area

This makes permit scanning feel more important than the entire project workspace and consumes too much mobile real estate.

### New Permit Pattern

Permit scan should be available but quiet.

Replace large permit hero cards with:

1. Compact inline action row in Overview
   - Label: Permits
   - State: 3 open, 1 pending city, 8 closed
   - Actions: Scan, Open

2. Project action sheet item
   - Scan permit
   - Upload permit PDF

3. Permits tab header toolbar
   - Primary icon button: camera
   - Secondary menu: upload, add manual permit, copy brief

4. Closeout banner compact link
   - "Permits: 3 open"
   - Small camera icon if scanning is allowed

### What To Remove

- Remove the large green project overview scan card.
- Remove duplicate scan CTA from the closeout banner.
- Remove duplicate scan strip at top of the permits tab.
- Remove the "Permits · Scan" special behavior from navigation. The nav should navigate. The action sheet should scan.

### What To Keep

- Keep camera based permit capture.
- Keep upload PDF/photo.
- Keep OCR review.
- Keep permit register.
- Keep permit analytics.
- Keep mobile ability to open scan quickly from project action sheet.

## Financial UX Specification

### Proposal Flow

The proposal tab should offer two paths:

1. Write from scratch with AI.
2. Upload an already signed client proposal and manually type approved value lines.

When uploading an already signed proposal:

- Do not rewrite the proposal using AI.
- Keep the uploaded file as the permanent source record.
- Let the user manually enter approved line items.
- Select lead type: APAS, contractor, consultant.
- Select contractor or consultant from the project team.
- If the person or company is missing, route the user to add them to the project team first.
- Show APAS markup, pass through, subtotal, grand total, and estimated APAS profit.
- Lock after approval.

### Invoice Flow

Invoices should be connected to approved proposal value lines.

Mobile invoice creation should show:

1. Choose approved proposal.
2. Choose line or approved value group.
3. Enter percent complete, amount, or remaining balance.
4. Review invoice package.
5. Save draft or issue.

The right side preview on desktop should be resizable. On mobile, the preview should be a separate "Preview" step or bottom sheet, not squeezed beside the form.

## Desktop Improvement Specification

Desktop should be rebuilt for operational density:

- Full width app pages with max width around 1800 px, not narrow document pages.
- Resizable form and preview panes.
- Sticky project navigation on the left.
- Tables where tables help scanning.
- Cards only for repeated items or mobile layouts.
- No giant CTA cards inside operational modules.
- Compact toolbars with icons and labels.
- Action sheets or menus for secondary actions.
- Keep the desktop sidebar, but avoid nested navigation clutter inside content.

## Visual Design Direction

The signed in app should feel quiet, premium, and operational:

- Calm surfaces
- Strong typography hierarchy
- Small but clear icons
- Fewer giant blocks
- Fewer gradients in backend work areas
- Clear active state
- No wasted gutters
- Stable touch targets of at least 44 px
- No horizontal overflow on phone
- Bottom navigation must clear safe area on iPhone

## Implementation Plan

### Status As Of 2026-09-22

- Implemented locally: the app shell bottom navigation now uses Home, Projects, Capture, Money, and More.
- Implemented locally: Capture opens a project-aware action sheet and routes current-project actions to existing photo, daily log, permit scan, punch, accountability, voice, repository, and incident workflows.
- Implemented locally, pending production deployment and migration verification: consulting client invoice draft edit exposes invoice-number amendment and draft deletion inside the edit modal; eligible unpaid voided invoices expose delete in the detail view while paid/payment-referenced invoices remain preserved.
- Verified locally: financial mobile smoke covers proposal and invoice lifecycle at 390 px, unpaid voided invoice deletion, draft invoice-number amendment, draft deletion from the edit modal, and stale project identity protection.
- Not yet complete: the project cockpit, full five-group project drawer simplification, client/owner portal mobile parity, subcontractor portal mobile parity, all client interaction flows, and Notion/Hermes meeting intelligence end-to-end verification.
- Runtime blocker: Proj OS public Notion OAuth still needs `NOTION_OAUTH_CLIENT_ID` and `NOTION_OAUTH_CLIENT_SECRET` configured in Supabase secrets before consent, source search, mapping, and sync can be tested end to end.

### Phase 1: Spec Alignment And Cleanup

- Add this spec.
- Identify all repeated project CTAs.
- Replace permit hero blocks with compact actions.
- Keep all existing permit functionality.
- Do not deploy until reviewed.

### Phase 2: Mobile App Shell

- Refine bottom nav to Home, Projects, Capture, Money, More.
- Add global Capture action sheet.
- Add role aware action filtering.
- Move permit scanning into Capture and project action sheet.

### Phase 3: Project Mobile Cockpit

- Rebuild project first view as a cockpit.
- Add single project action button.
- Collapse project tabs into Overview, Money, Field, Plan, Files.
- Move repeated module CTAs into contextual action sheets.

### Phase 4: Financial Mobile Workflow

- Finish proposal upload path as manual value entry only.
- Keep AI only for scratch proposal generation.
- Finish invoice preview as desktop resizable pane and mobile preview step.
- Verify proposal to invoice guardrails on mobile.

### Phase 5: Desktop Refinement

- Apply full width and resizable pane rules across major operational pages.
- Remove unnecessary white space.
- Improve project dashboard density.
- Keep desktop powerful but not cluttered.

### Phase 6: Verification

- Add Playwright mobile tests for:
  - Dashboard no horizontal overflow.
  - Project cockpit no horizontal overflow.
  - Project action sheet opens.
  - Permit scan reachable from action sheet.
  - Proposal upload value entry visible on mobile.
  - Invoice builder preview is not clipped on desktop.

- Add screenshot checks for:
  - iPhone width 390 px.
  - Small Android width 360 px.
  - Tablet width 768 px.
  - Desktop width 1440 px.

## Acceptance Criteria

The signed in app is considered mobile ready when:

- A user can open the app on iPhone and immediately understand what to do.
- A user can open a project and reach updates, money, field capture, plan, and files without hunting.
- The permit scan flow is available but does not dominate project screens.
- No signed in primary route has body horizontal scroll at 390 px.
- Proposal and invoice workflows are usable on a phone.
- Desktop financial pages use available width and support resizable panes where preview competes with editing.
- Client, staff, and contractor entry points remain separate.
- The app remains permission aware and module aware.

## First Implementation Target

The first implementation should be:

1. Remove the large project permit scan card from overview.
2. Remove duplicate permit scan CTA from closeout banner.
3. Replace project permits tab scan strip and hero button with a compact header toolbar.
4. Add a project action sheet that includes Scan Permit as one option.
5. Keep permit scan dialog and OCR flow exactly as is.
6. Add mobile no overflow tests for project detail and permit action entry.

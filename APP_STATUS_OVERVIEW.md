# Nspire Guardian Hub - Implementation Status

Nspire Guardian Hub is a property operations platform for inspections, compliance, work orders, permits, projects, and team collaboration. The app combines daily grounds inspections, NSPIRE unit inspections, asset tracking, issues, and a CRM-style contacts system with role-based access control and invitation-only onboarding.

## Role Hierarchy (Access Model)
- Super Admin (Dhruman)
- Owner (H)
- Administrator
- Property Manager (Simi)
- Project Manager
- Superintendent (Eros)
- Inspector
- Clerk
- Subcontractor
- Viewer
- Standard User

Access is role-based: higher roles inherit broader permissions and can manage lower roles. UI access is granted based on this hierarchy.

## Done / Implemented (based on current repo + your updates)
- Google OAuth sign-in is wired alongside email/password login. Users can sign in with Google or standard credentials.
- Invitation-only onboarding is in place with invitation tokens and an acceptance flow.
- Role-based access control and a role hierarchy are implemented with role definitions, permissions, and assignment rules.
- Team roles are assigned and UI access follows the hierarchy.
- Units support CSV import and full CRUD.
- Assets inventory exists with asset types stored in the backend and managed in the UI.
- Daily grounds inspections are implemented with asset grid checks, inspection history, and automatic issue creation for defects/attention.
- Permits & compliance module is implemented with a dashboard, permit details, and requirements tracking.
- Chat/messaging module exists with threads and conversations; chat UI has been optimized.
- Voice agent console exists with ElevenLabs support and maintenance request creation is connected.
- Organization tab exists in Settings (currently static placeholder data).
- Document Center is restricted to admin/owner operations (as intended).
- Documents sent from Eros are uploaded into the Documents section under Organization.
- CRM is implemented inside the app and follows similar role-based access control.
- Site is hosted on Cloudflare at `pm.apas.ai`.
- Google Drive replica folder structure has been created.
- Issue tab is responsive and working.

## Not Done / Needs Work
- Paid feature gating and a real billing workflow are not implemented (billing tab is UI only).
- Asset creation is not admin-only (currently admins and managers can create). Requirement says admin-only for now.
- “Only add 5 catch basin assets for EROS to inspect” is not seeded or automated.
- Permits email ingestion from Eros is not implemented (no mail connector/ingestion job).
- GDrive dump + curated admin pull into the app is not implemented (structure exists, but ingestion + filtering logic is pending).
- Voice agent “2nd tool” integration (VAPI/Retool) and automated issue → supervisor → work order flow is not implemented.
- “Procorlite lifecycle feature (mock project)” is not implemented.
- “Get NSPIRE book, read, use in dev” is not reflected in code.

## Partially Done / Needs Verification
- Daily grounds inspection flow includes review status and issue creation, but there is no explicit supervisor approval workflow beyond status fields and assignment. Confirm expected routing.
- Organization tab exists but is static; needs real tenant/org settings and placement confirmation.

## Deployment Status
- Site is already hosted on Cloudflare at `pm.apas.ai`.

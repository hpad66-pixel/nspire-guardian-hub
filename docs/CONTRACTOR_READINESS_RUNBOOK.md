# Contractor Readiness operations runbook

## Release components

- Database: `20260903210000_contractor_readiness.sql`
- Reminder schedule: `20260903210100_contractor_readiness_reminders.sql`
- Edge functions: `contractor-invite`, `contractor-portal`, `contractor-document-assist`, `contractor-reminders`
- Private storage bucket: `contractor-readiness`
- Application routes: portfolio, client, project, case review, policy, and public onboarding

## Required production secrets

| Secret | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Project API endpoint | Supabase-provided |
| `SUPABASE_ANON_KEY` | Authenticated staff client validation | Supabase-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Token portal and scheduled operations | Supabase-provided |
| `PUBLIC_APP_URL` | Absolute invitation/reminder link origin | Yes; use `https://projos.ai` |
| `RESEND_API_KEY` | Invitation and reminder delivery | Required for email delivery |
| `ANTHROPIC_API_KEY` | Document field extraction | Optional; required only for AI extraction |

`contractor-invite` validates its bearer token internally even though gateway JWT verification is disabled for compatibility with the current auth configuration. `contractor-document-assist` requires a valid JWT at the gateway and rechecks case-manager permission.

## Deployment order

1. Apply database migrations.
2. Deploy the four edge functions.
3. Set `PUBLIC_APP_URL` and provider secrets.
4. Deploy the web application.
5. Enable the paid module for the target workspace in Admin → Modules.
6. Review the standard template in Contractor Readiness → Policy.
7. Enable work, contract, and payment gates only after initial contractor records are loaded.

Never enable enforcement gates before the relevant contractors have qualification cases; an enabled policy intentionally blocks an operation when no matching case exists.

## Smoke test

1. Open **Contractor Readiness** from desktop and mobile navigation.
2. Create a project-scoped case for a test company.
3. Send a contractor link to a controlled email address.
4. Open the link in a private browser with no projOS session.
5. Save company information, add experience, upload a test file, and submit.
6. Confirm the staff case shows the uploaded evidence and audit events.
7. Run AI extraction and confirm it creates a draft only.
8. Request a correction and confirm the external portal reopens the item.
9. Verify all required evidence and confirm gate indicators change automatically.
10. Enable one gate in a nonproduction workspace and confirm the corresponding database operation is blocked/allowed as expected.

## Scheduled reminder verification

- Confirm the `contractor-reminders-daily` cron job exists and is active.
- Invoke `contractor-reminders` with the stored `contractor_readiness` cron secret.
- Confirm response counters for `sent`, `skipped`, and `failed`.
- Confirm a row exists in `contractor_reminder_log` for every attempted notification.
- Confirm a repeat invocation on the same date does not duplicate delivery.

## Operational policy

- Reviewers must inspect source evidence before verifying.
- Internal notes must not contain unnecessary tax identifiers or protected personal data.
- Do not email attachments; use the secure portal.
- Use broker links only for insurance-related evidence.
- Use temporary exceptions only for nonlegal items, include an interim risk control, and use the shortest practical expiration.
- Suspend a company immediately when a known condition makes continued work inappropriate.
- Treat external verification services as evidence sources, never as automatic final approval.

## Incident response

If a secure link is exposed, set `revoked_at` on that `contractor_portal_links` record and issue a new invitation. If an uploaded file is suspect, do not delete the database record; reject it, preserve the audit trail, and remove the storage object only under the organization's retention and incident policy.

If reminder delivery fails, inspect `contractor_reminder_log.error_message`, correct the provider configuration, and allow the next scheduled run to issue a fresh deduplicated notification.


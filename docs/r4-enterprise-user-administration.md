# R4 enterprise access administration

Proj OS uses two separate authority levels. A **Workspace Administrator** can administer the whole Proj OS workspace. Every operational role—including **Property Owner**—belongs to one or more properties and never grants portfolio-wide access.

## Invite a new R4 user

1. Open **Settings → Users & Roles** and choose **Invite User**.
2. Enter the person's name and email.
3. Select one property. A new user cannot be invited without a property.
4. Choose the property role and send the invitation.
5. The recipient opens the single-use Proj OS email, creates a strong password, and is signed in. The private invitation verifies the email, so no second Supabase verification email is sent.
6. The invitation expires after seven days. Pending invitations can be resent or revoked.

Public self-registration is disabled. Administrators never create, know, or send another user's password.

## Add a second property or change permissions

In **Settings → Users & Roles**, open the user's menu and choose **Property Access & Permissions**.

- Add or remove property assignments independently.
- Select a different role for each property.
- Use the permission grid to allow or deny an individual action.
- A reset icon means the value is a user override. Reset it to inherit the role default again.

The grid contains 27 capability groups and six actions—**View, Create, Edit, Delete, Approve, Assign**—for 162 independently controlled decisions per property. Groups cover projects, people, schedule, RFIs, submittals, documents, photos, daily reports, issues, inspections, safety, work orders, financials, procurement, reporting, communications, portal content, compliance, property operations, workflows, closeout, and property administration.

## Role defaults

| Role | Intended property-level authority |
| --- | --- |
| Property Owner | All features and actions inside assigned properties only |
| Property Manager | Broad operating control; sensitive deletion and financial administration limited |
| Project Manager | Project delivery, workflows, approvals, and assignments; no property access administration by default |
| Superintendent | Field execution, schedule, safety, reports, inspections, closeout |
| Inspector | Inspections, issues, safety, evidence, and daily records |
| Administrator | Property administration and coordination without workspace authority |
| Clerk | Documents, reports, communications, portal content, and action tracking |
| Subcontractor | Assigned field collaboration and submissions |
| Viewer | Read-only access inside assigned properties |
| Standard User | Minimal read-only project/document/communication access |

Defaults are a starting point. The access grid can override any action for one user on one property.

## Isolation guarantees

- Non-admin users see only properties explicitly listed in their active property assignments.
- Project and operational records are enforced at the database row level, not merely hidden in the interface.
- Records with no property or project scope default to Workspace Administrators only.
- A property role is stored only on the property assignment. It is never copied into workspace-wide roles.
- Deactivation blocks authentication, removes active tenant resolution, preserves business history, and writes an audit record.
- Invitations are single-use, expiring, revocable, bound to email/workspace/property/role, and consumed atomically when the Auth account is created.
- Permission and property-access changes are written to the enterprise user audit log.

## Workspace Administrator checklist

After an invitation or permission change:

1. Confirm the user shows a baseline workspace role and the intended property role.
2. Open **Property Access & Permissions** and verify the property list.
3. Review financial, deletion, approval, and people-assignment permissions especially carefully.
4. Test with a non-admin account: the property selector must contain only assigned properties, and a direct URL/API request for another property must return no row or permission denied.
5. Use **Deactivate** rather than deleting a departing user's records.

## Deployment configuration

The release requires:

- migration `20260829023000_enterprise_property_rbac.sql`;
- Edge Function `accept-workspace-invitation` with gateway JWT verification disabled because its signed invitation token is the credential;
- existing `send-invitation` and `manage-workspace-user` functions;
- function secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `APP_ORIGIN=https://projos.ai`;
- Supabase Auth Site URL `https://projos.ai`, a matching redirect allowlist, and public signup disabled.

Existing accounts do not receive another activation email. The branded, no-second-email activation applies to new invitations after this release.

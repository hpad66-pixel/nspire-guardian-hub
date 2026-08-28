# R4 enterprise user administration

Proj OS workspace owners can administer R4 workforce access from **Settings → Users & Roles**.

## Owner workflow

1. Choose **Invite User**.
2. Enter the employee or member name and email.
3. Assign the appropriate workspace role and, when relevant, an organization or property.
4. Send the invitation. The invitation is single-use and expires after seven days.
5. Track pending invitations in the same screen. Invitations can be resent or revoked.
6. After activation, add or remove roles from the user action menu.
7. Deactivate an account when access should stop. Proj OS blocks authentication, removes tenant access for existing sessions, preserves business records, and records the reason in the audit trail.

## Authority model

- The workspace owner can create and manage every R4 workspace role, including workspace administrators.
- Workspace administrators can manage users below the administrator and owner levels.
- Owners and managers can only assign roles below their own authority.
- Nobody can deactivate the workspace owner or change their own access from this screen.
- Platform super-administrator authority remains separate from tenant roles.
- A user and invitation must belong to the caller's workspace; cross-client user administration is rejected server-side.

## Deployment requirements

Apply `20260828150000_enterprise_user_administration.sql`, then deploy these Edge Functions:

- `send-invitation`
- `manage-workspace-user`

Required function secrets are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `APP_ORIGIN`. `APP_ORIGIN` must be the production Proj OS application origin so invitation links cannot be redirected to another host.

The authentication email-confirmation redirect allowlist must include the production Proj OS origin. Invitation recipients choose their own password; administrators never create or view employee passwords.

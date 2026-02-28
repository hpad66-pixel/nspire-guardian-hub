# Workspace Provisioning Guide — APAS OS

## Overview

APAS OS is a multi-tenant platform. Each paying client organization (e.g., R4 Capital, Glorieta Gardens) operates within its own **workspace**. This document explains how to provision new workspaces.

---

## Prerequisites

- You must be a **Platform Administrator** (i.e., `is_platform_admin = true` on your profile).
- You must be logged into the APAS OS application.

---

## Step-by-Step: Provisioning a New Client Workspace

### 1. Navigate to Platform Command

Go to `/platform` in the application. This page is only visible to platform admins.

### 2. Click "Add Client"

In the **Client Workspaces** section, click the **"+ Add Client"** button in the top-right corner.

### 3. Fill Out the Onboarding Form

| Field                  | Required | Description                                      |
|------------------------|----------|--------------------------------------------------|
| Workspace Name         | ✅       | Display name for the workspace                   |
| Client Company         |          | Legal entity name                                |
| Contact Name           |          | Primary contact person                           |
| Billing Email          |          | Email for invoices                               |
| Plan                   | ✅       | `trial`, `starter`, `professional`, `enterprise` |
| Monthly Fee            |          | Dollar amount billed per cycle                   |
| Seat Limit             | ✅       | Max number of users allowed                      |
| Billing Cycle          | ✅       | `monthly` or `annual`                            |
| Notes                  |          | Internal notes about the client                  |

### 4. Submit

The system will:
1. Create the workspace record.
2. Initialize default module gates (`workspace_modules` row).
3. Log the action in `platform_audit_log`.

### 5. Assign the Client's Admin User

After creating the workspace, you need to:
1. Invite the client's primary admin user via the **User Invitations** system.
2. Ensure the invitation includes the new `workspace_id` so the user is automatically assigned on signup.
3. Assign the `admin` or `owner` role to their user via the **Roles & Access** settings.

### 6. Configure Module Gates

Back on the Platform Command page, use the **Module Gates** toggles for the new workspace to enable/disable specific platform features (e.g., Projects, Inspections, Compliance Calendar).

---

## Key Database Tables

| Table               | Purpose                                         |
|---------------------|------------------------------------------------ |
| `workspaces`        | Core workspace/tenant record                    |
| `workspace_modules` | Feature flags per workspace                     |
| `profiles`          | User profiles; `workspace_id` links user → workspace |
| `user_roles`        | Role assignments (never on profiles table)      |
| `platform_audit_log`| Audit trail for platform admin actions          |

---

## Security Notes

- Workspace creation bypasses RLS via the `platform_create_workspace()` SECURITY DEFINER function.
- Only users with `is_platform_admin = true` can invoke this function.
- All workspace data is isolated via `get_my_workspace_id()` in RLS policies.
- Roles are stored in `user_roles` table, **never** on `profiles` or `auth.users`.

---

## Troubleshooting

| Symptom                         | Cause                                    | Fix                                          |
|---------------------------------|------------------------------------------|----------------------------------------------|
| "Workspace Not Assigned" screen | User's `profiles.workspace_id` is NULL   | Update profile with correct workspace_id     |
| User can't see any data         | Missing or wrong workspace assignment    | Verify `profiles.workspace_id` matches       |
| "Access denied" on creation     | Caller lacks `is_platform_admin`         | Set `is_platform_admin = true` on profile    |

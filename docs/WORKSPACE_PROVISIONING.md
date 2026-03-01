# APAS OS — Workspace Provisioning & Platform Guide

## Overview

APAS OS is a multi-tenant property intelligence platform. Each client organization operates within its own **workspace** with isolated data, role-based access, and configurable module gates. This document covers provisioning, module inventory, and administration.

---

## Prerequisites

- You must be a **Platform Administrator** (`is_platform_admin = true` on your profile).
- You must be logged into the APAS OS application at [apasos.ai](https://apasos.ai).

---

## Step-by-Step: Provisioning a New Client Workspace

### 1. Navigate to Platform Command

Go to `/platform` in the application. This page is only visible to platform admins.

### 2. Click "Add Client"

In the **Client Workspaces** section, click the **"+ Add Client"** button in the top-right corner.

### 3. Fill Out the Onboarding Form

| Field              | Required | Description                                      |
|--------------------|----------|--------------------------------------------------|
| Workspace Name     | ✅       | Display name for the workspace                   |
| Client Company     |          | Legal entity name                                |
| Contact Name       |          | Primary contact person                           |
| Billing Email      |          | Email for invoices                               |
| Plan               | ✅       | `trial`, `starter`, `professional`, `enterprise` |
| Monthly Fee        |          | Dollar amount billed per cycle                   |
| Seat Limit         | ✅       | Max number of users allowed                      |
| Billing Cycle      | ✅       | `monthly` or `annual`                            |
| Notes              |          | Internal notes about the client                  |

### 4. Submit

The system will:
1. Create the workspace record.
2. Initialize default module gates (`workspace_modules` row).
3. Log the action in `platform_audit_log`.

### 5. Assign the Client's Admin User

1. Invite the client's primary admin user via the **User Invitations** system.
2. Ensure the invitation includes the new `workspace_id`.
3. Assign the `admin` or `owner` role via **Roles & Access** settings.

### 6. Configure Module Gates

Use the **Module Gates** toggles on the Platform Command page to enable/disable features per workspace.

---

## Complete Module Inventory (18 Modules)

| # | Module                 | Key Capabilities                                                    |
|---|------------------------|---------------------------------------------------------------------|
| 1 | **NSPIRE Inspections** | 130+ defect library, REAC scoring, life-threatening detection, proof-of-repair workflow |
| 2 | **Daily Grounds**      | 12-section photo-first inspections, voice dictation, auto-save, supervisor review |
| 3 | **Construction Projects** | Full lifecycle management, change orders, RFIs, daily field reports, pay applications |
| 4 | **Issues & Work Orders** | Unified detection → verification, auto-triggers from inspections/safety/permits |
| 5 | **Permits & Compliance** | Lifecycle tracking, deadline alerts, regulatory agency coordination (DERM, FDEP, HUD) |
| 6 | **Equipment & Fleet**  | Asset registry (vehicles, tools), check-out/in, document compliance, tiered limits |
| 7 | **Asset Management**   | QR-code scanning, condition logs, infrastructure asset tracking |
| 8 | **Material Inventory** | Stock levels, reorder points, low-stock alerts, transaction audit trails |
| 9 | **Credentials Wallet** | Licenses, certifications, insurance tracking, secure share links, expiry alerts |
| 10 | **Training Academy** | SCORM/xAPI course hosting, progress tracking, completion certificates |
| 11 | **Safety / OSHA**    | Mobile incident logging, safety FAB, automated OSHA 300/300A report generation |
| 12 | **Client Portals**   | White-label branded portals, messaging, action items, document sharing |
| 13 | **CaseIQ (AI)**      | AI-powered regulatory document review, risk identification, deadline extraction |
| 14 | **HR Document Vault** | Employee document categories, file upload with expiry tracking, per-employee vault |
| 15 | **Occupancy & Tenants** | Unit management, lease tracking, tenant status (active/notice/suspended/vacated) |
| 16 | **Executive Suite**  | Portfolio health dashboards, 18-slide animated presentations, NSPIRE scoring |
| 17 | **Documents & CRM**  | Centralized document management, contact records, folder organization |
| 18 | **Command Center**   | Unified dashboard aggregating all modules into one view |

---

## Architecture

### Data Isolation
- All tenant data is isolated via `workspace_id` foreign keys.
- Row-Level Security (RLS) policies use `get_my_workspace_id()` to enforce isolation.
- Workspace creation uses `platform_create_workspace()` (SECURITY DEFINER function).

### Role System
- Roles are stored in `user_roles` table — **never** on `profiles` or `auth.users`.
- Supported roles: `admin`, `owner`, `manager`, `member`, `viewer`.
- The `useUserPermissions` hook detects missing roles and surfaces warnings.

### Workspace Guard
- A `WorkspaceNullGuard` in `WorkspaceContext.tsx` blocks rendering if a user has no workspace assignment.
- Displays a full-screen warning directing the user to contact the platform administrator.

### Key Database Tables

| Table                 | Purpose                                          |
|-----------------------|--------------------------------------------------|
| `workspaces`          | Core workspace/tenant record                     |
| `workspace_modules`   | Feature flags per workspace                      |
| `profiles`            | User profiles; `workspace_id` links user → workspace |
| `user_roles`          | Role assignments                                 |
| `platform_audit_log`  | Audit trail for platform admin actions           |
| `tenants`             | Occupancy/tenant records per property            |
| `properties`          | Property records with `occupancy_enabled` flag   |
| `units`               | Unit records linked to properties                |

---

## Security Notes

- Only users with `is_platform_admin = true` can create workspaces or manage module gates.
- All workspace data is isolated via RLS policies.
- The platform admin command center is restricted to `/platform` route with admin-only guards.

---

## Troubleshooting

| Symptom                          | Cause                                    | Fix                                          |
|----------------------------------|------------------------------------------|----------------------------------------------|
| "Workspace Not Assigned" screen  | User's `profiles.workspace_id` is NULL   | Update profile with correct workspace_id     |
| User can't see any data          | Missing or wrong workspace assignment    | Verify `profiles.workspace_id` matches       |
| "Access denied" on creation      | Caller lacks `is_platform_admin`         | Set `is_platform_admin = true` on profile    |
| "Role not assigned" warning      | User has no entry in `user_roles` table  | Create role assignment for the user          |
| Modules not visible              | Module gate disabled for workspace       | Enable via Platform Command module toggles   |

---

## Subscription Tiers

| Plan         | Properties | Users | Client Portals | Equipment Assets |
|--------------|------------|-------|----------------|------------------|
| Trial        | 1          | 2     | 0              | 10               |
| Starter      | 5          | 5     | 1              | 50               |
| Professional | 25         | 15    | 3              | 200              |
| Business     | 100        | 50    | 10             | 1,000            |
| Enterprise   | Unlimited  | Unlimited | Unlimited  | Unlimited        |

---

*Last updated: March 2026 · APAS Consulting LLC*

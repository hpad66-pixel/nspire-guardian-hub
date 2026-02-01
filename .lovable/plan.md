
# Implementation Plan: Authentication Hardening & First-Time Onboarding Experience

## Executive Summary

Your application **already has authentication fully implemented**. However, you want to:
1. **Restrict who can sign up** (not allow the world to register)
2. **Create a guided onboarding flow** for first-time setup of properties and people

This plan covers both requirements to prepare the app for go-live.

---

## Part 1: Current Authentication Status

### What's Already Built

| Feature | Status | Location |
|---------|--------|----------|
| Login page | Done | `/auth` route |
| Sign up form | Done | `/auth` (tabs) |
| Password validation | Done | Zod schema (6+ chars) |
| Email validation | Done | Zod schema |
| Protected routes | Done | `ProtectedRoute` component |
| Session management | Done | `useAuth` hook |
| Role-based access | Done | `user_roles` table + `has_role()` function |
| Auto-redirect | Done | Redirects to `/` after login |

### Security Concern: Open Registration

Currently, **anyone can create an account** by visiting `/auth` and clicking "Sign Up". For a go-live scenario, you need to control who can register.

---

## Part 2: Registration Control Options

### Option A: Invitation-Only System (Recommended)

Only existing admins can invite new users. New users receive an email with a magic link to set their password.

**How it works:**
1. Remove public sign-up tab from `/auth`
2. Admin invites user via People page (enters email + role)
3. System sends invitation email with secure link
4. User clicks link, sets password, account is created

**Benefits:**
- Complete control over who joins
- Users are pre-assigned roles before first login
- Audit trail of who invited whom

### Option B: Email Domain Restriction

Only allow sign-ups from specific email domains (e.g., `@yourcompany.com`).

**How it works:**
1. Add domain validation to sign-up form
2. Reject registrations from non-approved domains

**Benefits:**
- Simpler to implement
- Self-service for approved domain users

### Option C: Admin Approval Queue

Users can request access, but must be approved by an admin before gaining access.

**How it works:**
1. User submits registration request
2. Account created but marked as "pending"
3. Admin reviews and approves in dashboard
4. User receives email when approved

---

## Part 3: First-Time Onboarding Wizard

When a new admin logs in to an empty system, they should see a guided setup wizard.

### Wizard Flow

```text
Step 1: Welcome
-----------------
"Welcome to NSPIRE Property OS!"
"Let's set up your first property in just a few steps."

    [Get Started]

Step 2: Add Your First Property
--------------------------------
[Property Name        ]
[Street Address       ]
[City     ] [State] [ZIP]
[Total Units          ]

"Which modules do you need?"
[ ] Daily Grounds Inspections
[ ] NSPIRE Compliance
[ ] Projects Management

    [Continue]

Step 3: Invite Your Team (Optional)
------------------------------------
"Add team members to help manage this property"

[Email Address    ] [Role Selector] [+ Add]

Listed invites:
- john@example.com (Inspector)
- jane@example.com (Manager)

    [Skip for Now]  [Send Invites]

Step 4: All Set!
-----------------
"Your property is ready!"

Summary:
- Property: Oak Ridge Apartments (50 units)
- Modules: Daily Grounds, NSPIRE
- Team: 2 invitations sent

    [Go to Dashboard]
```

### Trigger Conditions

Show onboarding wizard when:
- User is logged in
- User has admin or manager role
- No properties exist in the system

---

## Part 4: Technical Implementation

### Database Changes

**1. New table: `user_invitations`**
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**2. New table: `onboarding_status`**
```sql
CREATE TABLE onboarding_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  completed_at TIMESTAMPTZ,
  steps_completed JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Components

| Component | Purpose |
|-----------|---------|
| `OnboardingWizard.tsx` | Multi-step setup flow |
| `InviteUserDialog.tsx` | Admin dialog to invite users |
| `AcceptInvitePage.tsx` | Page for invited users to set password |

### Modified Files

| File | Changes |
|------|---------|
| `AuthPage.tsx` | Remove/hide Sign Up tab (invitation-only) |
| `App.tsx` | Add `/accept-invite/:token` route |
| `Dashboard.tsx` | Check onboarding status, show wizard if needed |
| `PeoplePage.tsx` | Add "Invite User" button for admins |

### New Edge Function

**`send-invitation`** - Sends invitation emails to new users

---

## Part 5: Implementation Order

### Phase 1: Registration Control
1. Create `user_invitations` table with RLS
2. Build `send-invitation` edge function
3. Create `InviteUserDialog` component
4. Add invite functionality to People page
5. Create `/accept-invite/:token` route
6. Build `AcceptInvitePage` with password setup
7. Hide public Sign Up from `/auth` (login-only)

### Phase 2: Onboarding Wizard
1. Create `onboarding_status` table
2. Build `useOnboarding` hook to check status
3. Create multi-step `OnboardingWizard` component
4. Integrate wizard trigger into Dashboard
5. Add property creation step
6. Add team invitation step
7. Mark onboarding complete when finished

### Phase 3: Polish
1. Add loading states and animations
2. Handle edge cases (expired invitations, etc.)
3. Add ability to resend invitations
4. Add progress indicator to wizard

---

## Part 6: Files to Create/Modify

### New Files (8 files)
| File | Description |
|------|-------------|
| `src/components/onboarding/OnboardingWizard.tsx` | Main wizard component |
| `src/components/onboarding/WelcomeStep.tsx` | Step 1: Welcome |
| `src/components/onboarding/PropertyStep.tsx` | Step 2: Add property |
| `src/components/onboarding/TeamStep.tsx` | Step 3: Invite team |
| `src/components/onboarding/CompleteStep.tsx` | Step 4: Success |
| `src/components/people/InviteUserDialog.tsx` | Invite new users |
| `src/pages/auth/AcceptInvitePage.tsx` | Accept invitation page |
| `src/hooks/useOnboarding.ts` | Onboarding state management |
| `supabase/functions/send-invitation/index.ts` | Send invite emails |

### Modified Files (5 files)
| File | Changes |
|------|---------|
| `src/pages/auth/AuthPage.tsx` | Hide Sign Up tab |
| `src/pages/Dashboard.tsx` | Show wizard for new admins |
| `src/pages/people/PeoplePage.tsx` | Add Invite User button |
| `src/App.tsx` | Add accept-invite route |
| `src/hooks/useAuth.tsx` | Add invitation acceptance logic |

### Database Migrations (2)
1. Create `user_invitations` table
2. Create `onboarding_status` table

---

## Summary

This implementation transforms your application from an open-registration system to a controlled, invitation-only platform with a guided first-time setup experience:

1. **Secure Access** - Only invited users can join
2. **Admin Control** - Admins invite team members with pre-assigned roles
3. **Guided Setup** - First-time wizard walks through property and team setup
4. **Go-Live Ready** - Clean, controlled user base from day one

The existing authentication infrastructure (login, sessions, roles) remains intact. We're adding an invitation layer on top and a friendly onboarding experience for new administrators.

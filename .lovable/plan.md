
# Implementation Plan: Email Report Delivery & Professional Inbox

## Overview

This plan adds two major features:
1. **Send Report via Email** - Ability to send inspection reports to multiple recipients with PDF attachment
2. **Report Inbox** - A professional inbox interface to track all sent reports and their delivery status

---

## Current State Analysis

### What Exists
- `report_emails` table in database with: `id`, `report_id`, `recipients[]`, `subject`, `sent_at`, `status`, `error_message`
- `InspectionReportDialog` with Print and Download PDF buttons
- PDF generation utility (`generatePDF`) already working
- No email-sending edge function
- No RESEND_API_KEY configured

### What's Missing
1. No edge function for sending emails with PDF attachments
2. No "Send Email" button in report dialog
3. No inbox/outbox page to track sent reports
4. `report_emails.report_id` references `daily_reports`, not `daily_inspections`

---

## Part 1: Database Schema Update

Update `report_emails` table to support both inspection reports and daily reports:

```sql
-- Add report_type column to distinguish between report types
ALTER TABLE report_emails 
ADD COLUMN report_type TEXT DEFAULT 'daily_report';

-- Add sender info
ALTER TABLE report_emails
ADD COLUMN sent_by UUID REFERENCES auth.users(id);

-- Add optional reference to daily_inspection
ALTER TABLE report_emails
ADD COLUMN daily_inspection_id UUID REFERENCES daily_inspections(id);

-- Make report_id nullable since we're adding daily_inspection_id
ALTER TABLE report_emails
ALTER COLUMN report_id DROP NOT NULL;

-- Add check constraint to ensure at least one reference exists
ALTER TABLE report_emails
ADD CONSTRAINT report_reference_check 
CHECK (report_id IS NOT NULL OR daily_inspection_id IS NOT NULL);
```

---

## Part 2: Create Email-Sending Edge Function

**File**: `supabase/functions/send-report-email/index.ts`

Create an edge function that:
1. Receives report data (HTML content, recipients, subject)
2. Uses Resend API to send formatted email with PDF attachment
3. Returns delivery status

### API Contract
```typescript
// Request
{
  recipients: string[];          // Array of email addresses
  subject: string;               // Email subject line
  reportType: 'daily_inspection' | 'daily_report';
  reportId: string;              // ID of the inspection/report
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  htmlContent: string;           // Report HTML for email body preview
  pdfBase64?: string;            // Optional: Pre-generated PDF as base64
}

// Response
{
  success: boolean;
  emailId?: string;
  error?: string;
}
```

### Email Template Design
- Professional HTML email template with:
  - Branded header
  - Summary section (property, date, inspector)
  - Quick status overview (OK/Attention/Defect counts)
  - Link to view full report online (optional future)
  - PDF attachment

---

## Part 3: Add "Send Email" Button to Report Dialog

**File**: `src/components/inspections/InspectionReportDialog.tsx`

### Changes
1. Add "Share" or "Email" button next to Print/Download
2. Opens `SendReportEmailDialog` component

### Updated Header Buttons
```
┌──────────────────────────────────────────────────────────┐
│ Daily Grounds Inspection Report           [Print] [↓PDF] │
│ Riverside Manor • February 1, 2026         [📧 Email]   │
└──────────────────────────────────────────────────────────┘
```

---

## Part 4: Create Send Report Email Dialog

**File**: `src/components/inspections/SendReportEmailDialog.tsx`

A modal for composing and sending the report email:

### UI Design
```
┌─────────────────────────────────────────────────────────┐
│  📧 Send Inspection Report                         [X]  │
├─────────────────────────────────────────────────────────┤
│  To:                                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ john@example.com [x]  sarah@company.com [x]      │   │
│  │ + Add recipient...                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Subject:                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Daily Grounds Inspection - Riverside Manor - ... │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Message (optional):                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Please find attached the daily grounds           │   │
│  │ inspection report for today.                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  📎 Attachment: inspection-report-2026-02-01.pdf       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                               [Cancel]  [📤 Send Email] │
└─────────────────────────────────────────────────────────┘
```

### Features
- Multiple recipient input with tag-style chips
- Email validation
- Auto-generated subject line
- Optional custom message
- Preview attachment filename
- Loading state during send
- Success/error toast notifications

---

## Part 5: Create Report Inbox Page

**File**: `src/pages/inbox/ReportInboxPage.tsx`

A professional inbox-style interface for tracking sent reports.

### UI Design - Inbox Style
```
┌─────────────────────────────────────────────────────────────────┐
│  📬 Report Inbox                              [Search...]       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Tabs: [All] [Sent ✓] [Failed ✗] [Pending ⏳]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✓  Daily Grounds - Riverside Manor              2 min ago  ││
│  │    To: john@example.com, sarah@company.com                  ││
│  │    Sent by You                                              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ✓  Daily Grounds - Glorieta Gardens           Yesterday    ││
│  │    To: admin@property.com                                   ││
│  │    Sent by John Smith                                       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ✗  NSPIRE Report - Sunset Apartments          Jan 30       ││
│  │    To: invalid@email                                        ││
│  │    Error: Recipient address rejected                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 3 of 24 emails                      [← Prev] [Next →] │
└─────────────────────────────────────────────────────────────────┘
```

### Features
- Filter by status (All, Sent, Failed, Pending)
- Search by subject, recipient, or property
- Click to view report detail
- Resend option for failed emails
- Pagination for large lists
- Time-based grouping (Today, Yesterday, This Week, etc.)

---

## Part 6: Create Report Email Hooks

**File**: `src/hooks/useReportEmails.ts`

```typescript
// Fetch sent emails with filtering
export function useReportEmails(filters?: ReportEmailFilters)

// Send a new email
export function useSendReportEmail()

// Get stats (sent, failed, pending counts)
export function useReportEmailStats()
```

---

## Part 7: Add Inbox to Sidebar Navigation

**File**: `src/components/layout/AppSidebar.tsx`

Add inbox link under Platform section:

```
Platform
├── Dashboard
├── Properties
├── Units
├── Assets
├── Issues
├── Work Orders
├── Documents
├── 📬 Inbox     ← NEW
├── People
└── Reports
```

---

## Part 8: Update App Router

**File**: `src/App.tsx`

Add route for inbox page:
```typescript
<Route path="/inbox" element={<ReportInboxPage />} />
```

---

## Implementation Summary

### Database Changes
1. Add columns to `report_emails`: `report_type`, `sent_by`, `daily_inspection_id`
2. Make `report_id` nullable
3. Add check constraint

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/send-report-email/index.ts` | Edge function for email delivery via Resend |
| `src/components/inspections/SendReportEmailDialog.tsx` | Email composition modal |
| `src/pages/inbox/ReportInboxPage.tsx` | Professional inbox interface |
| `src/hooks/useReportEmails.ts` | React Query hooks for emails |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/config.toml` | Register new edge function |
| `src/components/inspections/InspectionReportDialog.tsx` | Add "Email" button |
| `src/components/layout/AppSidebar.tsx` | Add Inbox navigation |
| `src/App.tsx` | Add inbox route |

---

## User Workflow

### Sending a Report
1. Complete daily grounds inspection
2. Click "View Report" to open report dialog
3. Click "📧 Email" button
4. Enter recipient email(s)
5. Customize subject (optional)
6. Add personal message (optional)
7. Click "Send Email"
8. Receive confirmation toast
9. Report logged to inbox

### Tracking Sent Reports
1. Click "Inbox" in sidebar
2. View all sent reports chronologically
3. Filter by status (Sent/Failed)
4. Search for specific reports
5. Click to view original report
6. Resend failed emails if needed

---

## Technical Notes

1. **Resend API** - Requires `RESEND_API_KEY` secret to be configured
2. **PDF as Attachment** - Generate PDF client-side, convert to base64, send to edge function
3. **Email Validation** - Validate emails client-side before sending
4. **Rate Limiting** - Consider adding rate limits to prevent spam
5. **RLS Policies** - Users can only view emails they sent or where they're admin/manager

---

## API Key Requirement

Before implementing the email functionality, the `RESEND_API_KEY` secret must be configured:
1. User needs a Resend account (https://resend.com)
2. Generate API key at https://resend.com/api-keys
3. Verify email domain at https://resend.com/domains
4. Add secret via Lovable secrets UI

---

## Future Enhancements (Not in Current Scope)

- Email templates (choose from preset designs)
- Scheduled sends (send tomorrow morning)
- CC/BCC support
- Email read receipts
- Attachment history
- Email thread replies

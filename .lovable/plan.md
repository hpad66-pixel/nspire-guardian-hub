

# Enterprise Construction Project Management Platform

## Executive Summary

This plan transforms your current application from a basic project tracker into an enterprise-grade construction management platform comparable to Procore. It addresses all the requirements you've outlined: enhanced daily reports with rich text editing and AI voice-to-text, unlimited photo uploads, full audit trails, owner portal access, and comprehensive user management with role-based access control.

---

## Phase 1: Enhanced Daily Reports System

### 1.1 Rich Text Editor Integration

Replace plain textareas with a professional rich text editor for daily report content.

**Features:**
- Bold, italic, underline, strikethrough formatting
- Bullet lists and numbered lists
- Headers and subheaders for sections
- Tables for organizing data
- Quote blocks for owner communications
- Code blocks for measurements/specifications

**Technical Approach:**
- Integrate TipTap editor (modern, extensible, React-friendly)
- Store content as HTML or Markdown in database
- Render formatted content in report views

### 1.2 AI Voice-to-Text Dictation

Enable field workers to dictate reports using their voice, with AI transcription.

**Features:**
- Microphone button in the daily report form
- Real-time transcription using Lovable AI
- Review and edit transcribed text before saving
- Support for construction terminology

**Technical Approach:**
- Create edge function `ai-transcribe` using Lovable AI Gateway
- Use browser's MediaRecorder API to capture audio
- Send audio to edge function for transcription
- Insert transcribed text into rich text editor

### 1.3 Unlimited Photo Uploads with Camera Support

Expand photo capabilities for daily reports.

**Features:**
- No limit on number of photos per report
- Take photos directly from device camera
- Upload from gallery/files
- Photo captions and annotations
- Automatic date/time stamps
- GPS location tagging (optional)
- Photo thumbnails with lightbox viewing
- Drag-and-drop reordering

**Technical Approach:**
- Create new storage bucket `daily-report-photos`
- Update PhotoUpload component with camera capture
- Store photo metadata (captions, location, timestamp)
- Create photo gallery component with lightbox

### 1.4 Report Schema Enhancements

Expand daily report data model for construction needs.

**New Fields:**
- `work_performed_html` - Rich text content
- `safety_notes` - Safety observations and incidents
- `equipment_used` - Equipment on site
- `materials_received` - Deliveries log
- `subcontractors` - Subcontractor crew information
- `delays` - Delay documentation with reasons
- `visitor_log` - Site visitors
- `inspector_notes` - For owner/inspector visits
- `signature` - Digital signature for report approval

---

## Phase 2: Professional Report Output

### 2.1 Printable/Downloadable Report Format

Create beautiful, professional daily report PDFs.

**Features:**
- Company letterhead/branding
- Project information header
- Weather conditions with icons
- Formatted work performed section
- Photo gallery with captions
- Issue tracking summary
- Digital signature line
- Page numbers and dates

**Technical Approach:**
- Create React component for print layout
- Use browser print API with CSS print styles
- Option to export as PDF via html2pdf library

### 2.2 Email Report Functionality

Send reports directly to stakeholders.

**Features:**
- Email report to project owner
- Email to superintendent/management
- CC/BCC support
- Attach PDF version
- Email history tracking

**Technical Approach:**
- Create edge function `send-report-email` using Resend
- Store email history in new `report_emails` table
- Track delivery status

---

## Phase 3: Complete User Management System

### 3.1 User Roles Enhancement

Expand role system for construction workflows.

**New Role Hierarchy:**

| Role | Description | Capabilities |
|------|-------------|--------------|
| `super_admin` | Platform administrator | Full system access, manage tenants |
| `owner` | Property/project owner | View-only portal, approve change orders |
| `admin` | Tenant administrator | Manage users, properties, all CRUD |
| `project_manager` | Project lead | Full project access, approve reports |
| `superintendent` | Site supervisor | Daily reports, crew management |
| `inspector` | Field inspector | Inspections, defect logging |
| `subcontractor` | External contractor | Limited project view, own reports |
| `viewer` | Read-only access | View assigned projects only |

**Database Changes:**
- Add new roles to `app_role` enum
- Create `project_team_members` table for project-level permissions
- Update RLS policies for role-based access

### 3.2 User Management Interface

Create comprehensive user administration.

**Features:**
- User list with search and filters
- Invite users via email
- Assign roles at tenant and project level
- Deactivate/reactivate users
- View user activity history
- Password reset management

**New Pages:**
- `/settings/users` - User management
- `/settings/users/invite` - User invitation
- `/settings/users/:id` - User profile/permissions

### 3.3 Project Team Assignment

Assign users to specific projects with permissions.

**Features:**
- Add/remove team members from projects
- Assign project-specific roles
- View team directory per project
- Email notifications for assignments

---

## Phase 4: Owner Portal

### 4.1 Owner-Specific Views

Create a portal for property owners to view their projects.

**Features:**
- Dashboard showing all their properties/projects
- Project progress and milestone status
- Daily report summaries (owner-filtered content)
- Change order review and approval
- Photo galleries organized by date
- Document access (contracts, permits, drawings)
- Financial summaries (budget, invoices)

**Technical Approach:**
- Create `/owner` route group
- Implement owner-specific RLS policies
- Filter sensitive internal content
- Owner approval workflows

### 4.2 Owner Notifications

Keep owners informed automatically.

**Features:**
- Weekly progress summaries via email
- Milestone completion alerts
- Change order pending approval notifications
- Project completion notice

---

## Phase 5: Communications Hub

### 5.1 Project Communications Log

Track all project communications.

**Features:**
- Log phone calls, emails, meetings
- Link communications to projects/issues
- Search and filter communication history
- Attach related documents

**New Table: `project_communications`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | Related project |
| type | enum | call, email, meeting, note |
| subject | text | Communication subject |
| content | text | Details/summary |
| participants | text[] | People involved |
| created_by | uuid | Who logged it |
| created_at | timestamp | When logged |

### 5.2 RFI (Request for Information) Management

Industry-standard RFI workflow.

**Features:**
- Create RFIs with questions/clarifications
- Assign to architects, engineers, owners
- Track response status and due dates
- Link to drawings/documents
- RFI log with search/export

### 5.3 Submittals Tracking

Track shop drawings and material submittals.

**Features:**
- Submit for approval workflow
- Revision tracking
- Approval status (approved, rejected, revise)
- Due date tracking

---

## Phase 6: Complete Audit Trail

### 6.1 Activity Logging

Track all system changes.

**New Table: `activity_log`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| entity_type | text | table name (project, report, etc.) |
| entity_id | uuid | Record ID |
| action | text | create, update, delete |
| changes | jsonb | Before/after values |
| user_id | uuid | Who made change |
| ip_address | text | User's IP |
| user_agent | text | Browser info |
| created_at | timestamp | When |

**Technical Approach:**
- Create database triggers for key tables
- Store field-level changes in JSONB
- Create audit log viewer in settings

### 6.2 Audit Log Viewer

Interface to review all changes.

**Features:**
- Filter by entity, user, date range
- View change details with diff
- Export audit reports
- User activity timeline

---

## Phase 7: Enhanced Project Features

### 7.1 Punch List Management

Track closeout items.

**Features:**
- Create punch items from inspections
- Assign to subcontractors
- Photo before/after
- Approval workflow
- Punch list reports

### 7.2 Project Documents

Document management system.

**Features:**
- Upload contracts, drawings, permits
- Folder organization
- Version control
- Access permissions
- Document checkout/editing

### 7.3 Project Schedule (Gantt)

Visual schedule management.

**Features:**
- Gantt chart view of milestones
- Drag-and-drop scheduling
- Dependencies between tasks
- Critical path highlighting
- Baseline vs. actual comparison

---

## Database Schema Changes Summary

### New Tables

```text
project_team_members
- id, project_id, user_id, role, added_by, added_at

project_communications
- id, project_id, type, subject, content, participants[], created_by, created_at

project_rfis
- id, project_id, number, subject, question, response, status, due_date, assigned_to, created_by

project_submittals
- id, project_id, number, title, status, revision, due_date, created_by

punch_items
- id, project_id, location, description, assigned_to, status, before_photos[], after_photos[]

project_documents
- id, project_id, folder, name, file_url, version, uploaded_by, uploaded_at

activity_log
- id, entity_type, entity_id, action, changes, user_id, ip_address, created_at

report_emails
- id, report_id, recipients, subject, sent_at, status
```

### Modified Tables

```text
daily_reports
- ADD: work_performed_html, safety_notes, equipment_used, materials_received
- ADD: subcontractors, delays, visitor_log, signature, signature_date

user_roles
- UPDATE app_role enum: add 'owner', 'project_manager', 'superintendent', 'subcontractor'
```

### New Storage Buckets

```text
daily-report-photos (public)
project-documents (private)
```

---

## New Components Summary

### Pages

| Page | Purpose |
|------|---------|
| `/settings/users` | User management |
| `/settings/audit-log` | Audit trail viewer |
| `/owner` | Owner portal dashboard |
| `/owner/projects/:id` | Owner project view |
| `/projects/:id/team` | Project team management |
| `/projects/:id/documents` | Document management |
| `/projects/:id/rfis` | RFI management |
| `/projects/:id/punch-list` | Punch list |
| `/projects/:id/communications` | Communications log |

### Components

| Component | Purpose |
|-----------|---------|
| `RichTextEditor` | TipTap-based editor |
| `VoiceDictation` | Microphone + AI transcription |
| `EnhancedPhotoUpload` | Camera + gallery + annotations |
| `PrintableReport` | PDF-ready report layout |
| `UserManagement` | User CRUD interface |
| `AuditLogViewer` | Activity history |
| `GanttChart` | Schedule visualization |
| `DocumentManager` | File upload/management |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-transcribe` | Voice-to-text using Lovable AI |
| `send-report-email` | Email daily reports |
| `send-notification` | Owner/user notifications |

---

## Implementation Priority

### Immediate (This Phase)

1. Rich text editor for daily reports
2. AI voice dictation
3. Enhanced photo uploads with camera
4. Printable/downloadable reports
5. User management interface with full RBAC
6. Audit trail system

### Next Phase

7. Owner portal
8. Communications log
9. RFI management
10. Project documents

### Future

11. Gantt chart scheduling
12. Punch list management
13. Submittals tracking
14. Mobile-optimized field app

---

## Expected Outcome

After implementation, you will have:

- Professional daily reports with rich formatting and voice dictation
- Unlimited photo uploads with camera capture
- Beautiful printable/emailable reports
- Complete user management with role-based permissions
- Owner portal for client transparency
- Full audit trail of every action
- Communications tracking for project documentation
- Enterprise-grade security with proper RLS policies

This transforms the application from a basic tracker into a professional construction management platform suitable for real projects and client-facing use.


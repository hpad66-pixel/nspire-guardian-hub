
## Add "Email Externally" to RFIs, Submittals, Change Orders, Progress Reports & Proposals

### What This Does
Every major project document type — RFIs, Submittals, Change Orders, Progress Reports, and Proposals — will get a premium **"Email Externally"** button/action. Clicking it opens a beautiful, reusable email compose dialog that lets users send the document to any external party (architect, subcontractor, owner, inspector, etc.) as a formatted email — with CC/BCC support, a pre-filled subject, optional personal message, and a PDF attachment of the document.

### Reference: Procore Screenshot Analysis
The Procore screenshot shows an RFI detail page with an **"Emails (0)"** tab, a **Distribution List**, and metadata fields. Our version will be far more actionable — instead of just tracking email history on a separate tab, we'll give users a **one-click "Send via Email"** button right on each item that opens a polished compose dialog, 10x better than Procore's passive tab approach.

---

### Architecture

A single reusable `SendExternalEmailDialog` component will be created. Each document type just passes the relevant context (title, type, content) and the dialog handles the rest. No duplication.

```text
src/components/projects/
  └─ SendExternalEmailDialog.tsx    ← NEW: reusable dialog (all document types)

Components Updated:
  ├─ RFIDetailSheet.tsx             ← Add "Send Email" button (sheet action)
  ├─ RFIList.tsx                    ← Add "Send Email" per-row action (dropdown)
  ├─ SubmittalsTab.tsx              ← Add "Send Email" per-row action
  ├─ ChangeOrdersList.tsx           ← Add "Send Email" per-item action
  ├─ ReportGeneratorDialog.tsx      ← Add "Email Report" button in review step
  └─ ProposalList.tsx               ← Add "Email" option in dropdown menu
```

---

### Technical Plan

#### Step 1 — New Reusable Component: `SendExternalEmailDialog.tsx`

Build a rich email composition dialog (inspired by the existing `SendReportEmailDialog` from inspections, which already has an excellent pattern with ContactPicker + badge recipients).

**Props interface:**
```typescript
interface SendExternalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'rfi' | 'submittal' | 'change_order' | 'progress_report' | 'proposal';
  documentTitle: string;
  documentId: string;
  projectName: string;
  defaultSubject?: string;
  contentHtml?: string;    // for inline email body preview
  onSent?: () => void;
}
```

**Dialog design (premium, 10x Procore):**

- **Header**: Icon (Mail) + "Send via Email" + document type chip badge (e.g. "RFI #9")
- **Document preview card**: compact card showing document title, type chip, project name — so sender confirms what they're emailing
- **To field**: Multi-email tag input with:
  - Free-type any external email
  - "From Contacts" button → opens existing `ContactPicker` component (already built)
  - Tag badges with × remove
- **CC field**: Collapsible (show "Add CC/BCC +" link), same multi-email tag input
- **BCC field**: Same as CC, collapsed by default
- **Subject**: Pre-filled intelligently based on document type (e.g. `"RFI #9 — Testing Company Information | [Project Name]"`)
- **Personal message**: Textarea with placeholder — optional note shown in email body above the document details
- **Attachment notice**: Pill showing `📎 Document summary included` (email body will contain formatted document info — no actual PDF required for RFIs/submittals, since we don't generate per-item PDFs; for Progress Reports and Proposals we use the existing PDF generation)
- **Send button**: Primary CTA with loading state

**Email content strategy by type:**
- **RFI**: Subject: question, Due date, Status, Response (if any) — formatted as HTML table
- **Submittal**: Title, submittal number, status, due date
- **Change Order**: Title, amount, status, description
- **Progress Report**: Uses existing PDF generation from `ReportGeneratorDialog` (already has `generatePDF`)
- **Proposal**: Uses existing PDF path from `ProposalSendDialog` (already generates PDF)

The dialog calls `useSendEmail` hook (the simple compose hook at `src/hooks/useSendEmail.ts`) which invokes the `send-email` edge function — this is already fully wired up and working for the mailbox module.

#### Step 2 — Wire into RFIDetailSheet

In `RFIDetailSheet.tsx`, add a **"Send via Email"** button in the actions section (alongside the existing "Close RFI" button):

```
[ Close RFI ]   [ Send via Email ↗ ]
```

Pass: `documentType="rfi"`, `documentTitle={rfi.subject}`, `documentId={rfi.id}`, and construct `contentHtml` from the RFI's question + response fields.

Also add a per-row **dropdown action** in `RFIList.tsx` — each table row gets a `...` menu with "Open" and "Send via Email" options (mirrors the Procore "Emails" tab concept but far more accessible).

#### Step 3 — Wire into SubmittalsTab

In `SubmittalsTab.tsx`, add a **Mail icon button** on each submittal row (between the status badge and the status select dropdown). Clicking it opens the dialog for that submittal.

#### Step 4 — Wire into ChangeOrdersList

In `ChangeOrdersList.tsx`, add a **"Send via Email"** button for each change order item. Most useful for **pending** orders (send to client/owner for approval) but available on all statuses. Place it next to the existing Approve/Reject/Edit buttons.

#### Step 5 — Wire into ReportGeneratorDialog (Progress Reports)

In the **review step** of `ReportGeneratorDialog.tsx`, an existing `Mail` icon button is already present but needs to be wired to the external email dialog instead of (or in addition to) the internal send. Add a "Send Externally" option that opens `SendExternalEmailDialog` with PDF generation.

#### Step 6 — Wire into ProposalList

In `ProposalList.tsx`, add an **"Email Externally"** `DropdownMenuItem` in the per-proposal `...` menu. Currently the menu has View/Edit, Duplicate, Delete. Add **"Send via Email"** between Edit and Duplicate. This opens `SendExternalEmailDialog` with PDF generation (reusing the `ProposalSendDialog` PDF logic).

---

### Files to Create
| File | Description |
|---|---|
| `src/components/projects/SendExternalEmailDialog.tsx` | New reusable email dialog |

### Files to Modify
| File | Change |
|---|---|
| `src/components/projects/RFIDetailSheet.tsx` | Add Send button in actions area |
| `src/components/projects/RFIList.tsx` | Add per-row dropdown with Send option |
| `src/components/projects/SubmittalsTab.tsx` | Add Mail button per row |
| `src/components/projects/ChangeOrdersList.tsx` | Add Send button per change order |
| `src/components/projects/ReportGeneratorDialog.tsx` | Wire email button in review step |
| `src/components/proposals/ProposalList.tsx` | Add Email option in dropdown |

### No Database Changes Required
The existing `send-email` edge function and `report_emails` table already handle external email sending and logging. No new tables or migrations needed.

---

### UX Flow (10x Better Than Procore)

**Procore:** User must navigate to a separate "Emails" tab, then click "Create Email", then fill a form.

**Our version:**
1. User clicks **"⇗ Email Externally"** directly on the RFI/Submittal/Change Order
2. Compose dialog appears with document details pre-filled
3. User types recipient email or picks from Contacts
4. Hits Send — email sent instantly, logged in the mailbox system
5. Done — 3 steps, no navigation required

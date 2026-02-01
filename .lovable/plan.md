
# Implementation Plan: AI-Powered Project Proposal & Correspondence System

## Executive Summary

Build a comprehensive proposal generation and correspondence management system within the Projects module. This system enables super admins/consultants to create AI-powered proposals, edit them with a rich text editor, brand them with company letterheads, attach documents, and send them to clients - all tracked within the existing mailbox system.

---

## Part 1: Architecture Overview

### System Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROPOSAL LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│   │  DRAFT   │ -> │  REVIEW  │ -> │ APPROVED │ -> │   SENT   │              │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│        │                                                                     │
│        v                                                                     │
│   ┌──────────────────────────────────────────┐                              │
│   │     AI GENERATION (Gemini)               │                              │
│   │  • Project context auto-included         │                              │
│   │  • Prompt templates for proposal types   │                              │
│   │  • Streaming response                    │                              │
│   └──────────────────────────────────────────┘                              │
│        │                                                                     │
│        v                                                                     │
│   ┌──────────────────────────────────────────┐                              │
│   │     RICH TEXT EDITING                    │                              │
│   │  • Full formatting controls              │                              │
│   │  • Insert images/tables                  │                              │
│   │  • Version history                       │                              │
│   └──────────────────────────────────────────┘                              │
│        │                                                                     │
│        v                                                                     │
│   ┌──────────────────────────────────────────┐                              │
│   │     BRANDING & FINALIZATION              │                              │
│   │  • Company letterhead                    │                              │
│   │  • Logo placement                        │                              │
│   │  • PDF generation                        │                              │
│   └──────────────────────────────────────────┘                              │
│        │                                                                     │
│        v                                                                     │
│   ┌──────────────────────────────────────────┐                              │
│   │     SEND & TRACK                         │                              │
│   │  • Email via Resend                      │                              │
│   │  • Tracked in Mailbox                    │                              │
│   │  • PDF attachment stored                 │                              │
│   └──────────────────────────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Role-Based Access

| Role | Can View | Can Create | Can Edit | Can Send | Can Delete |
|------|----------|------------|----------|----------|------------|
| Admin | All | Yes | Yes | Yes | Yes |
| Manager | All | No | No | No | No |
| Other Roles | None | No | No | No | No |

---

## Part 2: Database Schema

### New Tables

```sql
-- Proposal types enum
CREATE TYPE proposal_type AS ENUM (
  'project_proposal',
  'change_order_request',
  'scope_amendment',
  'cost_estimate',
  'letter',
  'memo',
  'correspondence'
);

-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'review',
  'approved',
  'sent',
  'archived'
);

-- Project proposals table
CREATE TABLE project_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Proposal metadata
  proposal_number SERIAL,
  proposal_type proposal_type NOT NULL DEFAULT 'project_proposal',
  title TEXT NOT NULL,
  subject TEXT,
  status proposal_status NOT NULL DEFAULT 'draft',
  
  -- Content
  content_html TEXT,
  content_text TEXT,
  
  -- AI generation metadata
  ai_prompt TEXT,
  ai_generated BOOLEAN DEFAULT false,
  
  -- Branding
  include_letterhead BOOLEAN DEFAULT true,
  include_logo BOOLEAN DEFAULT true,
  letterhead_config JSONB DEFAULT '{}',
  
  -- Recipients
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_company TEXT,
  recipient_address TEXT,
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  sent_email_id UUID REFERENCES report_emails(id),
  
  -- Attachments (stored as array of document IDs)
  attachment_ids UUID[] DEFAULT '{}',
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES project_proposals(id)
);

-- Proposal templates for AI generation
CREATE TABLE proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  proposal_type proposal_type NOT NULL,
  prompt_template TEXT NOT NULL,
  content_template TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company branding settings (stored per user/organization)
CREATE TABLE company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#3b82f6',
  address_line1 TEXT,
  address_line2 TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_proposals_project ON project_proposals(project_id);
CREATE INDEX idx_proposals_status ON project_proposals(status);
CREATE INDEX idx_proposals_created_by ON project_proposals(created_by);

-- RLS
ALTER TABLE project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_branding ENABLE ROW LEVEL SECURITY;

-- Only admins can manage proposals
CREATE POLICY "Admins can manage proposals" ON project_proposals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all proposals" ON project_proposals
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- Templates accessible to admins
CREATE POLICY "Admins can manage templates" ON proposal_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated can view templates" ON proposal_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Branding owned by user
CREATE POLICY "Users manage own branding" ON company_branding
  FOR ALL USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON project_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON company_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO proposal_templates (name, description, proposal_type, prompt_template, is_default) VALUES
(
  'Project Proposal',
  'Standard project proposal template',
  'project_proposal',
  'Generate a professional project proposal for the following project:

Project Name: {{project_name}}
Property: {{property_name}}
Description: {{project_description}}
Scope: {{project_scope}}
Budget: {{budget}}
Timeline: {{start_date}} to {{target_end_date}}

The proposal should include:
1. Executive Summary
2. Project Understanding
3. Proposed Approach
4. Scope of Work
5. Timeline and Milestones
6. Investment Summary
7. Terms and Conditions
8. Next Steps

Write in a professional, confident tone. Be specific about deliverables.',
  true
),
(
  'Change Order Request',
  'Request for project scope or cost changes',
  'change_order_request',
  'Generate a professional change order request for:

Project Name: {{project_name}}
Property: {{property_name}}
Current Status: {{project_status}}

Change Details:
{{user_notes}}

The request should include:
1. Change Order Summary
2. Reason for Change
3. Impact on Timeline
4. Cost Impact
5. Required Approvals',
  true
),
(
  'Professional Letter',
  'General business correspondence',
  'letter',
  'Generate a professional business letter regarding:

Project Name: {{project_name}}
Property: {{property_name}}
Subject: {{subject}}

Key Points:
{{user_notes}}

The letter should be formal, clear, and professional.',
  true
);
```

---

## Part 3: Edge Function for AI Proposal Generation

### New Edge Function: `generate-proposal`

```typescript
// supabase/functions/generate-proposal/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateProposalRequest {
  projectId: string;
  proposalType: string;
  templateId?: string;
  userNotes?: string;
  subject?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: GenerateProposalRequest = await req.json();
    const { projectId, proposalType, templateId, userNotes, subject } = body;

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`*, property:properties(name, address, city, state)`)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    let template;
    if (templateId) {
      const { data } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      template = data;
    } else {
      const { data } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("proposal_type", proposalType)
        .eq("is_default", true)
        .single();
      template = data;
    }

    if (!template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with project context
    const prompt = template.prompt_template
      .replace("{{project_name}}", project.name)
      .replace("{{property_name}}", project.property?.name || "N/A")
      .replace("{{project_description}}", project.description || "N/A")
      .replace("{{project_scope}}", project.scope || "N/A")
      .replace("{{budget}}", project.budget ? `$${project.budget.toLocaleString()}` : "TBD")
      .replace("{{start_date}}", project.start_date || "TBD")
      .replace("{{target_end_date}}", project.target_end_date || "TBD")
      .replace("{{project_status}}", project.status)
      .replace("{{user_notes}}", userNotes || "")
      .replace("{{subject}}", subject || "");

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional business consultant and proposal writer. 
            Generate clear, professional, and persuasive business documents.
            Use proper formatting with headings, bullet points, and clear sections.
            Output in HTML format suitable for rendering in a rich text editor.
            Use semantic HTML tags: h2 for main sections, h3 for subsections, p for paragraphs, ul/li for lists.`,
          },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("AI Gateway error:", error);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to generate proposal");
    }

    // Stream response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in generate-proposal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## Part 4: Frontend Components

### New Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useProposals.ts` | CRUD hooks for proposals |
| `src/hooks/useCompanyBranding.ts` | Branding settings hook |
| `src/hooks/useProposalGeneration.ts` | AI streaming hook |
| `src/components/proposals/ProposalList.tsx` | List of proposals for a project |
| `src/components/proposals/ProposalEditor.tsx` | Full proposal editor with AI |
| `src/components/proposals/ProposalPreview.tsx` | Branded preview for PDF |
| `src/components/proposals/ProposalAIPanel.tsx` | AI generation sidebar |
| `src/components/proposals/ProposalSendDialog.tsx` | Send to recipient dialog |
| `src/components/proposals/BrandingSettings.tsx` | Company branding config |
| `src/components/proposals/LetterheadPreview.tsx` | Letterhead preview |

### Project Detail Page Update

Add new "Proposals" tab to the project detail page:

```text
TABS: [Overview] [Schedule] [Daily Logs] [Financials] [RFIs] [Punch List] [Proposals]
                                                                              ^NEW
```

---

## Part 5: UI Design - Apple-Inspired

### Proposal Editor Layout

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  [← Back]  New Proposal                    [Preview] [Save Draft] [Send ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────┬──────────────────────────────────────┐  │
│  │  AI ASSISTANT                  │  DOCUMENT EDITOR                     │  │
│  │  ─────────────────────         │  ────────────────                    │  │
│  │                                │                                      │  │
│  │  Template:                     │  ┌──────────────────────────────┐    │  │
│  │  [Project Proposal    ▼]       │  │ [B] [I] [U] [H2] [H3] [•] [1]│    │  │
│  │                                │  ├──────────────────────────────┤    │  │
│  │  Additional Context:           │  │                              │    │  │
│  │  ┌────────────────────────┐    │  │  <Content appears here>      │    │  │
│  │  │ Describe any specific  │    │  │                              │    │  │
│  │  │ requirements...        │    │  │  The generated proposal      │    │  │
│  │  └────────────────────────┘    │  │  with full editing...        │    │  │
│  │                                │  │                              │    │  │
│  │  [✨ Generate with AI]         │  │                              │    │  │
│  │                                │  │                              │    │  │
│  │  ─────────────────────         │  │                              │    │  │
│  │                                │  │                              │    │  │
│  │  Recipient:                    │  │                              │    │  │
│  │  Name: _______________         │  │                              │    │  │
│  │  Email: ______________         │  │                              │    │  │
│  │  Company: ____________         │  │                              │    │  │
│  │                                │  │                              │    │  │
│  │  ─────────────────────         │  │                              │    │  │
│  │                                │  └──────────────────────────────┘    │  │
│  │  Attachments:                  │                                      │  │
│  │  [+ Add from Documents]        │  Branding:                           │  │
│  │  📎 Scope_Document.pdf         │  ☑ Include letterhead                │  │
│  │  📎 Cost_Estimate.xlsx         │  ☑ Include logo                      │  │
│  │                                │  [Configure Branding →]              │  │
│  │                                │                                      │  │
│  └────────────────────────────────┴──────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Proposal List View

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  📄 PROPOSALS & CORRESPONDENCE                        [+ New Proposal]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ #1  Project Proposal - Elevator Modernization       [Sent ✓]           │ │
│  │     To: John Smith (john@client.com)               Feb 1, 2026         │ │
│  │     Sent via email with 2 attachments                                  │ │
│  │                                                    [View] [Duplicate]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ #2  Change Order Request - Additional HVAC Work     [Draft]            │ │
│  │     Not sent                                       Updated 2h ago      │ │
│  │                                                                        │ │
│  │                                          [Edit] [Preview] [Delete]     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Branded PDF Preview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ┌───────────────────────────────────────────────────────────────┐   │    │
│  │ │  [COMPANY LOGO]                                               │   │    │
│  │ │                                                               │   │    │
│  │ │  COMPANY NAME                                                 │   │    │
│  │ │  123 Business Street, City, State 12345                       │   │    │
│  │ │  Phone: (555) 123-4567 | Email: info@company.com              │   │    │
│  │ ├───────────────────────────────────────────────────────────────┤   │    │
│  │ │                                                               │   │    │
│  │ │  February 1, 2026                                             │   │    │
│  │ │                                                               │   │    │
│  │ │  John Smith                                                   │   │    │
│  │ │  Client Company                                               │   │    │
│  │ │  456 Client Ave, City, State 67890                            │   │    │
│  │ │                                                               │   │    │
│  │ │  RE: Project Proposal - Elevator Modernization                │   │    │
│  │ │                                                               │   │    │
│  │ │  Dear Mr. Smith,                                              │   │    │
│  │ │                                                               │   │    │
│  │ │  [Generated proposal content...]                              │   │    │
│  │ │                                                               │   │    │
│  │ ├───────────────────────────────────────────────────────────────┤   │    │
│  │ │  [Footer with company info]                                   │   │    │
│  │ └───────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  [◀ Page 1 of 3 ▶]                       [Download PDF] [Print] [Send →]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Company Branding Settings

### Branding Configuration Dialog

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Company Branding Settings                                         [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMPANY INFO                                                                │
│  ─────────────                                                               │
│  Company Name: _________________________________                             │
│  Address Line 1: _______________________________                             │
│  Address Line 2: _______________________________                             │
│  Phone: ________________________________________                             │
│  Email: ________________________________________                             │
│  Website: ______________________________________                             │
│                                                                              │
│  BRANDING                                                                    │
│  ─────────                                                                   │
│  Logo:                                                                       │
│  ┌────────────────────┐                                                     │
│  │  [Upload Logo]     │  Recommended: 400x100px PNG                         │
│  │  📷 Current logo   │                                                     │
│  └────────────────────┘                                                     │
│                                                                              │
│  Primary Color: [■ #1e40af]  Secondary Color: [■ #3b82f6]                   │
│                                                                              │
│  Footer Text:                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Confidential - For intended recipient only                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  PREVIEW                                                                     │
│  ───────                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  [Letterhead Preview]                                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                    [Cancel]  [Save Changes] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Integration with Mailbox

When a proposal is sent:
1. Generate branded PDF
2. Call `send-report-email` edge function (extended to support proposals)
3. Store email record in `report_emails` table with type `proposal`
4. Link back to proposal via `sent_email_id`
5. Proposal appears in Sent folder of Mailbox
6. Track open/read status

### Update `report_emails` Table

```sql
-- Add proposal type support
ALTER TABLE report_emails 
ADD COLUMN proposal_id UUID REFERENCES project_proposals(id);

-- Update report_type check or add new value
UPDATE report_emails SET report_type = 'proposal' WHERE proposal_id IS NOT NULL;
```

---

## Part 8: Hooks Architecture

### useProposals.ts

```typescript
// Core CRUD operations
export function useProposalsByProject(projectId: string | null)
export function useProposal(id: string | null)
export function useCreateProposal()
export function useUpdateProposal()
export function useDeleteProposal()
export function useSendProposal()

// Proposal stats
export function useProposalStats(projectId: string | null)
```

### useProposalGeneration.ts

```typescript
// AI streaming generation
export function useGenerateProposal({
  onDelta: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
})
```

### useCompanyBranding.ts

```typescript
export function useCompanyBranding()
export function useUpdateBranding()
export function useUploadLogo()
```

---

## Part 9: Admin-Only Access Control

### Frontend Guard

```typescript
// In ProposalList.tsx and ProposalEditor.tsx
const { data: userRole } = useCurrentUserRole();
const isAdmin = userRole === 'admin';

if (!isAdmin) {
  return (
    <div className="text-center py-12">
      <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Admin Access Required</h3>
      <p className="text-muted-foreground">
        Proposal creation is available to administrators only.
      </p>
    </div>
  );
}
```

### Backend RLS (Already Included)

The RLS policies in Part 2 ensure only users with the `admin` role can create, update, or delete proposals.

---

## Part 10: Implementation Order

### Phase 1: Database Setup
1. Create database migration with all new tables
2. Add proposal templates
3. Update report_emails for proposal support

### Phase 2: Backend
4. Create `generate-proposal` edge function
5. Update `send-report-email` to handle proposals

### Phase 3: Hooks
6. Create `useProposals.ts`
7. Create `useProposalGeneration.ts`
8. Create `useCompanyBranding.ts`

### Phase 4: UI Components
9. Create `ProposalList.tsx`
10. Create `ProposalEditor.tsx` with AI panel
11. Create `ProposalPreview.tsx` with branding
12. Create `ProposalSendDialog.tsx`
13. Create `BrandingSettings.tsx`

### Phase 5: Integration
14. Add Proposals tab to ProjectDetailPage
15. Add branding settings to Settings page
16. Update Mailbox to show proposal emails
17. Test full workflow end-to-end

---

## Part 11: File Structure Summary

### New Files

| Category | File |
|----------|------|
| Edge Function | `supabase/functions/generate-proposal/index.ts` |
| Hooks | `src/hooks/useProposals.ts` |
| Hooks | `src/hooks/useProposalGeneration.ts` |
| Hooks | `src/hooks/useCompanyBranding.ts` |
| Components | `src/components/proposals/ProposalList.tsx` |
| Components | `src/components/proposals/ProposalEditor.tsx` |
| Components | `src/components/proposals/ProposalPreview.tsx` |
| Components | `src/components/proposals/ProposalAIPanel.tsx` |
| Components | `src/components/proposals/ProposalSendDialog.tsx` |
| Components | `src/components/proposals/BrandingSettings.tsx` |
| Components | `src/components/proposals/LetterheadPreview.tsx` |
| Components | `src/components/proposals/PrintableProposal.tsx` |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/projects/ProjectDetailPage.tsx` | Add Proposals tab |
| `src/pages/settings/SettingsPage.tsx` | Add Branding section |
| `supabase/functions/send-report-email/index.ts` | Support proposal emails |

---

## Summary

This implementation creates a complete proposal generation and correspondence system that:

1. **AI-Powered**: Uses Gemini via Lovable AI to generate professional proposals
2. **Admin-Only**: Restricted to super admin/consultant role via RLS
3. **Rich Editing**: Full formatting with the existing TipTap editor
4. **Branded Output**: Company letterhead, logo, colors for professional PDFs
5. **Attachment Support**: Link documents from the project document center
6. **Email Integration**: Send via Resend, tracked in Mailbox
7. **Version History**: Track revisions and maintain proposal history
8. **Apple-Inspired UX**: Clean, minimalist, intuitive interface

The system integrates seamlessly with existing infrastructure (mailbox, documents, PDF generation) while adding powerful AI capabilities for professional document generation.

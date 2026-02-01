
# Implementation Plan: Training Academy Module

## Executive Summary

This plan creates a comprehensive Training Academy page designed for operational, hands-on learning for property management staff, subcontractors, and employees. The page will integrate LearnWorld LMS access, embedded eBooks/flipbooks, and a feedback system to capture learner inputs.

---

## Part 1: Design Philosophy

### Operational Learning Focus
Unlike academic learning management systems, this training page prioritizes:
- **Hands-on skills** - Property inspections, maintenance procedures, safety protocols
- **Quick access** - One-click access to LearnWorld courses and eBook resources
- **Role-based content** - Content organized by job function (Inspector, Superintendent, etc.)
- **Onboarding workflows** - New employee/subcontractor orientation paths
- **Feedback loop** - Capture training requests and suggestions from the field

### Apple-Inspired Design
Following the existing dashboard aesthetic:
- Clean, minimalist interface with generous whitespace
- Card-based content organization
- Gradient accents for visual hierarchy
- Smooth transitions and hover states

---

## Part 2: Page Structure

### Training Academy Layout

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Training Academy                                                                     │
│ Operational training resources for your team                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │ Total Courses    │  │ Quick Reference  │  │ Team Members     │  │ Feedback     ││
│  │      24          │  │ Guides           │  │ Enrolled         │  │ Requests     ││
│  │                  │  │      12          │  │     18           │  │      5       ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────┘│
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │ [All Training] [By Role] [Quick Start Guides] [eBooks] [Request Training]     │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ═══════════════════════════════════════════════════════════════════════════════   │
│                                                                                      │
│  QUICK ACCESS                                                     [Open LearnWorld] │
│  ─────────────                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │  │ 🎓          │  │ 🔧          │  │ 🛡️          │  │ 📋          │        │   │
│  │  │ New Hire    │  │ Maintenance │  │ Safety      │  │ NSPIRE      │        │   │
│  │  │ Onboarding  │  │ Essentials  │  │ Protocols   │  │ Compliance  │        │   │
│  │  │             │  │             │  │             │  │             │        │   │
│  │  │ 8 modules   │  │ 12 modules  │  │ 6 modules   │  │ 15 modules  │        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │   │
│  │                                                                              │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  eBook LIBRARY                                                                       │
│  ─────────────                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                                     │    │   │
│  │  │             [EMBEDDED FLIPBOOK iFrame]                              │    │   │
│  │  │                                                                     │    │   │
│  │  │             PRD Professional eBook                                  │    │   │
│  │  │                                                                     │    │   │
│  │  └─────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                              │   │
│  │  [← Previous]                                                [Next →]       │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ROLE-BASED LEARNING PATHS                                                          │
│  ─────────────────────────                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐            │
│  │ Inspector Track    │  │ Superintendent     │  │ Property Manager   │            │
│  │ 12 required courses│  │ Track              │  │ Track              │            │
│  │                    │  │ 18 required courses│  │ 22 required courses│            │
│  │ [View Path →]      │  │ [View Path →]      │  │ [View Path →]      │            │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tabs Structure

| Tab | Content |
|-----|---------|
| **All Training** | Full catalog of courses and resources |
| **By Role** | Learning paths organized by job function |
| **Quick Start Guides** | Short, operational how-to guides |
| **eBooks** | Embedded flipbook viewer with library navigation |
| **Request Training** | Feedback form for training requests |

---

## Part 3: Database Schema

### New Tables

**1. `training_resources`** - Catalog of training materials
```sql
CREATE TABLE training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'course', 'ebook', 'video', 'guide', 'document'
  category TEXT NOT NULL, -- 'onboarding', 'maintenance', 'safety', 'compliance', 'operations'
  target_roles app_role[] DEFAULT '{}', -- Which roles this is for
  external_url TEXT, -- LearnWorld course URL
  embed_code TEXT, -- For eBooks/flipbooks
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**2. `training_progress`** - Track user completion
```sql
CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES training_resources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);
```

**3. `training_requests`** - Feedback and requests from staff
```sql
CREATE TABLE training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'new_topic', 'improvement', 'question', 'resource_request'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'implemented', 'declined'
  admin_response TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

```sql
-- training_resources: All authenticated users can view
CREATE POLICY "Authenticated users can view training resources"
  ON training_resources FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage training resources"
  ON training_resources FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- training_progress: Users can manage their own progress
CREATE POLICY "Users can view own progress"
  ON training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON training_progress FOR ALL
  USING (auth.uid() = user_id);

-- training_requests: Users can create and view own requests
CREATE POLICY "Users can manage own requests"
  ON training_requests FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON training_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can respond to requests"
  ON training_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
```

---

## Part 4: UI Components

### Training Page Components

| Component | Purpose |
|-----------|---------|
| `TrainingPage.tsx` | Main training academy page with tabs |
| `TrainingCatalog.tsx` | Grid of training resources with filtering |
| `LearningPathCard.tsx` | Role-based learning path display |
| `EBookViewer.tsx` | Embedded flipbook/eBook component |
| `TrainingRequestDialog.tsx` | Form for submitting training requests |
| `TrainingProgressCard.tsx` | Individual resource progress display |
| `QuickAccessCard.tsx` | Quick access category cards |

### EBook Viewer Component

```typescript
// Handles the provided embed code beautifully
function EBookViewer({ embedCode, title }: { embedCode: string; title: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative w-full aspect-[4/3] bg-muted">
          {/* Embed iframe safely */}
          <iframe
            src={extractSrcFromEmbed(embedCode)}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            title={title}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Training Request Form

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Request Training                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  What type of request is this?                                                       │
│  [○ New Topic] [○ Improvement] [○ Question] [○ Resource Request]                    │
│                                                                                      │
│  Title:                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ e.g., "Need training on new HVAC systems"                                   │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  Description:                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ Tell us what you need and why it would help your work...    [🎤] [✨ Polish]│    │
│  │                                                                             │    │
│  │                                                                             │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  Priority:                                                                           │
│  [Normal ▼]                                                                          │
│                                                                                      │
│                                              [Cancel]  [Submit Request]             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/training/TrainingPage.tsx` | Main training academy page |
| `src/components/training/TrainingCatalog.tsx` | Resource catalog grid |
| `src/components/training/LearningPathCard.tsx` | Role-based learning paths |
| `src/components/training/EBookViewer.tsx` | Embedded eBook display |
| `src/components/training/TrainingRequestDialog.tsx` | Training request form |
| `src/components/training/QuickAccessCard.tsx` | Quick access category cards |
| `src/hooks/useTrainingResources.ts` | CRUD for training resources |
| `src/hooks/useTrainingProgress.ts` | Track user progress |
| `src/hooks/useTrainingRequests.ts` | Training requests management |

---

## Part 6: Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/training` route |
| `src/components/layout/AppSidebar.tsx` | Add Training link with tooltip |
| `src/types/modules.ts` | Add `trainingEnabled` to ModuleConfig |
| `src/contexts/ModuleContext.tsx` | Add training module support |

---

## Part 7: Navigation Integration

### Sidebar Addition

```typescript
// In AppSidebar.tsx - Platform section
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <NavLink
      to="/training"
      className="flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
    >
      <GraduationCap className="h-4 w-4" />
      {!collapsed && <span>Training</span>}
    </NavLink>
  </SidebarMenuButton>
</SidebarMenuItem>
```

Tooltip: "Training Academy - Operational skills and certifications"

---

## Part 8: Seed Data

### Default Training Categories

| Category | Icon | Description |
|----------|------|-------------|
| **New Hire Onboarding** | 🎓 | Essential orientation for all new team members |
| **Maintenance Essentials** | 🔧 | Core maintenance and repair procedures |
| **Safety Protocols** | 🛡️ | OSHA compliance and workplace safety |
| **NSPIRE Compliance** | 📋 | HUD inspection standards and procedures |
| **Property Operations** | 🏢 | Day-to-day property management |
| **Emergency Response** | 🚨 | Emergency procedures and protocols |

### Default eBook Entry

```sql
INSERT INTO training_resources (
  title, description, resource_type, category, embed_code, is_active
) VALUES (
  'PRD Professional Handbook',
  'Comprehensive operational guide for property management professionals',
  'ebook',
  'operations',
  '<iframe src="https://3e4ed0b2-6b22-4160-aee9-ee4110f6dd2f.lovableproject.com/embed/enzark-prd-professional-1769980229295"...',
  true
);
```

---

## Part 9: Implementation Order

### Phase 1: Database & Infrastructure
1. Create database migration for training tables
2. Add RLS policies
3. Seed default categories and sample eBook entry

### Phase 2: Core Hooks
4. Create `useTrainingResources.ts`
5. Create `useTrainingProgress.ts`
6. Create `useTrainingRequests.ts`

### Phase 3: Main Page
7. Build `TrainingPage.tsx` with tabs structure
8. Build `QuickAccessCard.tsx` for category navigation
9. Build `EBookViewer.tsx` for flipbook embedding

### Phase 4: Training Features
10. Build `TrainingCatalog.tsx` with search/filter
11. Build `LearningPathCard.tsx` for role-based paths
12. Build `TrainingRequestDialog.tsx` with voice dictation

### Phase 5: Integration
13. Add route to `App.tsx`
14. Add navigation link to `AppSidebar.tsx`
15. Add admin management in Settings (optional)

---

## Part 10: Key Features

| Feature | Description |
|---------|-------------|
| **LearnWorld Integration** | Direct link to external LMS with SSO potential |
| **Embedded eBooks** | Flipbook viewer for operational manuals |
| **Role-Based Paths** | Curated learning paths per job function |
| **Progress Tracking** | Track completion status per user |
| **Training Requests** | Feedback loop for staff to request topics |
| **Quick Access** | Category cards for fast navigation |
| **Search & Filter** | Find resources by keyword, category, or role |
| **Voice Dictation** | Use AI polish in request forms |

---

## Technical Notes

1. **Embed Safety**: Sanitize and validate embed codes before rendering
2. **LearnWorld SSO**: Future enhancement for seamless login integration
3. **Mobile Responsive**: Ensure eBook viewer works on tablets/phones
4. **Progress Sync**: Consider real-time updates for progress tracking
5. **Admin Panel**: Allow admins to add/remove resources from Settings

---

## Summary

This Training Academy implementation provides:

1. **Operational Focus** - Hands-on, job-relevant training for property staff
2. **LearnWorld Integration** - Easy access to external LMS courses
3. **eBook Library** - Embedded flipbook viewer for digital manuals
4. **Role-Based Learning** - Curated paths for each job function
5. **Feedback Loop** - Staff can request new training topics
6. **Professional UX** - Apple-inspired design matching existing platform

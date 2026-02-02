

# Articulate Course Integration System
## Premium Training Academy with SCORM/HTML5 Course Delivery

---

## Overview

Implementing a beautiful, enterprise-grade Articulate course delivery system that allows admins to upload exported HTML5/SCORM courses (zip files), process and store them, and provide learners with an immersive course consumption experience with progress tracking and certification upon completion.

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ARTICULATE COURSE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADMIN UPLOAD                 PROCESSING                 STORAGE│
│  ┌──────────┐    ┌───────────────────────┐    ┌───────────────┐│
│  │ ZIP File │───▶│ Edge Function         │───▶│ training-     ││
│  │ (HTML5)  │    │ - Unzip               │    │ courses       ││
│  └──────────┘    │ - Validate structure  │    │ (bucket)      ││
│                  │ - Extract metadata    │    └───────────────┘│
│                  │ - Store files         │                     │
│                  └───────────────────────┘                     │
│                            │                                   │
│                            ▼                                   │
│                  ┌───────────────────────┐                     │
│                  │ training_courses      │                     │
│                  │ (database table)      │                     │
│                  │ - Course metadata     │                     │
│                  │ - Entry point URL     │                     │
│                  │ - Duration, status    │                     │
│                  └───────────────────────┘                     │
│                                                                 │
│  USER EXPERIENCE                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Course Player (Immersive Mode)                              ││
│  │ - Full-screen iframe loading HTML5 content                  ││
│  │ - Progress tracking via postMessage                         ││
│  │ - Completion detection → Certificate                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `training_courses`

Dedicated table for Articulate/SCORM courses (separate from general resources):

```sql
CREATE TABLE training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Course Metadata
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'operations',
  
  -- Course Content
  content_path TEXT NOT NULL, -- Path in storage bucket
  entry_file TEXT DEFAULT 'index.html', -- Main entry point
  
  -- Duration & Settings
  duration_minutes INTEGER,
  passing_score INTEGER DEFAULT 80, -- % required to pass
  allow_resume BOOLEAN DEFAULT true,
  
  -- Status & Publishing
  is_active BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  
  -- Role-based Access
  target_roles app_role[] DEFAULT '{}',
  
  -- Ordering
  sort_order INTEGER,
  
  -- Attribution
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Course Version
  version TEXT DEFAULT '1.0'
);

-- Enable RLS
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active courses
CREATE POLICY "Authenticated users can view courses"
ON training_courses FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can see all courses (including inactive)
CREATE POLICY "Admins can view all courses"
ON training_courses FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can create courses
CREATE POLICY "Only admins can create courses"
ON training_courses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update courses
CREATE POLICY "Only admins can update courses"
ON training_courses FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete courses
CREATE POLICY "Only admins can delete courses"
ON training_courses FOR DELETE
USING (has_role(auth.uid(), 'admin'));
```

### New Table: `course_progress`

Track user progress through courses with detailed state:

```sql
CREATE TABLE course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  
  -- Progress State
  status TEXT NOT NULL DEFAULT 'not_started',
  progress_percent INTEGER DEFAULT 0,
  score INTEGER,
  
  -- Bookmark (for resume)
  last_location TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Users can view own progress
CREATE POLICY "Users can view own progress"
ON course_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own progress
CREATE POLICY "Users can insert own progress"
ON course_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own progress
CREATE POLICY "Users can update own progress"
ON course_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress"
ON course_progress FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

---

## Storage Configuration

### New Bucket: `training-courses`

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-courses', 'training-courses', true);

-- Public read access for course content
CREATE POLICY "Public read access for courses"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-courses');

-- Only admins can upload/delete
CREATE POLICY "Admins can upload courses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-courses' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete courses"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-courses' AND
  has_role(auth.uid(), 'admin')
);
```

---

## Edge Function: `process-articulate-course`

Process uploaded ZIP files and extract course content:

```text
INPUT: ZIP file upload
PROCESS:
  1. Receive ZIP file from client
  2. Validate file (size limits, file type)
  3. Generate unique course folder ID
  4. Unzip contents to memory
  5. Identify entry point (story.html, index.html, etc.)
  6. Upload all files to storage bucket with correct paths
  7. Return course metadata (entry point, file count, etc.)
OUTPUT: { coursePath, entryFile, fileCount, status }
```

---

## UI Components

### File Structure

```text
src/
├── pages/
│   └── training/
│       └── TrainingPage.tsx (update)
│       └── CoursePlayerPage.tsx (new)
├── components/
│   └── training/
│       ├── CourseCard.tsx (new - premium course display)
│       ├── CourseUploadDialog.tsx (new - admin zip upload)
│       ├── CoursePlayer.tsx (new - immersive player)
│       ├── CourseProgressRing.tsx (new - circular progress)
│       ├── CourseCertificateDialog.tsx (new - completion cert)
│       └── CourseManagementTable.tsx (new - admin management)
├── hooks/
│   └── useTrainingCourses.ts (new)
│   └── useCourseProgress.ts (new)
```

---

## UI Design Specifications

### 1. Courses Tab (Premium Cards)

```text
┌─────────────────────────────────────────────────────────────────┐
│  TRAINING ACADEMY                                               │
│  ┌─────────┬─────────┬─────────────┬─────────┐                 │
│  │ eBooks  │ Courses │ Paths       │ Manage  │                 │
│  └─────────┴────┬────┴─────────────┴─────────┘                 │
│                 ▼                                               │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🎓 Interactive Training Courses                            ││
│  │ Complete interactive courses to earn your certification    ││
│  │                                              [+ Add Course] ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌────────────┐ ││
│  │ │  THUMBNAIL   │ │  │ │  THUMBNAIL   │ │  │ │ THUMBNAIL  │ ││
│  │ │              │ │  │ │              │ │  │ │            │ ││
│  │ │   ○ 65%     │ │  │ │   ✓ 100%    │ │  │ │  Not Started│ ││
│  │ └──────────────┘ │  │ └──────────────┘ │  │ └────────────┘ ││
│  │ Safety Training  │  │ NSPIRE Basics    │  │ Fire Safety   ││
│  │ 45 min • Required│  │ 30 min • ✓ Done  │  │ 20 min        ││
│  │ [Continue Course]│  │ [View Certificate]│  │ [Start Course]││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2. Course Card Design

Premium card with:
- Large thumbnail area with gradient overlay
- Circular progress indicator (ring style)
- Course title and description
- Duration badge
- Required/Optional indicator
- Action button (Start/Continue/Complete)
- Hover animation with scale/shadow

### 3. Course Upload Dialog (Admin)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Upload Articulate Course                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌─────┐  Drag & drop your Articulate                  │   │
│  │  │ 📦  │  HTML5 export (.zip) here                     │   │
│  │  └─────┘                                                │   │
│  │           or click to browse                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Course Details                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Title: [________________________________]                │   │
│  │ Description: [_____________________________]             │   │
│  │ Category: [Safety ▼]  Duration: [30] min                │   │
│  │ Target Roles: ○ Inspector ● Manager ○ Superintendent    │   │
│  │ [ ] Required  [✓] Published                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Processing... 45%  [████████░░░░░░░░]                   │   │
│  │ Extracting course content...                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                    [Cancel]  [Upload Course]   │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Immersive Course Player

Full-screen immersive experience:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                    ○ 65%     [Mark Complete]│ │
│ │                                              [X Close]      │ │
│ │                                                             │ │
│ │                                                             │ │
│ │              ┌───────────────────────────────┐             │ │
│ │              │                               │             │ │
│ │              │     ARTICULATE COURSE         │             │ │
│ │              │       (iframe content)        │             │ │
│ │              │                               │             │ │
│ │              │                               │             │ │
│ │              │                               │             │ │
│ │              └───────────────────────────────┘             │ │
│ │                                                             │ │
│ │                                                             │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│           [ ◀ Previous ]  ──────────────────  [ Next ▶ ]       │
└─────────────────────────────────────────────────────────────────┘
```

Features:
- Dark background for focus
- Floating controls (close, progress, complete)
- Full viewport iframe
- Optional navigation controls
- Progress persistence
- Glassmorphism control bar

---

## Implementation Phases

### Phase 1: Database & Storage
1. Create `training_courses` table with RLS
2. Create `course_progress` table with RLS
3. Create `training-courses` storage bucket
4. Add storage policies

### Phase 2: Edge Function
1. Create `process-articulate-course` edge function
2. Handle ZIP upload and extraction
3. Upload extracted files to storage
4. Return course metadata

### Phase 3: Hooks
1. Create `useTrainingCourses.ts` - CRUD for courses
2. Create `useCourseProgress.ts` - Track user progress
3. Create `useUploadCourse.ts` - Handle ZIP upload flow

### Phase 4: UI Components
1. `CourseCard.tsx` - Premium course display card
2. `CourseUploadDialog.tsx` - Admin upload with drag-drop
3. `CourseProgressRing.tsx` - Circular progress indicator
4. `CoursePlayer.tsx` - Immersive full-screen player
5. `CourseCertificateDialog.tsx` - Completion certificate

### Phase 5: Page Integration
1. Update `TrainingPage.tsx` - Enhance Courses tab
2. Create route for course player (or use dialog)
3. Add management section for admins

### Phase 6: Features Page Update
1. Add Training Academy module to showcase
2. Highlight course delivery and certification

---

## Technical Considerations

### Articulate HTML5 Export Structure

Typical Articulate export contains:
```text
course.zip/
├── story.html (or index.html) ← Entry point
├── story_content/
│   ├── slides/
│   ├── data/
│   └── assets/
├── mobile/
└── tincan.xml (or imsmanifest.xml for SCORM)
```

### Entry Point Detection

The edge function will look for:
1. `story.html` (Storyline 360)
2. `index.html` (Rise 360 / generic)
3. `story_html5.html` (older exports)

### Progress Tracking

Two approaches:
1. **Simple**: Manual "Mark Complete" button
2. **SCORM/xAPI**: Listen for postMessage from course

For initial implementation, we'll use the simple approach with the option to auto-complete when the user reaches 100% in the iframe.

### File Size Limits

- Edge function limit: Consider chunked upload for large courses
- Typical Articulate course: 5-50MB zipped
- Storage: Public bucket for easy iframe access

---

## Visual Design Language

### Color Scheme
- Course cards: Primary gradient background
- Progress ring: Green for complete, amber for in-progress
- Player: Dark mode (black/dark slate)

### Animations (Framer Motion)
- Card hover: Scale + shadow
- Progress ring: Animated fill
- Player entrance: Fade + scale
- Certificate: Celebration confetti

### Typography
- Course titles: Bold, tracking-tight
- Descriptions: Regular, muted color
- Duration badges: Small, rounded pills

---

## Files to Create

### New Files
1. `supabase/functions/process-articulate-course/index.ts`
2. `src/hooks/useTrainingCourses.ts`
3. `src/hooks/useCourseProgress.ts`
4. `src/components/training/CourseCard.tsx`
5. `src/components/training/CourseUploadDialog.tsx`
6. `src/components/training/CoursePlayer.tsx`
7. `src/components/training/CourseProgressRing.tsx`
8. `src/components/training/CourseCertificateDialog.tsx`

### Modified Files
1. `src/pages/training/TrainingPage.tsx` - Enhanced Courses tab
2. `src/components/features/ModuleShowcase.tsx` - Add Training Academy

### Database Migrations
1. Create `training_courses` table
2. Create `course_progress` table
3. Create `training-courses` storage bucket

---

## Value Proposition

This implementation delivers:

1. **Professional Course Delivery** - Immersive, distraction-free learning experience
2. **Zero External Dependencies** - All courses hosted internally
3. **Progress Tracking** - Users can resume where they left off
4. **Certification** - Professional certificates upon completion
5. **Admin Control** - Easy upload and management of courses
6. **Role-Based Access** - Target specific teams with specific training
7. **Beautiful UX** - Apple-quality design that encourages engagement

---

## Summary

The Articulate Course Integration transforms the Training Academy into a complete learning management system:

1. **Admin uploads** a ZIP file exported from Articulate
2. **Edge function processes** the ZIP, extracts files to storage
3. **Course appears** in the premium Courses tab
4. **Users launch** courses in immersive full-screen player
5. **Progress is tracked** automatically
6. **Certification** is awarded upon completion

This creates a seamless, professional training experience that rivals enterprise LMS platforms while remaining fully integrated within the Glorieta Gardens Platform.


-- Create training_courses table for Articulate/SCORM courses
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Course Metadata
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'operations',
  
  -- Course Content
  content_path TEXT NOT NULL,
  entry_file TEXT DEFAULT 'index.html',
  
  -- Duration & Settings
  duration_minutes INTEGER,
  passing_score INTEGER DEFAULT 80,
  allow_resume BOOLEAN DEFAULT true,
  
  -- Status & Publishing
  is_active BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  
  -- Role-based Access
  target_roles app_role[] DEFAULT '{}',
  
  -- Ordering
  sort_order INTEGER,
  
  -- Attribution
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Course Version
  version TEXT DEFAULT '1.0'
);

-- Create course_progress table for tracking user progress
CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  
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

-- Enable RLS on training_courses
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active courses
CREATE POLICY "Authenticated users can view active courses"
ON public.training_courses FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can view all courses (including inactive)
CREATE POLICY "Admins can view all courses"
ON public.training_courses FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can create courses
CREATE POLICY "Only admins can create courses"
ON public.training_courses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update courses
CREATE POLICY "Only admins can update courses"
ON public.training_courses FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete courses
CREATE POLICY "Only admins can delete courses"
ON public.training_courses FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Enable RLS on course_progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Users can view own progress
CREATE POLICY "Users can view own progress"
ON public.course_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own progress
CREATE POLICY "Users can insert own progress"
ON public.course_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own progress
CREATE POLICY "Users can update own progress"
ON public.course_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress"
ON public.course_progress FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create training-courses storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-courses', 'training-courses', true);

-- Public read access for course content
CREATE POLICY "Public read access for training courses"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-courses');

-- Only admins can upload courses
CREATE POLICY "Admins can upload training courses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-courses' AND
  has_role(auth.uid(), 'admin')
);

-- Only admins can delete courses
CREATE POLICY "Admins can delete training courses"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-courses' AND
  has_role(auth.uid(), 'admin')
);

-- Create updated_at trigger for training_courses
CREATE TRIGGER update_training_courses_updated_at
BEFORE UPDATE ON public.training_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
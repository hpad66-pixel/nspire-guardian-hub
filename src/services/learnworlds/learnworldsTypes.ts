// ─────────────────────────────────────────────────────────────────────────────
// LearnWorlds Type Definitions
// All LW-related types live here. Zero leakage into component files.
// ─────────────────────────────────────────────────────────────────────────────

export type LWCourseCategory =
  | 'compliance'
  | 'safety'
  | 'property_management'
  | 'construction'
  | 'ai_productivity'
  | 'hr'
  | 'leadership'
  | 'custom';

export type LWDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type LWProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LWCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: LWCourseCategory;
  durationMinutes: number;
  difficulty: LWDifficulty;
  tags: string[];
  lwUrl: string;
}

export interface LWUserProgress {
  courseId: string;
  status: LWProgressStatus;
  progressPercent: number;
  lastAccessedAt: string | null;
  completedAt: string | null;
}

export interface LWCertificate {
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  expiresAt: string | null;
  certificateUrl: string;
  certificateId: string;
}

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export const TIER_CATEGORIES: Record<SubscriptionTier, LWCourseCategory[]> = {
  starter: ['compliance', 'safety'],
  professional: ['compliance', 'safety', 'property_management', 'construction', 'hr'],
  enterprise: [
    'compliance',
    'safety',
    'property_management',
    'construction',
    'ai_productivity',
    'hr',
    'leadership',
    'custom',
  ],
};

export const CATEGORY_LABELS: Record<LWCourseCategory, string> = {
  compliance: 'Compliance',
  safety: 'Safety',
  property_management: 'Property Management',
  construction: 'Construction',
  ai_productivity: 'AI & Productivity',
  hr: 'HR',
  leadership: 'Leadership',
  custom: 'Custom',
};

export const CATEGORY_COLORS: Record<LWCourseCategory, string> = {
  compliance: 'bg-blue-500/10 text-blue-600',
  safety: 'bg-amber-500/10 text-amber-600',
  property_management: 'bg-green-500/10 text-green-600',
  construction: 'bg-orange-500/10 text-orange-600',
  ai_productivity: 'bg-purple-500/10 text-purple-600',
  hr: 'bg-pink-500/10 text-pink-600',
  leadership: 'bg-indigo-500/10 text-indigo-600',
  custom: 'bg-muted text-muted-foreground',
};

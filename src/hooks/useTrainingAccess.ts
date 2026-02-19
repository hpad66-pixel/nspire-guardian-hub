import { useModules } from '@/contexts/ModuleContext';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import type { LWCourse, LWCourseCategory, SubscriptionTier } from '@/services/learnworlds/learnworldsTypes';
import { TIER_CATEGORIES } from '@/services/learnworlds/learnworldsTypes';

interface TrainingAccess {
  canAccessTraining: boolean;
  visibleCategories: LWCourseCategory[];
  canSelfEnroll: boolean;
  canAssignCourses: boolean;
  subscriptionTier: SubscriptionTier;
}

// ─────────────────────────────────────────────────────────────────────────────
// useTrainingAccess
// Determines what a user can see based on their org's subscription package.
// Subscription tier is currently derived from role as a placeholder until
// a real subscription system is wired in.
// ─────────────────────────────────────────────────────────────────────────────
export function useTrainingAccess(): TrainingAccess {
  const { isModuleEnabled } = useModules();
  const { data: role } = useCurrentUserRole();

  const trainingEnabled = isModuleEnabled('trainingHubEnabled');

  // Subscription tier placeholder logic:
  // Admin/Owner → Enterprise
  // Manager/Project Manager/Superintendent → Professional
  // Everyone else → Starter
  const subscriptionTier: SubscriptionTier =
    role === 'admin' || role === 'owner'
      ? 'enterprise'
      : role === 'manager' || role === 'project_manager' || role === 'superintendent'
        ? 'professional'
        : 'starter';

  const visibleCategories = TIER_CATEGORIES[subscriptionTier];

  const canAssignCourses =
    role === 'admin' || role === 'owner' || role === 'manager' || role === 'project_manager';

  return {
    canAccessTraining: trainingEnabled,
    visibleCategories,
    canSelfEnroll: true,
    canAssignCourses,
    subscriptionTier,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useFilteredCourses
// Returns courses split into visible (accessible) and locked (teaser).
// Locked courses are included so users can see what they're missing.
// ─────────────────────────────────────────────────────────────────────────────
export function useFilteredCourses(courses: LWCourse[]): {
  accessible: LWCourse[];
  locked: LWCourse[];
} {
  const { visibleCategories } = useTrainingAccess();

  const accessible = courses.filter((c) => visibleCategories.includes(c.category));
  const locked = courses.filter((c) => !visibleCategories.includes(c.category));

  return { accessible, locked };
}

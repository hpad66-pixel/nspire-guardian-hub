import { useModules } from '@/contexts/ModuleContext';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { isAdminRole, isManagerRole } from '@/lib/rbac';
import type { LWCourse, LWCourseCategory, SubscriptionTier } from '@/services/learnworlds/learnworldsTypes';
import { TIER_CATEGORIES } from '@/services/learnworlds/learnworldsTypes';

// Roles that map to the "professional" training tier in the placeholder model.
const PROFESSIONAL_TIER_ROLES = ['manager', 'project_manager', 'superintendent'];

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
  // TODO: replace this role→tier placeholder with canUseFeature() once the
  // training hub is wired into the A6 billing plan.
  const subscriptionTier: SubscriptionTier =
    isAdminRole(role)
      ? 'enterprise'
      : PROFESSIONAL_TIER_ROLES.includes(role ?? '')
        ? 'professional'
        : 'starter';

  const visibleCategories = TIER_CATEGORIES[subscriptionTier];

  const canAssignCourses = isManagerRole(role);

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

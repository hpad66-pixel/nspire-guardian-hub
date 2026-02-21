// ─────────────────────────────────────────────────────────────────────────────
// LearnWorlds Service Layer
//
// THIS IS THE ONLY FILE WHERE LEARNWORLDS API CALLS LIVE.
// All components and hooks call this service — never call LW directly.
// When LW credentials are ready, only this file changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { LWCourse, LWUserProgress, LWCertificate } from './learnworldsTypes';
import { MOCK_COURSES, MOCK_PROGRESS, MOCK_CERTIFICATES } from './mockData';

// ─── Config (swap with real values when credentials are ready) ───────────────
const LW_SCHOOL_URL =
  import.meta.env.VITE_LW_SCHOOL_URL ?? 'https://apas-labs.learnworlds.com';

// Artificial delay to simulate network — remove for real API calls
const simulateLatency = (ms = 400) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── SSO URL Generation ──────────────────────────────────────────────────────
/**
 * Generates a signed SSO URL so the user lands in LearnWorlds already
 * authenticated with no second login required.
 *
 * schoolUrl — the school's base URL (from useUserSchool().primarySchool.school_url)
 *             Falls back to VITE_LW_SCHOOL_URL / APAS Labs if not provided.
 *
 * REAL implementation (implement when credentials are ready):
 *   1. Create JWT with { sub: userId, email, name, iat, exp }
 *   2. Sign with school's SSO secret (fetched server-side via edge function)
 *   3. Return `${schoolUrl}/sso?token=${jwt}&redirect=${courseUrl}`
 */
export async function generateSSOUrl(
  userId: string,
  schoolUrl?: string,
  courseId?: string,
  returnUrl?: string,
): Promise<string> {
  await simulateLatency(600);

  const baseUrl = schoolUrl ?? LW_SCHOOL_URL;
  console.log('[LW Service] generateSSOUrl called', { userId, baseUrl, courseId, returnUrl });

  // MOCK: returns school URL with a fake token param
  const params = new URLSearchParams({ token: 'mock_sso_token_replace_when_ready' });
  if (courseId) params.set('course', courseId);
  if (returnUrl) params.set('return_url', returnUrl);

  return `${baseUrl}/sso?${params.toString()}`;
}

// ─── Course Catalog ──────────────────────────────────────────────────────────
/**
 * Fetches the full course catalog from LearnWorlds.
 * schoolUrl — the school's base URL for the real API call.
 * REAL: GET /api/v2/courses (against schoolUrl)
 */
export async function getCourses(schoolUrl?: string): Promise<LWCourse[]> {
  await simulateLatency(300);
  console.log('[LW Service] getCourses — returning mock data', { schoolUrl });
  return MOCK_COURSES;
}

// ─── User Progress ───────────────────────────────────────────────────────────
/**
 * Gets all course progress for a user.
 * REAL: GET /api/v2/users/{lwUserId}/courses (against schoolUrl)
 */
export async function getUserProgress(
  lwUserId: string,
  schoolUrl?: string,
): Promise<LWUserProgress[]> {
  await simulateLatency(350);
  console.log('[LW Service] getUserProgress', { lwUserId, schoolUrl });
  return MOCK_PROGRESS;
}

// ─── Certificates ────────────────────────────────────────────────────────────
/**
 * Gets all certificates earned by a user.
 * REAL: GET /api/v2/users/{lwUserId}/certificates (against schoolUrl)
 */
export async function getUserCertificates(
  lwUserId: string,
  schoolUrl?: string,
): Promise<LWCertificate[]> {
  await simulateLatency(300);
  console.log('[LW Service] getUserCertificates', { lwUserId, schoolUrl });
  return MOCK_CERTIFICATES;
}

// ─── Enrollment ──────────────────────────────────────────────────────────────
/**
 * Enrolls a user in a course.
 * REAL: POST /api/v2/users/{lwUserId}/courses (against schoolUrl)
 */
export async function enrollUser(
  lwUserId: string,
  courseId: string,
  schoolUrl?: string,
): Promise<boolean> {
  await simulateLatency(500);
  console.log('[LW Service] enrollUser', { lwUserId, courseId, schoolUrl });
  // MOCK: always succeeds
  return true;
}

// ─── Catalog Sync ────────────────────────────────────────────────────────────
/**
 * Pulls LW catalog and upserts into lw_courses table.
 * REAL: calls getCourses() then upserts to DB via Supabase
 */
export async function syncCourseCatalog(schoolUrl?: string): Promise<void> {
  console.log('[LW Service] syncCourseCatalog — sync would happen here', { schoolUrl });
  // REAL implementation: fetch getCourses(schoolUrl) then upsert lw_courses table
}

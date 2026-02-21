import { useState } from 'react';
import { GraduationCap, BookOpen, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrainingAccess, useFilteredCourses } from '@/hooks/useTrainingAccess';
import { useMyAssignments, useMyCertificates, useCatalog, useMyLWProgress, useMyLWCertificates } from '@/hooks/useTraining';
import { LWCourseCardStandalone as CourseCard } from './LWCourseCardStandalone';
import { AssignmentCard } from './AssignmentCard';
import { CertificateCard } from './CertificateCard';
import { CourseLauncher } from './CourseLauncher';
import { SchoolSwitcher } from './SchoolSwitcher';
import { useUserSchool, useSwitchPrimarySchool } from '@/hooks/useUserSchool';
import type { LWCourse } from '@/services/learnworlds/learnworldsTypes';
import { CATEGORY_LABELS } from '@/services/learnworlds/learnworldsTypes';
import { cn } from '@/lib/utils';

export function MyTrainingDashboard() {
  const { canAccessTraining, visibleCategories, subscriptionTier } = useTrainingAccess();
  const { primarySchool, allSchools, hasMultipleSchools } = useUserSchool();
  const switchSchool = useSwitchPrimarySchool();

  const { data: assignments = [] } = useMyAssignments();
  const { data: dbCerts = [] } = useMyCertificates();
  const { data: catalogRaw = [] } = useCatalog();
  const { data: lwProgress } = useMyLWProgress();
  const { data: lwCerts } = useMyLWCertificates();

  const { accessible, locked } = useFilteredCourses(catalogRaw);
  const allCourses = [...accessible, ...locked];

  const [launcher, setLauncher] = useState<{ id: string; title: string } | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<string>('all');

  // ── Feature flag / subscription gate ──────────────────────────────────────
  if (!canAccessTraining) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">Training & Certifications</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Access compliance training, safety certifications, and professional development
            courses — all tracked in one place.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open('https://apasos.ai', '_blank')}>
          Learn More
        </Button>
      </div>
    );
  }

  const getProgressForCourse = (courseId: string) =>
    lwProgress.find((p) => p.courseId === courseId);

  const getCertForCourse = (courseId: string) =>
    lwCerts.find((c) => c.courseId === courseId);

  const inProgressCourses = allCourses.filter((c) => {
    const p = getProgressForCourse(c.id);
    return p?.status === 'in_progress';
  });

  const tierSubtitleMap = {
    starter: 'Compliance & Safety courses included in your plan',
    professional: 'Professional development courses included in your plan',
    enterprise: 'Full course library included',
  };

  // Catalog filter tabs
  const catalogCategories = ['all', ...visibleCategories];
  const filteredCatalog =
    catalogFilter === 'all'
      ? allCourses
      : allCourses.filter((c) => c.category === catalogFilter);

  const handleLaunch = (course: LWCourse) => {
    setLauncher({ id: course.id, title: course.title });
  };

  return (
    <div className="space-y-8">
      {/* ── School Switcher (only shown when user has 2+ schools) ────────── */}
      {hasMultipleSchools && (
        <SchoolSwitcher
          schools={allSchools}
          activeSchoolId={primarySchool?.id ?? null}
          onSwitch={switchSchool}
        />
      )}

      {/* ── Section 1: My Assignments ──────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Required Training</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No required training right now. Check the catalog for optional courses below.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assignments.map((a) => {
              const course = allCourses.find((c) => c.id === a.lw_course_id);
              const progress = getProgressForCourse(a.lw_course_id);
              return (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  courseTitle={course?.title}
                  progressPercent={progress?.progressPercent}
                  isCompleted={progress?.status === 'completed'}
                  onLaunch={course ? () => handleLaunch(course) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: In Progress ────────────────────────────────────── */}
      {inProgressCourses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-semibold text-foreground">In Progress</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={getProgressForCourse(course.id)}
                onLaunch={handleLaunch}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 3: My Certificates ───────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          <h2 className="text-base font-semibold text-foreground">My Certificates</h2>
        </div>

        {lwCerts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Certificates you earn will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {lwCerts.map((cert) => {
              const dbCert = dbCerts.find((c) => c.lw_course_id === cert.courseId);
              return (
                <CertificateCard
                  key={cert.certificateId}
                  certificate={cert}
                  completionId={dbCert?.id}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 4: Course Catalog ────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Available Courses</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setLauncher({ id: '', title: 'Course Catalog' })}
            >
              Browse Full Catalog
            </Button>
          </div>
          <p className="mt-0.5 ml-6 text-xs text-muted-foreground">
            {tierSubtitleMap[subscriptionTier]}
            {primarySchool && (
              <span className="text-muted-foreground/60"> · {primarySchool.name}</span>
            )}
          </p>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {catalogCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatalogFilter(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                catalogFilter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={getProgressForCourse(course.id)}
              locked={locked.includes(course)}
              onLaunch={handleLaunch}
              onEnroll={handleLaunch}
            />
          ))}
        </div>
      </section>

      {/* ── Course Launcher ──────────────────────────────────────────── */}
      {launcher && (
        <CourseLauncher
          courseId={launcher.id}
          courseTitle={launcher.title}
          onClose={() => setLauncher(null)}
        />
      )}
    </div>
  );
}

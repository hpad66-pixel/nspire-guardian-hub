import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  BookOpen,
  GraduationCap,
  Search,
  ExternalLink,
  MessageSquarePlus,
  Plus,
  Settings,
  BookMarked,
  Pencil,
  PlayCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTrainingResources, useTrainingStats } from '@/hooks/useTrainingResources';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { useActiveCourses, useTrainingCourses, type TrainingCourse } from '@/hooks/useTrainingCourses';
import { useUserCourseProgress, useStartCourse, type CourseProgress } from '@/hooks/useCourseProgress';
import { EBookCard } from '@/components/training/EBookCard';
import { GeneratedBookCover } from '@/components/training/GeneratedBookCover';
import { EBookManagementDialog } from '@/components/training/EBookManagementDialog';
import { LearningPathCard } from '@/components/training/LearningPathCard';
import { TrainingResourceCard } from '@/components/training/TrainingResourceCard';
import { TrainingRequestDialog } from '@/components/training/TrainingRequestDialog';
import { ProgressStatsCard } from '@/components/training/ProgressStatsCard';
import { CourseCard } from '@/components/training/CourseCard';
import { CourseUploadDialog } from '@/components/training/CourseUploadDialog';
import { CoursePlayer } from '@/components/training/CoursePlayer';
import { CourseCertificateDialog } from '@/components/training/CourseCertificateDialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrainingResource } from '@/hooks/useTrainingResources';

const LEARNING_PATHS = [
  { 
    title: 'Inspector Track', 
    description: 'Master NSPIRE inspections and compliance reporting',
    totalModules: 12,
    estimatedHours: 8,
    isRequired: true,
  },
  { 
    title: 'Superintendent Track', 
    description: 'Property oversight, vendor management, and operations',
    totalModules: 18,
    estimatedHours: 12,
    isRequired: true,
  },
  { 
    title: 'Property Manager Track', 
    description: 'Full property management certification program',
    totalModules: 22,
    estimatedHours: 16,
    isRequired: false,
  },
  { 
    title: 'Subcontractor Orientation', 
    description: 'Site safety, protocols, and expectations',
    totalModules: 6,
    estimatedHours: 3,
    isRequired: true,
  },
];

export default function TrainingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showEbookDialog, setShowEbookDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingEbook, setEditingEbook] = useState<TrainingResource | null>(null);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [activeCourse, setActiveCourse] = useState<TrainingCourse | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<TrainingCourse | null>(null);
  const [certificateProgress, setCertificateProgress] = useState<CourseProgress | null>(null);

  const { data: resources, isLoading: resourcesLoading } = useTrainingResources();
  const { data: stats } = useTrainingStats();
  const { data: currentRole } = useCurrentUserRole();
  const { data: courses, isLoading: coursesLoading } = useActiveCourses();
  const { data: allCourses } = useTrainingCourses();
  const { data: courseProgress } = useUserCourseProgress();
  const startCourse = useStartCourse();

  const isAdmin = currentRole === 'admin';

  // Filter ebooks by user's role
  const filterByRole = (resources: TrainingResource[]) => {
    if (isAdmin) return resources;
    return resources.filter(r => {
      if (!r.target_roles || r.target_roles.length === 0) return true;
      return currentRole && r.target_roles.includes(currentRole);
    });
  };

  // Filter courses by user's role
  const filterCoursesByRole = (courses: TrainingCourse[]) => {
    if (isAdmin) return courses;
    return courses.filter(c => {
      if (!c.target_roles || c.target_roles.length === 0) return true;
      return currentRole && c.target_roles.includes(currentRole);
    });
  };

  const ebooks = filterByRole(resources?.filter(r => r.resource_type === 'ebook') || []);
  const allEbooks = resources?.filter(r => r.resource_type === 'ebook') || [];

  const filteredEbooks = ebooks.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = filterCoursesByRole(courses || []).filter(c =>
    c.title.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  // Get progress for a specific course
  const getCourseProgress = (courseId: string): CourseProgress | null => {
    return courseProgress?.find(p => p.course_id === courseId) || null;
  };

  const handleEditEbook = (ebook: TrainingResource) => {
    setEditingEbook(ebook);
    setShowEbookDialog(true);
  };

  const handleAddEbook = () => {
    setEditingEbook(null);
    setShowEbookDialog(true);
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setShowCourseDialog(true);
  };

  const handleEditCourse = (course: TrainingCourse) => {
    setEditingCourse(course);
    setShowCourseDialog(true);
  };

  const handleStartCourse = async (course: TrainingCourse) => {
    await startCourse.mutateAsync(course.id);
    setActiveCourse(course);
    setShowPlayer(true);
  };

  const handleContinueCourse = (course: TrainingCourse) => {
    setActiveCourse(course);
    setShowPlayer(true);
  };

  const handleCourseComplete = () => {
    if (activeCourse) {
      const progress = getCourseProgress(activeCourse.id);
      if (progress) {
        setCertificateCourse(activeCourse);
        setCertificateProgress(progress);
      }
    }
    setShowPlayer(false);
    setActiveCourse(null);
  };

  const handleViewCertificate = (course: TrainingCourse, progress: CourseProgress) => {
    setCertificateCourse(course);
    setCertificateProgress(progress);
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Academy</h1>
          <p className="text-muted-foreground mt-1">
            Resources and guides to help you succeed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRequestDialog(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Request Training
          </Button>
          <Button onClick={() => window.open('https://learnworld.com', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            LearnWorld
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="library" className="data-[state=active]:bg-background">
            <BookOpen className="h-4 w-4 mr-2" />
            eBook Library
          </TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-background">
            <GraduationCap className="h-4 w-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="paths" className="data-[state=active]:bg-background">
            Learning Paths
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="manage" className="data-[state=active]:bg-background">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        {/* eBook Library Tab */}
        <TabsContent value="library" className="space-y-6">
          {/* Progress Stats */}
          <ProgressStatsCard totalResources={ebooks.length} />
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search eBooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Button onClick={handleAddEbook}>
                <Plus className="h-4 w-4 mr-2" />
                Add eBook
              </Button>
            )}
          </div>

          {resourcesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : filteredEbooks.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <BookMarked className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-xl mb-2">No eBooks yet</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {isAdmin
                    ? 'Add your first eBook to start building your training library.'
                    : 'eBooks will appear here once they are added by an administrator.'}
                </p>
                {isAdmin && (
                  <Button onClick={handleAddEbook}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First eBook
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredEbooks.map((ebook) => (
                <div key={ebook.id} className="relative group">
                  <EBookCard ebook={ebook} />
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleEditEbook(ebook)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Courses Tab - New Premium Design */}
        <TabsContent value="courses" className="space-y-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <PlayCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Interactive Training Courses</h2>
                  <p className="text-muted-foreground mt-1">
                    Complete interactive courses to earn your certifications
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={handleAddCourse} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              )}
            </div>
          </motion.div>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Courses Grid */}
          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <GraduationCap className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-xl mb-2">No courses available</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {isAdmin
                    ? 'Upload your first Articulate course to start training your team.'
                    : 'Interactive courses will appear here once they are added by an administrator.'}
                </p>
                {isAdmin && (
                  <Button onClick={handleAddCourse}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload First Course
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 },
                },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredCourses.map((course) => {
                const progress = getCourseProgress(course.id);
                return (
                  <div key={course.id} className="relative group">
                    <CourseCard
                      course={course}
                      progress={progress}
                      onStart={() => handleStartCourse(course)}
                      onContinue={() => handleContinueCourse(course)}
                      onViewCertificate={
                        progress?.status === 'completed'
                          ? () => handleViewCertificate(course, progress)
                          : undefined
                      }
                    />
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCourse(course);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="space-y-6">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Role-Based Learning Paths</h2>
            <p className="text-muted-foreground">
              Structured training tracks tailored to your role
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEARNING_PATHS.map((path, index) => (
              <LearningPathCard
                key={index}
                title={path.title}
                description={path.description}
                totalModules={path.totalModules}
                completedModules={0}
                estimatedHours={path.estimatedHours}
                isRequired={path.isRequired}
              />
            ))}
          </div>
        </TabsContent>

        {/* Admin Management Tab */}
        {isAdmin && (
          <TabsContent value="manage" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Manage Training Content</h2>
                <p className="text-muted-foreground">
                  Add, edit, or remove training resources
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Courses Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Interactive Courses</h3>
                        <p className="text-sm text-muted-foreground">
                          {allCourses?.length || 0} course{allCourses?.length !== 1 ? 's' : ''} uploaded
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleAddCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>

                  {!allCourses || allCourses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No courses uploaded yet. Click "Add Course" to upload an Articulate export.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {allCourses.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <PlayCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">
                                  {course.category} • {course.is_active ? 'Published' : 'Draft'}
                                </span>
                                {course.duration_minutes && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                    {course.duration_minutes} min
                                  </span>
                                )}
                                {course.is_required && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCourse(course)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* eBooks Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">eBooks</h3>
                        <p className="text-sm text-muted-foreground">
                          {allEbooks.length} eBook{allEbooks.length !== 1 ? 's' : ''} in library
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleAddEbook}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add eBook
                    </Button>
                  </div>

                  {allEbooks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No eBooks added yet. Click "Add eBook" to get started.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {allEbooks.map((ebook) => (
                        <div
                          key={ebook.id}
                          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                          {ebook.thumbnail_url ? (
                              <img
                                src={ebook.thumbnail_url}
                                alt=""
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 rounded overflow-hidden relative">
                                <GeneratedBookCover 
                                  title={ebook.title} 
                                  category={ebook.category}
                                  compact
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{ebook.title}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">
                                  {ebook.category} • {ebook.is_active ? 'Published' : 'Draft'}
                                </span>
                                {ebook.target_roles && ebook.target_roles.length > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    {ebook.target_roles.length} role{ebook.target_roles.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {ebook.is_required && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEbook(ebook)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats?.totalEbooks || 0}</p>
                    <p className="text-sm text-muted-foreground">eBooks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{allCourses?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Courses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats?.totalGuides || 0}</p>
                    <p className="text-sm text-muted-foreground">Guides</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <TrainingRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />
      
      <EBookManagementDialog
        open={showEbookDialog}
        onOpenChange={setShowEbookDialog}
        editingEbook={editingEbook}
      />

      <CourseUploadDialog
        open={showCourseDialog}
        onOpenChange={setShowCourseDialog}
        editingCourse={editingCourse}
      />

      {/* Course Player */}
      {activeCourse && (
        <CoursePlayer
          course={activeCourse}
          progress={getCourseProgress(activeCourse.id)}
          open={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setActiveCourse(null);
          }}
          onComplete={handleCourseComplete}
        />
      )}

      {/* Certificate Dialog */}
      {certificateCourse && certificateProgress && (
        <CourseCertificateDialog
          open={!!certificateCourse}
          onOpenChange={(open) => {
            if (!open) {
              setCertificateCourse(null);
              setCertificateProgress(null);
            }
          }}
          course={certificateCourse}
          progress={certificateProgress}
        />
      )}
    </div>
  );
}

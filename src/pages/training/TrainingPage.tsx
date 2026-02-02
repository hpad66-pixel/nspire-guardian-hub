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
} from 'lucide-react';
import { useTrainingResources, useTrainingStats } from '@/hooks/useTrainingResources';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { EBookCard } from '@/components/training/EBookCard';
import { EBookManagementDialog } from '@/components/training/EBookManagementDialog';
import { LearningPathCard } from '@/components/training/LearningPathCard';
import { TrainingResourceCard } from '@/components/training/TrainingResourceCard';
import { TrainingRequestDialog } from '@/components/training/TrainingRequestDialog';
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
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showEbookDialog, setShowEbookDialog] = useState(false);
  const [editingEbook, setEditingEbook] = useState<TrainingResource | null>(null);

  const { data: resources, isLoading } = useTrainingResources();
  const { data: stats } = useTrainingStats();
  const { data: currentRole } = useCurrentUserRole();

  const isAdmin = currentRole === 'admin' || currentRole === 'manager';

  const ebooks = resources?.filter(r => r.resource_type === 'ebook') || [];
  const courses = resources?.filter(r => r.resource_type === 'course') || [];
  const guides = resources?.filter(r => r.resource_type === 'guide') || [];

  const filteredEbooks = ebooks.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditEbook = (ebook: TrainingResource) => {
    setEditingEbook(ebook);
    setShowEbookDialog(true);
  };

  const handleAddEbook = () => {
    setEditingEbook(null);
    setShowEbookDialog(true);
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

          {isLoading ? (
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

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <GraduationCap className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-xl mb-2">No courses available</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Interactive courses will be added soon. Access LearnWorld for external training.
                </p>
                <Button onClick={() => window.open('https://learnworld.com', '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open LearnWorld
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((resource) => (
                <TrainingResourceCard
                  key={resource.id}
                  resource={resource}
                  onStart={() => {
                    if (resource.external_url) {
                      window.open(resource.external_url, '_blank');
                    }
                  }}
                />
              ))}
            </div>
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
                          {ebooks.length} eBook{ebooks.length !== 1 ? 's' : ''} in library
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleAddEbook}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add eBook
                    </Button>
                  </div>

                  {ebooks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No eBooks added yet. Click "Add eBook" to get started.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {ebooks.map((ebook) => (
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
                              <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{ebook.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {ebook.category} • {ebook.is_active ? 'Published' : 'Draft'}
                              </p>
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
                    <p className="text-3xl font-bold">{stats?.totalCourses || 0}</p>
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
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  BookOpen,
  Shield,
  Wrench,
  ClipboardCheck,
  Building2,
  AlertTriangle,
  Search,
  ExternalLink,
  MessageSquarePlus,
  Users,
  BookMarked,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useTrainingResources, useTrainingStats } from '@/hooks/useTrainingResources';
import { useUserTrainingProgress } from '@/hooks/useTrainingProgress';
import { useRequestsCount } from '@/hooks/useTrainingRequests';
import { QuickAccessCard } from '@/components/training/QuickAccessCard';
import { EBookViewer } from '@/components/training/EBookViewer';
import { LearningPathCard } from '@/components/training/LearningPathCard';
import { TrainingResourceCard } from '@/components/training/TrainingResourceCard';
import { TrainingRequestDialog } from '@/components/training/TrainingRequestDialog';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = [
  { key: 'onboarding', label: 'New Hire Onboarding', icon: GraduationCap, color: 'bg-blue-500', description: 'Essential orientation' },
  { key: 'maintenance', label: 'Maintenance Essentials', icon: Wrench, color: 'bg-orange-500', description: 'Core repair procedures' },
  { key: 'safety', label: 'Safety Protocols', icon: Shield, color: 'bg-red-500', description: 'OSHA compliance' },
  { key: 'compliance', label: 'NSPIRE Compliance', icon: ClipboardCheck, color: 'bg-purple-500', description: 'HUD inspection standards' },
  { key: 'operations', label: 'Property Operations', icon: Building2, color: 'bg-green-500', description: 'Day-to-day management' },
  { key: 'emergency', label: 'Emergency Response', icon: AlertTriangle, color: 'bg-rose-500', description: 'Emergency procedures' },
];

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const { data: resources, isLoading: resourcesLoading } = useTrainingResources(
    selectedCategory !== 'all' ? selectedCategory : undefined
  );
  const { data: stats } = useTrainingStats();
  const { data: progress } = useUserTrainingProgress();
  const { data: pendingRequests } = useRequestsCount();

  const filteredResources = resources?.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ebooks = resources?.filter(r => r.resource_type === 'ebook') || [];

  const getProgressForResource = (resourceId: string) => {
    return progress?.find(p => p.resource_id === resourceId);
  };

  const completedCount = progress?.filter(p => p.status === 'completed').length || 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Academy</h1>
          <p className="text-muted-foreground">
            Operational training resources for your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRequestDialog(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Request Training
          </Button>
          <Button onClick={() => window.open('https://learnworld.com', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open LearnWorld
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Resources"
          value={stats?.totalResources || 0}
          icon={BookOpen}
          subtitle="Available training materials"
        />
        <StatCard
          title="Courses"
          value={stats?.totalCourses || 0}
          icon={GraduationCap}
          subtitle="Interactive courses"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={ClipboardCheck}
          subtitle="Your completed trainings"
        />
        <StatCard
          title="Feedback Requests"
          value={pendingRequests || 0}
          icon={MessageSquarePlus}
          subtitle="Pending requests"
        />
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all">All Training</TabsTrigger>
          <TabsTrigger value="paths">By Role</TabsTrigger>
          <TabsTrigger value="guides">Quick Guides</TabsTrigger>
          <TabsTrigger value="ebooks">eBooks</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        {/* All Training Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Quick Access Categories */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CATEGORIES.map((cat) => (
                <QuickAccessCard
                  key={cat.key}
                  icon={cat.icon}
                  title={cat.label}
                  subtitle={cat.description}
                  count={stats?.byCategory?.[cat.key] || 0}
                  color={cat.color}
                  isActive={selectedCategory === cat.key}
                  onClick={() => setSelectedCategory(
                    selectedCategory === cat.key ? 'all' : cat.key
                  )}
                />
              ))}
            </div>
          </div>

          {/* Search and Resources Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {selectedCategory !== 'all' 
                  ? CATEGORIES.find(c => c.key === selectedCategory)?.label 
                  : 'All Resources'}
                {selectedCategory !== 'all' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => setSelectedCategory('all')}
                  >
                    Clear filter
                  </Button>
                )}
              </h2>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {resourcesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredResources?.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No resources found</h3>
                  <p className="text-muted-foreground max-w-md">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'No training resources available in this category yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredResources?.map((resource) => (
                  <TrainingResourceCard
                    key={resource.id}
                    resource={resource}
                    progress={getProgressForResource(resource.id)}
                    onStart={() => {
                      if (resource.external_url) {
                        window.open(resource.external_url, '_blank');
                      }
                    }}
                    onView={() => {
                      // Scroll to ebook viewer or open modal
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Role-Based Learning Paths</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Curated training tracks for each job function. Complete required paths to ensure readiness.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEARNING_PATHS.map((path, index) => (
              <LearningPathCard
                key={index}
                title={path.title}
                description={path.description}
                totalModules={path.totalModules}
                completedModules={Math.floor(Math.random() * path.totalModules)} // TODO: Real progress
                estimatedHours={path.estimatedHours}
                isRequired={path.isRequired}
              />
            ))}
          </div>
        </TabsContent>

        {/* Quick Guides Tab */}
        <TabsContent value="guides" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Quick Start Guides</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Short, actionable how-to guides for common tasks. Get up to speed fast.
            </p>
          </div>
          {resourcesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources?.filter(r => r.resource_type === 'guide').map((resource) => (
                <TrainingResourceCard
                  key={resource.id}
                  resource={resource}
                  progress={getProgressForResource(resource.id)}
                />
              ))}
              {resources?.filter(r => r.resource_type === 'guide').length === 0 && (
                <Card className="col-span-full py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-1">No quick guides yet</h3>
                    <p className="text-muted-foreground">Quick guides will be added soon.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* eBooks Tab */}
        <TabsContent value="ebooks" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">eBook Library</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Interactive flipbooks and digital manuals. Read online or download for offline use.
            </p>
          </div>
          
          {ebooks.length > 0 ? (
            <div className="space-y-6">
              {ebooks.map((ebook) => (
                <EBookViewer
                  key={ebook.id}
                  embedUrl={ebook.embed_code || ''}
                  title={ebook.title}
                  description={ebook.description || undefined}
                />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">No eBooks available</h3>
                <p className="text-muted-foreground">eBooks will be added to your library soon.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">My Training Requests</h2>
              <p className="text-muted-foreground text-sm">
                Track your submitted training requests and their status.
              </p>
            </div>
            <Button onClick={() => setShowRequestDialog(true)}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
          
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">No requests yet</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Have a training need? Submit a request and we'll work on adding it.
              </p>
              <Button onClick={() => setShowRequestDialog(true)}>
                Submit Your First Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      <TrainingRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />
    </div>
  );
}
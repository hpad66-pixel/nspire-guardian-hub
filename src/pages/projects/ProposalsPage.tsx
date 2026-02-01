import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Search,
  Mail,
  Clock,
  CheckCircle2,
  Send,
  FolderKanban,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useProposals } from '@/hooks/useProposals';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  draft: { label: 'Draft', icon: Clock, className: 'bg-muted text-muted-foreground' },
  review: { label: 'In Review', icon: FileText, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  sent: { label: 'Sent', icon: Send, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  archived: { label: 'Archived', icon: FileText, className: 'bg-muted text-muted-foreground' },
};

const typeLabels: Record<string, string> = {
  project_proposal: 'Project Proposal',
  change_order_request: 'Change Order',
  scope_amendment: 'Scope Amendment',
  cost_estimate: 'Cost Estimate',
  letter: 'Letter',
  memo: 'Memo',
  correspondence: 'Correspondence',
};

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: projects } = useProjects();

  // Filter proposals
  const filteredProposals = proposals?.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.recipient_company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    const matchesProject = projectFilter === 'all' || proposal.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  }) || [];

  // Group by project
  const proposalsByProject = filteredProposals.reduce((acc, proposal) => {
    const projectId = proposal.project_id;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(proposal);
    return acc;
  }, {} as Record<string, typeof filteredProposals>);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center py-24">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Proposal management is available to administrators only. Contact your admin for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Proposals & Correspondence</h1>
              <p className="text-muted-foreground">AI-powered document generation for projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{proposals?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Proposals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {proposals?.filter(p => p.status === 'draft').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {proposals?.filter(p => p.status === 'sent').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {proposals?.filter(p => p.ai_generated).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">AI Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {proposalsLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!proposalsLoading && filteredProposals.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Proposals Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
                ? 'No proposals match your current filters.'
                : 'Create your first proposal by going to a project and using the Proposals tab.'}
            </p>
            <Button onClick={() => navigate('/projects')}>
              <FolderKanban className="h-4 w-4 mr-2" />
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Proposals List */}
      {!proposalsLoading && Object.keys(proposalsByProject).length > 0 && (
        <div className="space-y-6">
          {Object.entries(proposalsByProject).map(([projectId, projectProposals]) => {
            const project = projects?.find(p => p.id === projectId);
            return (
              <div key={projectId}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderKanban className="h-4 w-4 text-module-projects" />
                  <h2 className="font-semibold text-sm">
                    {project?.name || 'Unknown Project'}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {projectProposals.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {projectProposals.map((proposal) => {
                    const status = statusConfig[proposal.status];
                    const StatusIcon = status?.icon || FileText;
                    return (
                      <Card
                        key={proposal.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/projects/${projectId}?tab=proposals`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  #{proposal.proposal_number}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {typeLabels[proposal.proposal_type] || proposal.proposal_type}
                                </Badge>
                                {proposal.ai_generated && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium truncate">{proposal.title}</h3>
                              {proposal.recipient_name && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  <Mail className="h-3 w-3 inline mr-1" />
                                  {proposal.recipient_name}
                                  {proposal.recipient_company && ` • ${proposal.recipient_company}`}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline" className={status?.className}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(proposal.updated_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

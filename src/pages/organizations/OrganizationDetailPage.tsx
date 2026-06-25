import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, ChevronRight, Briefcase, FolderKanban, Mail, Phone, Globe,
  Building2, Calendar, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient, type ClientType } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  internal_org: 'Internal Organization',
  business_client: 'Business Client',
  property_management: 'Property Management',
  government: 'Government',
  other: 'Other',
};

const STATUS_CLASS: Record<string, string> = {
  planning:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
  active:    'bg-success/10 text-success border-success/20',
  on_hold:   'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-muted text-muted-foreground border-border',
  closed:    'bg-muted text-muted-foreground border-border',
};

export default function OrganizationDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: org, isLoading: orgLoading } = useClient(clientId);
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();

  // RLS already scopes projects to the tenant; filter to this organization.
  const projects = useMemo(
    () => allProjects.filter((p) => (p as { client_id?: string | null }).client_id === clientId),
    [allProjects, clientId],
  );

  const formatCurrency = (amount: number | null | undefined) =>
    amount
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
      : null;

  if (orgLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6">
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Organization not found</h2>
          <Button onClick={() => navigate('/organizations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/organizations" className="hover:text-foreground">Organizations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{org.name}</span>
      </nav>

      {/* Org header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
              <Badge variant="outline">{CLIENT_TYPE_LABEL[org.client_type]}</Badge>
              {!org.is_active && <Badge variant="secondary">Archived</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {org.contact_email && (
                <a href={`mailto:${org.contact_email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" />{org.contact_email}
                </a>
              )}
              {org.contact_phone && (
                <a href={`tel:${org.contact_phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Phone className="h-3 w-3" />{org.contact_phone}
                </a>
              )}
              {(org.city || org.state) && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />{[org.city, org.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-module-projects" />
          <h2 className="text-base font-semibold">Projects</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {projects.length}
          </span>
        </div>

        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card py-12 text-center">
            <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No projects under this organization yet</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
              <Plus className="mr-2 h-4 w-4" />Go to Projects
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const budget = formatCurrency(Number(project.budget) || 0);
              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group rounded-xl border bg-card p-4 text-left transition-all hover:border-accent/50 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold leading-tight">{project.name}</h3>
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', STATUS_CLASS[project.status] ?? STATUS_CLASS.planning)}>
                      {project.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {project.property?.name ?? 'Standalone'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    {budget && <span className="font-medium text-foreground">{budget}</span>}
                    {project.target_end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(project.target_end_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

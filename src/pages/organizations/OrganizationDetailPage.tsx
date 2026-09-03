import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Briefcase, FolderKanban, Mail, Phone, Globe, Plus, UserRoundCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientProjectKindGrid } from '@/components/organizations/ClientProjectKindGrid';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { useClient, useClientProjectAccess, type ClientType } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useModules } from '@/contexts/ModuleContext';
import { groupProjectsByKind } from '@/lib/projectKind';

const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  internal_org: 'Internal Organization',
  business_client: 'Business Client',
  property_management: 'Property Management',
  government: 'Government',
  other: 'Other',
};

export default function OrganizationDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: org, isLoading: orgLoading } = useClient(clientId);
  const { data: projectAccess, isLoading: accessLoading } = useClientProjectAccess(clientId);
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();
  const { currentRole } = useUserPermissions();
  const { isModuleEnabled } = useModules();
  const canCreateProject = projectAccess?.canCreate ?? false;
  const canManageContractors = isModuleEnabled('contractorReadinessEnabled')
    && ['admin', 'owner', 'manager', 'project_manager', 'administrator'].includes(currentRole ?? '');

  // RLS already scopes projects to the tenant; filter to this organization.
  const projects = useMemo(
    () => allProjects.filter((p) => (p as { client_id?: string | null }).client_id === clientId),
    [allProjects, clientId],
  );

  const kindCounts = useMemo(() => {
    const grouped = groupProjectsByKind(projects);
    return {
      construction: grouped.construction.length,
      consulting: grouped.consulting.length,
    };
  }, [projects]);

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
        <div className="flex flex-col items-start gap-4 sm:flex-row">
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
          <div className="flex flex-wrap gap-2">{canManageContractors && <Button variant="outline" className="shrink-0" onClick={() => navigate(`/organizations/${org.id}/contractors`)}><UserRoundCheck className="mr-2 h-4 w-4" />Contractors</Button>}{canCreateProject && <Button className="shrink-0" onClick={() => setCreateProjectOpen(true)}><Plus className="mr-2 h-4 w-4" />Create project</Button>}</div>
        </div>
      </div>

      {/* Projects — Construction row + Consulting row */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <FolderKanban className="h-4 w-4 text-module-projects" />
          <h2 className="text-base font-semibold">Projects</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {projects.length}
          </span>
          {projects.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              {kindCounts.construction > 0 && (
                <span className="rounded-full border border-orange-600/30 bg-orange-500/15 px-2.5 py-0.5 text-orange-800 dark:text-orange-200">
                  {kindCounts.construction} Construction
                </span>
              )}
              {kindCounts.consulting > 0 && (
                <span className="rounded-full border border-emerald-700/30 bg-[var(--apas-surface)] px-2.5 py-0.5 text-[var(--apas-white)]">
                  {kindCounts.consulting} Consulting
                </span>
              )}
            </div>
          )}
        </div>

        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card py-12 text-center">
            <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No projects under this organization yet</p>
            {accessLoading ? (
              <Skeleton className="mx-auto mt-4 h-9 w-40" />
            ) : canCreateProject ? (
              <Button className="mt-4" onClick={() => setCreateProjectOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Create the first project
              </Button>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">A client or workspace administrator can create the first project here.</p>
            )}
          </div>
        ) : (
          <ClientProjectKindGrid projects={projects} />
        )}
      </section>

      {canCreateProject && (
        <ProjectDialog
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
          clientContext={{ id: org.id, name: org.name }}
          onCreated={(created) => navigate(`/projects/${created.id}`)}
        />
      )}
    </div>
  );
}

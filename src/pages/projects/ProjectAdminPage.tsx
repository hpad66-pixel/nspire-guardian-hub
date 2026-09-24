import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive, ArrowLeft, Building2, Briefcase, ChevronRight, Lightbulb, LockKeyhole, Mail, Settings2, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useUserPermissions } from '@/hooks/usePermissions';
import { ModuleVisibilityPanel } from '@/components/projects/ModuleVisibilityPanel';
import { ProjectKindBadge, ProjectTypeMissingAlert } from '@/components/projects/ProjectKindBadge';
import { ProjectTypeDialog } from '@/components/projects/ProjectTypeDialog';
import {
  APAS_COMPANY_BRANDS,
  billingWorkflowDescriptorForProjectType,
  companyBrandForProject,
  upsertProjectBillingProfile,
  type ApasCompanyKey,
} from '@/lib/financial/apasCompanyBranding';
import { projectKind } from '@/lib/projectKind';
import { useState } from 'react';
import { toast } from 'sonner';
import { AgentPilotAdminCard } from '@/components/agent/AgentPilotAdminCard';
import { AGENT_FOUNDATION_ENABLED } from '@/lib/agent/runtime';
import { ProjectCloseDialog } from '@/components/projects/ProjectCloseDialog';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';

/**
 * Per-project administration: module on/off, project type, and cross-links
 * into CRM / email / money / portal. Inherits workspace admin privileges;
 * every project gets its own admin surface so complexity can be decluttered.
 */
export default function ProjectAdminPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(projectId ?? null);
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
  const updateProject = useUpdateProject();
  const [typeOpen, setTypeOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const { isSuperAdmin } = usePlatformSuperAdmin();

  const kind = projectKind(project ?? {});
  const brand = companyBrandForProject(project as { project_type?: string | null; program_meta?: unknown } | null);
  const workflow = billingWorkflowDescriptorForProjectType((project as { project_type?: string | null } | null)?.project_type, brand);

  const changeBillingCompany = async (companyKey: ApasCompanyKey) => {
    await updateProject.mutateAsync({
      id: project!.id,
      program_meta: upsertProjectBillingProfile((project as { program_meta?: unknown }).program_meta, companyKey),
    } as never);
  };

  if (isLoading || permsLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="link" onClick={() => navigate('/projects')}>Back to projects</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-8 text-center">
        <Settings2 className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Only workspace or project administrators can turn modules on or off.
        </p>
        <Button onClick={() => navigate(`/projects/${project.id}`)}>Back to project</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-foreground">Projects</Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <Link to={`/projects/${project.id}`} className="max-w-[200px] truncate hover:text-foreground">
          {project.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="font-medium text-foreground">Admin</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <ProjectKindBadge project={project} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Project Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Declutter this {kind === 'consulting' ? 'consulting engagement' : 'construction job'} —
            activate only the modules that add value for the client.
          </p>
        </div>
      </div>

      <ProjectTypeMissingAlert project={project} />

      {/* Super-admin lifecycle lockdown */}
      <Card className={project.status === 'closed' ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {project.status === 'closed' ? <ShieldCheck className="h-4 w-4 text-emerald-700" /> : <LockKeyhole className="h-4 w-4" />}
            Project lifecycle lockdown
          </CardTitle>
          <CardDescription>
            Completed projects become view-only records. Nobody can add, delete, upload, or modify project-owned records unless the platform super administrator reopens the project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {project.status === 'closed' ? (
              <>
                <p className="font-semibold text-emerald-950">This project is completed and locked down.</p>
                <p className="mt-1 text-emerald-900/75">
                  Users can view the project, but edits are blocked. Change requests should go to{' '}
                  <a href="mailto:hardeep@apas.ai" className="font-semibold underline-offset-2 hover:underline">hardeep@apas.ai</a>.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Close and lock the project when the work is final.</p>
                <p className="mt-1 text-muted-foreground">
                  This creates an audit event, freezes the project, and preserves it as the official completed record.
                </p>
              </>
            )}
          </div>
          {isSuperAdmin && project.status !== 'closed' && (
            <Button className="shrink-0 bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCloseOpen(true)}>
              <Archive className="mr-2 h-4 w-4" />
              Close and lock
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Billing workflow + inheritance summary */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {kind === 'consulting' ? <Briefcase className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              Billing workflow and company
            </CardTitle>
            <CardDescription>
              Project type controls invoice vs pay-app workflow. Billing company controls APAS Consulting vs APAS Build branding and sender identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `${brand.accent}66`,
                background: brand.surface,
                color: brand.ink,
                fontFamily: brand.fontFamily,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: brand.accent }}>
                    {brand.wordmark}
                  </div>
                  <div className="mt-1 text-lg font-black">{brand.legalName}</div>
                  <div className="text-sm" style={{ color: brand.muted }}>{workflow.workflowDescription}</div>
                </div>
                <span className="rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white" style={{ background: brand.primary }}>
                  {workflow.workflowLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-white/80 p-2">
                  <p className="font-semibold">Project type</p>
                  <p className="capitalize" style={{ color: brand.muted }}>{(project as { project_type?: string }).project_type ?? 'unset'}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2">
                  <p className="font-semibold">Document</p>
                  <p style={{ color: brand.muted }}>{workflow.documentLabel}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2">
                  <p className="font-semibold">Sender</p>
                  <p style={{ color: brand.muted }}>{brand.senderName} &lt;{brand.senderEmail}&gt;</p>
                  {brand.senderEmailStatus === 'pending_domain' && (
                    <p className="mt-0.5 text-[10px] font-semibold text-amber-700">APASBuild.com sender domain pending verification</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing company</p>
                <p className="text-xs text-muted-foreground">Use this for City Engineering or any project where APAS Build owns the invoice even if the work is consulting.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.values(APAS_COMPANY_BRANDS).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    disabled={updateProject.isPending}
                    onClick={() => changeBillingCompany(option.key)}
                    className={`rounded-lg border p-3 text-left transition ${brand.key === option.key ? 'ring-2 ring-offset-1' : 'hover:border-muted-foreground/40'}`}
                    style={{
                      borderColor: brand.key === option.key ? option.accent : undefined,
                      background: brand.key === option.key ? option.surface : undefined,
                      color: brand.key === option.key ? option.ink : undefined,
                    }}
                  >
                    <p className="text-sm font-black">{option.legalName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.senderName} &lt;{option.senderEmail}&gt;
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setTypeOpen(true)}>
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                Change type
              </Button>
              <Button size="sm" asChild style={{ background: brand.primary }}>
                <Link to={`/projects/${project.id}/${workflow.routePath}`}>
                  <Wallet className="mr-1.5 h-3.5 w-3.5" />
                  {workflow.routeLabel}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Cross-connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected workflows</CardTitle>
          <CardDescription>
            Contacts, email, money, and the client portal stay linked through the project directory.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="justify-start" asChild>
            <Link to={`/projects/${project.id}/directory`}>
              <Users className="mr-2 h-4 w-4" />
              People & CRM
            </Link>
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate(`/projects/${project.id}?tab=correspondence`)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Correspondence
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to={`/projects/${project.id}/${workflow.routePath}`}>
              <Wallet className="mr-2 h-4 w-4" />
              {workflow.workflowLabel}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate(`/projects/${project.id}?tab=client-portal`)}
          >
            <Users className="mr-2 h-4 w-4" />
            Client portal
          </Button>
        </CardContent>
      </Card>

      {/* Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Modules
          </CardTitle>
          <CardDescription>
            Example: turn off Procurement or Safety on a lean consulting job; turn them back on when the engagement grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModuleVisibilityPanel
            project={{
              id: project.id,
              name: project.name,
              project_type: (project as { project_type?: string }).project_type,
              module_config: (project as { module_config?: Record<string, boolean> }).module_config,
              module_inherit_from_parent: (project as { module_inherit_from_parent?: boolean }).module_inherit_from_parent,
              parent_project_id: project.parent_project_id,
            }}
          />
        </CardContent>
      </Card>

      {AGENT_FOUNDATION_ENABLED && <AgentPilotAdminCard projectId={project.id} />}

      <ProjectTypeDialog
        open={typeOpen}
        onOpenChange={setTypeOpen}
        project={project as never}
      />
      <ProjectCloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        projectId={project.id}
        projectName={project.name}
        consulting={kind === 'consulting'}
      />
    </div>
  );
}

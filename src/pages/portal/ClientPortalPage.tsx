import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { PortalShell, type PortalTab } from '@/components/portal/PortalShell';
import { PortalHome } from '@/components/portal/PortalHome';
import { PortalMessages } from '@/components/portal/PortalMessages';
import { PortalDocuments } from '@/components/portal/PortalDocuments';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientUpdate {
  id: string;
  title: string;
  body: string;
  photo_url: string | null;
  update_type: string | null;
  created_at: string;
}

// ─── Data hooks ──────────────────────────────────────────────────────────────

function usePortalProject(projectId: string) {
  return useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, milestones:project_milestones(id, name, due_date, status, completed_at)')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

function usePortalUpdates(projectId: string) {
  return useQuery({
    queryKey: ['portal-updates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_client_updates' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Portal updates fetch:', error.message);
        return [] as ClientUpdate[];
      }
      return (data ?? []) as unknown as ClientUpdate[];
    },
    enabled: !!projectId,
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<PortalTab>('home');

  const { data: branding } = useCompanyBranding();
  const { data: project, isLoading: projectLoading, error: projectError } = usePortalProject(projectId ?? '');
  const { data: updates = [] } = usePortalUpdates(projectId ?? '');

  const accentColor = branding?.primary_color ?? 'hsl(217, 91%, 60%)';

  // ── Auth guard ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1117' }}>
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=/portal/${projectId}`} replace />;
  }

  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Project loading ───────────────────────────────────────
  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1117' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading your project...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0D1117' }}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <p className="text-white font-semibold">Project not found</p>
          <p className="text-sm text-slate-500 max-w-xs">
            This project link may be invalid or you may not have access to it.
            Contact your contractor for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Render tabs ───────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'home':
        return (
          <PortalHome
            project={project!}
            companyBranding={branding ?? null}
            updates={updates}
            onNavigate={(tab) => setActiveTab(tab as PortalTab)}
            accentColor={accentColor}
          />
        );
      case 'messages':
        return (
          <PortalMessages
            projectId={projectId!}
            companyName={branding?.company_name ?? 'Your Contractor'}
            accentColor={accentColor}
          />
        );
      case 'docs':
        return (
          <PortalDocuments
            projectId={projectId!}
            accentColor={accentColor}
          />
        );
    }
  }

  return (
    <PortalShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      projectId={projectId}
      projectName={project?.name}
      branding={branding ?? null}
    >
      {renderTab()}
    </PortalShell>
  );
}

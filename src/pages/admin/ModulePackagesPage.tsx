import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Boxes, Lock, Check, ShieldCheck } from 'lucide-react';
import { useWorkspaceModules, useToggleWorkspaceModule, useApplyPackage, type WorkspaceModuleRow } from '@/hooks/useWorkspaceModules';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { MODULE_CATALOG, PACKAGES, MODULE_WS_COLUMN, type ModuleKey } from '@/lib/packages';
import { cn } from '@/lib/utils';

export default function ModulePackagesPage() {
  const { data: row, isLoading } = useWorkspaceModules();
  const toggle = useToggleWorkspaceModule();
  const applyPkg = useApplyPackage();
  const { refetchModules, isModuleEnabled, toggleModule } = useModules();
  const { currentRole } = useUserPermissions();
  const isAdminOrOwner = currentRole === 'admin' || currentRole === 'owner';

  // Fall back to querying the workspace id when no module row exists yet.
  const { data: wsId } = useQuery({
    queryKey: ['my-workspace-id'],
    enabled: !row?.workspace_id,
    queryFn: async () => { const { data } = await supabase.from('workspaces').select('id').limit(1).maybeSingle(); return (data as any)?.id ?? null; },
  });
  const workspaceId = (row?.workspace_id as string | undefined) ?? (wsId as string | undefined);

  if (!isAdminOrOwner) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">Only workspace admins can manage modules.</p>
      </div>
    );
  }

  const r = row as WorkspaceModuleRow | null;
  // nspire / daily-grounds are stored on the PROPERTIES table (workspace-wide),
  // toggled via ModuleContext; everything else is a workspace_modules column.
  const PROPERTY_BACKED = new Set<ModuleKey>(['nspireEnabled', 'dailyGroundsEnabled']);

  const state = (key: ModuleKey) => {
    const wsCol = MODULE_WS_COLUMN[key];
    const propertyBacked = PROPERTY_BACKED.has(key);
    const platformCol = wsCol ? ('platform_' + wsCol.replace(/_enabled$/, '')) as keyof WorkspaceModuleRow : null;
    const platformOn = !r || !platformCol ? true : (r as any)[platformCol] !== false;
    return { on: isModuleEnabled(key), locked: !!wsCol && !platformOn, controllable: !!wsCol || propertyBacked, propertyBacked, wsCol };
  };

  const setModule = (key: ModuleKey, value: boolean) => {
    const s = state(key);
    if (s.propertyBacked) { void toggleModule(key); return; } // flips across all workspace properties
    if (!s.wsCol || !workspaceId) return;
    toggle.mutate({ workspaceId, field: s.wsCol as any, value }, { onSuccess: () => refetchModules() });
  };
  const apply = (packageKey: string) => {
    if (!workspaceId) return;
    applyPkg.mutate({ workspaceId, packageKey }, { onSuccess: () => refetchModules() });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"><Boxes className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Modules &amp; Packages</h1>
          <p className="mt-1 text-muted-foreground">Turn suites on or off for this workspace. Apply a package to set them all at once.</p>
        </div>
        {r?.package && <Badge variant="secondary" className="ml-auto mt-1">Package: {r.package}</Badge>}
      </div>

      {/* Packages */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Packages</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((p) => {
            const active = r?.package === p.name;
            return (
              <button key={p.key} onClick={() => apply(p.key)} disabled={applyPkg.isPending || !workspaceId}
                className={cn('text-left rounded-xl border p-3 transition-all hover:border-primary/50 hover:shadow-sm', active && 'border-primary bg-primary/5')}>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">{p.name}</span>{active && <Check className="h-4 w-4 text-primary" />}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.modules.length} modules</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog */}
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-5">
          {MODULE_CATALOG.map((cat) => (
            <div key={cat.key}>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{cat.label}</div>
              <div className="rounded-xl border bg-card divide-y">
                {cat.modules.map((m) => {
                  const s = state(m.key);
                  return (
                    <div key={m.key} className="flex items-center gap-3 p-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.label}</span>
                          {s.locked && <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground"><Lock className="h-3 w-3" />Not in plan</Badge>}
                          {s.propertyBacked && <Badge variant="outline" className="text-[10px] text-muted-foreground">Workspace-wide</Badge>}
                        </div>
                        {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                      </div>
                      <Switch
                        checked={s.on}
                        disabled={s.locked || !s.controllable || (!!s.wsCol && !workspaceId) || toggle.isPending}
                        onCheckedChange={(v) => setModule(m.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">“Not in plan” means a super-admin platform gate is off (upsell). “Per property” modules (NSPIRE, Daily Grounds) are turned on inside each property.</p>
    </div>
  );
}

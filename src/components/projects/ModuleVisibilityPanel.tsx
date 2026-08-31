import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { useUpdateProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import {
  PROJECT_MODULE_CATALOG,
  MODULE_GROUP_LABELS,
  MODULE_GROUP_ORDER,
  MODULE_PRESETS,
  buildModuleConfig,
  emptyModuleConfig,
  isModuleVisible,
  type ModulePresetId,
  type ModuleVisibilityProject,
} from '@/lib/projects/moduleVisibility';
import { projectKind } from '@/lib/projectKind';
import { toast } from 'sonner';

interface ModuleVisibilityPanelProps {
  project: ModuleVisibilityProject & { id: string; name?: string | null };
  /** Compact = used inside a dialog; full = used on Project Admin page. */
  variant?: 'compact' | 'full';
  onSaved?: () => void;
}

export function ModuleVisibilityPanel({
  project,
  variant = 'full',
  onSaved,
}: ModuleVisibilityPanelProps) {
  const updateProject = useUpdateProject();
  const kind = projectKind(project);

  const initial = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const def of PROJECT_MODULE_CATALOG) map[def.slug] = isModuleVisible(project, def.slug);
    return map;
  }, [project]);

  const [values, setValues] = useState<Record<string, boolean>>(initial);
  const [inherit, setInherit] = useState(Boolean(project.module_inherit_from_parent));

  useEffect(() => {
    setValues(initial);
    setInherit(Boolean(project.module_inherit_from_parent));
  }, [initial, project.id, project.module_inherit_from_parent]);

  const grouped = useMemo(
    () =>
      MODULE_GROUP_ORDER.map((group) => ({
        group,
        items: PROJECT_MODULE_CATALOG.filter((m) => m.group === group && !m.adminOnly),
      })).filter((g) => g.items.length > 0),
    [],
  );

  const dirty =
    PROJECT_MODULE_CATALOG.some((def) => !def.locked && values[def.slug] !== initial[def.slug]) ||
    inherit !== Boolean(project.module_inherit_from_parent);

  const enabledCount = PROJECT_MODULE_CATALOG.filter((d) => !d.adminOnly && values[d.slug]).length;

  const applyPreset = (id: ModulePresetId) => {
    const preset = MODULE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = preset.apply(project.project_type);
    setValues((prev) => ({ ...prev, ...next, overview: true, admin: true }));
    if (id === 'reset-defaults') setInherit(false);
    toast.message(`Applied “${preset.label}” — save to keep changes`);
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {
        id: project.id,
        module_inherit_from_parent: inherit,
      };
      if (MODULE_PRESETS.find((p) => p.id === 'reset-defaults') && !dirty) {
        // no-op
      }
      // If values match type defaults exactly and inherit is off, store empty config
      // so future default changes still apply. Otherwise store explicit map.
      const explicit = buildModuleConfig(values);
      const matchesDefaults = PROJECT_MODULE_CATALOG.every(
        (def) => def.locked || explicit[def.slug] === isModuleVisible({ project_type: project.project_type }, def.slug),
      );
      payload.module_config = matchesDefaults && !inherit ? emptyModuleConfig() : explicit;

      await updateProject.mutateAsync(payload as never);
      toast.success('Project modules updated');
      onSaved?.();
    } catch {
      // toast handled by mutation
    }
  };

  const handleResetDefaults = async () => {
    setValues(
      Object.fromEntries(
        PROJECT_MODULE_CATALOG.map((d) => [
          d.slug,
          isModuleVisible({ project_type: project.project_type }, d.slug),
        ]),
      ),
    );
    setInherit(false);
    try {
      await updateProject.mutateAsync({
        id: project.id,
        module_config: emptyModuleConfig(),
        module_inherit_from_parent: false,
      } as never);
      toast.success('Reset to type defaults');
      onSaved?.();
    } catch {
      /* mutation toast */
    }
  };

  return (
    <div className={cn('space-y-5', variant === 'full' && 'max-w-3xl')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Turn modules on or off for{' '}
            <span className="font-medium text-foreground">{project.name ?? 'this project'}</span>.
            Off modules leave the sidebar for everyone — including the client portal where applicable.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-semibold uppercase tracking-wide">
              {kind === 'consulting' ? 'Consulting' : 'Construction'} defaults
            </Badge>
            <span className="text-xs text-muted-foreground">
              {enabledCount} modules on
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            disabled={updateProject.isPending}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset defaults
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || updateProject.isPending}
          >
            {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save modules'}
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Quick presets
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULE_PRESETS.filter((p) => p.id !== 'reset-defaults').map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-accent/5"
            >
              <div className="text-sm font-semibold text-foreground">{preset.label}</div>
              <div className="text-xs text-muted-foreground leading-snug">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-project inheritance */}
      {project.parent_project_id && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Inherit modules from parent project</div>
            <div className="text-xs text-muted-foreground">
              Sub-project uses the parent’s on/off map unless you override a module here.
            </div>
          </div>
          <Switch checked={inherit} onCheckedChange={setInherit} aria-label="Inherit from parent" />
        </div>
      )}

      {grouped.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MODULE_GROUP_LABELS[group]}
          </p>
          <div className="divide-y rounded-lg border">
            {items.map((def) => {
              const locked = Boolean(def.locked);
              return (
                <div key={def.slug} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {def.label}
                      {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Always on" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{def.description}</div>
                  </div>
                  <Switch
                    checked={values[def.slug] ?? true}
                    disabled={locked}
                    onCheckedChange={(v) => setValues((prev) => ({ ...prev, [def.slug]: v }))}
                    aria-label={`Toggle ${def.label}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

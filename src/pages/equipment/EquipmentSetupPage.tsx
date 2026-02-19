import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMasterCategories, useWorkspaceEquipmentConfig, useSaveEquipmentConfig } from '@/hooks/useEquipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Truck, Check, Box, Star, Layers, Grid3X3, Cpu, Anchor, Globe, Leaf } from 'lucide-react';
import { icons as lucideIcons } from 'lucide-react';
import { toast } from 'sonner';

const CUSTOM_ICON_OPTIONS = [
  { name: 'Box', Icon: Box },
  { name: 'Star', Icon: Star },
  { name: 'Layers', Icon: Layers },
  { name: 'Grid3X3', Icon: Grid3X3 },
  { name: 'Cpu', Icon: Cpu },
  { name: 'Anchor', Icon: Anchor },
  { name: 'Globe', Icon: Globe },
  { name: 'Leaf', Icon: Leaf },
];

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <Box className={className} />;
  return <Icon className={className} />;
}

export default function EquipmentSetupPage() {
  const navigate = useNavigate();
  const { data: masterCategories = [], isLoading } = useMasterCategories();
  const { data: existingConfig } = useWorkspaceEquipmentConfig();
  const saveConfig = useSaveEquipmentConfig();

  const [selected, setSelected] = useState<Set<string>>(
    new Set(existingConfig?.active_category_slugs ?? [])
  );
  const [useCustom, setUseCustom] = useState(!!existingConfig?.custom_category_name);
  const [customName, setCustomName] = useState(existingConfig?.custom_category_name ?? '');
  const [customIcon, setCustomIcon] = useState(existingConfig?.custom_category_icon ?? 'Box');

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one category');
      return;
    }
    await saveConfig.mutateAsync({
      active_category_slugs: Array.from(selected),
      custom_category_name: useCustom && customName.trim() ? customName.trim() : null,
      custom_category_icon: useCustom ? customIcon : null,
      setup_completed: true,
    });
    navigate('/equipment');
    toast.success('Equipment tracking is ready ✓');
  };

  const handleSkip = async () => {
    await saveConfig.mutateAsync({
      active_category_slugs: [],
      custom_category_name: null,
      custom_category_icon: null,
      setup_completed: true,
    });
    navigate('/equipment');
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 pb-20 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set up Equipment Tracking</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Choose what you track. Only selected categories will appear in your equipment list.
          </p>
        </div>

        {/* Category grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {masterCategories.map(cat => {
              const isSelected = selected.has(cat.slug);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggle(cat.slug)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-150',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    <CategoryIcon iconName={cat.icon} className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </span>
                  <span className={cn('text-sm font-semibold leading-tight', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom category */}
        <div className="mt-6 rounded-2xl border border-dashed border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Need something not on the list?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can add one custom category for your organization.
              </p>
            </div>
            <button
              onClick={() => setUseCustom(v => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                useCustom ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                useCustom ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {useCustom && (
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">Category Name</label>
                  <span className="text-xs text-muted-foreground">{customName.length} / 40</span>
                </div>
                <Input
                  value={customName}
                  onChange={e => setCustomName(e.target.value.slice(0, 40))}
                  placeholder="e.g. Marine Equipment"
                  maxLength={40}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Icon</p>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_ICON_OPTIONS.map(({ name, Icon }) => (
                    <button
                      key={name}
                      onClick={() => setCustomIcon(name)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all',
                        customIcon === name
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={saveConfig.isPending || selected.size === 0}
          >
            {saveConfig.isPending ? 'Saving...' : 'Start Tracking Equipment'}
          </Button>
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Skip setup — I'll configure this later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

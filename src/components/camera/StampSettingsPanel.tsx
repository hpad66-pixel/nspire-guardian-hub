import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  STAMP_COLOR_HEX,
  STAMP_DATE_FORMAT_OPTIONS,
  type StampPosition,
  type StampSettings,
  type StampTextColor,
} from '@/lib/camera';
import { Check } from 'lucide-react';

const POSITIONS: { value: StampPosition; label: string }[] = [
  { value: 'top-left', label: 'TL' },
  { value: 'top-center', label: 'TC' },
  { value: 'top-right', label: 'TR' },
  { value: 'bottom-left', label: 'BL' },
  { value: 'bottom-center', label: 'BC' },
  { value: 'bottom-right', label: 'BR' },
];

const COLORS: StampTextColor[] = ['white', 'yellow', 'black', 'blue'];

interface StampSettingsPanelProps {
  settings: StampSettings;
  onChange: (next: StampSettings) => void;
  onSave: () => void;
  previewUrl?: string | null;
}

export function StampSettingsPanel({
  settings,
  onChange,
  onSave,
  previewUrl,
}: StampSettingsPanelProps) {
  const patch = (partial: Partial<StampSettings>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-5" data-testid="stamp-settings-panel">
      {previewUrl && (
        <div className="overflow-hidden rounded-xl border border-[#dedbd1]">
          <img src={previewUrl} alt="Stamp preview" className="max-h-40 w-full object-cover" />
        </div>
      )}

      <div className="space-y-2">
        <Label>Date & time format</Label>
        <Select
          value={settings.dateFormat}
          onValueChange={(v) => patch({ dateFormat: v as StampSettings['dateFormat'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAMP_DATE_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dedbd1] bg-[#FBFDF9] px-3 py-2.5">
        <div>
          <div className="text-sm font-medium">Location</div>
          <div className="text-xs text-muted-foreground">GPS + address on every photo</div>
        </div>
        <Switch
          checked={settings.showLocation}
          onCheckedChange={(showLocation) => patch({ showLocation })}
        />
      </div>

      <div className="space-y-2">
        <Label>Position</Label>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => {
            const active = settings.position === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => patch({ position: p.value })}
                className={cn(
                  'relative flex h-12 items-center justify-center rounded-lg border text-xs font-semibold',
                  active
                    ? 'border-[#0D3B30] bg-[#0D3B30]/10 text-[#0D3B30]'
                    : 'border-[#dedbd1] bg-white text-muted-foreground',
                )}
              >
                {p.label}
                {active && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Font size</Label>
          <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
        </div>
        <Slider
          value={[settings.fontSize]}
          min={12}
          max={36}
          step={1}
          onValueChange={([fontSize]) => patch({ fontSize })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Opacity</Label>
          <span className="text-xs text-muted-foreground">{Math.round(settings.opacity * 100)}%</span>
        </div>
        <Slider
          value={[Math.round(settings.opacity * 100)]}
          min={35}
          max={100}
          step={1}
          onValueChange={([pct]) => patch({ opacity: pct / 100 })}
        />
      </div>

      <div className="space-y-2">
        <Label>Text color</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => patch({ textColor: c })}
              className={cn(
                'h-9 w-9 rounded-full border-2',
                settings.textColor === c ? 'border-[#0D3B30] ring-2 ring-[#0D3B30]/30' : 'border-black/10',
              )}
              style={{ backgroundColor: STAMP_COLOR_HEX[c] }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Custom text</Label>
        <Input
          value={settings.customText}
          maxLength={80}
          placeholder="e.g. Filter change — leak stopped"
          onChange={(e) => patch({ customText: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Auto lines</Label>
        <div className="space-y-2 rounded-xl border border-[#dedbd1] bg-white p-3">
          {(
            [
              ['workOrder', 'Work order'],
              ['unit', 'Unit'],
              ['project', 'Project / property'],
              ['technician', 'Technician name'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <Switch
                checked={settings.autoLines[key]}
                onCheckedChange={(v) =>
                  patch({ autoLines: { ...settings.autoLines, [key]: v } })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <Button
        type="button"
        className="w-full bg-[#0D3B30] hover:bg-[#0D3B30]/90"
        onClick={onSave}
      >
        Save stamp style
      </Button>
    </div>
  );
}

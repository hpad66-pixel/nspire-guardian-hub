import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, MapPin, Loader2 } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { cn } from '@/lib/utils';

export interface WeatherData {
  condition: string;
  temperature: number;
  windSpeed: number;
  siteConditions: string;
}

const WEATHER_OPTIONS = [
  { value: 'Clear', emoji: '☀️', label: 'Clear' },
  { value: 'Partly Cloudy', emoji: '⛅', label: 'Partly Cloudy' },
  { value: 'Overcast', emoji: '🌥️', label: 'Overcast' },
  { value: 'Rain', emoji: '🌧️', label: 'Rain' },
  { value: 'Storm', emoji: '⛈️', label: 'Storm' },
  { value: 'Fog', emoji: '🌫️', label: 'Fog' },
  { value: 'Windy', emoji: '🌬️', label: 'Windy' },
  { value: 'Cold', emoji: '❄️', label: 'Cold' },
];

const CONDITION_CHIPS = [
  { value: 'Good visibility', label: 'Good visibility' },
  { value: 'Muddy conditions', label: 'Muddy conditions' },
  { value: 'Standing water', label: 'Standing water' },
  { value: 'Dust', label: 'Dust' },
  { value: 'Extreme heat', label: 'Extreme heat' },
];

interface WeatherSectionProps {
  open: boolean;
  onClose: () => void;
  data: WeatherData;
  onChange: (data: WeatherData) => void;
}

export function WeatherSection({ open, onClose, data, onChange }: WeatherSectionProps) {
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const update = (patch: Partial<WeatherData>) => onChange({ ...data, ...patch });

  const fetchWeather = async () => {
    if (!navigator.geolocation) return;
    setFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`
        );
        const json = await r.json();
        const temp = Math.round(json.current?.temperature_2m ?? data.temperature);
        const wind = Math.round(json.current?.wind_speed_10m ?? data.windSpeed);
        update({ temperature: temp, windSpeed: wind });
      } catch { /* silent */ }
      setFetchingWeather(false);
    }, () => setFetchingWeather(false));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">🌤️ Weather & Site Conditions</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Weather condition chips */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Weather Condition</p>
            <div className="grid grid-cols-4 gap-2">
              {WEATHER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ condition: opt.value })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                    data.condition === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-muted-foreground'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature & Wind */}
          {data.condition && (
            <div className="grid grid-cols-2 gap-6">
              <StepperInput
                label="Temperature (°F)"
                value={data.temperature}
                onChange={v => update({ temperature: v })}
                min={-20}
                max={130}
                step={5}
                size="md"
              />
              <StepperInput
                label="Wind Speed (mph)"
                value={data.windSpeed}
                onChange={v => update({ windSpeed: v })}
                min={0}
                max={100}
                step={5}
                size="md"
              />
            </div>
          )}

          {/* Fetch weather button */}
          <Button type="button" variant="outline" size="sm" onClick={fetchWeather} disabled={fetchingWeather} className="gap-2">
            {fetchingWeather ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Fetch current weather from GPS
          </Button>

          {/* Site conditions */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Quick Conditions</p>
            <QuickPickChips
              options={CONDITION_CHIPS}
              value={data.siteConditions.split(',').filter(Boolean)}
              multi
              onChange={(v) => {
                const current = data.siteConditions.split(',').filter(Boolean);
                const next = current.includes(v) ? current.filter(c => c !== v) : [...current, v];
                update({ siteConditions: next.join(',') });
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Visibility / Site Conditions</p>
              <VoiceDictation onTranscript={t => update({ siteConditions: data.siteConditions ? `${data.siteConditions}. ${t}` : t })} />
            </div>
            <Textarea
              value={data.siteConditions}
              onChange={e => update({ siteConditions: e.target.value })}
              placeholder="Describe site conditions, visibility, access issues..."
              className="min-h-[100px]"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

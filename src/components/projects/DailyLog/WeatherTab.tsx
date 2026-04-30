/**
 * C4 · WeatherTab — single-row editor for `daily_weather` (FK to daily_reports).
 *
 * Shows high/low, precip, wind, conditions. "Fetch from Open-Meteo" calls
 * the `daily-weather` edge function which populates the fields server-side
 * based on the project's lat/lng and the report_date.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CloudSun, Save } from "lucide-react";
import { toast } from "sonner";

interface DailyWeatherRow {
  daily_report_id: string;
  low_temp_f: number | null;
  high_temp_f: number | null;
  precipitation_in: number | null;
  wind_mph: number | null;
  conditions: string | null;
  source: string;
  fetched_at: string | null;
}

export function WeatherTab({ dailyReportId }: { dailyReportId: string | null }) {
  const qc = useQueryClient();

  const { data: row } = useQuery<DailyWeatherRow | null>({
    queryKey: ["daily-weather-row", dailyReportId],
    enabled: Boolean(dailyReportId),
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_weather" as any)
        .select("*").eq("daily_report_id", dailyReportId!).maybeSingle();
      if (error) throw error;
      return (data as DailyWeatherRow | null) ?? null;
    },
  });

  const [draft, setDraft] = useState<Omit<DailyWeatherRow, "daily_report_id" | "fetched_at">>({
    low_temp_f: null, high_temp_f: null, precipitation_in: null,
    wind_mph: null, conditions: null, source: "manual",
  });

  useEffect(() => {
    if (row) {
      setDraft({
        low_temp_f: row.low_temp_f,
        high_temp_f: row.high_temp_f,
        precipitation_in: row.precipitation_in,
        wind_mph: row.wind_mph,
        conditions: row.conditions,
        source: row.source,
      });
    }
  }, [row?.daily_report_id, row]);

  const save = useMutation({
    mutationFn: async () => {
      if (!dailyReportId) throw new Error("No daily report");
      const { error } = await supabase.from("daily_weather" as any).upsert({
        daily_report_id: dailyReportId,
        ...draft,
      } as any, { onConflict: "daily_report_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-weather-row", dailyReportId] }),
  });

  const fetchRemote = useMutation({
    mutationFn: async () => {
      if (!dailyReportId) throw new Error("No daily report");
      const { data, error } = await supabase.functions.invoke("daily-weather", {
        body: { report_id: dailyReportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-weather-row", dailyReportId] });
      qc.invalidateQueries({ queryKey: ["daily-report"] });
    },
  });

  async function handleSave() {
    try {
      await save.mutateAsync();
      toast.success("Weather saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleFetch() {
    try {
      await fetchRemote.mutateAsync();
      toast.success("Pulled from Open-Meteo");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!dailyReportId) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center">
        Create the daily report first to record weather.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Source: <span className="font-mono">{draft.source}</span>
          {row?.fetched_at && <> · fetched {new Date(row.fetched_at).toLocaleString()}</>}
        </div>
        <Button variant="outline" onClick={handleFetch} disabled={fetchRemote.isPending}>
          <CloudSun className="h-4 w-4 mr-2" />
          {fetchRemote.isPending ? "Fetching…" : "Fetch from Open-Meteo"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label>High (°F)</Label>
          <Input type="number"
                 value={draft.high_temp_f ?? ""}
                 onChange={(e) => setDraft({ ...draft, high_temp_f: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <Label>Low (°F)</Label>
          <Input type="number"
                 value={draft.low_temp_f ?? ""}
                 onChange={(e) => setDraft({ ...draft, low_temp_f: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <Label>Precip (in)</Label>
          <Input type="number" step="0.01"
                 value={draft.precipitation_in ?? ""}
                 onChange={(e) => setDraft({ ...draft, precipitation_in: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <Label>Wind (mph)</Label>
          <Input type="number"
                 value={draft.wind_mph ?? ""}
                 onChange={(e) => setDraft({ ...draft, wind_mph: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <Label>Conditions</Label>
          <Input value={draft.conditions ?? ""}
                 onChange={(e) => setDraft({ ...draft, conditions: e.target.value })}
                 placeholder="Partly cloudy, breezy" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

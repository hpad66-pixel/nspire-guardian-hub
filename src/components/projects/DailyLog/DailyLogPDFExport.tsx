/**
 * C4 · DailyLogPDFExport — download button that packages the 14 category
 * tables into a single PDF using `generateDailyLogPdf`.
 *
 * Data is pulled on-demand when the user clicks the button so we don't do
 * the N+1 fetch on every render.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadDailyLogPdf } from "@/lib/pdf/dailyLog";
import type { DailyPhotoRow } from "@/lib/pdf/dailyLog";
import { useLinkedPhotos } from "@/hooks/usePhotos";
import type { Photo } from "@/hooks/usePhotos";
import { signedUrlFor } from "@/lib/pdf-viewer";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

/** Fetch a stored photo and inline it as a data URL so jsPDF can embed it. */
async function photoToDataUrl(photo: Photo): Promise<DailyPhotoRow | null> {
  try {
    const url = await signedUrlFor("project-photos", photo.storage_path, 600);
    const blob = await (await fetch(url)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, caption: photo.caption };
  } catch {
    return null;
  }
}

export function DailyLogPDFExport({
  dailyReportId, variant = "outline", size = "default", disabled,
}: {
  dailyReportId: string | null;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  // Photos attached to this daily report via photo_links (recordType "daily").
  const { data: linkedPhotos = [] } = useLinkedPhotos(dailyReportId, "daily");

  async function handleClick() {
    if (!dailyReportId) return;
    setBusy(true);
    try {
      // Pull the parent + its child-table rows in parallel.
      const tables = [
        "daily_reports", "daily_weather",
        "daily_manpower", "daily_equipment", "daily_deliveries",
        "daily_safety_violations", "daily_quantities",
      ] as const;

      const [
        { data: parent },
        { data: weather },
        { data: manpower },
        { data: equipment },
        { data: deliveries },
        { data: safety },
        { data: quantities },
      ] = await Promise.all(
        tables.map((t) =>
          t === "daily_reports"
            ? supabase.from(t).select("*").eq("id", dailyReportId).maybeSingle()
            : supabase.from(t).select("*").eq("daily_report_id", dailyReportId),
        ) as any,
      );

      if (!parent) {
        toast.error("Daily report not found");
        return;
      }

      const report = {
        id: (parent as any).id,
        log_date: (parent as any).report_date ?? (parent as any).log_date,
        weather_high_f: (weather as any[])?.[0]?.high_temp_f ?? null,
        weather_low_f: (weather as any[])?.[0]?.low_temp_f ?? null,
        weather_description: (weather as any[])?.[0]?.conditions ?? null,
        precip_in: (weather as any[])?.[0]?.precipitation_in ?? null,
        wind_mph: (weather as any[])?.[0]?.wind_mph ?? null,
        notes: (parent as any).notes ?? null,
        author_name: null,
        submitted_at: (parent as any).submitted_at ?? null,
      };

      // Inline the attached photos as data URLs (signed against project-photos).
      const photos = (
        await Promise.all(linkedPhotos.map(photoToDataUrl))
      ).filter(Boolean) as DailyPhotoRow[];

      downloadDailyLogPdf(report, {
        photos,
        labor: ((manpower as any[]) ?? []).map((m) => ({
          company: m.organization_id ?? "—",
          trade: m.trade ?? "—",
          workers: m.workers ?? 0,
          hours: m.hours ?? 0,
        })),
        equipment: ((equipment as any[]) ?? []).map((e) => ({
          equipment: e.equipment_name ?? "—",
          hours: e.hours_used ?? 0,
          idle_hours: null,
        })),
        deliveries: ((deliveries as any[]) ?? []).map((d) => ({
          time: d.time_received ?? null,
          vendor: d.from_vendor ?? "—",
          items: d.description ?? "—",
        })),
        quality: ((quantities as any[]) ?? []).map((q) => ({
          time: null,
          description: `${q.qty ?? "?"} ${q.uom ?? ""} @ ${q.cost_code_id ?? "—"}`,
          severity: null,
        })),
        safety: ((safety as any[]) ?? []).map((s) => ({
          time: null,
          description: s.description ?? "—",
          severity: s.severity ?? null,
        })),
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant} size={size}
      disabled={disabled || busy || !dailyReportId}
    >
      <FileDown className="h-4 w-4 mr-2" />
      {busy ? "Building…" : "Download PDF"}
    </Button>
  );
}

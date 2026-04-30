/**
 * C4 · DailyLogTabs — the 14 category tabs for a single daily report.
 *
 * Layout: a horizontal scroll of Tabs triggers, each rendering a category
 * pane. Most panes use the generic DailyCategoryTable; the Weather pane is
 * its own component because it's a 1-row relationship that calls the
 * `daily-weather` edge function.
 *
 * Column defs are kept in one file to make the full 14-category surface
 * obvious at a glance.
 */
import { useParams } from "react-router-dom";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { DailyCategoryTable, type ColumnDef } from "./DailyCategoryTable";
import { WeatherTab } from "./WeatherTab";
import { DailyNotesTab } from "./DailyNotesTab";
import { PhotoAttachPanel } from "@/components/photos/PhotoAttachPanel";

export interface DailyLogTabsProps {
  dailyReportId: string | null;
}

const MANPOWER_COLS: ColumnDef<any>[] = [
  { key: "trade",     header: "Trade",   width: "4" },
  { key: "workers",   header: "Workers", type: "number", width: "2" },
  { key: "hours",     header: "Hours",   type: "number", width: "2" },
  { key: "notes",     header: "Notes",   width: "3" },
];

const EQUIPMENT_COLS: ColumnDef<any>[] = [
  { key: "equipment_name", header: "Equipment", width: "6" },
  { key: "hours_used",     header: "Hours used", type: "number", width: "3" },
  { key: "notes",          header: "Notes", width: "2" },
];

const DELIVERIES_COLS: ColumnDef<any>[] = [
  { key: "time_received", header: "Time",      type: "time", width: "2" },
  { key: "from_vendor",   header: "Vendor",    width: "3" },
  { key: "description",   header: "Items",     width: "4" },
  { key: "received_by",   header: "Received by", width: "2" },
];

const SAFETY_VIOLATIONS_COLS: ColumnDef<any>[] = [
  { key: "description",       header: "Description",       width: "5" },
  { key: "severity",          header: "Severity",          width: "2" },
  { key: "corrective_action", header: "Corrective action", width: "4" },
];

const ACCIDENTS_COLS: ColumnDef<any>[] = [
  { key: "brief",       header: "Brief",        width: "8" },
  { key: "incident_id", header: "Incident FK",  width: "3" },
];

const QUANTITIES_COLS: ColumnDef<any>[] = [
  { key: "cost_code_id", header: "Cost code", width: "5" },
  { key: "qty",          header: "Qty",       type: "number", width: "3" },
  { key: "uom",          header: "UOM",       width: "3" },
];

const PRODUCTIVITY_COLS: ColumnDef<any>[] = [
  { key: "cost_code_id", header: "Cost code",   width: "5" },
  { key: "actual_qty",   header: "Actual qty",  type: "number", width: "3" },
  { key: "actual_hours", header: "Actual hours", type: "number", width: "3" },
];

const VISITORS_COLS: ColumnDef<any>[] = [
  { key: "name",       header: "Name",    width: "3" },
  { key: "company",    header: "Company", width: "3" },
  { key: "purpose",    header: "Purpose", width: "3" },
  { key: "arrived_at", header: "In",      type: "time", width: "1" },
  { key: "left_at",    header: "Out",     type: "time", width: "1" },
];

const CALLS_COLS: ColumnDef<any>[] = [
  { key: "at_time", header: "Time",   type: "time", width: "2" },
  { key: "caller",  header: "Caller", width: "3" },
  { key: "subject", header: "Subject", width: "3" },
  { key: "notes",   header: "Notes",  width: "3" },
];

const DUMPSTER_COLS: ColumnDef<any>[] = [
  { key: "hauled_at", header: "Time",      type: "time", width: "2" },
  { key: "vendor",    header: "Vendor",    width: "3" },
  { key: "size",      header: "Size",      width: "2" },
  { key: "material",  header: "Material",  width: "4" },
];

const SCHEDULED_WORK_COLS: ColumnDef<any>[] = [
  { key: "description",     header: "Description", width: "8" },
  { key: "organization_id", header: "Org FK",      width: "3" },
];

const TAB_TRIGGERS: Array<{ value: string; label: string }> = [
  { value: "weather",   label: "Weather" },
  { value: "manpower",  label: "Manpower" },
  { value: "equipment", label: "Equipment" },
  { value: "deliveries",label: "Deliveries" },
  { value: "safety",    label: "Safety" },
  { value: "accidents", label: "Accidents" },
  { value: "quantities",label: "Quantities" },
  { value: "productivity", label: "Productivity" },
  { value: "visitors",  label: "Visitors" },
  { value: "calls",     label: "Calls" },
  { value: "notes",     label: "Notes" },
  { value: "dumpster",  label: "Dumpster" },
  { value: "scheduled", label: "Scheduled work" },
  { value: "photos",    label: "Photos" },
];

export function DailyLogTabs({ dailyReportId }: DailyLogTabsProps) {
  return (
    <Tabs defaultValue="weather">
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="w-max">
          {TAB_TRIGGERS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="weather" className="mt-4">
        <WeatherTab dailyReportId={dailyReportId} />
      </TabsContent>

      <TabsContent value="manpower" className="mt-4">
        <DailyCategoryTable
          table="daily_manpower"
          dailyReportId={dailyReportId}
          columns={MANPOWER_COLS}
          buildEmpty={() => ({ trade: "", workers: 0, hours: 0 })}
          emptyText="No manpower recorded yet."
        />
      </TabsContent>

      <TabsContent value="equipment" className="mt-4">
        <DailyCategoryTable
          table="daily_equipment"
          dailyReportId={dailyReportId}
          columns={EQUIPMENT_COLS}
          buildEmpty={() => ({ equipment_name: "", hours_used: 0 })}
          emptyText="No equipment entries yet."
        />
      </TabsContent>

      <TabsContent value="deliveries" className="mt-4">
        <DailyCategoryTable
          table="daily_deliveries"
          dailyReportId={dailyReportId}
          columns={DELIVERIES_COLS}
          buildEmpty={() => ({})}
          emptyText="No deliveries recorded yet."
        />
      </TabsContent>

      <TabsContent value="safety" className="mt-4">
        <DailyCategoryTable
          table="daily_safety_violations"
          dailyReportId={dailyReportId}
          columns={SAFETY_VIOLATIONS_COLS}
          buildEmpty={() => ({})}
          emptyText="No safety violations today."
        />
      </TabsContent>

      <TabsContent value="accidents" className="mt-4">
        <DailyCategoryTable
          table="daily_accidents"
          dailyReportId={dailyReportId}
          columns={ACCIDENTS_COLS}
          buildEmpty={() => ({})}
          emptyText="No accidents today."
        />
      </TabsContent>

      <TabsContent value="quantities" className="mt-4">
        <DailyCategoryTable
          table="daily_quantities"
          dailyReportId={dailyReportId}
          columns={QUANTITIES_COLS}
          buildEmpty={() => ({})}
          emptyText="No quantities placed today."
        />
      </TabsContent>

      <TabsContent value="productivity" className="mt-4">
        <DailyCategoryTable
          table="daily_productivity"
          dailyReportId={dailyReportId}
          columns={PRODUCTIVITY_COLS}
          buildEmpty={() => ({})}
          emptyText="No productivity rows yet."
        />
      </TabsContent>

      <TabsContent value="visitors" className="mt-4">
        <DailyCategoryTable
          table="daily_visitors"
          dailyReportId={dailyReportId}
          columns={VISITORS_COLS}
          buildEmpty={() => ({})}
          emptyText="No visitors today."
        />
      </TabsContent>

      <TabsContent value="calls" className="mt-4">
        <DailyCategoryTable
          table="daily_calls"
          dailyReportId={dailyReportId}
          columns={CALLS_COLS}
          buildEmpty={() => ({})}
          emptyText="No calls logged today."
        />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <DailyNotesTab dailyReportId={dailyReportId} />
      </TabsContent>

      <TabsContent value="dumpster" className="mt-4">
        <DailyCategoryTable
          table="daily_dumpster"
          dailyReportId={dailyReportId}
          columns={DUMPSTER_COLS}
          buildEmpty={() => ({})}
          emptyText="No dumpster pulls today."
        />
      </TabsContent>

      <TabsContent value="scheduled" className="mt-4">
        <DailyCategoryTable
          table="daily_scheduled_work"
          dailyReportId={dailyReportId}
          columns={SCHEDULED_WORK_COLS}
          buildEmpty={() => ({ planned: true })}
          emptyText="No scheduled work entries yet."
        />
      </TabsContent>

      <TabsContent value="photos" className="mt-4">
        <DailyPhotosTab dailyReportId={dailyReportId} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * Photos pane — lets the user attach existing project photos to this daily
 * report via the `photo_links` table keyed by `linked_record_type="daily"`.
 */
function DailyPhotosTab({ dailyReportId }: { dailyReportId: string | null }) {
  const { projectId } = useParams<{ projectId: string }>();
  if (!dailyReportId || !projectId) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center">
        Create the daily report first to attach photos.
      </div>
    );
  }
  return (
    <PhotoAttachPanel
      projectId={projectId}
      recordId={dailyReportId}
      recordType="daily"
    />
  );
}

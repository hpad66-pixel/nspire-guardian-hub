/**
 * C4 · DailyNotesTab — free-text notes saved to `daily_notes.body`.
 *
 * The table supports multiple note rows per report, but 95% of use is a
 * single long paragraph — so this tab edits the first row and auto-creates
 * it on save. Advanced users can still add separate rows via direct insert
 * (not exposed in this UI for simplicity).
 */
import { useEffect, useState } from "react";
import { useDailyCategory } from "@/hooks/useDailyLog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface DailyNote { id: string; body: string | null; }

export function DailyNotesTab({ dailyReportId }: { dailyReportId: string | null }) {
  const { data: notes = [], add, update, isLoading } =
    useDailyCategory<DailyNote>("daily_notes", dailyReportId);
  const primary = notes[0] ?? null;
  const [body, setBody] = useState("");

  useEffect(() => {
    setBody(primary?.body ?? "");
  }, [primary?.id, primary?.body]);

  async function handleSave() {
    if (!dailyReportId) return;
    try {
      if (primary) {
        if (primary.body === body) return;
        await update.mutateAsync({ id: primary.id, patch: { body } });
      } else {
        await add.mutateAsync({ body });
      }
      toast.success("Notes saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!dailyReportId) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center">
        Create the daily report first to record notes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        placeholder="General notes for the day — observations, conversations, issues, anything the other tabs don't cover."
        disabled={isLoading}
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {notes.length > 1 && (
            <span>
              ({notes.length - 1} additional note row{notes.length - 1 === 1 ? "" : "s"} exist from other users)
            </span>
          )}
        </span>
        <Button onClick={handleSave} disabled={add.isPending || update.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {add.isPending || update.isPending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}

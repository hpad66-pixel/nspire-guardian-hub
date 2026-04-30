/**
 * E2 · IncidentDialog — full incident capture form.
 *
 * Fields:
 *   - Title + description
 *   - Occurred-at timestamp
 *   - Type (injury / illness / near-miss / env / property / theft)
 *   - Severity free-text (tenant-defined taxonomy)
 *   - OSHA block: recordable toggle, case number, days-away, restricted-days
 *   - Optional location picker
 *
 * This replaces / complements the existing LogIncidentSheet (which is a
 * lightweight field-capture sheet). IncidentDialog is the full admin form.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/field/LocationPicker";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { toast } from "sonner";

const INCIDENT_TYPES: Incident["incident_type"][] = [
  "injury", "illness", "near_miss", "env", "property", "theft",
];

export function IncidentDialog({
  open, onOpenChange, projectId: projectIdProp, incident,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId?: string;
  /** Optional row to prefill when editing. */
  incident?: Incident | null;
}) {
  const { projectId: projectIdFromRoute } = useParams();
  const projectId = projectIdProp ?? projectIdFromRoute ?? "";
  const { create } = useIncidents(projectId || null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16), // local-ish default
  );
  const [incidentType, setIncidentType] = useState<Incident["incident_type"]>("injury");
  const [severity, setSeverity] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);

  const [oshaRecordable, setOshaRecordable] = useState(false);
  const [oshaCaseNumber, setOshaCaseNumber] = useState("");
  const [oshaDaysAway, setOshaDaysAway] = useState(0);
  const [oshaRestricted, setOshaRestricted] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (incident) {
      setTitle(incident.title ?? "");
      setDescription(incident.description ?? "");
      setOccurredAt(incident.occurred_at ? incident.occurred_at.slice(0, 16) : occurredAt);
      setIncidentType(incident.incident_type ?? "injury");
      setSeverity(incident.severity ?? "");
      setLocationId(incident.location_id ?? null);
      setOshaRecordable(incident.osha_recordable);
      setOshaCaseNumber(incident.osha_case_number ?? "");
      setOshaDaysAway(incident.osha_days_away);
      setOshaRestricted(incident.osha_restricted_days);
    } else {
      setTitle("");
      setDescription("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
      setIncidentType("injury");
      setSeverity("");
      setLocationId(null);
      setOshaRecordable(false);
      setOshaCaseNumber("");
      setOshaDaysAway(0);
      setOshaRestricted(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incident]);

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!projectId) { toast.error("No project selected"); return; }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        occurred_at: new Date(occurredAt).toISOString(),
        incident_type: incidentType,
        severity: severity.trim() || null,
        location_id: locationId,
        osha_recordable: oshaRecordable,
        osha_case_number: oshaRecordable ? (oshaCaseNumber.trim() || null) : null,
        osha_days_away: oshaRecordable ? oshaDaysAway : 0,
        osha_restricted_days: oshaRecordable ? oshaRestricted : 0,
        status: "open",
      });
      toast.success("Incident logged");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {incident ? "Edit incident" : "Log incident"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
                   placeholder="Short summary" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                      rows={4} placeholder="What happened?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Occurred at</Label>
              <Input type="datetime-local" value={occurredAt}
                     onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={incidentType ?? "injury"}
                      onValueChange={(v) => setIncidentType(v as Incident["incident_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t!}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Input value={severity} onChange={(e) => setSeverity(e.target.value)}
                     placeholder="e.g. medium, first-aid, lost-time" />
            </div>
            {projectId && (
              <div>
                <Label>Location</Label>
                <LocationPicker
                  projectId={projectId}
                  value={locationId}
                  onValueChange={setLocationId}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={oshaRecordable}
                onCheckedChange={(v) => setOshaRecordable(v === true)}
              />
              OSHA recordable
            </label>

            {oshaRecordable && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Case #</Label>
                  <Input value={oshaCaseNumber}
                         onChange={(e) => setOshaCaseNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Days away</Label>
                  <Input type="number" min={0}
                         value={oshaDaysAway}
                         onChange={(e) => setOshaDaysAway(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Restricted days</Label>
                  <Input type="number" min={0}
                         value={oshaRestricted}
                         onChange={(e) => setOshaRestricted(Number(e.target.value) || 0)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !title.trim()}>
            {create.isPending ? "Saving…" : incident ? "Save" : "Log incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

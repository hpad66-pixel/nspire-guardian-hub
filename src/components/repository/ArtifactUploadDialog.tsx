import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { type ArtifactType, type ArtifactSource, useProjectArtifacts } from "@/hooks/useProjectArtifacts";

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  prime_contract:    "Prime Contract",
  invoice:           "Invoice",
  change_order:      "Change Order",
  drawing:           "Drawing",
  permit:            "Permit",
  inspection_record: "Inspection Record",
  photo:             "Photo",
  specification:     "Specification",
  correspondence:    "Correspondence",
  other:             "Other",
};

const SOURCE_LABELS: Record<ArtifactSource, string> = {
  procore:  "Procore (historical)",
  builtos:  "Build OS",
  manual:   "Manual upload",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSource?: ArtifactSource;
}

export function ArtifactUploadDialog({ open, onOpenChange, projectId, defaultSource = "manual" }: Props) {
  const { upload } = useProjectArtifacts(projectId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [artifactType, setArtifactType] = useState<ArtifactType>("other");
  const [sourceSystem, setSourceSystem] = useState<ArtifactSource>(defaultSource);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [periodDate, setPeriodDate] = useState("");
  const [amount, setAmount] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function reset() {
    setFile(null); setArtifactType("other"); setSourceSystem(defaultSource);
    setTitle(""); setDescription(""); setReferenceNo("");
    setPeriodDate(""); setAmount(""); setTagInput(""); setTags([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  async function handleSubmit() {
    if (!file) { toast.error("Select a file to upload"); return; }
    if (!title.trim()) { toast.error("Title is required"); return; }
    try {
      await upload.mutateAsync({
        file,
        projectId,
        input: {
          artifact_type: artifactType,
          source_system: sourceSystem,
          title: title.trim(),
          description: description.trim() || undefined,
          reference_no: referenceNo.trim() || undefined,
          period_date: periodDate || undefined,
          amount: amount ? parseFloat(amount) : undefined,
          tags,
        },
      });
      toast.success(`${title} uploaded`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Artifact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.dwg,.dxf,.xlsx,.xls,.docx,.doc,.csv" />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Click to select file</p>
                <p className="text-xs text-muted-foreground">PDF, images, drawings, spreadsheets</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={artifactType} onValueChange={(v) => setArtifactType(v as ArtifactType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ARTIFACT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source System</Label>
              <Select value={sourceSystem} onValueChange={(v) => setSourceSystem(v as ArtifactSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Invoice #12 – Glorieta Gardens" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Reference # <span className="text-muted-foreground text-xs">(invoice #, CO #…)</span></Label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="INV-012" />
            </div>
            <div className="space-y-1">
              <Label>Period / Date</Label>
              <Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Amount <span className="text-muted-foreground text-xs">(for financial docs)</span></Label>
            <Input type="number" inputMode="decimal" step="0.01" min="0"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief notes — what's in this document, key details…" />
          </div>

          <div className="space-y-2">
            <Label>Tags <span className="text-muted-foreground text-xs">(for AI search)</span></Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="sewer, retainage, phase-1…" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 cursor-pointer"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                    {t} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

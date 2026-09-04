import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, FileImage, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  checkCardScanEntitlement, executeCardApproval, fieldsToContact, requestCardApproval,
  scanBusinessCard, type ApprovalPreview, type DuplicateCandidate, type IntakeResult,
  type ReviewedContact, type SourceContext,
} from "@/lib/crm/cardIntake";

type ProjectOption = { id: string; name: string };
type Step = "capture" | "review" | "approval" | "done";
const EMPTY_CONTACT: ReviewedContact = {
  firstName: "", lastName: "", organization: "", title: "", email: "", phone: "", mobile: "",
  website: "", address: "", city: "", state: "", zipCode: "", country: "USA", contactType: "other",
};

export function BusinessCardScanDialog({
  projects, initialProjectId, open, onOpenChange, onCompleted,
}: {
  projects: ProjectOption[];
  initialProjectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}) {
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? "");
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [source, setSource] = useState<SourceContext>({ tags: [] });
  const [tagText, setTagText] = useState("");
  const [step, setStep] = useState<Step>("capture");
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [contact, setContact] = useState<ReviewedContact>(EMPTY_CONTACT);
  const [kind, setKind] = useState<"create" | "update" | "link_existing">("create");
  const [candidate, setCandidate] = useState<DuplicateCandidate | null>(null);
  const [approval, setApproval] = useState<ApprovalPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("Ready when you are.");
  const [error, setError] = useState<string | null>(null);

  const project = projects.find((item) => item.id === projectId);
  const firstProjectId = projects[0]?.id ?? "";
  const duplicates = intake?.duplicateCandidates ?? [];
  const lowConfidence = intake?.fields?.some((field) => field.reviewRequired) ?? false;
  const canPreview = Boolean(contact.firstName.trim()) && (kind === "create" || candidate);
  const previewUrls = useMemo(() => ({
    front: front ? URL.createObjectURL(front) : null,
    back: back ? URL.createObjectURL(back) : null,
  }), [front, back]);

  useEffect(() => () => {
    if (previewUrls.front) URL.revokeObjectURL(previewUrls.front);
    if (previewUrls.back) URL.revokeObjectURL(previewUrls.back);
  }, [previewUrls]);

  useEffect(() => {
    if (!open) return;
    const next = initialProjectId ?? firstProjectId;
    setProjectId(next);
    resetWorkflow();
  }, [open, initialProjectId, firstProjectId]);

  useEffect(() => {
    if (!open || !projectId) { setEntitled(null); return; }
    let active = true;
    setEntitled(null);
    void checkCardScanEntitlement(projectId).then((value) => { if (active) setEntitled(value); });
    return () => { active = false; };
  }, [open, projectId]);

  function resetWorkflow() {
    setFront(null); setBack(null); setSource({ tags: [] }); setTagText(""); setStep("capture");
    setIntake(null); setContact(EMPTY_CONTACT); setKind("create"); setCandidate(null); setApproval(null);
    setBusy(false); setProgress("Ready when you are."); setError(null);
  }

  async function readCard() {
    if (!front || !projectId) return;
    setBusy(true); setError(null);
    try {
      const sourceContext = { ...source, tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean) };
      const result = await scanBusinessCard({ projectId, front, back: back ?? undefined, sourceContext, onProgress: setProgress });
      if (result.state === "failed") throw new Error(result.message ?? "The card could not be read.");
      setIntake(result); setContact(fieldsToContact(result.fields ?? [])); setSource(sourceContext);
      setStep("review"); setProgress("Card read. Please check the details.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The card could not be read."); }
    finally { setBusy(false); }
  }

  async function prepareApproval() {
    if (!intake) return;
    setBusy(true); setError(null); setProgress("Preparing an exact approval preview…");
    try {
      const result = await requestCardApproval({
        intakeId: intake.intakeId, correlationId: intake.correlationId, kind,
        ...(candidate ? { targetContactId: candidate.apasContactExternalId } : {}), reviewedFields: contact, sourceContext: source,
      });
      setApproval(result); setStep("approval"); setProgress("Nothing has changed yet. Review and approve below.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Approval could not be prepared."); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!approval) return;
    setBusy(true); setError(null); setProgress("Applying your approved change to APAS CRM…");
    try {
      await executeCardApproval(approval); setStep("done"); setProgress("Contact saved and linked to the project."); onCompleted?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The approved action could not be completed."); }
    finally { setBusy(false); }
  }

  function updateField(key: keyof ReviewedContact, value: string) { setContact((current) => ({ ...current, [key]: value })); }
  function chooseCandidate(nextKind: "update" | "link_existing", next: DuplicateCandidate) { setKind(nextKind); setCandidate(next); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]"><Camera className="h-4 w-4" /></span>
            <DialogTitle>Scan a business card</DialogTitle>
            <Badge variant="outline" className="rounded-full">APAS CRM</Badge>
          </div>
          <DialogDescription>
            Read a card, check every detail, then approve exactly what will be saved. Nothing is added automatically.
          </DialogDescription>
        </DialogHeader>

        {projects.length > 1 && step === "capture" && (
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
              <SelectContent>{projects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs">
          <span className="font-semibold text-foreground">Current project: </span>{project?.name ?? "Choose a project"}
          <span className="mx-2 text-border">•</span><span className="text-muted-foreground">Signed in as your Proj OS account</span>
        </div>

        {entitled === null && projectId && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking pilot access…</div>}
        {entitled === false && (
          <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div><p className="font-semibold">Card scan is not enabled for this project yet.</p><p className="mt-1 text-muted-foreground">A workspace administrator can add you to the one-admin/four-person pilot.</p></div>
          </div>
        )}

        {entitled && step === "capture" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <CardImageInput id="card-front" label="Front of card" file={front} preview={previewUrls.front} required onChange={setFront} />
              <CardImageInput id="card-back" label="Back (optional)" file={back} preview={previewUrls.back} onChange={setBack} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Where did you meet?" value={source.eventOrLocation ?? ""} onChange={(value) => setSource((s) => ({ ...s, eventOrLocation: value }))} placeholder="Conference, site visit…" />
              <Field label="Date met" type="date" value={source.metOn ?? ""} onChange={(value) => setSource((s) => ({ ...s, metOn: value }))} />
              <Field label="Project role" value={source.projectRole ?? ""} onChange={(value) => setSource((s) => ({ ...s, projectRole: value }))} placeholder="Architect, supplier…" />
              <Field label="Tags" value={tagText} onChange={setTagText} placeholder="vendor, conference" />
            </div>
            <div className="space-y-2"><Label htmlFor="card-notes">Context or follow-up</Label><Textarea id="card-notes" value={source.notes ?? ""} onChange={(event) => setSource((s) => ({ ...s, notes: event.target.value }))} placeholder="Why this contact matters…" /></div>
          </div>
        )}

        {entitled && step === "review" && (
          <div className="space-y-5">
            {(lowConfidence || intake?.reason) && (
              <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><span>{intake?.guidance ?? "Some text was uncertain. Check it against the card."}</span></div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" value={contact.firstName} onChange={(value) => updateField("firstName", value)} required />
              <Field label="Last name" value={contact.lastName} onChange={(value) => updateField("lastName", value)} />
              <Field label="Company" value={contact.organization} onChange={(value) => updateField("organization", value)} />
              <Field label="Job title" value={contact.title} onChange={(value) => updateField("title", value)} />
              <Field label="Email" type="email" value={contact.email} onChange={(value) => updateField("email", value)} />
              <Field label="Phone" type="tel" value={contact.phone} onChange={(value) => updateField("phone", value)} />
              <Field label="Website" value={contact.website} onChange={(value) => updateField("website", value)} />
              <Field label="Address" value={contact.address} onChange={(value) => updateField("address", value)} />
            </div>
            {duplicates.length > 0 && (
              <section className="space-y-2" aria-label="Possible APAS CRM matches">
                <h3 className="text-sm font-semibold">Possible APAS CRM matches</h3>
                {duplicates.map((item) => (
                  <div key={item.apasContactExternalId} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{item.displayName}</p><p className="text-xs text-muted-foreground">{item.safePreview.company || item.safePreview.email || item.safePreview.phone}</p></div><Badge variant="secondary">{Math.round(item.matchScore * 100)}% match</Badge></div>
                    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant={kind === "update" && candidate?.apasContactExternalId === item.apasContactExternalId ? "default" : "outline"} onClick={() => chooseCandidate("update", item)}>Update this contact</Button><Button type="button" size="sm" variant={kind === "link_existing" && candidate?.apasContactExternalId === item.apasContactExternalId ? "default" : "outline"} onClick={() => chooseCandidate("link_existing", item)}>Link without changes</Button></div>
                  </div>
                ))}
                <Button type="button" variant={kind === "create" ? "default" : "outline"} size="sm" onClick={() => { setKind("create"); setCandidate(null); }}>Create a separate contact</Button>
              </section>
            )}
          </div>
        )}

        {entitled && step === "approval" && approval && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><h3 className="font-semibold">{approval.preview.title}</h3><p className="mt-1 text-sm text-muted-foreground">{approval.preview.summary}</p><p className="mt-3 text-xs font-medium">This approval expires at {new Date(approval.expiresAt).toLocaleTimeString()}. It can perform this exact action only once.</p></div></div>
          </div>
        )}

        {entitled && step === "done" && (
          <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h3 className="mt-3 text-lg font-semibold">Saved to APAS CRM</h3><p className="mt-1 text-sm text-muted-foreground">The contact is linked to {project?.name}. The approval and result are in the audit trail.</p></div>
        )}

        {error && <div role="alert" className="flex gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {entitled && <div aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{progress}</div>}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "capture" && entitled && <Button type="button" onClick={readCard} disabled={!front || busy}><Camera className="mr-2 h-4 w-4" />Read card</Button>}
          {step === "review" && <><Button type="button" variant="outline" onClick={() => setStep("capture")} disabled={busy}>Back</Button><Button type="button" onClick={prepareApproval} disabled={!canPreview || busy}><ShieldCheck className="mr-2 h-4 w-4" />Review action</Button></>}
          {step === "approval" && <><Button type="button" variant="outline" onClick={() => { setApproval(null); setStep("review"); }} disabled={busy}>Make changes</Button><Button type="button" onClick={approve} disabled={busy}>Approve and save</Button></>}
          {step === "done" && <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardImageInput({ id, label, file, preview, required, onChange }: { id: string; label: string; file: File | null; preview: string | null; required?: boolean; onChange: (file: File | null) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><label htmlFor={id} className="flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/25 text-center hover:bg-muted/50">{preview ? <img src={preview} alt={`${label} preview`} className="h-36 w-full object-contain" /> : <><FileImage className="mb-2 h-7 w-7 text-muted-foreground" /><span className="text-sm font-medium">Take a photo or choose an image</span><span className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or HEIC · up to 10 MB</span></>}<input id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/heic" capture="environment" onChange={(event) => onChange(event.target.files?.[0] ?? null)} /></label>{file && <p className="truncate text-xs text-muted-foreground">{file.name}</p>}</div>;
}
function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  const id = `card-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required ? " *" : ""}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></div>;
}

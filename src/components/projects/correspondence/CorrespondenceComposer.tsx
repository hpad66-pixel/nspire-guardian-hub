/**
 * CorrespondenceComposer — draft a branded project letter, AI-assisted, then
 * take it out three ways: download a branded PDF, send by email (Resend), or send
 * via Gmail (lights up once Gmail is connected in PR3). Every save/send is logged
 * to the project trail (project_emails). Body is plain text (the letter renderer
 * lays it out); the PDF is produced from an off-screen rendered node.
 */
import { useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Download, Send, Inbox, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { useCorrespondenceTemplates } from "@/hooks/useCorrespondenceTemplates";
import { buildCorrespondenceHtml } from "@/lib/correspondence/correspondenceLetter";
import { downloadReportPdf, reportPdfBase64 } from "@/lib/reports/reportPdf";

const CATEGORIES = [
  { value: "r4", label: "Client / Owner (R4)" },
  { value: "city", label: "Agency / City" },
  { value: "transmittal", label: "Transmittal" },
  { value: "general", label: "General" },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CorrespondenceComposer({
  open, onOpenChange, projectId, projectName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName?: string | null;
}) {
  const sendEmail = useSendEmail();
  const emails = useProjectEmails(projectId);
  const templates = useCorrespondenceTemplates(projectId);
  const docRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState("r4");
  const [recipient, setRecipient] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const letterHtml = useMemo(
    () => buildCorrespondenceHtml({
      subtitle: category === "city" ? "Agency correspondence" : "Project correspondence",
      recipient, recipientOrg, referenceNo, subject, body, projectName,
    }),
    [category, recipient, recipientOrg, referenceNo, subject, body, projectName],
  );

  const loadTemplate = (id: string) => {
    const t = (templates.data ?? []).find((x) => x.id === id);
    if (!t) return;
    setCategory(t.category || "general");
    if (t.recipient) setRecipient(t.recipient);
    if (t.subject_template) setSubject(t.subject_template);
    if (t.body_template) setBody(t.body_template);
    toast.success(`Loaded "${t.name}"`);
  };

  const aiDraft = async () => {
    if (!subject.trim()) { toast.error("Add a subject first."); return; }
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-correspondence", {
        body: { projectName, category, recipient, subject, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBody(String(data?.body ?? ""));
      toast.success("Draft ready — review and edit.");
    } catch (e: any) {
      toast.error(`Couldn't draft: ${e?.message ?? "try again"}`);
    } finally { setDrafting(false); }
  };

  const filename = () => `${(subject || "letter").replace(/[^\w.-]+/g, "-").slice(0, 60)}.pdf`;

  // Create the trail row on first save; update it thereafter (avoids duplicates).
  async function persist(status: "draft" | "sent", channel: string) {
    const payload = {
      status, channel, subject: subject || "(no subject)",
      to_emails: recipientEmail ? [recipientEmail] : [],
      body_html: letterHtml, body_text: body,
    };
    if (savedId) {
      await emails.update.mutateAsync({ id: savedId, ...(payload as any) });
      return savedId;
    }
    const row = await emails.create.mutateAsync(payload);
    setSavedId(row.id);
    return row.id;
  }

  const saveDraft = async () => {
    if (!subject.trim()) { toast.error("Add a subject first."); return; }
    setBusy(true);
    try { await persist("draft", "manual"); toast.success("Saved to the correspondence trail."); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't save."); }
    finally { setBusy(false); }
  };

  const download = async () => {
    if (!docRef.current) return;
    setBusy(true);
    const t = toast.loading("Building branded PDF…");
    try {
      await downloadReportPdf(docRef.current, filename());
      toast.success("Downloaded.", { id: t });
    } catch (e: any) { toast.error(`PDF failed: ${e?.message}`, { id: t }); }
    finally { setBusy(false); }
  };

  const sendResend = async () => {
    if (!EMAIL_RE.test(recipientEmail)) { toast.error("Add a valid recipient email."); return; }
    if (!subject.trim()) { toast.error("Add a subject first."); return; }
    setBusy(true);
    const t = toast.loading("Sending…");
    try {
      let attachments;
      if (docRef.current) {
        const { base64, size } = await reportPdfBase64(docRef.current);
        attachments = [{ filename: filename(), contentBase64: base64, contentType: "application/pdf", size }];
      }
      await sendEmail.mutateAsync({ recipients: [recipientEmail], subject, bodyHtml: letterHtml, bodyText: body, attachments });
      await persist("sent", "resend");
      toast.success(`Sent to ${recipientEmail}.`, { id: t });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed.", { id: t });
    } finally { setBusy(false); }
  };

  const saveTemplate = async () => {
    const name = window.prompt("Template name (e.g. \"R4 status letter\"):", `${CATEGORIES.find((c) => c.value === category)?.label} letter`);
    if (!name) return;
    try {
      await templates.create.mutateAsync({ name, category, subject_template: subject, body_template: body, recipient });
      toast.success(`Saved template "${name}".`);
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save template."); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Compose correspondence</DialogTitle></DialogHeader>

        <div className="space-y-3">
          {/* Template + category */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start from template <span className="text-muted-foreground">(optional)</span></Label>
              <Select value="" onValueChange={loadTemplate} disabled={!(templates.data?.length)}>
                <SelectTrigger><SelectValue placeholder={templates.data?.length ? "Pick a template" : "No templates yet"} /></SelectTrigger>
                <SelectContent>{(templates.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Recipient name / title" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            <Input placeholder="Recipient org (e.g. R4 Capital)" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} />
            <Input placeholder="Recipient email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            <Input placeholder="Reference no. (optional)" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />

          {/* AI draft */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> AI draft</div>
            <Textarea rows={2} placeholder="Points to cover (what happened, decisions, requests, dates, figures)…" value={context} onChange={(e) => setContext(e.target.value)} />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={aiDraft} disabled={drafting || !subject.trim()}>
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft with AI
            </Button>
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Letter body</Label>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={saveTemplate} disabled={!body.trim()}>
                <Save className="h-3.5 w-3.5" /> Save as template
              </Button>
            </div>
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The letter body — draft with AI above, or write it here." className="font-[Georgia,serif] leading-relaxed" />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={saveDraft} disabled={busy}><Save className="h-4 w-4 mr-1" /> Save draft</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={download} disabled={busy}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          <Button variant="outline" disabled title="Connect Gmail (next update) to send from your inbox and keep the thread"><Inbox className="h-4 w-4 mr-1" /> Send via Gmail</Button>
          <Button onClick={sendResend} disabled={busy || sendEmail.isPending}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send email
          </Button>
        </DialogFooter>

        {/* Off-screen branded letter — rasterized to PDF (download / attachment). */}
        <div style={{ position: "fixed", left: -99999, top: 0, width: 720, background: "#fff" }} aria-hidden>
          <div ref={docRef} dangerouslySetInnerHTML={{ __html: letterHtml }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

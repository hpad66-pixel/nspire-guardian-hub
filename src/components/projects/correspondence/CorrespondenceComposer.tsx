/**
 * CorrespondenceComposer — draft a branded project letter, AI-assisted, typed,
 * or pasted by hand. The body is ONE rich-text editor (bold, headings, bullets,
 * sub-bullets…) and it is the single source of truth: whatever the greeting/
 * body says in the editor is exactly what goes into the document — nothing is
 * auto-composited on top of it (no hidden "To Whom It May Concern" that isn't
 * actually in your text). A Preview toggle shows the exact branded rendering
 * before you send — what you see there is pixel-for-pixel what the PDF/email
 * produce. Take it out three ways: download a branded PDF (paginated, not
 * shrunk to fit one page), send by email (Resend, PDF attached), or send via
 * Gmail from the user's connected mailbox. Every save/send is logged
 * to the project trail (project_emails); pass `draft` to reopen a previously-
 * saved one and keep editing the same row instead of creating a duplicate.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProRichTextEditor } from "@/components/ui/rich-text-editor";
import { Sparkles, Loader2, Download, Send, Inbox, Save, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails, type ProjectEmail } from "@/hooks/useProjectEmails";
import { useCorrespondenceTemplates } from "@/hooks/useCorrespondenceTemplates";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { buildCorrespondenceHtml, buildCoverNoteHtml } from "@/lib/correspondence/correspondenceLetter";
import { downloadLetterPdf, letterPdfBase64 } from "@/lib/correspondence/letterPdf";
import { RecipientsInput } from "./RecipientsInput";

const CATEGORIES = [
  { value: "r4", label: "Client / Owner (R4)" },
  { value: "city", label: "Agency / City" },
  { value: "transmittal", label: "Transmittal" },
  { value: "general", label: "General" },
];
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// AI drafts come back as plain text (blank line = new paragraph) — wrap it into
// the same paragraph markup the rich editor itself produces, so it drops in as
// normal editable content, not a special case.
const plainTextToHtml = (text: string) =>
  text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${escHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

export function CorrespondenceComposer({
  open, onOpenChange, projectId, projectName, draft, replyTo, presetRecipient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName?: string | null;
  /** Reopen an existing saved draft (from project_emails) to keep editing it —
   *  populates every field from its letter_meta and continues updating the
   *  same row instead of creating a duplicate. Omit/null for a fresh letter. */
  draft?: ProjectEmail | null;
  /** Latest message in a Gmail thread when composing a reply. */
  replyTo?: ProjectEmail | null;
  /** Project-directory contact selected before opening the composer. */
  presetRecipient?: { name: string; email: string; companyName?: string | null } | null;
}) {
  const sendEmail = useSendEmail();
  const emails = useProjectEmails(projectId);
  const templates = useCorrespondenceTemplates(projectId);
  const savedRecipients = useSavedRecipients();
  const gmail = useGmailConnection();
  const docRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState("r4");
  const [recipient, setRecipient] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [referenceNo, setReferenceNo] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [message, setMessage] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Populate every field from a saved draft when it's opened, or reset to a
  // blank letter otherwise — so Save/Send continue updating the same row.
  useEffect(() => {
    if (!open) return;
    if (draft) {
      const meta = (draft.letter_meta ?? {}) as Record<string, any>;
      setCategory(meta.category || "r4");
      setRecipient(meta.recipient || "");
      setRecipientOrg(meta.recipientOrg || "");
      setRecipients(draft.to_emails ?? []);
      setCcRecipients((draft as any).cc_emails ?? []);
      setBccRecipients([]); // never stored — bcc stays private, not resumable
      setShowCcBcc(((draft as any).cc_emails ?? []).length > 0);
      setReferenceNo(meta.referenceNo || "");
      setSubject(draft.subject || "");
      setMessage(meta.message || "");
      // Prefer the raw rich content saved alongside the draft; fall back to
      // wrapping the flattened plain body for drafts saved before this shipped.
      setBodyHtml(meta.bodyHtml || (draft.body_text ? plainTextToHtml(draft.body_text) : ""));
      setSavedId(draft.id);
    } else if (replyTo) {
      setCategory("general");
      setRecipient(replyTo.direction === "inbound" ? (replyTo.from_name || "") : "");
      setRecipientOrg("");
      setRecipients(replyTo.direction === "inbound" && replyTo.from_email ? [replyTo.from_email] : (replyTo.to_emails ?? []));
      setCcRecipients(replyTo.cc_emails ?? []);
      setBccRecipients([]);
      setShowCcBcc((replyTo.cc_emails ?? []).length > 0);
      setReferenceNo("");
      setSubject(/^re:/i.test(replyTo.subject || "") ? (replyTo.subject || "") : `Re: ${replyTo.subject || "Project correspondence"}`);
      setContext(""); setBodyHtml(""); setMessage(""); setSavedId(null);
    } else if (presetRecipient) {
      setCategory("general");
      setRecipient(presetRecipient.name);
      setRecipientOrg(presetRecipient.companyName || "");
      setRecipients([presetRecipient.email]);
      setCcRecipients([]); setBccRecipients([]); setShowCcBcc(false);
      setReferenceNo(""); setSubject(""); setContext(""); setBodyHtml(""); setMessage(""); setSavedId(null);
    } else {
      setCategory("r4"); setRecipient(""); setRecipientOrg("");
      setRecipients([]); setCcRecipients([]); setBccRecipients([]); setShowCcBcc(false);
      setReferenceNo(""); setSubject(""); setContext(""); setBodyHtml(""); setMessage(""); setSavedId(null);
    }
    setMode("edit");
  }, [open, draft, replyTo, presetRecipient]);

  const letterHtml = useMemo(
    () => buildCorrespondenceHtml({
      subtitle: category === "city" ? "Agency correspondence" : "Project correspondence",
      recipient, recipientOrg, referenceNo, subject, body: bodyHtml, projectName,
    }),
    [category, recipient, recipientOrg, referenceNo, subject, bodyHtml, projectName],
  );

  const loadTemplate = (id: string) => {
    const t = (templates.data ?? []).find((x) => x.id === id);
    if (!t) return;
    setCategory(t.category || "general");
    if (t.recipient) setRecipient(t.recipient);
    if (t.subject_template) setSubject(t.subject_template);
    if (t.body_template) setBodyHtml(t.body_template);
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
      setBodyHtml(plainTextToHtml(String(data?.body ?? "")));
      setMode("edit");
      toast.success("Draft ready — review and edit.");
    } catch (e: any) {
      toast.error(`Couldn't draft: ${e?.message ?? "try again"}`);
    } finally { setDrafting(false); }
  };

  const filename = () => `${(subject || "letter").replace(/[^\w.-]+/g, "-").slice(0, 60)}.pdf`;

  // Create the trail row on first save; update it thereafter (avoids duplicates).
  // bcc is deliberately never persisted here — that's what makes it blind.
  async function persist(status: "draft" | "sent", channel: string, gmailMeta?: {
    from?: string | null;
    messageId?: string | null;
    threadId?: string | null;
    rfcMessageId?: string | null;
    inReplyTo?: string | null;
  }) {
    const plain = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const payload = {
      status, channel, subject: subject || "(no subject)",
      to_emails: recipients, cc_emails: ccRecipients,
      body_html: letterHtml, body_text: plain,
      letter_meta: { category, recipient, recipientOrg, referenceNo, bodyHtml, message },
      from_email: gmailMeta?.from ?? undefined,
      gmail_message_id: gmailMeta?.messageId ?? undefined,
      gmail_thread_id: gmailMeta?.threadId ?? undefined,
      rfc_message_id: gmailMeta?.rfcMessageId ?? undefined,
      in_reply_to: gmailMeta?.inReplyTo ?? undefined,
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
      await downloadLetterPdf(docRef.current, filename());
      toast.success("Downloaded.", { id: t });
    } catch (e: any) { toast.error(`PDF failed: ${e?.message}`, { id: t }); }
    finally { setBusy(false); }
  };

  const sendResend = async () => {
    if (!recipients.length) { toast.error("Add at least one recipient."); return; }
    if (!subject.trim()) { toast.error("Add a subject first."); return; }
    setBusy(true);
    const t = toast.loading("Sending…");
    try {
      let attachments;
      if (docRef.current) {
        const { base64, size } = await letterPdfBase64(docRef.current);
        attachments = [{ filename: filename(), contentBase64: base64, contentType: "application/pdf", size }];
      }
      // A separate cover note (if written) becomes the email body, with the
      // full branded letter going out as the PDF attachment only — instead of
      // rendering the whole letter twice (inline AND attached).
      const emailBodyHtml = message.trim()
        ? buildCoverNoteHtml({ message, attachmentName: filename(), projectName })
        : letterHtml;
      const emailBodyText = message.trim() ? message : bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      await sendEmail.mutateAsync({
        recipients, ccRecipients: ccRecipients.length ? ccRecipients : undefined, bccRecipients: bccRecipients.length ? bccRecipients : undefined,
        subject, bodyHtml: emailBodyHtml, bodyText: emailBodyText, attachments,
      });
      await persist("sent", "resend");
      savedRecipients.rememberAll([...recipients, ...ccRecipients, ...bccRecipients]).catch(() => {});
      toast.success(`Sent to ${recipients.join(", ")}.`, { id: t });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed.", { id: t });
    } finally { setBusy(false); }
  };

  const sendGmail = async () => {
    if (!recipients.length) { toast.error("Add at least one recipient."); return; }
    if (!subject.trim()) { toast.error("Add a subject first."); return; }
    if (!gmail.status.data?.connected) { toast.error("Connect Gmail first."); return; }
    setBusy(true);
    const t = toast.loading(`Sending from ${gmail.status.data.email}…`);
    try {
      let attachments;
      if (docRef.current) {
        const { base64, size } = await letterPdfBase64(docRef.current);
        attachments = [{ filename: filename(), contentBase64: base64, contentType: "application/pdf", size }];
      }
      const emailBodyHtml = message.trim()
        ? buildCoverNoteHtml({ message, attachmentName: filename(), projectName })
        : letterHtml;
      const emailBodyText = message.trim() ? message : bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const { data, error } = await supabase.functions.invoke("gmail", {
        body: {
          action: "send",
          projectId,
          to: recipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject,
          bodyHtml: emailBodyHtml,
          bodyText: emailBodyText,
          attachments,
          threadId: replyTo?.gmail_thread_id ?? null,
          inReplyTo: replyTo?.rfc_message_id ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await persist("sent", "gmail", {
        from: data?.from ?? gmail.status.data.email,
        messageId: data?.gmailMessageId ?? null,
        threadId: data?.gmailThreadId ?? replyTo?.gmail_thread_id ?? null,
        rfcMessageId: data?.rfcMessageId ?? null,
        inReplyTo: replyTo?.rfc_message_id ?? null,
      });
      savedRecipients.rememberAll([...recipients, ...ccRecipients, ...bccRecipients]).catch(() => {});
      toast.success(`Sent from ${data?.from ?? gmail.status.data.email}.`, { id: t });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Gmail send failed.", { id: t });
    } finally { setBusy(false); }
  };

  const saveTemplate = async () => {
    const name = window.prompt("Template name (e.g. \"R4 status letter\"):", `${CATEGORIES.find((c) => c.value === category)?.label} letter`);
    if (!name) return;
    try {
      await templates.create.mutateAsync({ name, category, subject_template: subject, body_template: bodyHtml, recipient });
      toast.success(`Saved template "${name}".`);
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save template."); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{draft ? "Edit draft" : replyTo ? "Reply in project thread" : "Compose correspondence"}</DialogTitle></DialogHeader>

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
            <Input placeholder="Recipient name / title (for the letter's address block)" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            <Input placeholder="Recipient org (e.g. R4 Capital)" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} />
          </div>

          {/* Send-to addresses — email only, no name required. Autocompletes
              from every address you've sent to before; anything you send to
              here is remembered automatically for next time. */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">To</Label>
              {!showCcBcc && (
                <button type="button" onClick={() => setShowCcBcc(true)} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Add Cc/Bcc
                </button>
              )}
            </div>
            <RecipientsInput value={recipients} onChange={setRecipients} placeholder="email@example.com — press Enter to add" />
            {showCcBcc && (
              <>
                <Label className="text-xs">Cc</Label>
                <RecipientsInput value={ccRecipients} onChange={setCcRecipients} placeholder="Visible to every recipient" />
                <Label className="text-xs">Bcc</Label>
                <RecipientsInput value={bccRecipients} onChange={setBccRecipients} placeholder="Hidden from every other recipient" />
              </>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Input placeholder="Reference no. (optional)" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Message <span className="text-muted-foreground">(optional cover note — becomes the email body, with the letter sent as a PDF attachment instead of inline. Leave blank to send the full letter inline as before.)</span></Label>
            <Textarea rows={2} placeholder="A short note to go with the attached letter…" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          {/* AI draft */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> AI draft</div>
            <Textarea rows={2} placeholder="Points to cover (what happened, decisions, requests, dates, figures)…" value={context} onChange={(e) => setContext(e.target.value)} />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={aiDraft} disabled={drafting || !subject.trim()}>
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft with AI
            </Button>
          </div>

          {/* Body — edit (rich text: bold, headings, bullets, sub-bullets…) or
              preview the exact branded rendering before you send. */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Letter body — includes your own greeting, exactly as typed</Label>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={saveTemplate} disabled={!bodyHtml.trim()}>
                  <Save className="h-3.5 w-3.5" /> Save as template
                </Button>
                <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                  <button
                    onClick={() => setMode("edit")}
                    className={cn("h-6 px-2 rounded text-xs font-medium flex items-center gap-1 transition-colors", mode === "edit" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => setMode("preview")}
                    className={cn("h-6 px-2 rounded text-xs font-medium flex items-center gap-1 transition-colors", mode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {mode === "edit" ? (
              <ProRichTextEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                placeholder={'Start typing — your greeting ("Dear …," or "To Whom It May Concern:"), then the letter body. Use the toolbar for bold, bullets, sub-bullets, and headings.'}
                editable
                minHeight="320px"
              />
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 overflow-x-auto">
                <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: 700 }} dangerouslySetInnerHTML={{ __html: letterHtml }} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={saveDraft} disabled={busy}><Save className="h-4 w-4 mr-1" /> Save draft</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={download} disabled={busy}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          <Button onClick={gmail.status.data?.connected ? sendGmail : () => gmail.connect.mutate(window.location.pathname)} disabled={busy || gmail.status.isLoading || gmail.connect.isPending} title={gmail.status.data?.connected ? `Send from ${gmail.status.data.email}` : "Connect your Gmail mailbox"}>
            {(gmail.connect.isPending || busy) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Inbox className="h-4 w-4 mr-1" />} {gmail.status.data?.connected ? `Send from ${gmail.status.data.email}` : "Connect Gmail"}
          </Button>
          <Button variant="outline" onClick={sendResend} disabled={busy || sendEmail.isPending} title="Send through the projOS transactional email service instead of your connected mailbox">
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send via projOS
          </Button>
        </DialogFooter>

        {/* Off-screen branded letter — always kept in sync with letterHtml so
            Download/Send rasterize the exact current content regardless of
            whether Edit or Preview is on screen right now. */}
        <div style={{ position: "fixed", left: -99999, top: 0, width: 720, background: "#fff" }} aria-hidden>
          <div ref={docRef} dangerouslySetInnerHTML={{ __html: letterHtml }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

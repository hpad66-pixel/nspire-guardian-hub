/**
 * Send a signed authored document to chosen recipients with a token-gated e-sign link.
 * Recipients are picked from project CRM / workspace contacts — never auto-forced.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { htmlToPdfAttachment } from "@/lib/docs/render";
import type { AuthoredDocument } from "@/hooks/useAuthoredDocuments";
import { useProjectContacts } from "@/hooks/useProjectPeople";
import { RecipientsInput } from "./RecipientsInput";
import { ESignStamp } from "@/components/correspondence/ESignStamp";

export function SendAuthoredDocumentDialog({
  open,
  onOpenChange,
  doc,
  projectName,
  editedHtml,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: AuthoredDocument;
  projectName?: string | null;
  editedHtml?: string | null;
  onSent: (email: string) => Promise<void>;
}) {
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(doc.project_id);
  const savedRecipients = useSavedRecipients();
  const { data: contacts = [] } = useProjectContacts(doc.project_id);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [primary, setPrimary] = useState<string>("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const signLink = `${window.location.origin}/sign/document/${doc.sign_token}`;
  const emailable = contacts.filter((c) => c.email);

  useEffect(() => {
    if (!open) return;
    // Do NOT auto-pick the first contact — that was forcing Airia/Chris/etc.
    setRecipients([]);
    setPrimary("");
    setMessage(
      `Please find “${doc.title}” for ${projectName || "the project"}. Review the document and sign electronically at the link below. Once executed, the fully signed copy is recorded in the project correspondence trail.`,
    );
  }, [open, doc.title, projectName]);

  const applyQuickPick = (email: string) => {
    if (!email) return;
    setPrimary(email);
    setRecipients((prev) => (prev.includes(email) ? prev : [...prev, email]));
  };

  const send = async () => {
    const list = recipients.map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!list.length) {
      toast.error("Choose who to send this to — pick from project contacts or type an email.");
      return;
    }
    if (!doc.contractor_signed_at && !doc.sign_token) {
      toast.error("Sign the document before sending.");
      return;
    }
    setBusy(true);
    try {
      let attachments: Array<{ filename: string; contentBase64: string; contentType: string; size: number }> | undefined;
      const html = editedHtml;
      if (html) {
        try {
          const att = await htmlToPdfAttachment(html, doc.title);
          attachments = [att];
        } catch {
          /* PDF attach is best-effort; the sign link is the primary path */
        }
      } else if (doc.has_original && doc.mime_type?.includes("pdf")) {
        const { data } = await supabase
          .from("authored_documents" as any)
          .select("original_base64,mime_type,source_file_name")
          .eq("id", doc.id)
          .single();
        const row = data as any;
        if (row?.original_base64) {
          attachments = [{
            filename: row.source_file_name || `${doc.title}.pdf`,
            contentBase64: row.original_base64,
            contentType: row.mime_type || "application/pdf",
            size: Math.round((row.original_base64.length * 3) / 4),
          }];
        }
      }

      const bodyHtml = `
        <div style="font-family:'DM Sans',Georgia,serif;color:#1A1714;max-width:640px;margin:0 auto;">
          <div style="border-bottom:2px solid #C4A35A;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;">APAS</div>
              <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">Correspondence for signature</div>
            </div>
            ${doc.contractor_signed_at ? `
              <div style="border:2px solid #059669;border-radius:8px;overflow:hidden;background:#ecfdf5;font-size:10px;">
                <div style="display:flex;">
                  <div style="background:#059669;color:#fff;padding:6px 8px;font-weight:700;">✓</div>
                  <div style="padding:4px 8px;">
                    <div style="font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#047857;">Electronically Signed</div>
                    <div style="color:#064e3b;font-weight:600;">${(doc.contractor_signed_name || "").replace(/</g, "")}</div>
                  </div>
                </div>
              </div>` : ""}
          </div>
          <p style="white-space:pre-wrap;line-height:1.55;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
          <p style="margin:22px 0;text-align:center;">
            <a href="${signLink}" style="display:inline-block;background:#1D6FE8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Review &amp; sign document</a>
          </p>
          <p style="color:#878581;font-size:12px;">${doc.title}${projectName ? ` · ${projectName}` : ""}${doc.contractor_signed_name ? ` · Signed by ${doc.contractor_signed_name}` : ""}</p>
        </div>`;

      await sendEmail.mutateAsync({
        recipients: list,
        subject: `${doc.title} — signature requested${projectName ? ` (${projectName})` : ""}`,
        bodyHtml,
        bodyText: `${message}\n\nReview & sign: ${signLink}`,
        attachments,
        fromName: doc.contractor_signed_name || undefined,
      });

      try {
        await savedRecipients.rememberAll(list);
      } catch { /* remember is best-effort */ }

      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound",
          status: "sent",
          channel: "resend",
          subject: `${doc.title} — signature requested`,
          to_emails: list,
          snippet: message.slice(0, 200),
          body_text: message,
        } as any);
      } catch { /* trail log is best-effort */ }

      await onSent(list[0]);
      toast.success(`Sent to ${list.join(", ")}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send to client</DialogTitle>
          <DialogDescription>
            Choose who receives this — project CRM contacts, any workspace contact, or a typed address. Nothing is pre-selected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {doc.contractor_signed_name && (
            <div className="flex justify-start">
              <ESignStamp
                name={doc.contractor_signed_name}
                signedAt={doc.contractor_signed_at}
                compact
              />
            </div>
          )}

          {emailable.length > 0 && (
            <div>
              <Label className="text-xs">Quick pick from this project</Label>
              <Select value={primary || undefined} onValueChange={applyQuickPick}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a project contact…" />
                </SelectTrigger>
                <SelectContent>
                  {emailable.map((c) => (
                    <SelectItem key={c.contactId} value={c.email!}>
                      {c.name}{c.isKeyContact ? " · key" : ""} · {c.email}
                      {c.roleLabel ? ` (${c.roleLabel})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Send to</Label>
            <div className="mt-1">
              <RecipientsInput
                value={recipients}
                onChange={setRecipients}
                projectId={doc.project_id}
                placeholder="Search contacts or type an email — press Enter"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Search your CRM, pick multiple people, or type any email. Project contacts show first when scoped.
            </p>
          </div>

          <div>
            <Label>Message</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground break-all">Sign link: {signLink}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy || recipients.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

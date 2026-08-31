/**
 * Send a signed authored document to the client with a token-gated e-sign link
 * (same pattern as SendChangeOrderDialog / financial proposals).
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { htmlToPdfAttachment } from "@/lib/docs/render";
import type { AuthoredDocument } from "@/hooks/useAuthoredDocuments";
import { useProjectContacts } from "@/hooks/useProjectPeople";

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
  const { data: contacts = [] } = useProjectContacts(doc.project_id);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const signLink = `${window.location.origin}/sign/document/${doc.sign_token}`;

  useEffect(() => {
    if (!open) return;
    const first = contacts.find((c) => c.email)?.email || "";
    setTo(first);
    setMessage(
      `Please find “${doc.title}” for ${projectName || "the project"}. Review the document and sign electronically at the link below. Once executed, the fully signed copy is recorded in the project correspondence trail.`,
    );
  }, [open, contacts, doc.title, projectName]);

  const send = async () => {
    const email = to.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter a valid client email.");
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
          <div style="border-bottom:2px solid #C4A35A;padding-bottom:10px;margin-bottom:16px;">
            <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;">APAS</div>
            <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">Correspondence for signature</div>
          </div>
          <p style="white-space:pre-wrap;line-height:1.55;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
          <p style="margin:22px 0;text-align:center;">
            <a href="${signLink}" style="display:inline-block;background:#1D6FE8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Review &amp; sign document</a>
          </p>
          <p style="color:#878581;font-size:12px;">${doc.title}${projectName ? ` · ${projectName}` : ""}${doc.contractor_signed_name ? ` · Signed by ${doc.contractor_signed_name}` : ""}</p>
        </div>`;

      await sendEmail.mutateAsync({
        recipients: [email],
        subject: `${doc.title} — signature requested${projectName ? ` (${projectName})` : ""}`,
        bodyHtml,
        bodyText: `${message}\n\nReview & sign: ${signLink}`,
        attachments,
        fromName: doc.contractor_signed_name || undefined,
      });

      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound",
          status: "sent",
          channel: "resend",
          subject: `${doc.title} — signature requested`,
          to_emails: [email],
          snippet: message.slice(0, 200),
          body_text: message,
        } as any);
      } catch { /* trail log is best-effort */ }

      await onSent(email);
      toast.success(`Sent to ${email}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send to client</DialogTitle>
          <DialogDescription>
            Email the signed document with a link the client can e-sign — same flow as change orders and proposals.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Client email</Label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" list="corr-doc-contacts" />
            <datalist id="corr-doc-contacts">
              {contacts.filter((c) => c.email).map((c) => (
                <option key={c.contactId} value={c.email!} label={c.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground break-all">Sign link: {signLink}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

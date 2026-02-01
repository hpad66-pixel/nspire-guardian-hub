import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCreateProposal, useUpdateProposal } from "@/hooks/useProposals";
import { useSendReportEmail } from "@/hooks/useReportEmails";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { generatePDFBase64 } from "@/lib/generatePDF";
import type { CompanyBranding } from "@/hooks/useCompanyBranding";
import { Loader2, Send, FileText } from "lucide-react";

interface ProposalData {
  id?: string;
  project_id: string;
  title: string;
  content_html: string;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string;
  include_letterhead: boolean;
  include_logo: boolean;
}

interface ProposalSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ProposalData;
  branding: CompanyBranding | null | undefined;
  onSent: () => void;
}

export function ProposalSendDialog({
  open,
  onOpenChange,
  proposal,
  branding,
  onSent,
}: ProposalSendDialogProps) {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const { data: profiles } = useProfiles();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const sendEmail = useSendReportEmail();

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const project = projects?.find((p) => p.id === proposal.project_id);
  const userProfile = profiles?.find((p) => p.user_id === user?.id);

  const handleSend = async () => {
    if (!proposal.recipient_email) {
      toast.error("Recipient email is required");
      return;
    }

    setIsSending(true);

    try {
      // First, save or update the proposal
      let proposalId = proposal.id;
      
      if (!proposalId) {
        const created = await createProposal.mutateAsync({
          project_id: proposal.project_id,
          proposal_type: "project_proposal",
          title: proposal.title,
          content_html: proposal.content_html,
          content_text: proposal.content_html.replace(/<[^>]*>/g, ""),
          recipient_name: proposal.recipient_name,
          recipient_email: proposal.recipient_email,
          recipient_company: proposal.recipient_company,
          include_letterhead: proposal.include_letterhead,
          include_logo: proposal.include_logo,
        });
        proposalId = created.id;
      }

      // Create temp element for PDF generation
      const today = format(new Date(), "MMMM d, yyyy");
      const tempDiv = document.createElement("div");
      tempDiv.id = "proposal-pdf-temp";
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "800px";
      tempDiv.style.background = "white";
      tempDiv.style.padding = "40px";
      tempDiv.style.fontFamily = "Arial, sans-serif";
      
      tempDiv.innerHTML = `
        ${proposal.include_letterhead && branding ? `
          <div style="border-bottom: 3px solid ${branding.primary_color || "#1e40af"}; padding-bottom: 20px; margin-bottom: 30px;">
            <div style="font-size: 18pt; font-weight: bold; color: ${branding.primary_color}">${branding.company_name}</div>
            <div style="font-size: 10pt; color: #666;">
              ${branding.address_line1 || ""} ${branding.address_line2 || ""}
              ${branding.phone ? ` | ${branding.phone}` : ""}
              ${branding.email ? ` | ${branding.email}` : ""}
            </div>
          </div>
        ` : ""}
        <div style="margin-bottom: 20px;">${today}</div>
        <div style="margin-bottom: 20px;">
          ${proposal.recipient_name ? `<div>${proposal.recipient_name}</div>` : ""}
          ${proposal.recipient_company ? `<div>${proposal.recipient_company}</div>` : ""}
        </div>
        <div style="font-weight: bold; margin-bottom: 20px;">RE: ${proposal.title}</div>
        <div>${proposal.content_html}</div>
        <div style="margin-top: 40px;">
          <div>Sincerely,</div>
          <div style="margin-top: 30px; font-weight: bold;">${userProfile?.full_name || "Your Name"}</div>
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      // Generate PDF
      const pdfBase64 = await generatePDFBase64({ elementId: "proposal-pdf-temp" });
      document.body.removeChild(tempDiv);

      // Send email
      await sendEmail.mutateAsync({
        recipients: [proposal.recipient_email],
        subject: `${proposal.title} - ${project?.name || "Project"}`,
        reportType: "daily_report",
        reportId: proposalId,
        propertyName: project?.name || "Project",
        inspectorName: userProfile?.full_name || "Team",
        inspectionDate: today,
        message: message || undefined,
        pdfBase64,
        pdfFilename: `${proposal.title.replace(/[^a-z0-9]/gi, "_")}.pdf`,
      });

      // Update proposal status to sent
      await updateProposal.mutateAsync({
        id: proposalId,
        status: "sent",
      });

      toast.success("Proposal sent successfully!");
      onSent();
    } catch (error) {
      console.error("Failed to send proposal:", error);
      toast.error("Failed to send proposal");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Proposal
          </DialogTitle>
          <DialogDescription>
            Review and send this proposal to {proposal.recipient_name || proposal.recipient_email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <FileText className="h-10 w-10 text-primary p-2 bg-primary/10 rounded" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{proposal.title}</h4>
                <p className="text-sm text-muted-foreground">
                  To: {proposal.recipient_name || proposal.recipient_email}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Additional Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Proposal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

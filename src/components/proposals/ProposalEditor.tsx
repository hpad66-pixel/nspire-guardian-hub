import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  useCreateProposal,
  useUpdateProposal,
  useProposalTemplates,
  type Proposal,
  type ProposalType,
} from "@/hooks/useProposals";
import { useProposalGeneration } from "@/hooks/useProposalGeneration";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { Sparkles, Save, Send, Loader2, Settings } from "lucide-react";
import { ProposalSendDialog } from "./ProposalSendDialog";
import { BrandingSettings } from "./BrandingSettings";

interface ProposalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  proposal: Proposal | null;
}

const proposalTypes: { value: ProposalType; label: string }[] = [
  { value: "project_proposal", label: "Project Proposal" },
  { value: "change_order_request", label: "Change Order Request" },
  { value: "scope_amendment", label: "Scope Amendment" },
  { value: "cost_estimate", label: "Cost Estimate" },
  { value: "letter", label: "Letter" },
  { value: "memo", label: "Memo" },
  { value: "correspondence", label: "Correspondence" },
];

export function ProposalEditor({
  open,
  onOpenChange,
  projectId,
  proposal,
}: ProposalEditorProps) {
  const isEditing = !!proposal?.id;
  const isSent = proposal?.status === "sent";

  // Form state
  const [title, setTitle] = useState("");
  const [proposalType, setProposalType] = useState<ProposalType>("project_proposal");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);

  // Dialogs
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);

  // Hooks
  const { data: templates } = useProposalTemplates();
  const { data: branding } = useCompanyBranding();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const { generate, isGenerating } = useProposalGeneration();

  // Initialize form when proposal changes
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title);
      setProposalType(proposal.proposal_type);
      setSubject(proposal.subject || "");
      setContent(proposal.content_html || "");
      setRecipientName(proposal.recipient_name || "");
      setRecipientEmail(proposal.recipient_email || "");
      setRecipientCompany(proposal.recipient_company || "");
      setRecipientAddress(proposal.recipient_address || "");
      setIncludeLetterhead(proposal.include_letterhead);
      setIncludeLogo(proposal.include_logo);
      setUserNotes(proposal.ai_prompt || "");
    } else {
      // Reset for new proposal
      setTitle("");
      setProposalType("project_proposal");
      setSubject("");
      setContent("");
      setRecipientName("");
      setRecipientEmail("");
      setRecipientCompany("");
      setRecipientAddress("");
      setIncludeLetterhead(true);
      setIncludeLogo(true);
      setUserNotes("");
    }
  }, [proposal, open]);

  const handleGenerate = async () => {
    if (!projectId) return;

    let generatedContent = "";

    await generate(
      {
        projectId,
        proposalType,
        userNotes,
        subject,
      },
      {
        onDelta: (chunk) => {
          generatedContent += chunk;
          setContent(generatedContent);
        },
        onDone: () => {
          toast.success("Proposal generated successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const data = {
      project_id: projectId,
      proposal_type: proposalType,
      title: title.trim(),
      subject: subject.trim() || null,
      content_html: content,
      content_text: content.replace(/<[^>]*>/g, ""),
      ai_prompt: userNotes || null,
      ai_generated: !!userNotes && content.length > 0,
      recipient_name: recipientName.trim() || null,
      recipient_email: recipientEmail.trim() || null,
      recipient_company: recipientCompany.trim() || null,
      recipient_address: recipientAddress.trim() || null,
      include_letterhead: includeLetterhead,
      include_logo: includeLogo,
    };

    if (isEditing && proposal?.id) {
      await updateProposal.mutateAsync({ id: proposal.id, ...data });
    } else {
      await createProposal.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const handleSendClick = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please add a title and content before sending");
      return;
    }
    if (!recipientEmail.trim()) {
      toast.error("Please add a recipient email");
      return;
    }
    setSendDialogOpen(true);
  };

  const isSaving = createProposal.isPending || updateProposal.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>
                {isSent ? "View Proposal" : isEditing ? "Edit Proposal" : "New Proposal"}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {!isSent && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Draft
                    </Button>
                    <Button size="sm" onClick={handleSendClick}>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* AI Generation Panel */}
              {!isSent && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">AI Assistant</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBrandingDialogOpen(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Branding
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <Select
                        value={proposalType}
                        onValueChange={(v) => setProposalType(v as ProposalType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {proposalTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject (optional)</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Elevator Modernization"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Context</Label>
                    <VoiceDictationTextareaWithAI
                      value={userNotes}
                      onValueChange={setUserNotes}
                      placeholder="Add any specific requirements, key points, or context for the AI to consider..."
                      rows={3}
                      context="notes"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Separator />

              {/* Document Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter proposal title"
                    disabled={isSent}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Start typing or generate with AI..."
                    editable={!isSent}
                    className="min-h-[300px]"
                  />
                </div>
              </div>

              <Separator />

              {/* Recipient */}
              <div className="space-y-4">
                <h3 className="font-medium">Recipient</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="John Smith"
                      disabled={isSent}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="john@example.com"
                      disabled={isSent}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={recipientCompany}
                      onChange={(e) => setRecipientCompany(e.target.value)}
                      placeholder="Acme Corp"
                      disabled={isSent}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      disabled={isSent}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Branding Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Branding</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="letterhead"
                      checked={includeLetterhead}
                      onCheckedChange={(checked) => setIncludeLetterhead(!!checked)}
                      disabled={isSent}
                    />
                    <Label htmlFor="letterhead" className="font-normal cursor-pointer">
                      Include letterhead
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="logo"
                      checked={includeLogo}
                      onCheckedChange={(checked) => setIncludeLogo(!!checked)}
                      disabled={isSent}
                    />
                    <Label htmlFor="logo" className="font-normal cursor-pointer">
                      Include logo
                    </Label>
                  </div>
                </div>
                {!branding && (
                  <p className="text-sm text-muted-foreground">
                    No branding configured.{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setBrandingDialogOpen(true)}
                    >
                      Configure now
                    </button>
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ProposalSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        proposal={{
          id: proposal?.id,
          project_id: projectId,
          title,
          content_html: content,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          recipient_company: recipientCompany,
          include_letterhead: includeLetterhead,
          include_logo: includeLogo,
        }}
        branding={branding}
        onSent={() => {
          setSendDialogOpen(false);
          onOpenChange(false);
        }}
      />

      <BrandingSettings
        open={brandingDialogOpen}
        onOpenChange={setBrandingDialogOpen}
      />
    </>
  );
}

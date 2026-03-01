import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useProposalsByProject, useDeleteProposal, type Proposal, type ProposalStatus } from "@/hooks/useProposals";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Trash2,
  Send,
  Lock,
  Mail,
  ExternalLink,
} from "lucide-react";
import { ProposalEditor, type ProposalEditorInitialContext } from "./ProposalEditor";
import { SendExternalEmailDialog } from "@/components/projects/SendExternalEmailDialog";

interface ProposalListProps {
  projectId: string;
  projectName?: string;
  /** Optional initial context to pre-populate the editor (e.g. from milestones) */
  initialContext?: ProposalEditorInitialContext;
  /** If true, auto-open the editor when the component mounts */
  autoOpen?: boolean;
  /** Callback when auto-open editor closes */
  onAutoOpenClose?: () => void;
}

const statusConfig: Record<ProposalStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  sent: { label: "Sent", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
};

const typeLabels: Record<string, string> = {
  project_proposal: "Project Proposal",
  change_order_request: "Change Order Request",
  scope_amendment: "Scope Amendment",
  cost_estimate: "Cost Estimate",
  letter: "Letter",
  memo: "Memo",
  correspondence: "Correspondence",
};

export function ProposalList({ projectId, projectName = '', initialContext, autoOpen, onAutoOpenClose }: ProposalListProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  
  const { data: proposals, isLoading } = useProposalsByProject(projectId);
  const deleteProposal = useDeleteProposal();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialContext, setEditorInitialContext] = useState<ProposalEditorInitialContext | undefined>(undefined);

  // Auto-open editor when initialContext is provided (e.g. from milestone)
  useEffect(() => {
    if (autoOpen && initialContext) {
      setEditorInitialContext(initialContext);
      setSelectedProposal(null);
      setEditorOpen(true);
    }
  }, [autoOpen, initialContext]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [emailProposal, setEmailProposal] = useState<Proposal | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Admin Access Required</h3>
        <p className="text-muted-foreground max-w-md mt-2">
          Proposal creation and management is available to administrators only.
        </p>
      </div>
    );
  }

  const handleCreate = () => {
    setSelectedProposal(null);
    setEditorOpen(true);
  };

  const handleEdit = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setEditorOpen(true);
  };

  const handleDuplicate = (proposal: Proposal) => {
    // Will be handled by creating with existing content
    setSelectedProposal({ ...proposal, id: "", status: "draft" as const });
    setEditorOpen(true);
  };

  const handleDeleteClick = (proposal: Proposal) => {
    setProposalToDelete(proposal);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (proposalToDelete) {
      deleteProposal.mutate({ id: proposalToDelete.id, projectId });
    }
    setDeleteDialogOpen(false);
    setProposalToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Proposals & Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage project proposals, letters, and documents
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {proposals && proposals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No proposals yet</h3>
            <p className="text-muted-foreground text-center max-w-md mt-2">
              Create your first proposal to get started. You can generate content with AI and customize it before sending.
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Proposal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals?.map((proposal) => {
            const status = statusConfig[proposal.status];
            return (
              <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          #{proposal.proposal_number}
                        </span>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                        {proposal.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium truncate">{proposal.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {typeLabels[proposal.proposal_type] || proposal.proposal_type}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {proposal.recipient_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {proposal.recipient_email}
                          </span>
                        )}
                        <span>
                          {proposal.status === "sent" && proposal.sent_at
                            ? `Sent ${format(new Date(proposal.sent_at), "MMM d, yyyy")}`
                            : `Updated ${format(new Date(proposal.updated_at), "MMM d, yyyy 'at' h:mm a")}`}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(proposal)}>
                          {proposal.status === "sent" ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </>
                          ) : (
                            <>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEmailProposal(proposal);
                            setEmailDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          Email Externally
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(proposal)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {proposal.status !== "sent" && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(proposal)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProposalEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditorInitialContext(undefined);
            onAutoOpenClose?.();
          }
        }}
        projectId={projectId}
        proposal={selectedProposal}
        initialContext={editorInitialContext}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{proposalToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailProposal && (
        <SendExternalEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          documentType="proposal"
          documentTitle={emailProposal.title}
          documentId={emailProposal.id}
          projectName={projectName}
          contentHtml={`
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;width:140px;">Proposal #</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailProposal.proposal_number}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Title</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailProposal.title}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Type</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailProposal.proposal_type}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Status</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailProposal.status}</td></tr>
            </table>
          `}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Reply,
  Forward,
  Archive,
  Trash2,
  MoreHorizontal,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { ReportEmailFull } from "@/hooks/useReportEmails";
import {
  useArchiveEmail,
  useRestoreEmail,
  useSoftDeleteEmail,
  usePermanentDeleteEmail,
} from "@/hooks/useEmailActions";
import { ReplyForwardDialog } from "./ReplyForwardDialog";

interface EmailActionsProps {
  email: ReportEmailFull;
  onActionComplete?: () => void;
  variant?: "buttons" | "dropdown";
}

export function EmailActions({
  email,
  onActionComplete,
  variant = "buttons",
}: EmailActionsProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);

  const archiveEmail = useArchiveEmail();
  const restoreEmail = useRestoreEmail();
  const softDeleteEmail = useSoftDeleteEmail();
  const permanentDeleteEmail = usePermanentDeleteEmail();

  const isArchived = (email as any).is_archived;
  const isDeleted = (email as any).is_deleted;

  const handleArchive = async () => {
    await archiveEmail.mutateAsync(email.id);
    onActionComplete?.();
  };

  const handleRestore = async () => {
    await restoreEmail.mutateAsync(email.id);
    onActionComplete?.();
  };

  const handleSoftDelete = async () => {
    await softDeleteEmail.mutateAsync(email.id);
    setDeleteDialogOpen(false);
    onActionComplete?.();
  };

  const handlePermanentDelete = async () => {
    await permanentDeleteEmail.mutateAsync(email.id);
    setPermanentDeleteDialogOpen(false);
    onActionComplete?.();
  };

  const isLoading =
    archiveEmail.isPending ||
    restoreEmail.isPending ||
    softDeleteEmail.isPending ||
    permanentDeleteEmail.isPending;

  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setReplyOpen(true)}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setForwardOpen(true)}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isArchived || isDeleted ? (
              <DropdownMenuItem onClick={handleRestore}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isDeleted ? (
              <DropdownMenuItem
                onClick={() => setPermanentDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ReplyForwardDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          email={email}
          mode="reply"
        />
        <ReplyForwardDialog
          open={forwardOpen}
          onOpenChange={setForwardOpen}
          email={email}
          mode="forward"
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Email?</AlertDialogTitle>
              <AlertDialogDescription>
                This email will be moved to trash. You can restore it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSoftDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={permanentDeleteDialogOpen}
          onOpenChange={setPermanentDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Email?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The email will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Buttons variant
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReplyOpen(true)}
          className="gap-2"
        >
          <Reply className="h-4 w-4" />
          Reply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setForwardOpen(true)}
          className="gap-2"
        >
          <Forward className="h-4 w-4" />
          Forward
        </Button>
        {isArchived || isDeleted ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isLoading}
            className="gap-2"
          >
            {restoreEmail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Restore
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={isLoading}
            className="gap-2"
          >
            {archiveEmail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            isDeleted
              ? setPermanentDeleteDialogOpen(true)
              : setDeleteDialogOpen(true)
          }
          disabled={isLoading}
          className="gap-2 text-destructive hover:text-destructive"
        >
          {softDeleteEmail.isPending || permanentDeleteEmail.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {isDeleted ? "Delete Forever" : "Delete"}
        </Button>
      </div>

      <ReplyForwardDialog
        open={replyOpen}
        onOpenChange={setReplyOpen}
        email={email}
        mode="reply"
      />
      <ReplyForwardDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        email={email}
        mode="forward"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This email will be moved to trash. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The email will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

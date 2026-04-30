/**
 * B3 · GenerateRegisterButton — triggers useGenerateSubmittalRegister and
 * surfaces a confirm dialog before creating draft submittal_register_items
 * from the project's spec_submittal_requirements.
 *
 * Extracted from SpecificationsPage so it can be reused in the Submittals
 * module header as well.
 */
import { useState } from "react";
import { useGenerateSubmittalRegister } from "@/hooks/useSpecs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";

export interface GenerateRegisterButtonProps {
  projectId: string;
  /** Optional label override. */
  label?: string;
  /** Button variant pass-through. */
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
}

export function GenerateRegisterButton({
  projectId, label = "Generate submittal register",
  variant = "default", size = "default",
}: GenerateRegisterButtonProps) {
  const [open, setOpen] = useState(false);
  const generate = useGenerateSubmittalRegister(projectId);

  async function handleConfirm() {
    try {
      const r = await generate.mutateAsync();
      if (r.count === 0) {
        toast.info("No new requirements to generate — register already up to date.");
      } else {
        toast.success(`Created ${r.count} draft submittal${r.count === 1 ? "" : "s"}`);
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={generate.isPending}>
          <ListPlus className="h-4 w-4 mr-2" />
          {generate.isPending ? "Generating…" : label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate submittal register?</AlertDialogTitle>
          <AlertDialogDescription>
            This creates a draft submittal for every ungenerated requirement in this
            project's active spec sections. Existing submittals are untouched.
            You can still edit or reject drafts after generation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={generate.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Generating…" : "Generate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

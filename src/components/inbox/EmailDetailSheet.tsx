import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmailPreview } from "./EmailPreview";

interface EmailDetailSheetProps {
  emailId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailDetailSheet({
  emailId,
  open,
  onOpenChange,
}: EmailDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Email Details</SheetTitle>
        </SheetHeader>
        <EmailPreview emailId={emailId} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

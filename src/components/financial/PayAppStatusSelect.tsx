/**
 * PayAppStatusSelect — manual status override dropdown for a prime pay app
 * (Draft / Submitted / Approved / Paid / Rejected). Lets the GC mark a pay app
 * paid/unpaid directly, like Procore's status column, instead of only via the
 * submit→approve workflow. Derived fields (approved amount, retainage) are kept
 * sane by useSetPayAppStatus.
 */
import { PAY_APP_STATUSES, useSetPayAppStatus, type PayAppStatus } from "@/hooks/usePayApp";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DOT: Record<string, string> = {
  draft: "bg-muted-foreground/50",
  submitted: "bg-amber-500",
  approved: "bg-blue-500",
  paid: "bg-emerald-500",
  rejected: "bg-rose-500",
};

export function PayAppStatusSelect({
  payAppId, value, disabled, className,
}: { payAppId: string; value: string; disabled?: boolean; className?: string }) {
  const setStatus = useSetPayAppStatus();
  return (
    <Select
      value={PAY_APP_STATUSES.some((s) => s.value === value) ? value : undefined}
      disabled={disabled || setStatus.isPending}
      onValueChange={(v) =>
        setStatus.mutate(
          { payAppId, status: v as PayAppStatus },
          {
            onSuccess: () => toast.success(`Marked ${v}.`),
            onError: (e: any) => toast.error(e.message),
          },
        )
      }
    >
      <SelectTrigger className={`h-8 w-[150px] ${className ?? ""}`}>
        <SelectValue placeholder={value || "Set status"} />
      </SelectTrigger>
      <SelectContent>
        {PAY_APP_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${DOT[s.value] ?? "bg-muted"}`} />
              {s.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

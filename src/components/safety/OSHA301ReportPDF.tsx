/**
 * E2 · OSHA301ReportPDF — download button for the per-incident OSHA Form 301.
 */
import { Button } from "@/components/ui/button";
import { downloadOsha301Pdf, type Osha301Input } from "@/lib/pdf/osha";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface OSHA301ReportPDFProps {
  input: Osha301Input;
  filename?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;
}

export function OSHA301ReportPDF({
  input, filename, label = "Download OSHA 301",
  variant = "outline", size = "default",
  disabled, className,
}: OSHA301ReportPDFProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await downloadOsha301Pdf(input, filename);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={variant} size={size} disabled={disabled || busy}
      onClick={handleClick} className={className}
    >
      <FileDown className="h-4 w-4 mr-2" />
      {busy ? "Generating…" : label}
    </Button>
  );
}

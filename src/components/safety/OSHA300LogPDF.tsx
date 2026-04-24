/**
 * E2 · OSHA300LogPDF — button component wrapping `generateOsha300Pdf`.
 *
 * Accepts the establishment metadata + incident rows and emits a
 * download-on-click OSHA Form 300 PDF. Keeping this separate from the
 * generator (`src/lib/pdf/osha.ts`) so non-UI callers (edge fns, reports)
 * can still invoke the generator directly.
 */
import { Button } from "@/components/ui/button";
import { downloadOsha300Pdf, type Osha300Input } from "@/lib/pdf/osha";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface OSHA300LogPDFProps {
  input: Osha300Input;
  filename?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;
}

export function OSHA300LogPDF({
  input, filename, label = "Download OSHA 300",
  variant = "outline", size = "default",
  disabled, className,
}: OSHA300LogPDFProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await downloadOsha300Pdf(input, filename);
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

/**
 * Sign a change order in-app: type your name, it renders as an ink signature and
 * stamps into the document, then produces the locked signed PDF and freezes the
 * row. Once signed the CO is locked (DB guard) — the signed version is immutable.
 */
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { buildCoPdfBlob } from "@/lib/changeOrder/coPdf";
import { uploadCoArtifact } from "@/lib/changeOrder/storage";
import { fmtLongDate } from "@/lib/changeOrder/defaults";
import type { CoSpec } from "@/lib/changeOrder/types";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export function ChangeOrderSignDialog({
  open, onOpenChange, coId, spec, projectId, onSigned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  coId: string;
  spec: CoSpec | null;
  projectId: string;
  onSigned?: () => void;
}) {
  const [sigData, setSigData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setSigData(null); setTypedName(""); } }, [open]);
  const handleSig = useCallback((url: string | null) => setSigData(url), []);

  const signerName = (typedName.trim() || spec?.signatures.submitted.name || "").trim();
  const signedSpec: CoSpec | null = spec
    ? { ...spec, signatures: { ...spec.signatures, submitted: { ...spec.signatures.submitted, name: signerName || spec.signatures.submitted.name, date: fmtLongDate(new Date().toISOString().slice(0, 10)) } } }
    : null;

  async function handleSign() {
    if (!sigData || !signedSpec) return toast.error("Type your name to sign first.");
    setBusy(true);
    try {
      // Render the locked vector PDF with the signature stamped in (best-effort —
      // a PDF hiccup must never block locking the signed change order).
      let pdfUrl: string | null = null;
      try {
        const pdf = await buildCoPdfBlob(signedSpec, { submitted: sigData });
        pdfUrl = await uploadCoArtifact(pdf, projectId, "change-orders/signed", "pdf");
      } catch (pdfErr) {
        console.warn("Signed PDF generation failed (continuing):", pdfErr);
      }
      const sigUrl = await uploadCoArtifact(await dataUrlToBlob(sigData), projectId, "change-orders/sig", "png");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("change_orders" as any).update({
        spec: signedSpec,
        ...(pdfUrl ? { pdf_path: pdfUrl } : {}),
        submitted_signature_path: sigUrl,
        submitted_signed_at: new Date().toISOString(),
        submitted_signed_by: user?.id ?? null,
        locked: true,
        status: "out_for_signature",
      } as any).eq("id", coId);
      if (error) throw error;
      toast.success("Change order signed and locked");
      onSigned?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-4 w-4" /> Sign change order</DialogTitle>
          <DialogDescription>Type your name to sign. On signing, this version locks and can be sent to the client.</DialogDescription>
        </DialogHeader>

        <TypedSignaturePad
          defaultName={spec?.signatures.submitted.name ?? ""}
          onChange={handleSig}
          onNameChange={setTypedName}
        />
        <p className="text-xs text-muted-foreground">{signerName} · {spec?.signatures.submitted.title}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSign} disabled={!sigData || busy}>{busy ? "Signing…" : "Sign & lock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Contractor e-sign for an authored correspondence document (Word letter or PDF).
 * Step 1: typed signature pad. Step 2: click-to-place on the document + Adobe-style stamp.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { SignaturePlacementCanvas, type SignaturePlacement } from "@/components/correspondence/SignaturePlacementCanvas";
import { ESignStamp } from "@/components/correspondence/ESignStamp";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import type { AuthoredDocument } from "@/hooks/useAuthoredDocuments";

export function SignAuthoredDocumentDialog({
  open,
  onOpenChange,
  doc,
  pdfBase64,
  onSign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: AuthoredDocument;
  pdfBase64?: string | null;
  onSign: (payload: {
    name: string;
    signatureDataUrl: string;
    placement: SignaturePlacement;
    signedAt: string;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<"sign" | "place">("sign");
  const [name, setName] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedAt, setSignedAt] = useState<string>("");

  const reset = () => {
    setStep("sign");
    setName("");
    setSig(null);
    setBusy(false);
    setSignedAt("");
  };

  const goPlace = () => {
    if (!sig || !name.trim()) {
      toast.error("Type your name and complete the signature.");
      return;
    }
    setSignedAt(new Date().toISOString());
    setStep("place");
  };

  const submit = async (placement: SignaturePlacement) => {
    if (!sig || !name.trim()) return;
    setBusy(true);
    try {
      await onSign({
        name: name.trim(),
        signatureDataUrl: sig,
        placement,
        signedAt: signedAt || new Date().toISOString(),
      });
      toast.success("Document electronically signed. You can send it to the client.");
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't sign the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className={step === "place" ? "sm:max-w-3xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-emerald-600" />
            {step === "sign" ? "Electronically sign" : "Place your signature"}
          </DialogTitle>
          <DialogDescription>
            {step === "sign"
              ? `Sign “${doc.title}” with a verified electronic signature — same security pattern as change orders and proposals.`
              : "Click exactly where the signature should appear. A green Electronically Signed certificate will stamp the top of the page."}
          </DialogDescription>
        </DialogHeader>

        {step === "sign" ? (
          <>
            <div className="flex justify-center py-1">
              <ESignStamp name={name || "Your name"} signedAt={new Date().toISOString()} compact />
            </div>
            <TypedSignaturePad onChange={setSig} onNameChange={setName} />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={goPlace} disabled={!sig || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                Next: place on document
              </Button>
            </DialogFooter>
          </>
        ) : busy ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Locking signature…
          </div>
        ) : (
          <SignaturePlacementCanvas
            pdfBase64={pdfBase64}
            signatureDataUrl={sig!}
            signerName={name.trim()}
            signedAt={signedAt}
            onConfirm={submit}
            onCancel={() => setStep("sign")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

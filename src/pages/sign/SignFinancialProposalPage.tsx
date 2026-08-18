import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { FinancialProposalDocument } from "@/components/financial/FinancialProposalDocument";
import type { FinancialProposal, FinancialProposalLine } from "@/hooks/useFinancialProposals";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-proposal-countersign`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface Payload {
  proposal: FinancialProposal;
  lines: FinancialProposalLine[];
  project_name: string;
  signable: boolean;
}

export default function SignFinancialProposalPage() {
  const { token } = useParams<{ token: string }>();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetch(`${FN_BASE}?token=${token}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Proposal not found");
        setPayload(data);
        if (data.proposal.accepted_signed_at) setResponse("accepted");
        else if (data.proposal.status === "rejected") setResponse("rejected");
      } catch (cause) { setError((cause as Error).message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  async function submit(action: "accept" | "reject") {
    if (action === "accept" && (!signature || !name.trim())) return setError("Type your name to sign.");
    if (action === "reject" && comments.trim().length < 2) return setError("Add a comment explaining what needs to change.");
    setBusy(true); setError(null);
    try {
      const result = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, action, signature, name, comments }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Could not record response");
      setResponse(action === "accept" ? "accepted" : "rejected");
      if (payload) setPayload({ ...payload, signable: false, proposal: { ...payload.proposal, status: action === "accept" ? "approved" : "rejected" } });
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading proposal…</div>;
  if (!payload) return <div className="flex min-h-screen items-center justify-center text-destructive">{error || "Proposal not found"}</div>;

  return (
    <div className="min-h-screen bg-[#F7F4ED] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div><h1 className="text-xl font-bold">{payload.proposal.proposal_no} · {payload.proposal.title}</h1><p className="text-sm text-muted-foreground">{payload.project_name}</p></div>
        <div className="overflow-x-auto rounded-lg border bg-white p-3 shadow-sm"><FinancialProposalDocument proposal={payload.proposal} lines={payload.lines} projectName={payload.project_name} /></div>
        {response === "accepted" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800"><CheckCircle2 className="mx-auto mb-2 h-8 w-8" /><p className="font-semibold">Proposal accepted and signed.</p></div>
        ) : response === "rejected" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800"><XCircle className="mx-auto mb-2 h-8 w-8" /><p className="font-semibold">Revision requested.</p></div>
        ) : payload.signable ? (
          <div className="space-y-4 rounded-lg border bg-white p-5">
            <TypedSignaturePad onChange={setSignature} onNameChange={setName} />
            <div><p className="mb-1 text-sm font-medium">Comments or conditions (optional)</p><Textarea rows={3} value={comments} onChange={event => setComments(event.target.value)} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row"><Button className="flex-1" onClick={() => submit("accept")} disabled={!signature || !name.trim() || busy}>Accept & sign</Button><Button className="flex-1" variant="destructive" onClick={() => submit("reject")} disabled={busy || comments.trim().length < 2}>Request revision</Button></div>
          </div>
        ) : <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">This proposal is not currently available for signature.</div>}
      </div>
    </div>
  );
}

/**
 * Token-based punch list response UI, shared by the public page (/respond/punch/:token)
 * and the sub portal. Loads the transmittal via the punch-respond edge function, lets
 * the sub set a status + comment per item, and submits. No login required — the token
 * is the credential.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
];
const PRIORITY_CLS: Record<string, string> = { high: "text-[var(--apas-rose)]", medium: "text-amber-600", low: "text-muted-foreground" };

interface RespItem { id: string; description: string; location: string; priority: string; lastStatus: string | null; lastComment: string | null; }
interface RespData { project: string; recipient: string; message: string | null; status: string; items: RespItem[]; }

export function PunchRespondView({ token, embedded = false }: { token: string; embedded?: boolean }) {
  const [data, setData] = useState<RespData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responderName, setResponderName] = useState("");
  const [responderEmail, setResponderEmail] = useState("");
  const [resp, setResp] = useState<Record<string, { sub_status: string; comment: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: d, error: e } = await supabase.functions.invoke("punch-respond", { body: { token, action: "get" } });
      if (!active) return;
      if (e || (d as any)?.error) { setError((d as any)?.error ?? e?.message ?? "Could not load this punch list."); return; }
      const payload = d as RespData;
      setData(payload);
      setResp(Object.fromEntries(payload.items.map((i) => [i.id, { sub_status: i.lastStatus ?? "", comment: i.lastComment ?? "" }])));
      setResponderName(payload.recipient ?? "");
      supabase.functions.invoke("punch-respond", { body: { token, action: "view" } });
    })();
    return () => { active = false; };
  }, [token]);

  async function submit() {
    const responses = Object.entries(resp)
      .filter(([, v]) => v.sub_status)
      .map(([punch_item_id, v]) => ({ punch_item_id, sub_status: v.sub_status, comment: v.comment }));
    if (!responses.length) { toast.error("Set a status on at least one item."); return; }
    setSubmitting(true);
    try {
      const { data: r, error: e } = await supabase.functions.invoke("punch-respond", {
        body: { token, action: "respond", responder_name: responderName, responder_email: responderEmail, responses },
      });
      if (e || (r as any)?.error) throw new Error((r as any)?.error ?? e?.message);
      setDone(true);
      toast.success("Thank you — your response was recorded.");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <div className={embedded ? "" : "min-h-screen grid place-items-center p-6"}><Card><CardContent className="p-8 text-center text-muted-foreground">{error}</CardContent></Card></div>;
  if (!data) return <div className={embedded ? "p-6" : "min-h-screen grid place-items-center"}><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (done) {
    return (
      <div className={embedded ? "" : "min-h-screen grid place-items-center p-6"}>
        <Card className="max-w-md"><CardContent className="p-8 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <div className="text-lg font-semibold">Response recorded</div>
          <p className="text-sm text-muted-foreground">The general contractor has been notified of your status on each item. You can close this page.</p>
        </CardContent></Card>
      </div>
    );
  }

  const body = (
    <div className="space-y-5">
      <div className="border-b-[3px] border-[var(--accent)] pb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--accent)] font-bold">Punch List</div>
        <div className="text-2xl font-bold">{data.project}</div>
        {data.message && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{data.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Your name</Label><Input value={responderName} onChange={(e) => setResponderName(e.target.value)} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Your email</Label><Input type="email" value={responderEmail} onChange={(e) => setResponderEmail(e.target.value)} placeholder="you@company.com" /></div>
      </div>

      <div className="space-y-3">
        {data.items.map((i, n) => (
          <Card key={i.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm"><span className="text-muted-foreground mr-1.5">{n + 1}.</span><span className="font-medium">{i.description}</span>
                  <span className="block text-xs text-muted-foreground ml-5">{i.location || "—"}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] capitalize ${PRIORITY_CLS[i.priority] ?? ""}`}>{i.priority}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-5">
                <Select value={resp[i.id]?.sub_status ?? ""} onValueChange={(v) => setResp((s) => ({ ...s, [i.id]: { ...s[i.id], sub_status: v } }))}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Set status…" /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input
                  value={resp[i.id]?.comment ?? ""}
                  onChange={(e) => setResp((s) => ({ ...s, [i.id]: { ...s[i.id], comment: e.target.value } }))}
                  placeholder="Comment (optional)" className="h-8 flex-1 min-w-40 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit response"}</Button>
      </div>
    </div>
  );

  if (embedded) return body;
  return <div className="min-h-screen bg-background"><div className="max-w-2xl mx-auto p-6">{body}</div></div>;
}

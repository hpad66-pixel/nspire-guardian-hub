/**
 * F1 · Sub portal — RFIs where the sub's org is responsible_contractor_org_id.
 * RLS (rfis_sub_portal_select) filters the rows. Sub can add official responses
 * when they're the current ball-in-court assignee (respond action uses same
 * rfi_responses insert as main app).
 */
import { useState } from "react";
import { useSubPortalData } from "@/hooks/usePortals";
import { useRfiResponses } from "@/hooks/useProcoreRfis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function SubRfisPage() {
  const { data, isLoading } = useSubPortalData();
  const rfis = (data?.rfis ?? []) as any[];
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">My RFIs</h1>
      <p className="text-muted-foreground mb-6">
        RFIs assigned to your organization for response.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rfis.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No RFIs assigned to your org.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {rfis.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium">
                      <span className="font-mono text-muted-foreground mr-2">{r.rfi_number ?? "RFI"}</span>
                      {r.question?.slice(0, 120)}{r.question?.length > 120 ? "…" : ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      stage: {r.stage} · initiated {r.date_initiated ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.stage ?? "open"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                      {openId === r.id ? "Close" : "Respond"}
                    </Button>
                  </div>
                </div>
                {openId === r.id && <SubRfiResponder rfiId={r.id} onSent={() => setOpenId(null)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SubRfiResponder({ rfiId, onSent }: { rfiId: string; onSent: () => void }) {
  const { add } = useRfiResponses(rfiId);
  const [body, setBody] = useState("");
  const [official, setOfficial] = useState(false);

  async function send() {
    if (!body.trim()) { toast.error("Response text required"); return; }
    try {
      await add.mutateAsync({ body: body.trim(), isOfficial: official });
      toast.success(official ? "Official response submitted" : "Comment added");
      setBody("");
      onSent();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type your response…"
        rows={4}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={official} onCheckedChange={(v) => setOfficial(Boolean(v))} />
          Mark as official response (advances workflow)
        </label>
        <Button size="sm" onClick={send} disabled={add.isPending}>
          {add.isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

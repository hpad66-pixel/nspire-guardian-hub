/**
 * F1 · Sub portal — punch lists the GC has sent to this sub's commitments, with
 * in-portal item-by-item responses (same flow as the emailed public link).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubPortalData } from "@/hooks/usePortals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PunchRespondView } from "@/components/projects/PunchRespondView";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const STATUS: Record<string, string> = {
  sent: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]", viewed: "bg-amber-100 text-amber-700",
  responded: "bg-emerald-100 text-emerald-700", closed: "bg-muted text-muted-foreground",
};

export default function SubPunchListsPage() {
  const { data } = useSubPortalData();
  const commitmentIds = useMemo(() => ((data?.commitments ?? []) as any[]).map((c) => c.id), [data]);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const { data: transmittals = [], isLoading } = useQuery({
    queryKey: ["sub-punch-transmittals", [...commitmentIds].sort()],
    enabled: commitmentIds.length > 0,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("punch_transmittals" as any)
        .select("id, recipient_name, subject, status, item_count, sent_at, respond_token")
        .in("commitment_id", commitmentIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as any[];
    },
  });

  if (activeToken) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setActiveToken(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Back to punch lists</Button>
        <PunchRespondView token={activeToken} embedded />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-1">Punch lists</h1>
      <p className="text-muted-foreground mb-6">Lists the general contractor has sent you. Open one to update a status on each item.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : transmittals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No punch lists sent to you yet.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {transmittals.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/40" onClick={() => setActiveToken(t.respond_token)}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{t.subject || "Punch list"}</div>
                  <div className="text-xs text-muted-foreground">{t.item_count} item{t.item_count === 1 ? "" : "s"} · sent {fmt(t.sent_at)}</div>
                </div>
                <Badge className={`text-[10px] ${STATUS[t.status] ?? ""}`}>{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

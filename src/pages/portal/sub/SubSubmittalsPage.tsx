/**
 * F1 · Sub portal — submittals where the sub's org is responsible_contractor_org_id.
 * RLS (submittals_sub_portal_select) filters.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubSubmittalsPage() {
  const { data: submittals = [], isLoading } = useQuery({
    queryKey: ["sub-submittals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_submittals" as any)
        .select("*")
        .order("final_due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">My submittals</h1>
      <p className="text-muted-foreground mb-6">
        Submittals your organization is responsible to produce. Upload shop drawings,
        product data, or samples against each.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : submittals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No submittals assigned to your org.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {(submittals as any[]).map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">
                    {s.submittal_number && (
                      <span className="font-mono text-muted-foreground mr-2">{s.submittal_number}</span>
                    )}
                    {s.title ?? s.submittal_type ?? "Submittal"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.submittal_type ?? "—"}
                    {s.final_due_date && ` · due ${s.final_due_date}`}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {s.status ?? "draft"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

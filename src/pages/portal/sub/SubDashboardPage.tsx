import { useSubPortalData } from "@/hooks/usePortals";
import { useMyCourt } from "@/hooks/useWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, Inbox } from "lucide-react";

export default function SubDashboardPage() {
  const { data, isLoading } = useSubPortalData();
  const { data: court = [] } = useMyCourt();

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Subcontractor Portal</h1>
      <p className="text-muted-foreground mb-6">Your commitments, invoices, and open items.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Commitments</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.commitments.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">Invoices</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data?.invoices.length ?? 0}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase">In my court</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{court.length}</CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button asChild variant="outline">
          <Link to="/sub-portal/commitments"><FileText className="h-4 w-4 mr-1" /> Commitments</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sub-portal/rfis"><Inbox className="h-4 w-4 mr-1" /> RFIs</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sub-portal/submittals"><ClipboardList className="h-4 w-4 mr-1" /> Submittals</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Your commitments</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : !data?.commitments.length ? (
            <div className="text-muted-foreground">No commitments yet.</div>
          ) : (
            <div className="divide-y">
              {(data.commitments as any[]).map((c) => (
                <Link key={c.id} to={`/sub-portal/commitments/${c.id}`} className="flex items-center justify-between py-2 hover:bg-muted px-2 rounded">
                  <div>
                    <span className="font-mono text-muted-foreground mr-2">{c.commitment_no}</span>
                    {c.title}
                  </div>
                  <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
